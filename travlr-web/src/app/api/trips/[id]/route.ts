import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Temporary auth mock
const _userId = "demo-user"

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        // Validate ownership
        const trip = await prisma.trip.findUnique({
            where: {
                id: id,
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

        // if (trip.userId !== userId) {
        //   return new NextResponse("Unauthorized", { status: 401 })
        // }

        return NextResponse.json(trip)
    } catch (error) {
        console.error("[TRIP_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

const updateTripSchema = z.object({
    name: z.string().optional(),
    destination: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    budget: z.number().optional()
})

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const json = await req.json()
        const body = updateTripSchema.parse(json)

        // Verify ownership first
        const existingTrip = await prisma.trip.findUnique({
            where: { id }
        })

        if (!existingTrip) {
            return new NextResponse("Not Found", { status: 404 })
        }

        // if (existingTrip.userId !== userId) {
        //     return new NextResponse("Unauthorized", { status: 401 })
        // }

        const trip = await prisma.trip.update({
            where: {
                id: id,
            },
            data: {
                name: body.name,
                destination: body.destination,
                startDate: body.startDate ? new Date(body.startDate) : undefined,
                endDate: body.endDate ? new Date(body.endDate) : undefined,
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
        console.error("[TRIP_PATCH]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        // Verify ownership first
        const existingTrip = await prisma.trip.findUnique({
            where: { id }
        })

        if (!existingTrip) {
            return new NextResponse("Not Found", { status: 404 })
        }

        // if (existingTrip.userId !== userId) {
        //     return new NextResponse("Unauthorized", { status: 401 })
        // }

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
