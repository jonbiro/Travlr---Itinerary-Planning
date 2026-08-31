import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { getPrismaClient } from "@/lib/prisma"
import { getCurrentUser, unauthorizedResponse } from "@/lib/current-user"
import { consumeRateLimitAsync, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { updateTripSchema } from "@/lib/validators/trip-update"
import { JSON_BODY_LIMITS, jsonBodyErrorResponse, readJsonBody } from "@/lib/request-json"
import { inclusiveUtcDayCount, PRODUCT_LIMITS } from "@/lib/product-limits"
import { z } from "zod"
import { serializeTripWithOwnerCapability } from "@/lib/trip-capabilities"
import { dateForTripDay } from "@/lib/trip-date-reconciliation"

class TripDateConflictError extends Error {}
class TripDateValidationError extends Error {}
class TripNotFoundError extends Error {}
const PRIVATE_NO_STORE_HEADERS = { "Cache-Control": "private, no-store" }

function databaseUnavailable() {
    return NextResponse.json(
        { error: "Database is not configured. Add DATABASE_URL to use trips." },
        { status: 503, headers: PRIVATE_NO_STORE_HEADERS },
    )
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser) return unauthorizedResponse()

        const prisma = getPrismaClient()
        if (!prisma) return databaseUnavailable()

        const { id } = await params

        const trip = await prisma.trip.findFirst({
            where: {
                id: id,
                OR: [
                    { userId: currentUser.id },
                    { members: { some: { userId: currentUser.id } } },
                ],
            },
            select: {
                id: true,
                name: true,
                tripName: true,
                destination: true,
                startDate: true,
                endDate: true,
                imgUrl: true,
                theme: true,
                budget: true,
                currency: true,
                userId: true,
                createdAt: true,
                updatedAt: true,
                days: {
                    select: {
                        id: true,
                        tripId: true,
                        date: true,
                        dayNumber: true,
                        theme: true,
                        activities: {
                            select: {
                                id: true,
                                dayId: true,
                                name: true,
                                description: true,
                                startTime: true,
                                endTime: true,
                                location: true,
                                lat: true,
                                lng: true,
                                order: true,
                                placeId: true,
                            },
                            orderBy: { order: "asc" },
                            take: PRODUCT_LIMITS.maxActivitiesPerDay,
                        },
                    },
                    orderBy: { dayNumber: "asc" },
                    take: PRODUCT_LIMITS.maxTripDays,
                },
            },
        })

        if (!trip) {
            return new NextResponse("Not Found", { status: 404, headers: PRIVATE_NO_STORE_HEADERS })
        }

        return NextResponse.json(serializeTripWithOwnerCapability(trip, currentUser.id), {
            headers: PRIVATE_NO_STORE_HEADERS,
        })
    } catch (error) {
        console.error("[TRIP_GET]", error)
        return new NextResponse("Internal Error", { status: 500, headers: PRIVATE_NO_STORE_HEADERS })
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser) return unauthorizedResponse()

        const prisma = getPrismaClient()
        if (!prisma) return databaseUnavailable()

        const mutationLimit = await consumeRateLimitAsync(
            `mutation:${currentUser.id}`,
            RATE_LIMITS.mutation,
            prisma,
        )
        if (!mutationLimit.allowed) return rateLimitResponse(mutationLimit)

        const { id } = await params
        const json = await readJsonBody(req, JSON_BODY_LIMITS.trip)
        if (!json.ok) return jsonBodyErrorResponse(json)
        const body = updateTripSchema.parse(json.data)

        const dateFieldsWereEdited = body.startDate !== undefined || body.endDate !== undefined
        const trip = await prisma.$transaction(async (tx) => {
            const [lockedTrip] = await tx.$queryRaw<{
                id: string
                startDate: Date | null
                endDate: Date | null
            }[]>(Prisma.sql`
                SELECT "id", "startDate", "endDate"
                FROM "Trip"
                WHERE "id" = ${id} AND "userId" = ${currentUser.id}
                FOR UPDATE
            `)
            if (!lockedTrip) throw new TripNotFoundError()

            const effectiveStartDate = body.startDate === undefined ? lockedTrip.startDate : body.startDate
            const effectiveEndDate = body.endDate === undefined ? lockedTrip.endDate : body.endDate
            if (effectiveStartDate && effectiveEndDate && effectiveEndDate < effectiveStartDate) {
                throw new TripDateValidationError("End date must be on or after the start date")
            }
            if (
                effectiveStartDate
                && effectiveEndDate
                && inclusiveUtcDayCount(effectiveStartDate, effectiveEndDate) > PRODUCT_LIMITS.maxTripDays
            ) {
                throw new TripDateValidationError(`Trips longer than ${PRODUCT_LIMITS.maxTripDays} days are not supported.`)
            }

            const itineraryDays = dateFieldsWereEdited
                ? await tx.day.findMany({
                    where: { tripId: id },
                    select: { id: true, dayNumber: true },
                    orderBy: { dayNumber: "asc" },
                })
                : []

            if (dateFieldsWereEdited && itineraryDays.length > 0) {
                if (!effectiveStartDate || !effectiveEndDate) {
                    throw new TripDateConflictError(
                        "This itinerary has planned days. Keep both trip dates so its day schedule stays consistent.",
                    )
                }

                const requestedDayCount = inclusiveUtcDayCount(effectiveStartDate, effectiveEndDate)
                if (requestedDayCount !== itineraryDays.length) {
                    throw new TripDateConflictError(
                        `This itinerary already has ${itineraryDays.length} planned days. Keep the trip duration at ${itineraryDays.length} days before changing its dates.`,
                    )
                }
            }

            if (dateFieldsWereEdited && itineraryDays.length > 0 && effectiveStartDate) {
                await Promise.all(itineraryDays.map((day) => tx.day.update({
                    where: { id: day.id },
                    data: { date: dateForTripDay(effectiveStartDate, day.dayNumber) },
                })))
            }

            const updatedTrip = await tx.trip.update({
                where: {
                    id: id,
                },
                data: {
                    name: body.name,
                    destination: body.destination,
                    startDate: body.startDate,
                    endDate: body.endDate,
                    budget: body.budget
                },
                select: {
                    id: true,
                    name: true,
                    tripName: true,
                    destination: true,
                    startDate: true,
                    endDate: true,
                    imgUrl: true,
                    theme: true,
                    budget: true,
                    currency: true,
                    userId: true,
                    days: {
                        select: {
                            id: true,
                            tripId: true,
                            date: true,
                            dayNumber: true,
                            theme: true,
                            activities: {
                                select: {
                                    id: true,
                                    dayId: true,
                                    name: true,
                                    description: true,
                                    startTime: true,
                                    endTime: true,
                                    location: true,
                                    lat: true,
                                    lng: true,
                                    order: true,
                                    placeId: true,
                                },
                                orderBy: { order: "asc" },
                                take: PRODUCT_LIMITS.maxActivitiesPerDay,
                            },
                        },
                        orderBy: { dayNumber: "asc" },
                        take: PRODUCT_LIMITS.maxTripDays,
                    },
                    createdAt: true,
                    updatedAt: true,
                },
            })

            return updatedTrip
        })

        return NextResponse.json(serializeTripWithOwnerCapability(trip, currentUser.id), {
            headers: PRIVATE_NO_STORE_HEADERS,
        })
    } catch (error) {
        if (error instanceof TripNotFoundError) {
            return new NextResponse("Not Found", { status: 404, headers: PRIVATE_NO_STORE_HEADERS })
        }
        if (error instanceof TripDateValidationError) {
            return NextResponse.json(
                {
                    error: "Invalid trip data",
                    issues: [{ path: ["endDate"], message: error.message }],
                },
                { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
            )
        }
        if (error instanceof TripDateConflictError) {
            return NextResponse.json(
                { error: error.message },
                { status: 409, headers: PRIVATE_NO_STORE_HEADERS },
            )
        }
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid trip data", issues: error.issues },
                { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
            )
        }
        console.error("[TRIP_PATCH]", error)
        return NextResponse.json(
            { error: "Unable to update trip" },
            { status: 500, headers: PRIVATE_NO_STORE_HEADERS },
        )
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser) return unauthorizedResponse()

        const prisma = getPrismaClient()
        if (!prisma) return databaseUnavailable()

        const mutationLimit = await consumeRateLimitAsync(
            `mutation:${currentUser.id}`,
            RATE_LIMITS.mutation,
            prisma,
        )
        if (!mutationLimit.allowed) return rateLimitResponse(mutationLimit)

        const { id } = await params

        const existingTrip = await prisma.trip.findFirst({
            where: { id, userId: currentUser.id }
        })

        if (!existingTrip) {
            return new NextResponse("Not Found", { status: 404, headers: PRIVATE_NO_STORE_HEADERS })
        }

        await prisma.trip.delete({
            where: {
                id: id,
            }
        })

        return new NextResponse(null, { status: 204, headers: PRIVATE_NO_STORE_HEADERS })
    } catch (error) {
        console.error("[TRIP_DELETE]", error)
        return new NextResponse("Internal Error", { status: 500, headers: PRIVATE_NO_STORE_HEADERS })
    }
}
