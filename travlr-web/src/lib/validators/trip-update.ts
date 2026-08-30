import { z } from "zod"

/**
 * Payload accepted by PATCH /api/trips/:id.
 *
 * Dates are coerced here so invalid date strings are rejected before they can
 * reach Prisma (where they would otherwise surface as a 500 response).
 */
export const updateTripSchema = z.object({
    name: z.string().trim().min(1, "Trip name must not be empty").optional(),
    destination: z.string().trim().min(1, "Destination must not be empty").optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    budget: z.number().finite().nonnegative("Budget must be zero or greater").optional(),
}).strict().refine(({ startDate, endDate }) => (
    !startDate || !endDate || endDate >= startDate
), {
    message: "End date must be on or after the start date",
    path: ["endDate"],
})

export type UpdateTripValues = z.infer<typeof updateTripSchema>
