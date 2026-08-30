import { NextResponse } from "next/server"
import { ensureDemoUser, getPrismaClient } from "@/lib/prisma"
import { getCurrentUser, unauthorizedResponse } from "@/lib/current-user"
import { JSON_BODY_LIMITS, jsonBodyErrorResponse, readJsonBody } from "@/lib/request-json"
import { consumeRateLimitAsync, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { z } from "zod"

const shareTripSchema = z.object({
    tripId: z.string().min(1),
    email: z.string().trim().email().max(320),
})

const acceptedResponse = () => NextResponse.json(
    {
        success: true,
        message: "If that account is eligible, trip access has been updated.",
    },
    { status: 202 },
)

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
        const rateLimit = await consumeRateLimitAsync(
            `share-trip:${currentUser.id}`,
            RATE_LIMITS.shareTrip,
            prisma,
        )
        if (!rateLimit.allowed) return rateLimitResponse(rateLimit)
        if (currentUser.isDemo) await ensureDemoUser(prisma)

        const json = await readJsonBody(req, JSON_BODY_LIMITS.shareTrip)
        if (!json.ok) return jsonBodyErrorResponse(json)
        const body = shareTripSchema.parse(json.data)

        const trip = await prisma.trip.findFirst({
            where: { id: body.tripId, userId: currentUser.id },
            select: { id: true, userId: true },
        })

        if (!trip) {
            return new NextResponse("Trip not found", { status: 404 })
        }

        const normalizedEmail = body.email.trim().toLowerCase()
        const userToInvite = await prisma.user.findFirst({
            where: { email: { equals: normalizedEmail, mode: "insensitive" } },
        })

        // Keep the response identical for an unknown address, the owner, and
        // an existing member. This prevents the sharing endpoint from being
        // used as an account-enumeration oracle.
        if (!userToInvite || userToInvite.id === trip.userId) return acceptedResponse()

        const existingMember = await prisma.tripUser.findUnique({
            where: {
                tripId_userId: {
                    tripId: trip.id,
                    userId: userToInvite.id,
                },
            },
            select: { id: true },
        })

        if (existingMember) return acceptedResponse()

        try {
            await prisma.tripUser.create({
                data: {
                    tripId: trip.id,
                    userId: userToInvite.id,
                },
            })
        } catch (error) {
            // A concurrent request may have created the membership. Treat
            // that case like every other accepted share attempt.
            if (!(error instanceof Error && "code" in error && error.code === "P2002")) {
                throw error
            }
        }

        return acceptedResponse()

    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse("Invalid request data", { status: 400 })
        }
        console.error("[TRIP_SHARE]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
