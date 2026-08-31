export type TripStatsAggregate = {
    totalTrips: number
    totalDestinations: number
    totalDaysPlanned: number
    totalActivities: number
    topDestinations: { name: string; tripCount: number }[]
}

export type TripDestinationCount = {
    destination: string | null
    tripCount: number
}

function normalizeDestination(value: string | null): string | null {
    if (typeof value !== "string") return null

    const normalized = value.trim().replace(/\s+/g, " ")
    return normalized.length > 0 ? normalized : null
}

/**
 * Build the stats response from database aggregates. The API only needs
 * destination groups and scalar day/activity counts; it never needs to load
 * itinerary records or activity descriptions for this view.
 */
export function buildTripStatsAggregate(input: {
    totalTrips: number
    destinationGroups: readonly TripDestinationCount[]
    totalDaysPlanned: number
    totalActivities: number
}): TripStatsAggregate {
    const destinations = new Map<string, { name: string; tripCount: number }>()

    for (const group of input.destinationGroups) {
        const name = normalizeDestination(group.destination)
        if (!name) continue

        const key = name.toLocaleLowerCase()
        const existing = destinations.get(key)
        if (existing) {
            existing.tripCount += group.tripCount
        } else {
            destinations.set(key, { name, tripCount: group.tripCount })
        }
    }

    return {
        totalTrips: input.totalTrips,
        totalDestinations: destinations.size,
        totalDaysPlanned: input.totalDaysPlanned,
        totalActivities: input.totalActivities,
        topDestinations: Array.from(destinations.values())
            .sort((a, b) => b.tripCount - a.tripCount || a.name.localeCompare(b.name))
            .slice(0, 5),
    }
}
