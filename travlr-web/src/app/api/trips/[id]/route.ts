import { NextResponse } from "next/server"
import { getPrismaClient } from "@/lib/prisma"
import { getCurrentUser, unauthorizedResponse } from "@/lib/current-user"
import { updateTripSchema } from "@/lib/validators/trip-update"
import { JSON_BODY_LIMITS, jsonBodyErrorResponse, readJsonBody } from "@/lib/request-json"
import { z } from "zod"

function databaseUnavailable() {
    return NextResponse.json(
        { error: "Database is not configured. Add DATABASE_URL to use trips." },
        { status: 503 },
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
            include: {
                days: {
                    include: {
                        activities: {
                            orderBy: {
                                order: 'asc'
                            }
                        }
                    },
                    orderBy: {
                        dayNumber: 'asc'
                    }
                },
                expenses: true,
                // Add other includes as needed
            }
        })

        if (!trip) {
            return new NextResponse("Not Found", { status: 404 })
        }

        return NextResponse.json(trip)
    } catch (error) {
        console.error("[TRIP_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
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

        const { id } = await params
        const json = await readJsonBody(req, JSON_BODY_LIMITS.trip)
        if (!json.ok) return jsonBodyErrorResponse(json)
        const body = updateTripSchema.parse(json.data)

        const existingTrip = await prisma.trip.findFirst({
            where: { id, userId: currentUser.id }
        })

        if (!existingTrip) {
            return new NextResponse("Not Found", { status: 404 })
        }

        const effectiveStartDate = body.startDate ?? existingTrip.startDate
        const effectiveEndDate = body.endDate ?? existingTrip.endDate
        if (effectiveStartDate && effectiveEndDate && effectiveEndDate < effectiveStartDate) {
            return NextResponse.json(
                {
                    error: "Invalid trip data",
                    issues: [{ path: ["endDate"], message: "End date must be on or after the start date" }],
                },
                { status: 400 },
            )
        }

        const trip = await prisma.trip.update({
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
            include: {
                days: {
                    include: {
                        activities: true
                    }
                }
            }
        })

        return NextResponse.json(trip)
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid trip data", issues: error.issues }, { status: 400 })
        }
        console.error("[TRIP_PATCH]", error)
        return NextResponse.json({ error: "Unable to update trip" }, { status: 500 })
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

        const { id } = await params

        const existingTrip = await prisma.trip.findFirst({
            where: { id, userId: currentUser.id }
        })

        if (!existingTrip) {
            return new NextResponse("Not Found", { status: 404 })
        }

        await prisma.trip.delete({
            where: {
                id: id,
            }
        })

        return new NextResponse(null, { status: 204 })
    } catch (error) {
        console.error("[TRIP_DELETE]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
