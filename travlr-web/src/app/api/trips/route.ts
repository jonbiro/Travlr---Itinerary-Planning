import { NextResponse } from "next/server"
import { ensureDemoUser, getPrismaClient } from "@/lib/prisma"
import { getCurrentUser, unauthorizedResponse } from "@/lib/current-user"
import { consumeRateLimitAsync, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { JSON_BODY_LIMITS, jsonBodyErrorResponse, readJsonBody } from "@/lib/request-json"
import { collectionPageSize, inclusiveUtcDayCount, PRODUCT_LIMITS } from "@/lib/product-limits"
import { z } from "zod"
import { dateOnlySchema } from "@/lib/date-only"

function databaseUnavailable() {
    return NextResponse.json(
        { error: "Database is not configured. Add DATABASE_URL to use trips." },
        { status: 503 },
    )
}

export async function GET(req: Request) {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser) return unauthorizedResponse()

        const prisma = getPrismaClient()
        if (!prisma) return databaseUnavailable()
        if (currentUser.isDemo) await ensureDemoUser(prisma)

        const url = new URL(req.url)
        const requestedLimit = url.searchParams.get("limit")
        const pageSize = requestedLimit
            ? collectionPageSize(requestedLimit)
            : PRODUCT_LIMITS.maxTripList
        const trips = await prisma.trip.findMany({
            where: {
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
            orderBy: { updatedAt: "desc" },
            take: Math.min(PRODUCT_LIMITS.maxTripList, pageSize + 1),
        })

        const hasMore = trips.length > pageSize
        return NextResponse.json(trips.slice(0, pageSize), {
            headers: {
                "Cache-Control": "private, no-store",
                "X-Result-Limit": String(pageSize),
                "X-Has-More": String(hasMore),
            },
        })
    } catch (error) {
        console.error("[TRIPS_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

const createTripSchema = z.object({
    name: z.string().trim().min(1).max(200),
    destination: z.string().trim().min(1).max(200).optional(),
    startDate: dateOnlySchema.optional(),
    endDate: dateOnlySchema.optional(),
}).strict().refine(({ startDate, endDate }) => (
    !startDate || !endDate || endDate >= startDate
), {
    message: "End date must be on or after the start date",
    path: ["endDate"],
}).refine(({ startDate, endDate }) => (
    !startDate || !endDate || inclusiveUtcDayCount(startDate, endDate) <= PRODUCT_LIMITS.maxTripDays
), {
    message: `Trips longer than ${PRODUCT_LIMITS.maxTripDays} days are not supported.`,
    path: ["endDate"],
})

export async function POST(req: Request) {
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

        const json = await readJsonBody(req, JSON_BODY_LIMITS.trip)
        if (!json.ok) return jsonBodyErrorResponse(json)
        const body = createTripSchema.parse(json.data)
        if (currentUser.isDemo) await ensureDemoUser(prisma)

        const tripCount = await prisma.trip.count({
            where: { userId: currentUser.id },
        })
        if (tripCount >= PRODUCT_LIMITS.maxTripsPerUser) {
            return NextResponse.json(
                { error: `You can save up to ${PRODUCT_LIMITS.maxTripsPerUser} trips.` },
                { status: 409 },
            )
        }

        const trip = await prisma.trip.create({
            data: {
                name: body.name,
                destination: body.destination,
                startDate: body.startDate,
                endDate: body.endDate,
                userId: currentUser.id,
            }
        })

        return NextResponse.json(trip, { status: 201 })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid trip data", issues: error.issues }, { status: 400 })
        }
        console.error("[TRIPS_POST]", error)
        return NextResponse.json({ error: "Unable to create trip" }, { status: 500 })
    }
}
