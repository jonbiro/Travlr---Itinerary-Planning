import { z } from "zod"
import { dateOnlySchema } from "@/lib/date-only"
import { PRODUCT_LIMITS, inclusiveUtcDayCount } from "@/lib/product-limits"

export const createTripSchema = z.object({
    destination: z.string().trim().min(2, "Destination must be at least 2 characters").max(200),
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
    budget: z.enum(["budget", "moderate", "luxury"]),
    interests: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
}).strict().refine(({ startDate, endDate }) => endDate >= startDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
}).refine(({ startDate, endDate }) => (
    inclusiveUtcDayCount(startDate, endDate) <= PRODUCT_LIMITS.maxTripDays
), {
    message: `Trips longer than ${PRODUCT_LIMITS.maxTripDays} days are not supported.`,
    path: ["endDate"],
})

export type CreateTripValues = z.infer<typeof createTripSchema>
