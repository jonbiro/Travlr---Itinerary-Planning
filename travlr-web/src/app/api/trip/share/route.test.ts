import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
    getCurrentUser: vi.fn(),
    getPrismaClient: vi.fn(),
    ensureDemoUser: vi.fn(),
    consumeRateLimitAsync: vi.fn(),
}))

vi.mock("@/lib/current-user", () => ({
    getCurrentUser: mocks.getCurrentUser,
    unauthorizedResponse: () => Response.json({ error: "Authentication required" }, { status: 401 }),
}))

vi.mock("@/lib/prisma", () => ({
    getPrismaClient: mocks.getPrismaClient,
    ensureDemoUser: mocks.ensureDemoUser,
}))

vi.mock("@/lib/rate-limit", () => ({
    RATE_LIMITS: {
        shareTrip: { limit: 20, windowMs: 600_000 },
    },
    consumeRateLimitAsync: mocks.consumeRateLimitAsync,
    rateLimitResponse: (result: { retryAfterSeconds: number }) => Response.json(
        { error: "Too many requests", retryAfterSeconds: result.retryAfterSeconds },
        { status: 429 },
    ),
}))

import { DELETE, GET, POST } from "./route"

function makePrisma() {
    const transactionClient = {
        $queryRaw: vi.fn().mockResolvedValue([{ id: "trip-1" }]),
        user: {
            findFirst: vi.fn().mockResolvedValue(null),
        },
        tripUser: {
            findUnique: vi.fn().mockResolvedValue(null),
            count: vi.fn().mockResolvedValue(0),
            create: vi.fn().mockResolvedValue({ id: "member-1" }),
        },
    }

    const prisma = {
        $transaction: vi.fn(async (callback: (client: typeof transactionClient) => unknown) => callback(transactionClient)),
        trip: { findFirst: vi.fn() },
        tripUser: {
            deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
            findFirst: vi.fn(),
            findUnique: vi.fn(),
        },
    }

    return { prisma, transactionClient }
}

function request(url: string, init?: RequestInit) {
    return new Request(`http://localhost${url}`, init)
}

