import { describe, expect, it } from "vitest"

import { dateForTripDay } from "./trip-date-reconciliation"

describe("dateForTripDay", () => {
    it("keeps day arithmetic on the UTC calendar across month boundaries", () => {
        expect(dateForTripDay(new Date("2026-01-31T00:00:00.000Z"), 2))
            .toEqual(new Date("2026-02-01T00:00:00.000Z"))
    })
})
