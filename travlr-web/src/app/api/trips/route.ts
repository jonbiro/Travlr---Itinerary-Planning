import { NextResponse } from "next/server"
// import { authOptions } from "@/app/api/auth/[...nextauth]/route" // Adjust import path as needed, or use a simpler check for now if auth options aren't exported there
import { prisma } from "@/lib/prisma" // Assuming prisma client is exported from here
import { z } from "zod"

// Temporary auth mock if authOptions not found, we'll try to use a standard getSession approach or just check headers if we were using middleware, but let's assume standard next-auth for now.
// If your project uses a different auth setup, please adjust.

export async function GET(_req: Request) {
    try {
        // const session = await getServerSession(authOptions)
        // if (!session || !session.user) {
        //   return new NextResponse("Unauthorized", { status: 401 })
        // }

        // For now, let's assume a hardcoded user ID or fetch from header if auth is not fully set up in this context. 
        // BUT looking at schema, Account/Session exist, so NextAuth is likely used.
        // Let's try to find a user or just return empty for now if no auth.

        // TODO: integrated real auth. querying for all trips for now or a specific demo user.
        // We will query where userId is not null.
        // Actually, looking at the schema, Trip requires userId.

        // Let's use a dummy user ID "demo-user" for development if no session, or try to get verification.
        const userId = "demo-user" // REPLACE WITH REAL AUTH

        // Check if demo user exists, if not create
        let user = await prisma.user.findUnique({ where: { id: userId } })
        if (!user) {
            // Create demo user if it doesn't exist for dev purposes
            user = await prisma.user.create({
                data: {
                    id: userId,
                    name: "Demo User",
                    email: "demo@example.com"
                }
            })
        }

        const trips = await prisma.trip.findMany({
            where: {
                userId: userId
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
    name: z.string().min(1),
    destination: z.string().optional(),
    startDate: z.string().optional(), // ISO date string
    endDate: z.string().optional(),
})

export async function POST(req: Request) {
    try {
        const json = await req.json()
        const body = createTripSchema.parse(json)

        const userId = "demo-user" // REPLACE WITH REAL AUTH

        const trip = await prisma.trip.create({
            data: {
                name: body.name,
                destination: body.destination,
                startDate: body.startDate ? new Date(body.startDate) : null,
                endDate: body.endDate ? new Date(body.endDate) : null,
                userId: userId,
                // Create initial day if dates provided?
                // Logic for creating days based on date range can be added here
            }
        })

        return NextResponse.json(trip)
    } catch (error) {
        console.error("[TRIPS_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