function jsonRequest(body: unknown) {
    return request("/api/trip/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    })
}

describe("trip sharing API", () => {
    let prisma: ReturnType<typeof makePrisma>["prisma"]
    let transactionClient: ReturnType<typeof makePrisma>["transactionClient"]

    beforeEach(() => {
        ({ prisma, transactionClient } = makePrisma())
        mocks.getCurrentUser.mockResolvedValue({ id: "owner-1", email: "owner@example.com", isDemo: false })
        mocks.getPrismaClient.mockReturnValue(prisma)
        mocks.ensureDemoUser.mockResolvedValue(undefined)
        mocks.consumeRateLimitAsync.mockResolvedValue({
            allowed: true,
            limit: 20,
            remaining: 19,
            resetAt: Date.now() + 600_000,
            retryAfterSeconds: 600,
        })
        vi.clearAllMocks()
    })

    it("returns an owner-only, sorted member list without caching it", async () => {
        prisma.trip.findFirst.mockResolvedValue({
            members: [
                { id: "member-z", user: { name: "Zoe", email: "zoe@example.com", image: null } },
                { id: "member-a", user: { name: "Ari", email: "ari@example.com", image: "https://example.com/ari.png" } },
            ],
        })

        const response = await GET(request("/api/trip/share?tripId=trip-1"))

        expect(response.status).toBe(200)
        expect(response.headers.get("cache-control")).toBe("private, no-store")
        await expect(response.json()).resolves.toEqual({
            members: [
                { id: "member-a", name: "Ari", email: "ari@example.com", image: "https://example.com/ari.png" },
                { id: "member-z", name: "Zoe", email: "zoe@example.com", image: null },
            ],
            maxMembersPerTrip: 25,
        })
        expect(prisma.trip.findFirst).toHaveBeenCalledWith({
            where: { id: "trip-1", userId: "owner-1" },
            select: {
                members: {
                    select: {
                        id: true,
                        user: { select: { name: true, email: true, image: true } },
                    },
                },
            },
        })
    })

    it("does not expose the member list to a shared member", async () => {
        mocks.getCurrentUser.mockResolvedValue({ id: "member-1", email: "member@example.com", isDemo: false })
        prisma.trip.findFirst.mockResolvedValue(null)

        const response = await GET(request("/api/trip/share?tripId=trip-1"))

        expect(response.status).toBe(404)
        expect(response.headers.get("cache-control")).toBe("private, no-store")
        await expect(response.text()).resolves.toBe("Trip not found")
    })

    it("keeps unknown-account and owner invites enumeration-safe", async () => {
        prisma.trip.findFirst.mockResolvedValue({ id: "trip-1", userId: "owner-1" })
        transactionClient.user.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "owner-1" })

        const unknownResponse = await POST(jsonRequest({ tripId: " trip-1 ", email: "unknown@example.com" }))
        const ownerResponse = await POST(jsonRequest({ tripId: "trip-1", email: "owner@example.com" }))

        expect(unknownResponse.status).toBe(202)
        expect(ownerResponse.status).toBe(202)
        expect(unknownResponse.headers.get("cache-control")).toBe("private, no-store")
        await expect(unknownResponse.json()).resolves.toEqual(await ownerResponse.json())
        expect(transactionClient.tripUser.create).not.toHaveBeenCalled()
    })

    it("enforces the member cap while serializing concurrent invites on the trip row", async () => {
        prisma.trip.findFirst.mockResolvedValue({ id: "trip-1", userId: "owner-1" })
        transactionClient.tripUser.count.mockResolvedValue(25)

        const response = await POST(jsonRequest({ tripId: "trip-1", email: "member26@example.com" }))

        expect(response.status).toBe(409)
        expect(response.headers.get("cache-control")).toBe("private, no-store")
        await expect(response.json()).resolves.toEqual({
            error: "A trip can have up to 25 members.",
        })
        expect(transactionClient.$queryRaw).toHaveBeenCalledTimes(1)
        expect(transactionClient.user.findFirst).not.toHaveBeenCalled()
        expect(transactionClient.tripUser.create).not.toHaveBeenCalled()
    })

    it("creates an eligible member while holding the trip lock", async () => {
        prisma.trip.findFirst.mockResolvedValue({ id: "trip-1", userId: "owner-1" })
        transactionClient.user.findFirst.mockResolvedValue({ id: "member-1" })
        transactionClient.tripUser.count.mockResolvedValue(24)

        const response = await POST(jsonRequest({ tripId: "trip-1", email: "member@example.com" }))

        expect(response.status).toBe(202)
        expect(transactionClient.$queryRaw).toHaveBeenCalledTimes(1)
        expect(transactionClient.tripUser.create).toHaveBeenCalledWith({
            data: { tripId: "trip-1", userId: "member-1" },
        })
    })

    it("allows an existing member invite without consuming member capacity", async () => {
        prisma.trip.findFirst.mockResolvedValue({ id: "trip-1", userId: "owner-1" })
        transactionClient.user.findFirst.mockResolvedValue({ id: "member-1" })
        transactionClient.tripUser.findUnique.mockResolvedValue({ id: "member-1" })
        transactionClient.tripUser.count.mockResolvedValue(24)

        const response = await POST(jsonRequest({ tripId: "trip-1", email: "member@example.com" }))

        expect(response.status).toBe(202)
        expect(transactionClient.tripUser.create).not.toHaveBeenCalled()
    })

    it("lets the owner revoke a membership without crossing trip boundaries", async () => {
        prisma.trip.findFirst.mockResolvedValue({ id: "trip-1", userId: "owner-1" })

        const response = await DELETE(request("/api/trip/share?tripId=trip-1&memberId=member-1"))

        expect(response.status).toBe(200)
        expect(response.headers.get("cache-control")).toBe("private, no-store")
        await expect(response.json()).resolves.toEqual({ success: true })
        expect(prisma.tripUser.deleteMany).toHaveBeenCalledWith({
            where: { id: "member-1", tripId: "trip-1" },
        })
    })

    it("lets a member leave only their own trip membership", async () => {
        mocks.getCurrentUser.mockResolvedValue({ id: "member-1", email: "member@example.com", isDemo: false })
        prisma.trip.findFirst.mockResolvedValue({ id: "trip-1", userId: "owner-1" })
        prisma.tripUser.findUnique.mockResolvedValue({ id: "membership-1" })

        const response = await DELETE(request("/api/trip/share?tripId=trip-1"))

        expect(response.status).toBe(200)
        expect(response.headers.get("cache-control")).toBe("private, no-store")
        expect(prisma.tripUser.deleteMany).toHaveBeenCalledWith({
            where: { id: "membership-1", tripId: "trip-1", userId: "member-1" },
        })
    })

    it("does not let a member remove another member", async () => {
        mocks.getCurrentUser.mockResolvedValue({ id: "member-1", email: "member@example.com", isDemo: false })
        prisma.trip.findFirst.mockResolvedValue({ id: "trip-1", userId: "owner-1" })
        prisma.tripUser.findFirst.mockResolvedValue(null)

        const response = await DELETE(request("/api/trip/share?tripId=trip-1&memberId=member-2"))

        expect(response.status).toBe(404)
        expect(response.headers.get("cache-control")).toBe("private, no-store")
        expect(prisma.tripUser.deleteMany).not.toHaveBeenCalled()
    })

    it("does not let the owner leave without specifying a member to revoke", async () => {
        prisma.trip.findFirst.mockResolvedValue({ id: "trip-1", userId: "owner-1" })

        const response = await DELETE(request("/api/trip/share?tripId=trip-1"))

        expect(response.status).toBe(409)
        expect(response.headers.get("cache-control")).toBe("private, no-store")
        expect(prisma.tripUser.deleteMany).not.toHaveBeenCalled()
    })
})
