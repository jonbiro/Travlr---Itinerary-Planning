import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const shareTripSchema = z.object({
    tripId: z.string().min(1),
    email: z.string().email(),
})

// Mock auth for now
const _currentUserId = "demo-user"

export async function POST(req: Request) {
    try {
        const json = await req.json()
        const body = shareTripSchema.parse(json)

        // 1. Verify trip exists and current user has access (owner or member)
        const trip = await prisma.trip.findUnique({
            where: { id: body.tripId },
            include: { members: true }
        })

        if (!trip) {
            return new NextResponse("Trip not found", { status: 404 })
        }

        // TODO: proper auth check. For now assuming if you can hit this with an ID, you might be allowed in dev.
        // In real app, check if currentUserId is owner or in members.

        // 2. Find user by email
        const userToInvite = await prisma.user.findUnique({
            where: { email: body.email }
        })

        if (!userToInvite) {
            return new NextResponse("User not found", { status: 404 })
        }

        // 3. Check if already a member
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

        // 4. Add to trip
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
