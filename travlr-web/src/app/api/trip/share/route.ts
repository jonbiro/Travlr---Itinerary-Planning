import { NextResponse } from "next/server"
import { ensureDemoUser, getPrismaClient } from "@/lib/prisma"
import { getCurrentUser, unauthorizedResponse } from "@/lib/current-user"
import { JSON_BODY_LIMITS, jsonBodyErrorResponse, readJsonBody } from "@/lib/request-json"
import { z } from "zod"

const shareTripSchema = z.object({
    tripId: z.string().min(1),
    email: z.string().email(),
})

export async function POST(req: Request) {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser) return unauthorizedResponse()

        const prisma = getPrismaClient()
        if (!prisma) {
            return NextResponse.json(
                { error: "Database is not configured. Add DATABASE_URL to share trips." },
                { status: 503 },
            )
        }
        if (currentUser.isDemo) await ensureDemoUser(prisma)

        const json = await readJsonBody(req, JSON_BODY_LIMITS.shareTrip)
        if (!json.ok) return jsonBodyErrorResponse(json)
        const body = shareTripSchema.parse(json.data)

        const trip = await prisma.trip.findFirst({
            where: { id: body.tripId, userId: currentUser.id },
        })

        if (!trip) {
            return new NextResponse("Trip not found", { status: 404 })
        }

        const userToInvite = await prisma.user.findUnique({
            where: { email: body.email }
        })

        if (!userToInvite) {
            return new NextResponse("User not found", { status: 404 })
        }

        if (userToInvite.id === trip.userId) {
            return new NextResponse("User already owns this trip", { status: 409 })
        }

        const existingMember = await prisma.tripUser.findUnique({
            where: {
                tripId_userId: {
                    tripId: body.tripId,
                    userId: userToInvite.id
                }
            }
        })

        if (existingMember) {
            return new NextResponse("User already a member", { status: 409 })
        }

        await prisma.tripUser.create({
            data: {
                tripId: body.tripId,
                userId: userToInvite.id
            }
        })

        return NextResponse.json({ success: true, message: "User added to trip" })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse("Invalid request data", { status: 400 })
        }
        console.error("[TRIP_SHARE]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
