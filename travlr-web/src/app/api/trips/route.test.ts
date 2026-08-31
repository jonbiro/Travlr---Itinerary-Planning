import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
    getCurrentUser: vi.fn(),
    getPrismaClient: vi.fn(),
    ensureDemoUser: vi.fn(),
    consumeRateLimitAsync: vi.fn(),
}))

vi.mock("@/lib/current-user", () => ({
    getCurrentUser: mocks.getCurrentUser,
    unauthorizedResponse: () => Response.json(
        { error: "Authentication required" },
        { status: 401 },
    ),
}))

vi.mock("@/lib/prisma", () => ({
    getPrismaClient: mocks.getPrismaClient,
    ensureDemoUser: mocks.ensureDemoUser,
}))

vi.mock("@/lib/rate-limit", () => ({
    RATE_LIMITS: {
        mutation: { limit: 20, windowMs: 600_000 },
    },
    consumeRateLimitAsync: mocks.consumeRateLimitAsync,
    rateLimitResponse: (result: { retryAfterSeconds: number }) => Response.json(
        { error: "Too many requests", retryAfterSeconds: result.retryAfterSeconds },
        { status: 429 },
    ),
}))

import { POST } from "./route"
import { PRODUCT_LIMITS } from "@/lib/product-limits"

const MAX_TRIPS_PER_USER = PRODUCT_LIMITS.maxTripsPerUser

function makePrisma() {
    const transactionClient = {
        $queryRaw: vi.fn().mockResolvedValue([{ id: "owner-1" }]),
        trip: {
            count: vi.fn().mockResolvedValue(0),
            create: vi.fn().mockResolvedValue({
                id: "trip-1",
                name: "Lisbon escape",
                destination: "Lisbon",
                userId: "owner-1",
            }),
        },
    }

    const prisma = {
        $transaction: vi.fn(async (
            callback: (client: typeof transactionClient) => unknown,
        ) => callback(transactionClient)),
    }

    return { prisma, transactionClient }
}

function jsonRequest(body: unknown) {
    return new Request("http://localhost/api/trips", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    })
}

function assertOwnerLock(lockQuery: unknown) {
    const query = lockQuery as { strings?: string[]; values?: unknown[] }

    expect(query.strings?.join("")).toContain('SELECT "id" FROM "User"')
    expect(query.strings?.join("")).toContain("FOR UPDATE")
    expect(query.values).toEqual(["owner-1"])
}

describe("POST /api/trips", () => {
    let prisma: ReturnType<typeof makePrisma>["prisma"]
    let transactionClient: ReturnType<typeof makePrisma>["transactionClient"]

    beforeEach(() => {
        vi.clearAllMocks()
        ;({ prisma, transactionClient } = makePrisma())
        mocks.getCurrentUser.mockResolvedValue({
            id: "owner-1",
            email: "owner@example.com",
            isDemo: false,
        })
        mocks.getPrismaClient.mockReturnValue(prisma)
        mocks.ensureDemoUser.mockResolvedValue(undefined)
        mocks.consumeRateLimitAsync.mockResolvedValue({
            allowed: true,
            limit: 20,
            remaining: 19,
            resetAt: Date.now() + 600_000,
            retryAfterSeconds: 600,
        })
    })

    it("locks the owner row before counting and serializes ownership without userId", async () => {
        transactionClient.trip.count.mockResolvedValue(MAX_TRIPS_PER_USER - 1)

        const response = await POST(jsonRequest({
            name: "Lisbon escape",
            destination: "Lisbon",
            startDate: "2026-09-10",
            endDate: "2026-09-12",
        }))

        expect(response.status).toBe(201)
        expect(response.headers.get("cache-control")).toBe("private, no-store")
        const body = await response.json()
        expect(body).toEqual({
            id: "trip-1",
            name: "Lisbon escape",
            destination: "Lisbon",
            isOwner: true,
        })
        expect(body).not.toHaveProperty("userId")

        expect(transactionClient.$queryRaw).toHaveBeenCalledTimes(1)
        assertOwnerLock(transactionClient.$queryRaw.mock.calls[0][0])
        expect(transactionClient.$queryRaw.mock.invocationCallOrder[0])
            .toBeLessThan(transactionClient.trip.count.mock.invocationCallOrder[0])
        expect(transactionClient.trip.create).toHaveBeenCalledTimes(1)
    })

    it("returns 409 at the per-user trip cap without creating another trip", async () => {
        transactionClient.trip.count.mockResolvedValue(MAX_TRIPS_PER_USER)

        const response = await POST(jsonRequest({
            name: "One trip too many",
        }))

        expect(response.status).toBe(409)
        expect(response.headers.get("cache-control")).toBe("private, no-store")
        await expect(response.json()).resolves.toEqual({
            error: `You can save up to ${MAX_TRIPS_PER_USER} trips.`,
        })
        expect(transactionClient.$queryRaw).toHaveBeenCalledTimes(1)
        assertOwnerLock(transactionClient.$queryRaw.mock.calls[0][0])
        expect(transactionClient.trip.count).toHaveBeenCalledWith({ where: { userId: "owner-1" } })
        expect(transactionClient.trip.create).not.toHaveBeenCalled()
    })
})
