import { NextResponse } from "next/server"
import { z } from "zod"

import { ensureDemoUser, getPrismaClient } from "@/lib/prisma"
import { getCurrentUser, unauthorizedResponse } from "@/lib/current-user"
import { consumeRateLimitAsync, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { JSON_BODY_LIMITS, jsonBodyErrorResponse, readJsonBody } from "@/lib/request-json"
import { collectionPageSize, PRODUCT_LIMITS } from "@/lib/product-limits"

const tripIdQuerySchema = z.object({
    tripId: z.string().trim().min(1),
})

const publicFileUrlSchema = z.string().trim().url().max(2_048).refine((value) => {
    const protocol = new URL(value).protocol
    return protocol === "https:" || protocol === "http:"
}, "File URL must use http or https")

const memorySchema = z.object({
    tripId: z.string().trim().min(1),
    type: z.enum(["photo", "video", "note", "document"]),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(1_000).nullable().optional(),
    content: z.string().max(100_000).nullable().optional(),
    fileUrl: publicFileUrlSchema.nullable().optional(),
    thumbnailUrl: publicFileUrlSchema.nullable().optional(),
    // The UI sends an ISO string. Keep the date optional for compatibility with
    // older clients and use the creation time when one is not supplied.
    date: z.union([
        z.string().trim().min(1),
        z.date(),
    ]).pipe(z.coerce.date()).optional(),
    location: z.string().trim().max(500).nullable().optional(),
})

const tripAccessFilter = (tripId: string, userId: string) => ({
    id: tripId,
    OR: [
        { userId },
        { members: { some: { userId } } },
    ],
})

function databaseUnavailable() {
    return NextResponse.json(
        { error: "Database is not configured. Add DATABASE_URL to use memories." },
        { status: 503 },
    )
}

function invalidMemoryData(error: z.ZodError) {
    return NextResponse.json(
        { error: "Invalid memory data", issues: error.issues },
        { status: 400 },
    )
}

function serializeMemory<T extends { createdById?: string | null }>(memory: T) {
    const serialized = { ...memory }
    delete (serialized as { createdById?: unknown }).createdById
    return serialized
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const parsedQuery = tripIdQuerySchema.safeParse({
        tripId: searchParams.get("tripId"),
    })

    if (!parsedQuery.success) {
        return NextResponse.json({ error: "tripId is required" }, { status: 400 })
    }

    try {
        const currentUser = await getCurrentUser()
        if (!currentUser) return unauthorizedResponse()

        const prisma = getPrismaClient()
        if (!prisma) return databaseUnavailable()

        const trip = await prisma.trip.findFirst({
            where: tripAccessFilter(parsedQuery.data.tripId, currentUser.id),
            select: { id: true, userId: true },
        })

        if (!trip) {
            return NextResponse.json({ error: "Trip not found" }, { status: 404 })
        }

        const pageSize = collectionPageSize(searchParams.get("limit"))
        const memories = await prisma.memory.findMany({
            where: { tripId: trip.id },
            select: {
                id: true,
                tripId: true,
                type: true,
                title: true,
                description: true,
                content: true,
                fileUrl: true,
                thumbnailUrl: true,
                date: true,
                location: true,
                createdAt: true,
                updatedAt: true,
                createdById: true,
            },
            orderBy: [{ date: "desc" }, { createdAt: "desc" }],
            take: pageSize + 1,
        })

        const hasMore = memories.length > pageSize
        return NextResponse.json({
            memories: memories.slice(0, pageSize).map((memory) => ({
                ...serializeMemory(memory),
                canDelete: trip.userId === currentUser.id || memory.createdById === currentUser.id,
            })),
            hasMore,
        }, {
            headers: {
                "Cache-Control": "private, no-store",
                "X-Result-Limit": String(pageSize),
                "X-Has-More": String(hasMore),
            },
        })
    } catch (error) {
        console.error("[TRIP_MEMORIES_GET]", error)
        return NextResponse.json({ error: "Failed to load memories" }, { status: 500 })
    }
}

export async function POST(request: Request) {
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
        if (currentUser.isDemo) await ensureDemoUser(prisma)

        const json = await readJsonBody(request, JSON_BODY_LIMITS.memory)
        if (!json.ok) return jsonBodyErrorResponse(json)

        const parsed = memorySchema.safeParse(json.data)
        if (!parsed.success) return invalidMemoryData(parsed.error)

        const trip = await prisma.trip.findFirst({
            where: tripAccessFilter(parsed.data.tripId, currentUser.id),
            select: { id: true },
        })

        if (!trip) {
            return NextResponse.json({ error: "Trip not found" }, { status: 404 })
        }

        const memoryCount = await prisma.memory.count({
            where: { tripId: trip.id },
        })
        if (memoryCount >= PRODUCT_LIMITS.maxMemoriesPerTrip) {
            return NextResponse.json(
                { error: `A trip can contain up to ${PRODUCT_LIMITS.maxMemoriesPerTrip} memories.` },
                { status: 409 },
            )
        }

        const memory = await prisma.memory.create({
            data: {
                tripId: trip.id,
                type: parsed.data.type,
                title: parsed.data.title,
                description: parsed.data.description ?? null,
                content: parsed.data.content ?? null,
                fileUrl: parsed.data.fileUrl ?? null,
                thumbnailUrl: parsed.data.thumbnailUrl ?? null,
                date: parsed.data.date ?? new Date(),
                location: parsed.data.location ?? null,
                createdById: currentUser.id,
            },
        })

        return NextResponse.json({ ...serializeMemory(memory), canDelete: true }, { status: 201 })
    } catch (error) {
        console.error("[TRIP_MEMORIES_POST]", error)
        return NextResponse.json({ error: "Failed to create memory" }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url)
    const parsedQuery = z.object({ id: z.string().trim().min(1) }).safeParse({
        id: searchParams.get("id"),
    })

    if (!parsedQuery.success) {
        return NextResponse.json({ error: "id is required" }, { status: 400 })
    }

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

        // Filter through the trip relation so a memory is never deleted unless
        // its trip is owned by, or shared with, the current user.
        const memory = await prisma.memory.findFirst({
            where: {
                id: parsedQuery.data.id,
                trip: {
                    OR: [
                        { userId: currentUser.id },
                        { members: { some: { userId: currentUser.id } } },
                    ],
                },
            },
            select: {
                id: true,
                createdById: true,
                trip: { select: { userId: true } },
            },
        })

        if (!memory) {
            return NextResponse.json({ error: "Memory not found" }, { status: 404 })
        }

        const canDelete = memory.trip.userId === currentUser.id
            || memory.createdById === currentUser.id
        if (!canDelete) {
            return NextResponse.json({ error: "Memory not found" }, { status: 404 })
        }

        await prisma.memory.delete({ where: { id: memory.id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("[TRIP_MEMORIES_DELETE]", error)
        return NextResponse.json({ error: "Failed to delete memory" }, { status: 500 })
    }
}
