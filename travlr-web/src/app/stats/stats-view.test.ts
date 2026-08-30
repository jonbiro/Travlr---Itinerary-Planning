import { describe, expect, it } from "vitest"

import { deriveTravelStats, normalizeTrips } from "./stats-view"

describe("travel stats data", () => {
    it("derives metrics from trip itineraries", () => {
        const trips = normalizeTrips([
            {
                destination: "Paris, France",
                days: [
                    { activities: [{ name: "Museum" }, { name: "Dinner" }] },
                    { activities: [{ name: "Walk" }] },
                ],
            },
            {
                destination: " paris,   france ",
                days: [{ activities: [{ name: "Market" }] }],
            },
            {
                destination: "Tokyo, Japan",
                days: [],
            },
        ])

        expect(deriveTravelStats(trips)).toEqual({
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

    it("rejects a response that is not a trips array", () => {
        expect(() => normalizeTrips({ trips: [] })).toThrow("We couldn’t read your trips right now.")
    })

    it("ignores malformed trip records without dropping valid empty itineraries", () => {
        const trips = normalizeTrips([
            {},
            {
                destination: "Tokyo, Japan",
                days: [],
            },
        ])

        expect(trips).toEqual([
            {
                destination: "Tokyo, Japan",
                dayCount: 0,
                activityCount: 0,
            },
        ])
        expect(deriveTravelStats(trips).totalTrips).toBe(1)
    })
})
