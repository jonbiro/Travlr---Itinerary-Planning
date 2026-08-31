import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
    clearRateLimitStore,
    consumeRateLimit,
    consumeRateLimitAsync,
    rateLimitResponse,
} from "./rate-limit"

describe("consumeRateLimit", () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-08-30T12:00:00.000Z"))
        clearRateLimitStore()
    })

    afterEach(() => {
        clearRateLimitStore()
        vi.unstubAllEnvs()
        vi.useRealTimers()
    })

    it("allows the configured number of requests, then returns a retry window", () => {
        const config = { limit: 2, windowMs: 60_000 }

        expect(consumeRateLimit("user-1", config)).toMatchObject({
            allowed: true,
            remaining: 1,
            retryAfterSeconds: 60,
        })
        expect(consumeRateLimit("user-1", config)).toMatchObject({
            allowed: true,
            remaining: 0,
        })

        const blocked = consumeRateLimit("user-1", config)
        expect(blocked).toMatchObject({
            allowed: false,
            limit: 2,
            remaining: 0,
            retryAfterSeconds: 60,
        })
    })

    it("isolates users and opens a new window after expiry", () => {
        const config = { limit: 1, windowMs: 10_000 }

        expect(consumeRateLimit("user-1", config).allowed).toBe(true)
        expect(consumeRateLimit("user-1", config).allowed).toBe(false)
        expect(consumeRateLimit("user-2", config).allowed).toBe(true)

        vi.advanceTimersByTime(10_001)
        expect(consumeRateLimit("user-1", config)).toMatchObject({
            allowed: true,
            remaining: 0,
            retryAfterSeconds: 10,
        })
    })

    it("returns a structured 429 response with retry headers", async () => {
        const result = consumeRateLimit("user-1", { limit: 1, windowMs: 30_000 })
        const blocked = consumeRateLimit("user-1", { limit: 1, windowMs: 30_000 })
        expect(result.allowed).toBe(true)

        const response = rateLimitResponse(blocked)
        expect(response.status).toBe(429)
        expect(response.headers.get("Retry-After")).toBe("30")
        expect(response.headers.get("X-RateLimit-Remaining")).toBe("0")
        await expect(response.json()).resolves.toMatchObject({
            code: "RATE_LIMITED",
            retryAfterSeconds: 30,
        })
    })

    it("uses an atomic durable bucket when a Prisma client is available", async () => {
        const queryRaw = vi.fn().mockResolvedValue([{
            count: 2,
            limit: 2,
            resetAt: new Date("2026-08-30T12:01:00.000Z"),
            windowMs: 60_000,
        }])

        const result = await consumeRateLimitAsync(
            "chat:user-1",
            { limit: 2, windowMs: 60_000 },
            { $queryRaw: queryRaw } as never,
        )

        expect(result).toMatchObject({
            allowed: true,
            remaining: 0,
            resetAt: new Date("2026-08-30T12:01:00.000Z").getTime(),
        })
        expect(queryRaw).toHaveBeenCalledTimes(1)
    })

    it("falls back to bounded local state if the durable bucket is unavailable", async () => {
        const queryRaw = vi.fn().mockRejectedValue(new Error("database unavailable"))

        const first = await consumeRateLimitAsync(
            "chat:user-1",
            { limit: 1, windowMs: 60_000 },
            { $queryRaw: queryRaw } as never,
        )
        const second = await consumeRateLimitAsync(
            "chat:user-1",
            { limit: 1, windowMs: 60_000 },
            { $queryRaw: queryRaw } as never,
        )

        expect(first.allowed).toBe(true)
        expect(second.allowed).toBe(false)
    })

    it("fails closed when the durable production bucket is unavailable", async () => {
        vi.stubEnv("NODE_ENV", "production")
        const queryRaw = vi.fn().mockRejectedValue(new Error("database unavailable"))

        const result = await consumeRateLimitAsync(
            "generate:user-1",
            { limit: 5, windowMs: 60_000 },
            { $queryRaw: queryRaw } as never,
        )

        expect(result).toMatchObject({
            allowed: false,
            unavailable: true,
            limit: 5,
            remaining: 0,
            retryAfterSeconds: 60,
        })

        const response = rateLimitResponse(result)
        expect(response.status).toBe(503)
        await expect(response.json()).resolves.toMatchObject({
            code: "RATE_LIMIT_UNAVAILABLE",
            retryAfterSeconds: 60,
        })
    })

    it("fails closed in production when no durable limiter client exists", async () => {
        vi.stubEnv("NODE_ENV", "production")

        const result = await consumeRateLimitAsync(
            "weather:user-1",
            { limit: 60, windowMs: 60_000 },
            null,
        )

        expect(result).toMatchObject({
            allowed: false,
            unavailable: true,
            remaining: 0,
        })
        expect(rateLimitResponse(result).status).toBe(503)
    })
})
