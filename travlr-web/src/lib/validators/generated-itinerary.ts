import { z } from "zod"

export const generatedItinerarySchema = z.object({
    tripName: z.string().trim().min(1).max(200),
    summary: z.string().trim().max(5_000),
    days: z.array(
        z.object({
            day: z.number().int().min(1).max(366),
            theme: z.string().trim().max(200),
            activities: z.array(
                z.object({
                    name: z.string().trim().min(1).max(200),
                    description: z.string().trim().max(2_000),
                    time: z.string().trim().max(100),
                    location: z.string().trim().max(500),
                }),
            ).max(50),
        }),
    ).max(366),
}).strict()

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
