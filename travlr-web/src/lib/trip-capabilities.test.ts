import { describe, expect, it } from "vitest"

import {
    serializeTripSummaryWithOwnerCapability,
    serializeTripWithOwnerCapability,
} from "./trip-capabilities"

describe("serializeTripWithOwnerCapability", () => {
    const trip = {
        id: "trip-1",
        name: "Lisbon",
        userId: "owner-1",
    }

    it("marks the current user's trip as owned without exposing the owner id", () => {
        expect(serializeTripWithOwnerCapability(trip, "owner-1")).toEqual({
            id: "trip-1",
            name: "Lisbon",
            isOwner: true,
        })
    })

    it("marks a shared trip as read-only without exposing the owner id", () => {
        const visibleTrip = serializeTripWithOwnerCapability(trip, "member-1")

        expect(visibleTrip.isOwner).toBe(false)
        expect(visibleTrip).not.toHaveProperty("userId")
    })

    it("serializes a summary day count without loading the itinerary graph", () => {
        expect(serializeTripSummaryWithOwnerCapability({
            ...trip,
            _count: { days: 5 },
        }, "owner-1")).toEqual({
            id: "trip-1",
            name: "Lisbon",
            dayCount: 5,
            isOwner: true,
        })
    })
})
