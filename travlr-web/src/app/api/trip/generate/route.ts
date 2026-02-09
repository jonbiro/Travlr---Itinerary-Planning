import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"
import { createTripSchema } from "@/lib/validators/trip"

// Define the schema for the generated itinerary
const itinerarySchema = z.object({
    tripName: z.string(),
    summary: z.string(),
    days: z.array(
        z.object({
            day: z.number(),
            theme: z.string(),
            activities: z.array(
                z.object({
                    name: z.string(),
                    description: z.string(),
                    time: z.string(),
                    location: z.string(),
                })
            ),
        })
    ),
})

export async function POST(req: Request) {
    try {
        const json = await req.json()
        const body = createTripSchema.parse(json)

        const result = await generateObject({
            model: openai("gpt-4-turbo"),
            schema: itinerarySchema,
            prompt: `Generate a detailed ${body.budget} travel itinerary for a trip to ${body.destination} from ${body.startDate} to ${body.endDate}. 
      The traveler is interested in: ${body.interests.join(", ")}.
      Create a unique name for the trip and a daily breakdown of activities.`,
        })

        return Response.json(result.object)
    } catch (error) {
        console.error("Error generating trip:", error)
        return Response.json({ error: "Failed to generate trip" }, { status: 500 })
    }
}
