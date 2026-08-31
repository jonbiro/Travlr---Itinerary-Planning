import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { ensureDemoUser, getPrismaClient } from "@/lib/prisma"
import { getCurrentUser, unauthorizedResponse } from "@/lib/current-user"
import { consumeRateLimitAsync, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { JSON_BODY_LIMITS, jsonBodyErrorResponse, readJsonBody } from "@/lib/request-json"
import { collectionPageSize, inclusiveUtcDayCount, PRODUCT_LIMITS } from "@/lib/product-limits"
import { z } from "zod"
import { dateOnlySchema } from "@/lib/date-only"
import {
    serializeTripSummaryWithOwnerCapability,
    serializeTripWithOwnerCapability,
} from "@/lib/trip-capabilities"
import { buildTripStatsAggregate } from "@/lib/trip-stats"

const PRIVATE_NO_STORE_HEADERS = { "Cache-Control": "private, no-store" }

function databaseUnavailable() {
    return NextResponse.json(
        { error: "Database is not configured. Add DATABASE_URL to use trips." },
        { status: 503, headers: PRIVATE_NO_STORE_HEADERS },
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

        const tripVisibilityWhere = {
            OR: [
                { userId: currentUser.id },
                { members: { some: { userId: currentUser.id } } },
            ],
        }
        const view = url.searchParams.get("view")

        if (view && !["full", "summary", "stats"].includes(view)) {
            return NextResponse.json(
                { error: "Unsupported trip list view." },
                { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
            )
        }

        if (view === "summary") {
            const trips = await prisma.trip.findMany({
                where: tripVisibilityWhere,
                select: {
                    id: true,
                    name: true,
                    tripName: true,
                    destination: true,
                    startDate: true,
                    endDate: true,
                    budget: true,
                    currency: true,
                    userId: true,
                    _count: { select: { days: true } },
                },
                orderBy: { updatedAt: "desc" },
                take: pageSize + 1,
            })

            const hasMore = trips.length > pageSize
            const visibleTrips = trips
                .slice(0, pageSize)
                .map((trip) => serializeTripSummaryWithOwnerCapability(trip, currentUser.id))

            return NextResponse.json(visibleTrips, {
                headers: {
                    ...PRIVATE_NO_STORE_HEADERS,
                    "X-Result-Limit": String(pageSize),
                    "X-Has-More": String(hasMore),
                    "X-Trip-View": "summary",
                },
            })
        }

        if (view === "stats") {
            const [totalTrips, destinationGroups, totalDaysPlanned, totalActivities] = await Promise.all([
                prisma.trip.count({ where: tripVisibilityWhere }),
                prisma.trip.groupBy({
                    by: ["destination"],
                    where: tripVisibilityWhere,
                    orderBy: { destination: "asc" },
                    _count: { _all: true },
                }),
                prisma.day.count({ where: { trip: tripVisibilityWhere } }),
                prisma.itineraryItem.count({ where: { day: { trip: tripVisibilityWhere } } }),
            ])

            return NextResponse.json(buildTripStatsAggregate({
                totalTrips,
                destinationGroups: destinationGroups.map((group) => ({
                    destination: group.destination,
                    tripCount: group._count._all,
                })),
                totalDaysPlanned,
                totalActivities,
            }), {
                headers: {
                    ...PRIVATE_NO_STORE_HEADERS,
                    "X-Trip-View": "stats",
                },
            })
        }

        const trips = await prisma.trip.findMany({
            where: tripVisibilityWhere,
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
            take: pageSize + 1,
        })

        const hasMore = trips.length > pageSize
        const visibleTrips = trips
            .slice(0, pageSize)
            .map((trip) => serializeTripWithOwnerCapability(trip, currentUser.id))

        return NextResponse.json(visibleTrips, {
            headers: {
                ...PRIVATE_NO_STORE_HEADERS,
                "X-Result-Limit": String(pageSize),
                "X-Has-More": String(hasMore),
            },
        })
    } catch (error) {
        console.error("[TRIPS_GET]", error)
        return new NextResponse("Internal Error", { status: 500, headers: PRIVATE_NO_STORE_HEADERS })
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

        const trip = await prisma.$transaction(async (tx) => {
            const lockedUser = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
                SELECT "id" FROM "User" WHERE "id" = ${currentUser.id} FOR UPDATE
            `)
            if (lockedUser.length === 0) throw new Error("Trip owner not found")

            const tripCount = await tx.trip.count({
                where: { userId: currentUser.id },
            })
            if (tripCount >= PRODUCT_LIMITS.maxTripsPerUser) return null

            return tx.trip.create({
                data: {
                    name: body.name,
                    destination: body.destination,
                    startDate: body.startDate,
                    endDate: body.endDate,
                    userId: currentUser.id,
                },
            })
        })

        if (!trip) {
            return NextResponse.json(
                { error: `You can save up to ${PRODUCT_LIMITS.maxTripsPerUser} trips.` },
                { status: 409, headers: PRIVATE_NO_STORE_HEADERS },
            )
        }

        return NextResponse.json(
            serializeTripWithOwnerCapability(trip, currentUser.id),
            { status: 201, headers: PRIVATE_NO_STORE_HEADERS },
        )
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid trip data", issues: error.issues },
                { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
            )
        }
        console.error("[TRIPS_POST]", error)
        return NextResponse.json(
            { error: "Unable to create trip" },
            { status: 500, headers: PRIVATE_NO_STORE_HEADERS },
        )
    }
}
