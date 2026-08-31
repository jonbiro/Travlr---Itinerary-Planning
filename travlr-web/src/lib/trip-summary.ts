export type TripSummaryPayload = {
    id: string
    isOwner: boolean
    name: string
    destination: string | null
    startDate: string | null
    endDate: string | null
    budget: string | number | null
    currency: string
    dayCount: number
}

function asString(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value : null
}

function asNonNegativeInteger(value: unknown): number | null {
    return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null
}

/**
 * Normalize the intentionally small payload returned by the trip-library
 * summary view. The legacy `days` fallback keeps older cached responses
 * readable while new requests use the server-computed `dayCount`.
 */
export function normalizeTripSummary(value: unknown): TripSummaryPayload | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null

    const record = value as Record<string, unknown>
    const id = asString(record.id)
    if (!id) return null

    const budget = typeof record.budget === "string" || typeof record.budget === "number"
        ? record.budget
        : null
    const dayCount = asNonNegativeInteger(record.dayCount)
        ?? (Array.isArray(record.days) ? record.days.length : 0)

    return {
        id,
        isOwner: record.isOwner === true,
        name: asString(record.name) ?? asString(record.tripName) ?? "Untitled trip",
        destination: asString(record.destination),
        startDate: asString(record.startDate),
        endDate: asString(record.endDate),
        budget,
        currency: asString(record.currency) ?? "USD",
        dayCount,
    }
}
