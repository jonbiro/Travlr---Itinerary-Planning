import { z } from "zod"
import { PRODUCT_LIMITS } from "@/lib/product-limits"

export const generatedItinerarySchema = z.object({
    tripName: z.string().trim().min(1).max(200),
    summary: z.string().trim().max(5_000),
    days: z.array(
        z.object({
            day: z.number().int().min(1).max(PRODUCT_LIMITS.maxTripDays),
            theme: z.string().trim().max(200),
            activities: z.array(
                z.object({
                    name: z.string().trim().min(1).max(200),
                    description: z.string().trim().max(2_000),
                    time: z.string().trim().max(100),
                    location: z.string().trim().max(500),
                }),
            ).max(PRODUCT_LIMITS.maxActivitiesPerDay),
        }),
    ).max(PRODUCT_LIMITS.maxTripDays),
}).strict().superRefine((itinerary, ctx) => {
    const activityCount = itinerary.days.reduce(
        (total, day) => total + day.activities.length,
        0,
    )

    if (activityCount > PRODUCT_LIMITS.maxActivitiesPerTrip) {
        ctx.addIssue({
            code: "too_big",
            maximum: PRODUCT_LIMITS.maxActivitiesPerTrip,
            origin: "number",
            path: ["days"],
            message: `An itinerary cannot contain more than ${PRODUCT_LIMITS.maxActivitiesPerTrip} activities.`,
        })
    }
})

export type GeneratedItinerary = z.infer<typeof generatedItinerarySchema>

export function inclusiveDayCount(startDate: Date, endDate: Date) {
    const start = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate())
    const end = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate())
    return Math.floor((end - start) / 86_400_000) + 1
}

export function hasCompleteDaySequence(
    days: GeneratedItinerary["days"],
    expectedDayCount: number,
) {
    if (days.length !== expectedDayCount) return false

    const dayNumbers = new Set(days.map((day) => day.day))
    if (dayNumbers.size !== expectedDayCount) return false

    return Array.from({ length: expectedDayCount }, (_, index) => index + 1)
        .every((dayNumber) => dayNumbers.has(dayNumber))
}
