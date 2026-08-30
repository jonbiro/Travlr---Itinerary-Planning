import { z } from "zod"

const hexColor = z.string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Colors must use six-digit hex format")

const imageUrl = z.string()
    .url("Background image must be a valid URL")
    .max(2048, "Background image URL is too long")
    .refine((value) => {
        try {
            const protocol = new URL(value).protocol
            return protocol === "http:" || protocol === "https:"
        } catch {
            return false
        }
    }, "Background image must use HTTP or HTTPS")

export const tripThemeSchema = z.object({
    backgroundColor: hexColor,
    accentColor: hexColor,
    backgroundImage: imageUrl.optional(),
    gradientFrom: hexColor.optional(),
    gradientTo: hexColor.optional(),
}).strict()

export type TripThemeValues = z.infer<typeof tripThemeSchema>
