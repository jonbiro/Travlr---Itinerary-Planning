import { NextResponse } from "next/server"
import { ensureDemoUser, getPrismaClient } from "@/lib/prisma"
import { getCurrentUser, unauthorizedResponse } from "@/lib/current-user"
import { JSON_BODY_LIMITS, jsonBodyErrorResponse, readJsonBody } from "@/lib/request-json"
import { z } from "zod"

function databaseUnavailable() {
    return NextResponse.json(
        { error: "Database is not configured. Add DATABASE_URL to use trips." },
        { status: 503 },
    )
}

export async function GET(_req: Request) {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser) return unauthorizedResponse()

        const prisma = getPrismaClient()
        if (!prisma) return databaseUnavailable()
        if (currentUser.isDemo) await ensureDemoUser(prisma)

        const trips = await prisma.trip.findMany({
            where: {
                OR: [
                    { userId: currentUser.id },
                    { members: { some: { userId: currentUser.id } } },
                ],
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
            },
            orderBy: {
                updatedAt: 'desc'
            }
        })

        return NextResponse.json(trips)
    } catch (error) {
        console.error("[TRIPS_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

const createTripSchema = z.object({
    name: z.string().trim().min(1),
    destination: z.string().trim().min(1).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
}).strict().refine(({ startDate, endDate }) => (
    !startDate || !endDate || endDate >= startDate
), {
    message: "End date must be on or after the start date",
    path: ["endDate"],
})

export async function POST(req: Request) {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser) return unauthorizedResponse()

        const prisma = getPrismaClient()
        if (!prisma) return databaseUnavailable()

        const json = await readJsonBody(req, JSON_BODY_LIMITS.trip)
        if (!json.ok) return jsonBodyErrorResponse(json)
        const body = createTripSchema.parse(json.data)
        if (currentUser.isDemo) await ensureDemoUser(prisma)

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
