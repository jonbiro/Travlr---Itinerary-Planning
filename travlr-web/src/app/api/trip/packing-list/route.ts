import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"

export const maxDuration = 30

export async function POST(req: Request) {
    const { destination, days, activities } = await req.json()

    const result = await generateObject({
        model: openai("gpt-4-turbo"),
        schema: z.object({
            categories: z.array(z.object({
                name: z.string(),
                items: z.array(z.object({
                    item: z.string(),
                    reason: z.string().optional(),
                    checked: z.boolean().default(false)
                }))
            }))
        }),
        system: "You are a pragmatic travel assistant. Generate a packing list based on the destination, duration, weather (infer from destination/date), and planned activities.",
        prompt: `Generate a packing list for a ${days}-day trip to ${destination}. Activities: ${activities.join(", ")}.`
    })

    return result.toJsonResponse()
}
