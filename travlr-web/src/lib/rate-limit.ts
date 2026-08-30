/**
 * Rate limiting for expensive routes.
 *
 * API routes use consumeRateLimitAsync, which stores buckets in Postgres when
 * a database client is available. The synchronous consumeRateLimit function
 * remains as a deterministic in-memory fallback for local development and
 * unit tests where no database exists.
 */

import { Prisma } from "@prisma/client"
import type { PrismaClient } from "@prisma/client"

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
    shareTrip: { limit: 20, windowMs: 10 * 60 * 1_000 },
    mutation: { limit: 120, windowMs: 10 * 60 * 1_000 },
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

type DurableRateLimitRow = {
    count: number
    limit: number
    resetAt: Date
    windowMs: number
}

async function pruneDurableBuckets(prisma: PrismaClient, now: number) {
    // Keep cleanup probabilistic and capped so the hot path does not turn
    // into a table sweep when an installation has accumulated old accounts.
    if (Math.random() >= 0.01 || typeof prisma.$executeRaw !== "function") return

    try {
        await prisma.$executeRaw(Prisma.sql`
            DELETE FROM "RateLimitBucket"
            WHERE "key" IN (
                SELECT "key"
                FROM "RateLimitBucket"
                WHERE "resetAt" <= to_timestamp(${now} / 1000.0)
                ORDER BY "resetAt" ASC
                LIMIT 500
            )
        `)
    } catch (error) {
        // Cleanup is maintenance only. A cleanup failure must not affect the
        // decision made by the atomic bucket update above.
        if (process.env.NODE_ENV !== "test") {
            console.warn("[RATE_LIMIT] Unable to prune expired durable buckets", error)
        }
    }
}

function resultFromDurableBucket(row: DurableRateLimitRow, now: number): RateLimitResult {
    const resetAt = row.resetAt instanceof Date
        ? row.resetAt.getTime()
        : new Date(row.resetAt).getTime()
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1_000))

    return {
        allowed: row.count <= row.limit,
        limit: row.limit,
        remaining: Math.max(0, row.limit - row.count),
        resetAt,
        retryAfterSeconds,
    }
}

/**
 * Atomically consume a bucket shared by all application instances.
 *
 * The INSERT ... ON CONFLICT statement increments an existing window in one
 * database operation, so concurrent requests cannot both observe the same
 * count. If a deployment has not applied the durable limiter migration yet,
 * the route remains protected by the bounded process-local fallback instead
 * of failing open.
 */
export async function consumeRateLimitAsync(
    key: string,
    config: RateLimitConfig,
    prisma: PrismaClient | null | undefined,
    now = Date.now(),
): Promise<RateLimitResult> {
    validateConfig(config)

    if (!prisma) return consumeRateLimit(key, config, now)

    try {
        const rows = await prisma.$queryRaw<DurableRateLimitRow[]>(Prisma.sql`
            INSERT INTO "RateLimitBucket" ("key", "count", "limit", "resetAt", "windowMs", "createdAt", "updatedAt")
            VALUES (
                ${key},
                1,
                ${config.limit},
                to_timestamp(${now} / 1000.0) + (${config.windowMs} * interval '1 millisecond'),
                ${config.windowMs},
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT ("key") DO UPDATE
            SET
                "count" = CASE
                    WHEN "RateLimitBucket"."resetAt" <= to_timestamp(${now} / 1000.0)
                        OR "RateLimitBucket"."limit" <> ${config.limit}
                        OR "RateLimitBucket"."windowMs" <> ${config.windowMs}
                    THEN 1
                    ELSE "RateLimitBucket"."count" + 1
                END,
                "limit" = ${config.limit},
                "resetAt" = CASE
                    WHEN "RateLimitBucket"."resetAt" <= to_timestamp(${now} / 1000.0)
                        OR "RateLimitBucket"."limit" <> ${config.limit}
                        OR "RateLimitBucket"."windowMs" <> ${config.windowMs}
                    THEN to_timestamp(${now} / 1000.0) + (${config.windowMs} * interval '1 millisecond')
                    ELSE "RateLimitBucket"."resetAt"
                END,
                "windowMs" = ${config.windowMs},
                "updatedAt" = CURRENT_TIMESTAMP
            RETURNING "count", "limit", "resetAt", "windowMs"
        `)

        const row = rows[0]
        if (!row || !Number.isFinite(row.count) || !(row.resetAt instanceof Date)) {
            throw new Error("Durable rate-limit bucket returned an invalid row")
        }

        const result = resultFromDurableBucket(row, now)
        await pruneDurableBuckets(prisma, now)
        return result
    } catch (error) {
        // Missing migrations, a temporarily unavailable database, or a test
        // double that does not implement $queryRaw should never make an
        // expensive endpoint fail open. The bounded fallback still protects
        // the current process while the deployment is repaired.
        if (process.env.NODE_ENV !== "test") {
            console.warn("[RATE_LIMIT] Durable bucket unavailable; using local fallback", error)
        }
        return consumeRateLimit(key, config, now)
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
