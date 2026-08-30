/**
 * Product-level guardrails shared by API routes and persistence helpers.
 *
 * These limits intentionally live outside individual routes so an alternate
 * client cannot quietly bypass the same safety budget that the UI follows.
 */
export const PRODUCT_LIMITS = {
    maxTripsPerUser: 100,
    maxTripDays: 60,
    maxActivitiesPerDay: 20,
    maxActivitiesPerTrip: 500,
    maxMemoriesPerTrip: 500,
    maxExpensesPerTrip: 1_000,
    maxTripList: 100,
    maxCollectionPage: 100,
    defaultCollectionPage: 100,
    maxChatMessages: 50,
    maxChatPartsPerMessage: 20,
    maxChatTextPerPart: 6_000,
    maxChatTextTotal: 40_000,
    maxChatNonTextPart: 20_000,
    maxChatPartPayload: 100_000,
} as const

export function inclusiveUtcDayCount(startDate: Date, endDate: Date) {
    const start = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate())
    const end = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate())

    return Math.floor((end - start) / 86_400_000) + 1
}

export function collectionPageSize(value: string | null | undefined) {
    if (!value) return PRODUCT_LIMITS.defaultCollectionPage

    const parsed = Number.parseInt(value, 10)
    if (!Number.isInteger(parsed)) return PRODUCT_LIMITS.defaultCollectionPage

    return Math.min(
        PRODUCT_LIMITS.maxCollectionPage,
        Math.max(1, parsed),
    )
}

export function slugForFilename(value: string | null | undefined, fallback = "trip") {
    const slug = value
        ?.normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase()

    return (slug || fallback).slice(0, 100)
}
