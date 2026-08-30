import { z } from "zod"
import { dateOnlySchema } from "@/lib/date-only"
import { inclusiveUtcDayCount, PRODUCT_LIMITS } from "@/lib/product-limits"

/**
 * Payload accepted by PATCH /api/trips/:id.
 *
 * Dates are coerced here so invalid date strings are rejected before they can
 * reach Prisma (where they would otherwise surface as a 500 response).
 */
export const updateTripSchema = z.object({
    name: z.string().trim().min(1, "Trip name must not be empty").max(200).optional(),
    destination: z.string().trim().min(1, "Destination must not be empty").max(200).optional(),
    startDate: dateOnlySchema.optional(),
    endDate: dateOnlySchema.optional(),
    budget: z.number().finite().nonnegative("Budget must be zero or greater").optional(),
}).strict().refine(({ startDate, endDate }) => (
    !startDate || !endDate || endDate >= startDate
), {
    message: "End date must be on or after the start date",
    path: ["endDate"],
}).refine(({ startDate, endDate }) => (
    !startDate || !endDate || inclusiveUtcDayCount(startDate, endDate) <= PRODUCT_LIMITS.maxTripDays
), {
    message: `Trips longer than ${PRODUCT_LIMITS.maxTripDays} days are not supported.`,
    path: ["endDate"],
})

export type UpdateTripValues = z.infer<typeof updateTripSchema>
