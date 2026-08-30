import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
    clearRateLimitStore,
    consumeRateLimit,
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
})
