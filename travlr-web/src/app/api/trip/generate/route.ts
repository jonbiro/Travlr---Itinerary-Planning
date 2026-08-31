import { openai } from "@ai-sdk/openai"
import { Prisma } from "@prisma/client"
import { generateText, Output } from "ai"
import { z } from "zod"
import { createTripSchema } from "@/lib/validators/trip"
import {
    generatedItinerarySchema,
    hasCompleteDaySequence,
    inclusiveDayCount,
} from "@/lib/validators/generated-itinerary"
import { ensureDemoUser, getPrismaClient } from "@/lib/prisma"
import { getCurrentUser, unauthorizedResponse } from "@/lib/current-user"
import { consumeRateLimitAsync, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { JSON_BODY_LIMITS, jsonBodyErrorResponse, readJsonBody } from "@/lib/request-json"
import { PRODUCT_LIMITS } from "@/lib/product-limits"
import { serializeTripWithOwnerCapability } from "@/lib/trip-capabilities"

export const maxDuration = 60
const PRIVATE_NO_STORE_HEADERS = { "Cache-Control": "private, no-store" }

function privateJson(body: unknown, init: ResponseInit = {}) {
    const headers = new Headers(init.headers)
    headers.set("Cache-Control", "private, no-store")
    return Response.json(body, { ...init, headers })
}

export async function POST(req: Request) {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser) return unauthorizedResponse()

        const prisma = getPrismaClient()
        const rateLimit = await consumeRateLimitAsync(`generate:${currentUser.id}`, RATE_LIMITS.generate, prisma)
        if (!rateLimit.allowed) return rateLimitResponse(rateLimit)

        const json = await readJsonBody(req, JSON_BODY_LIMITS.generateTrip)
        if (!json.ok) return jsonBodyErrorResponse(json)
        const body = createTripSchema.parse(json.data)

        if (!prisma) {
            return privateJson(
                { error: "Database is not configured. Add DATABASE_URL before creating trips." },
                { status: 503 },
            )
        }

        if (!process.env.OPENAI_API_KEY) {
            return privateJson(
                { error: "AI generation is not configured. Add OPENAI_API_KEY before creating trips." },
                { status: 503 },
            )
        }

        if (currentUser.isDemo) await ensureDemoUser(prisma)

        // Fail before calling the model when the user cannot persist another
        // trip. The final check below still protects against a trip being
        // created in another request while generation is in progress.
        const existingTripCount = await prisma.trip.count({
            where: { userId: currentUser.id },
        })
        if (existingTripCount >= PRODUCT_LIMITS.maxTripsPerUser) {
            return privateJson(
                { error: `You can save up to ${PRODUCT_LIMITS.maxTripsPerUser} trips.` },
                { status: 409 },
            )
        }

        const requestedDayCount = inclusiveDayCount(body.startDate, body.endDate)
        if (requestedDayCount > PRODUCT_LIMITS.maxTripDays) {
            return privateJson(
                { error: `Trips longer than ${PRODUCT_LIMITS.maxTripDays} days are not supported.` },
                { status: 400 },
            )
        }

        const result = await generateText({
            model: openai(process.env.OPENAI_MODEL || "gpt-5.6-luna"),
            abortSignal: req.signal,
            output: Output.object({ schema: generatedItinerarySchema }),
            maxOutputTokens: 12_000,
            prompt: `Generate a detailed ${body.budget} travel itinerary for a trip to ${body.destination} from ${body.startDate} to ${body.endDate}.
      The traveler is interested in: ${body.interests.join(", ")}.
      Create a unique name for the trip and exactly ${requestedDayCount} daily breakdowns.
      Use each day number from 1 through ${requestedDayCount} exactly once.`,
        })

        const tripData = result.output
        if (!hasCompleteDaySequence(tripData.days, requestedDayCount)) {
            return privateJson(
                { error: "The AI returned an incomplete itinerary. Please try generating the trip again." },
                { status: 502 },
            )
        }
        const activityCount = tripData.days.reduce(
            (total, day) => total + day.activities.length,
            0,
        )
        if (activityCount > PRODUCT_LIMITS.maxActivitiesPerTrip) {
            return privateJson(
                { error: `Itineraries are limited to ${PRODUCT_LIMITS.maxActivitiesPerTrip} activities.` },
                { status: 502 },
            )
        }
        const budgetAmounts = {
            budget: 1000,
            moderate: 2500,
            luxury: 6000,
        } as const

        const newTrip = await prisma.$transaction(async (tx) => {
            // Serialize quota checks for this owner so simultaneous AI and
            // manual creations cannot both pass the final capacity check.
            const lockedUser = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
                SELECT "id" FROM "User" WHERE "id" = ${currentUser.id} FOR UPDATE
            `)
            if (lockedUser.length === 0) throw new Error("Trip owner not found")

            const latestTripCount = await tx.trip.count({
                where: { userId: currentUser.id },
            })
            if (latestTripCount >= PRODUCT_LIMITS.maxTripsPerUser) return null

            return tx.trip.create({
                data: {
                    name: tripData.tripName,
                    tripName: tripData.tripName,
                    destination: body.destination,
                    startDate: body.startDate,
                    endDate: body.endDate,
                    budget: budgetAmounts[body.budget],
                    userId: currentUser.id,
                    days: {
                        create: tripData.days.map((day) => {
                            const date = new Date(body.startDate)
                            date.setUTCDate(date.getUTCDate() + day.day - 1)

                            return {
                                dayNumber: day.day,
                                date,
                                theme: day.theme,
                                activities: {
                                    create: day.activities.map((activity, index) => ({
                                        name: activity.name,
                                        description: activity.description,
                                        startTime: activity.time,
                                        location: activity.location,
                                        order: index,
                                    })),
                                },
                            }
                        }),
                    },
                },
                include: {
                    days: {
                        include: {
                            activities: {
                                orderBy: { order: "asc" },
                                take: PRODUCT_LIMITS.maxActivitiesPerDay,
                            },
                        },
                        orderBy: {
                            dayNumber: "asc",
                        },
                    },
                },
            })
        })

        if (!newTrip) {
            return privateJson(
                { error: `You can save up to ${PRODUCT_LIMITS.maxTripsPerUser} trips.` },
                { status: 409 },
            )
        }

        return Response.json(
            serializeTripWithOwnerCapability(newTrip, currentUser.id),
            { status: 201, headers: PRIVATE_NO_STORE_HEADERS },
        )
    } catch (error) {
        if (error instanceof z.ZodError) {
            return privateJson({ error: "Invalid trip details", issues: error.issues }, { status: 400 })
        }
        console.error("Error generating trip:", error)
        return privateJson({ error: "Failed to generate trip" }, { status: 500 })
    }
}
