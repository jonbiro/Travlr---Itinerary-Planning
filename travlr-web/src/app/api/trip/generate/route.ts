import { openai } from "@ai-sdk/openai"
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
import { consumeRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { JSON_BODY_LIMITS, jsonBodyErrorResponse, readJsonBody } from "@/lib/request-json"

export const maxDuration = 60

export async function POST(req: Request) {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser) return unauthorizedResponse()

        const rateLimit = consumeRateLimit(`generate:${currentUser.id}`, RATE_LIMITS.generate)
        if (!rateLimit.allowed) return rateLimitResponse(rateLimit)

        const json = await readJsonBody(req, JSON_BODY_LIMITS.generateTrip)
        if (!json.ok) return jsonBodyErrorResponse(json)
        const body = createTripSchema.parse(json.data)

        const prisma = getPrismaClient()
        if (!prisma) {
            return Response.json(
                { error: "Database is not configured. Add DATABASE_URL before creating trips." },
                { status: 503 },
            )
        }

        if (!process.env.OPENAI_API_KEY) {
            return Response.json(
                { error: "AI generation is not configured. Add OPENAI_API_KEY before creating trips." },
                { status: 503 },
            )
        }

        const requestedDayCount = inclusiveDayCount(body.startDate, body.endDate)
        if (requestedDayCount > 366) {
            return Response.json(
                { error: "Trips longer than 366 days are not supported." },
                { status: 400 },
            )
        }

        const result = await generateText({
            model: openai(process.env.OPENAI_MODEL || "gpt-5.6-luna"),
            output: Output.object({ schema: generatedItinerarySchema }),
            prompt: `Generate a detailed ${body.budget} travel itinerary for a trip to ${body.destination} from ${body.startDate} to ${body.endDate}.
      The traveler is interested in: ${body.interests.join(", ")}.
      Create a unique name for the trip and exactly ${requestedDayCount} daily breakdowns.
      Use each day number from 1 through ${requestedDayCount} exactly once.`,
        })

        const tripData = result.output
        if (!hasCompleteDaySequence(tripData.days, requestedDayCount)) {
            return Response.json(
                { error: "The AI returned an incomplete itinerary. Please try generating the trip again." },
                { status: 502 },
            )
        }
        if (currentUser.isDemo) await ensureDemoUser(prisma)

        const budgetAmounts = {
            budget: 1000,
            moderate: 2500,
            luxury: 6000,
        } as const

        const newTrip = await prisma.trip.create({
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
                }
            },
            include: {
                days: {
                    include: {
                        activities: true
                    },
                    orderBy: {
                        dayNumber: 'asc'
                    }
                }
            }
        })

        return Response.json(newTrip, { status: 201 })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return Response.json({ error: "Invalid trip details", issues: error.issues }, { status: 400 })
        }
        console.error("Error generating trip:", error)
        return Response.json({ error: "Failed to generate trip" }, { status: 500 })
    }
}
