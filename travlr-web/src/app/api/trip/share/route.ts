import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { ensureDemoUser, getPrismaClient } from "@/lib/prisma"
import { getCurrentUser, unauthorizedResponse } from "@/lib/current-user"
import { JSON_BODY_LIMITS, jsonBodyErrorResponse, readJsonBody } from "@/lib/request-json"
import { consumeRateLimitAsync, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { PRODUCT_LIMITS } from "@/lib/product-limits"
import { z } from "zod"

const shareTripSchema = z.object({
    tripId: z.string().trim().min(1).max(200),
    email: z.string().trim().email().max(320),
})

const tripIdQuerySchema = z.object({
    tripId: z.string().trim().min(1).max(200),
})

const removeMemberQuerySchema = tripIdQuerySchema.extend({
    memberId: z.string().trim().min(1).max(200).optional(),
}).strict()

const PRIVATE_NO_STORE_HEADERS = { "Cache-Control": "private, no-store" }

function privateJson(body: unknown, init: ResponseInit = {}) {
    const headers = new Headers(init.headers)
    headers.set("Cache-Control", "private, no-store")
    return NextResponse.json(body, { ...init, headers })
}

function privateText(body: BodyInit | null, init: ResponseInit = {}) {
    const headers = new Headers(init.headers)
    headers.set("Cache-Control", "private, no-store")
    return new NextResponse(body, { ...init, headers })
}

function privateResponse(response: Response) {
    for (const [key, value] of Object.entries(PRIVATE_NO_STORE_HEADERS)) {
        response.headers.set(key, value)
    }
    return response
}

const acceptedResponse = () => privateJson(
    {
        success: true,
        message: "If that account is eligible, trip access has been updated.",
    },
    { status: 202 },
)

function isPrismaErrorCode(error: unknown, code: string) {
    return error instanceof Error
        && "code" in error
        && error.code === code
}

function sortMembers<T extends { id: string; name: string | null; email: string | null }>(members: T[]) {
    return [...members].sort((first, second) => (
        (first.email ?? first.name ?? "").localeCompare(second.email ?? second.name ?? "")
        || first.id.localeCompare(second.id)
    ))
}

type ShareMutationResult = "accepted" | "not-found" | "limit-reached"

async function addTripMember(
    prisma: NonNullable<ReturnType<typeof getPrismaClient>>,
    tripId: string,
    ownerId: string,
    normalizedEmail: string,
): Promise<ShareMutationResult> {
    return prisma.$transaction(async (tx) => {
        // Lock the parent trip so concurrent share requests serialize before
        // checking the aggregate member count. This uses the existing Trip
        // row and therefore requires no schema migration.
        const lockedTrip = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
            SELECT "id"
            FROM "Trip"
            WHERE "id" = ${tripId} AND "userId" = ${ownerId}
            FOR UPDATE
        `)
        if (lockedTrip.length === 0) return "not-found"

        // Check capacity before resolving the address. At the cap, every
        // address gets the same result, so the limit cannot become an account
        // enumeration oracle.
        const memberCount = await tx.tripUser.count({ where: { tripId } })
        if (memberCount >= PRODUCT_LIMITS.maxMembersPerTrip) return "limit-reached"

        const userToInvite = await tx.user.findFirst({
            where: { email: { equals: normalizedEmail, mode: "insensitive" } },
        })
        if (!userToInvite || userToInvite.id === ownerId) return "accepted"

        const existingMember = await tx.tripUser.findUnique({
            where: {
                tripId_userId: {
                    tripId,
                    userId: userToInvite.id,
                },
            },
            select: { id: true },
        })
        if (existingMember) return "accepted"

        try {
            await tx.tripUser.create({
                data: {
                    tripId,
                    userId: userToInvite.id,
                },
            })
        } catch (error) {
            // A concurrent writer from an older deployment may have created
            // this unique membership; preserve the enumeration-safe response.
            if (!isPrismaErrorCode(error, "P2002")) throw error
        }

        return "accepted"
    })
}

function queryValue(request: Request, name: string) {
    return new URL(request.url).searchParams.get(name)
}

export async function GET(req: Request) {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser) return privateResponse(unauthorizedResponse())

        const prisma = getPrismaClient()
        if (!prisma) {
            return privateJson(
                { error: "Database is not configured. Add DATABASE_URL to manage trip members." },
                { status: 503 },
            )
        }

        const parsedQuery = tripIdQuerySchema.safeParse({ tripId: queryValue(req, "tripId") })
        if (!parsedQuery.success) {
            return privateJson({ error: "tripId parameter is required" }, { status: 400 })
        }

        const rateLimit = await consumeRateLimitAsync(
            `share-trip:${currentUser.id}`,
            RATE_LIMITS.shareTrip,
            prisma,
        )
        if (!rateLimit.allowed) return rateLimitResponse(rateLimit)
        if (currentUser.isDemo) await ensureDemoUser(prisma)

        // The list is intentionally owner-only. A member can use the trip but
        // cannot enumerate the other accounts attached to it.
        const trip = await prisma.trip.findFirst({
            where: { id: parsedQuery.data.tripId, userId: currentUser.id },
            select: {
                members: {
                    select: {
                        id: true,
                        user: {
                            select: {
                                name: true,
                                email: true,
                                image: true,
                            },
                        },
                    },
                },
            },
        })

        if (!trip) return privateText("Trip not found", { status: 404 })

        const members = sortMembers(trip.members.map((member) => ({
            id: member.id,
            name: member.user.name,
            email: member.user.email,
            image: member.user.image,
        })))

        return privateJson({
            members,
            maxMembersPerTrip: PRODUCT_LIMITS.maxMembersPerTrip,
        })
    } catch (error) {
        console.error("[TRIP_SHARE_GET]", error)
        return privateText("Internal Error", { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser) return privateResponse(unauthorizedResponse())

        const prisma = getPrismaClient()
        if (!prisma) {
            return privateJson(
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
        if (!json.ok) return privateResponse(jsonBodyErrorResponse(json))
        const body = shareTripSchema.parse(json.data)

        const trip = await prisma.trip.findFirst({
            where: { id: body.tripId, userId: currentUser.id },
            select: { id: true, userId: true },
        })

        if (!trip) {
            return privateText("Trip not found", { status: 404 })
        }

        const normalizedEmail = body.email.trim().toLowerCase()
        const result = await addTripMember(prisma, trip.id, trip.userId, normalizedEmail)
        if (result === "not-found") return privateText("Trip not found", { status: 404 })
        if (result === "limit-reached") {
            return privateJson(
                { error: `A trip can have up to ${PRODUCT_LIMITS.maxMembersPerTrip} members.` },
                { status: 409 },
            )
        }

        return acceptedResponse()

    } catch (error) {
        if (error instanceof z.ZodError) {
            return privateText("Invalid request data", { status: 400 })
        }
        console.error("[TRIP_SHARE]", error)
        return privateText("Internal Error", { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser) return privateResponse(unauthorizedResponse())

        const prisma = getPrismaClient()
        if (!prisma) {
            return privateJson(
                { error: "Database is not configured. Add DATABASE_URL to manage trip members." },
                { status: 503 },
            )
        }

        const parsedQuery = removeMemberQuerySchema.safeParse({
            tripId: queryValue(req, "tripId"),
            memberId: queryValue(req, "memberId") ?? undefined,
        })
        if (!parsedQuery.success) {
            return privateJson({ error: "A valid tripId is required" }, { status: 400 })
        }

        const rateLimit = await consumeRateLimitAsync(
            `share-trip:${currentUser.id}`,
            RATE_LIMITS.shareTrip,
            prisma,
        )
        if (!rateLimit.allowed) return rateLimitResponse(rateLimit)
        if (currentUser.isDemo) await ensureDemoUser(prisma)

        const trip = await prisma.trip.findFirst({
            where: {
                id: parsedQuery.data.tripId,
                OR: [
                    { userId: currentUser.id },
                    { members: { some: { userId: currentUser.id } } },
                ],
            },
            select: { id: true, userId: true },
        })

        // Do not distinguish an unknown trip from a trip the caller cannot
        // access. This keeps membership ids and trip ids non-enumerable.
        if (!trip) return privateText("Trip not found", { status: 404 })

        if (trip.userId === currentUser.id) {
            if (!parsedQuery.data.memberId) {
                return privateJson(
                    { error: "The trip owner cannot leave their own trip." },
                    { status: 409 },
                )
            }

            // deleteMany makes owner revocation idempotent and constrains the
            // target to this exact trip, so a guessed id cannot cross tenants.
            await prisma.tripUser.deleteMany({
                where: {
                    id: parsedQuery.data.memberId,
                    tripId: trip.id,
                },
            })
            return privateJson({ success: true })
        }

        const membership = parsedQuery.data.memberId
            ? await prisma.tripUser.findFirst({
                where: {
                    id: parsedQuery.data.memberId,
                    tripId: trip.id,
                    userId: currentUser.id,
                },
                select: { id: true },
            })
            : await prisma.tripUser.findUnique({
                where: {
                    tripId_userId: {
                        tripId: trip.id,
                        userId: currentUser.id,
                    },
                },
                select: { id: true },
            })

        // Members may remove only their own membership. Deliberately return
        // the same response for another member's id and a missing id.
        if (!membership) return privateText("Trip not found", { status: 404 })

        await prisma.tripUser.deleteMany({
            where: {
                id: membership.id,
                tripId: trip.id,
                userId: currentUser.id,
            },
        })

        return privateJson({ success: true })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return privateJson({ error: "Invalid request data", issues: error.issues }, { status: 400 })
        }
        console.error("[TRIP_SHARE_DELETE]", error)
        return privateText("Internal Error", { status: 500 })
    }
}
