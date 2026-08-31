import { describe, expect, it } from "vitest"

import { buildTripStatsAggregate } from "./trip-stats"

describe("buildTripStatsAggregate", () => {
    it("collapses equivalent destination labels while retaining database counts", () => {
        expect(buildTripStatsAggregate({
            totalTrips: 3,
            destinationGroups: [
                { destination: "Paris, France", tripCount: 1 },
                { destination: " paris,   france ", tripCount: 1 },
                { destination: "Tokyo, Japan", tripCount: 1 },
                { destination: null, tripCount: 2 },
            ],
            totalDaysPlanned: 3,
            totalActivities: 4,
        })).toEqual({
            totalTrips: 3,
            totalDestinations: 2,
            totalDaysPlanned: 3,
            totalActivities: 4,
            topDestinations: [
                { name: "Paris, France", tripCount: 2 },
                { name: "Tokyo, Japan", tripCount: 1 },
            ],
        })
    })
})
