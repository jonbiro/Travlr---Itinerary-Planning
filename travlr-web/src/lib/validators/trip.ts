import { z } from "zod"

export const createTripSchema = z.object({
    destination: z.string().trim().min(2, "Destination must be at least 2 characters").max(200),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    budget: z.enum(["budget", "moderate", "luxury"]),
    interests: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
}).strict().refine(({ startDate, endDate }) => endDate >= startDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
})

export type CreateTripValues = z.infer<typeof createTripSchema>
