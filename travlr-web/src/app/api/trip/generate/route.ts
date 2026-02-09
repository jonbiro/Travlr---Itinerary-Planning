import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"
import { createTripSchema } from "@/lib/validators/trip"
import { prisma } from "@/lib/prisma"

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

        const tripData = result.object
        const userId = "demo-user" // REPLACE WITH REAL AUTH - ensuring consistency with other routes

        // Persist to Database
        // 1. Create Trip
        const newTrip = await prisma.trip.create({
            data: {
                name: tripData.tripName, // Use helper or just map it
                tripName: tripData.tripName,
                destination: body.destination,
                startDate: new Date(body.startDate),
                endDate: new Date(body.endDate),
                budget: undefined, // Add mapping if we parse budget string to decimal
                userId: userId,
                days: {
                    create: tripData.days.map((day) => ({
                        dayNumber: day.day,
                        date: new Date(new Date(body.startDate).setDate(new Date(body.startDate).getDate() + day.day - 1)), // Rough calculation
                        theme: day.theme,
                        activities: {
                            create: day.activities.map((activity, index) => ({
                                name: activity.name,
                                description: activity.description,
                                startTime: activity.time,
                                location: activity.location,
                                order: index
                            }))
                        }
                    }))
                }
            },
            include: {
                days: {
                    include: {
                        activities: true
                    },
                    orderBy: {
                        dayNumber: 'asc'
                    }
                }
            }
        })

        return Response.json(newTrip)
    } catch (error) {
        console.error("Error generating trip:", error)
        return Response.json({ error: "Failed to generate trip" }, { status: 500 })
    }
}
