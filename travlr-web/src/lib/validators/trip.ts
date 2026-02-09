import { z } from "zod"

export const createTripSchema = z.object({
    destination: z.string().min(2, "Destination must be at least 2 characters"),
    startDate: z.date(),
    endDate: z.date(),
    budget: z.enum(["budget", "moderate", "luxury"]),
    interests: z.array(z.string()).default([]),
})

export type CreateTripValues = z.infer<typeof createTripSchema>
