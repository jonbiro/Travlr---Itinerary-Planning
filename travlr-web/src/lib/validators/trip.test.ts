import { describe, expect, it } from "vitest"

import { parseDateOnly } from "@/lib/date-only"
import { createTripSchema } from "./trip"
import { updateTripSchema } from "./trip-update"
import { tripThemeSchema } from "./trip-theme"
import { generatedItinerarySchema, hasCompleteDaySequence } from "./generated-itinerary"

describe("createTripSchema", () => {
    it("accepts the date-only strings sent by the browser", () => {
        const result = createTripSchema.parse({
            destination: "Paris, France",
            startDate: "2026-09-10",
            endDate: "2026-09-14",
            budget: "moderate",
        })

        expect(result.startDate).toBeInstanceOf(Date)
        expect(result.endDate).toBeInstanceOf(Date)
        expect(result.interests).toEqual([])
    })

    it("rejects offset-bearing timestamps instead of changing their calendar day", () => {
        for (const startDate of [
            "2026-09-10T00:00:00+09:00",
            "2026-09-10T00:00:00-07:00",
        ]) {
            const result = createTripSchema.safeParse({
                destination: "Tokyo, Japan",
                startDate,
                endDate: "2026-09-14",
                budget: "moderate",
            })

            expect(result.success).toBe(false)
        }
    })

    it("stores date-only input at UTC midnight", () => {
        const result = createTripSchema.parse({
            destination: "Tokyo, Japan",
            startDate: "2026-09-10",
            endDate: "2026-09-14",
            budget: "moderate",
        })

        expect(result.startDate.toISOString()).toBe("2026-09-10T00:00:00.000Z")
        expect(result.endDate.toISOString()).toBe("2026-09-14T00:00:00.000Z")
    })

    it("rejects impossible date-only values", () => {
        expect(parseDateOnly("2026-02-30")).toBeNull()
        expect(createTripSchema.safeParse({
            destination: "Tokyo, Japan",
            startDate: "2026-02-30",
            endDate: "2026-03-02",
            budget: "moderate",
        }).success).toBe(false)
    })

    it("rejects an end date before the start date", () => {
        const result = createTripSchema.safeParse({
            destination: "Tokyo, Japan",
            startDate: "2026-09-14",
            endDate: "2026-09-10",
            budget: "budget",
            interests: [],
        })

        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0]?.path).toEqual(["endDate"])
        }
    })

    it("rejects trips that exceed the product day limit", () => {
        const result = createTripSchema.safeParse({
            destination: "Tokyo, Japan",
            startDate: "2026-09-01",
            endDate: "2026-11-01",
            budget: "budget",
        })

        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((issue) => issue.path[0] === "endDate")).toBe(true)
        }
    })
})

describe("updateTripSchema", () => {
    it("rejects invalid date strings before they reach the database", () => {
        const result = updateTripSchema.safeParse({ startDate: "not-a-date" })

        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0]?.path).toEqual(["startDate"])
        }
    })

    it("rejects an end date before a supplied start date", () => {
        const result = updateTripSchema.safeParse({
            startDate: "2026-09-14",
            endDate: "2026-09-10",
        })

        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0]?.path).toEqual(["endDate"])
        }
    })
})

describe("tripThemeSchema", () => {
    it("accepts a preset theme and an HTTPS background image", () => {
        expect(tripThemeSchema.safeParse({
            backgroundColor: "#0ea5e9",
            accentColor: "#0284c7",
            gradientFrom: "#0ea5e9",
            gradientTo: "#2563eb",
            backgroundImage: "https://images.example.com/beach.jpg",
        }).success).toBe(true)
    })

    it("rejects unsafe image protocols and malformed colors", () => {
        expect(tripThemeSchema.safeParse({
            backgroundColor: "red",
            accentColor: "#0284c7",
            backgroundImage: "javascript:alert(1)",
        }).success).toBe(false)
    })
})

describe("generated itinerary validation", () => {
    const emptyDay = (day: number) => ({ day, theme: "Theme", activities: [] })

    it("requires every requested day exactly once", () => {
        expect(hasCompleteDaySequence([emptyDay(1), emptyDay(2)], 2)).toBe(true)
        expect(hasCompleteDaySequence([emptyDay(1), emptyDay(1)], 2)).toBe(false)
        expect(hasCompleteDaySequence([emptyDay(1), emptyDay(3)], 2)).toBe(false)
    })

    it("rejects fractional and out-of-range day numbers", () => {
        expect(generatedItinerarySchema.safeParse({
            tripName: "Test",
            summary: "Test",
            days: [emptyDay(1.5)],
        }).success).toBe(false)
        expect(generatedItinerarySchema.safeParse({
            tripName: "Test",
            summary: "Test",
            days: [emptyDay(0)],
        }).success).toBe(false)
        expect(generatedItinerarySchema.safeParse({
            tripName: "Test",
            summary: "Test",
            days: [emptyDay(61)],
        }).success).toBe(false)
    })

    it("caps activities per day and across the itinerary", () => {
        const activity = {
            name: "A",
            description: "",
            time: "10:00",
            location: "Somewhere",
        }
        expect(generatedItinerarySchema.safeParse({
            tripName: "Too busy",
            summary: "",
            days: [{ day: 1, theme: "Theme", activities: Array.from({ length: 21 }, () => activity) }],
        }).success).toBe(false)
        expect(generatedItinerarySchema.safeParse({
            tripName: "Too many",
            summary: "",
            days: Array.from({ length: 60 }, (_, index) => ({
                day: index + 1,
                theme: "Theme",
                activities: Array.from({ length: 9 }, () => activity),
            })),
        }).success).toBe(false)
    })
})
