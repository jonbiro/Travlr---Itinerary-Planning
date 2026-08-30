/**
 * A small, best-effort in-memory rate limiter for expensive API routes.
 *
 * This intentionally lives in the application process so it has no external
 * dependency. It protects a single instance from accidental or opportunistic
 * bursts; deploys with multiple instances must replace this with a shared
 * provider (for example, Redis or the host's rate-limit service) to enforce a
 * limit across the whole application.
 */

export type RateLimitConfig = {
    limit: number
    windowMs: number
}

export type RateLimitResult = {
    allowed: boolean
    limit: number
    remaining: number
    resetAt: number
    retryAfterSeconds: number
}

type RateLimitBucket = {
    count: number
    limit: number
    resetAt: number
    windowMs: number
}

const MAX_BUCKETS = 10_000
const CLEANUP_INTERVAL_MS = 60_000

const buckets = new Map<string, RateLimitBucket>()
let lastCleanupAt = 0

export const RATE_LIMITS = {
    chat: { limit: 30, windowMs: 10 * 60 * 1_000 },
    generate: { limit: 5, windowMs: 10 * 60 * 1_000 },
    packingList: { limit: 20, windowMs: 10 * 60 * 1_000 },
    weather: { limit: 60, windowMs: 10 * 60 * 1_000 },
} satisfies Record<string, RateLimitConfig>

function validateConfig(config: RateLimitConfig) {
    if (
        !Number.isInteger(config.limit)
        || config.limit < 1
        || !Number.isFinite(config.windowMs)
        || config.windowMs < 1
    ) {
        throw new Error("Invalid rate-limit configuration")
    }
}

function cleanupBuckets(now: number) {
    if (
        buckets.size <= MAX_BUCKETS
        && now - lastCleanupAt < CLEANUP_INTERVAL_MS
    ) {
        return
    }

    lastCleanupAt = now

    for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key)
    }

    // Keep memory bounded even if many distinct authenticated users arrive
    // before any existing window expires. Evict the buckets that will expire
    // first; they carry the least remaining state.
    if (buckets.size > MAX_BUCKETS) {
        const oldestBuckets = [...buckets.entries()]
            .sort(([, first], [, second]) => first.resetAt - second.resetAt)
        const excess = buckets.size - MAX_BUCKETS

        for (let index = 0; index < excess; index += 1) {
            buckets.delete(oldestBuckets[index][0])
        }
    }
}

export function consumeRateLimit(
    key: string,
    config: RateLimitConfig,
    now = Date.now(),
): RateLimitResult {
    validateConfig(config)
    cleanupBuckets(now)

    const existing = buckets.get(key)
    const bucket = (
        !existing
        || existing.resetAt <= now
        || existing.limit !== config.limit
        || existing.windowMs !== config.windowMs
    )
        ? {
            count: 0,
            limit: config.limit,
            resetAt: now + config.windowMs,
            windowMs: config.windowMs,
        }
        : existing

    bucket.count += 1
    buckets.set(key, bucket)
    if (buckets.size > MAX_BUCKETS) cleanupBuckets(now)

    const remaining = Math.max(0, bucket.limit - bucket.count)
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000))

    return {
        allowed: bucket.count <= bucket.limit,
        limit: bucket.limit,
        remaining,
        resetAt: bucket.resetAt,
        retryAfterSeconds,
    }
}

export function rateLimitResponse(result: RateLimitResult) {
    return Response.json(
        {
            error: "Too many requests. Please try again later.",
            code: "RATE_LIMITED",
            retryAfterSeconds: result.retryAfterSeconds,
        },
        {
            status: 429,
            headers: {
                "Cache-Control": "no-store",
                "Retry-After": String(result.retryAfterSeconds),
                "X-RateLimit-Limit": String(result.limit),
                "X-RateLimit-Remaining": String(result.remaining),
                "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1_000)),
            },
        },
    )
}

/** Clear limiter state between unit tests. */
export function clearRateLimitStore() {
    buckets.clear()
    lastCleanupAt = 0
}
