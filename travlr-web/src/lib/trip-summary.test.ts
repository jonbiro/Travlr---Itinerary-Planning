import { describe, expect, it } from "vitest"

import { normalizeTripSummary } from "./trip-summary"

describe("normalizeTripSummary", () => {
    it("uses the server-computed day count without requiring itinerary days", () => {
        expect(normalizeTripSummary({
            id: "trip-1",
            name: "Lisbon",
            destination: "Lisbon, Portugal",
            dayCount: 4,
            isOwner: false,
        })).toEqual({
            id: "trip-1",
            name: "Lisbon",
            destination: "Lisbon, Portugal",
            startDate: null,
            endDate: null,
            budget: null,
            currency: "USD",
            dayCount: 4,
            isOwner: false,
        })
    })

    it("rejects records without an id", () => {
        expect(normalizeTripSummary({ dayCount: 2 })).toBeNull()
    })
})
