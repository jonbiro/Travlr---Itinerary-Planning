import { openai } from "@ai-sdk/openai"
import { streamText, tool } from "ai"
import { z } from "zod"

export const maxDuration = 30

export async function POST(req: Request) {
    const { messages, trip } = await req.json()

    const result = streamText({
        model: openai("gpt-4-turbo"),
        messages,
        system: `You are an expert travel assistant for 'Travlr'. 
    You help users plan trips, find activities, and check local information.
    You have access to tools to get weather and update the itinerary.
    Always be helpful, concise, and enthusiastic about travel.
    Current Trip Context: ${JSON.stringify(trip, null, 2)}`, // Pass trip context to system prompt for awareness
        tools: {
            getWeather: tool({
                description: "Get the weather for a location",
                parameters: z.object({
                    location: z.string().describe("The city and state, e.g. San Francisco, CA"),
                }),
                execute: async ({ location }: { location: string }) => {
                    // Mock weather data
                    const temp = Math.floor(Math.random() * (30 - 10) + 10) // 10-30 celsius
                    const conditions = ["Sunny", "Cloudy", "Rainy", "Partly Cloudy"][
                        Math.floor(Math.random() * 4)
                    ]
                    return {
                        temperature: temp,
                        unit: "C",
                        condition: conditions,
                        location,
                    }
                },
            } as any),  // eslint-disable-line @typescript-eslint/no-explicit-any
            suggestDestinations: tool({
                description: "Suggest travel destinations based on preferences",
                parameters: z.object({
                    preferences: z.string().describe("User preferences like 'beach', 'hiking', 'history'"),
                    budget: z.enum(["budget", "moderate", "luxury"]).optional(),
                }),
                execute: async ({ preferences: _preferences }: { preferences: string }) => {
                    // Mock suggestions
                    return {
                        suggestions: [
                            { name: "Kyoto, Japan", reason: "Great for history and culture." },
                            { name: "Reykjavik, Iceland", reason: "Perfect for hiking and nature." },
                            { name: "Positano, Italy", reason: "Beautiful coastal town for relaxation." }
                        ]
                    }
                }
            } as any),  // eslint-disable-line @typescript-eslint/no-explicit-any
            planRoute: tool({
                description: "Plan a route between two locations",
                parameters: z.object({
                    origin: z.string(),
                    destination: z.string(),
                    mode: z.enum(["driving", "walking", "transit"]).default("driving")
                }),
                execute: async ({ origin, destination, mode }: { origin: string, destination: string, mode: string }) => {
                    // Mock route data
                    return {
                        distance: "15 km",
                        duration: "30 mins",
                        mode,
                        steps: [`Start at ${origin}`, "Go straight 5km", `Arrive at ${destination}`]
                    }
                }
            } as any),  // eslint-disable-line @typescript-eslint/no-explicit-any
            updateItinerary: tool({
                description: "Update the trip itinerary with new activities",
                parameters: z.object({
                    day: z.number().describe("The day number to update (1-indexed)"),
                    action: z.enum(["add", "remove", "replace"]),
                    activity: z.object({
                        name: z.string(),
                        description: z.string(),
                        time: z.string(),
                        location: z.string(),
                    }).describe("The activity details")
                }),
                execute: async ({ day, action, activity }: { day: number, action: string, activity: any }) => {  // eslint-disable-line @typescript-eslint/no-explicit-any
                    // Deep clone the trip to avoid mutation issues (though here it's a fresh object from req)
                    // Note: In a real app, we might want to validate 'trip' existence.
                    const updatedTrip = JSON.parse(JSON.stringify(trip || { days: [] }))

                    if (!updatedTrip.days) updatedTrip.days = []

                    // Ensure the day exists
                    let dayPlan = updatedTrip.days.find((d: any) => d.day === day)  // eslint-disable-line @typescript-eslint/no-explicit-any
                    if (!dayPlan) {
                        dayPlan = { day, theme: "New Day", activities: [] }
                        updatedTrip.days.push(dayPlan)
                        // Sort days just in case
                        updatedTrip.days.sort((a: any, b: any) => a.day - b.day)  // eslint-disable-line @typescript-eslint/no-explicit-any
                    }

                    if (action === "add") {
                        dayPlan.activities.push(activity)
                    } else if (action === "remove") {
                        dayPlan.activities = dayPlan.activities.filter((a: any) => a.name !== activity.name)  // eslint-disable-line @typescript-eslint/no-explicit-any
                    } else if (action === "replace") {
                        // Simple replace logic based on name matching or just add
                        dayPlan.activities = dayPlan.activities.map((a: any) => a.name === activity.name ? activity : a)  // eslint-disable-line @typescript-eslint/no-explicit-any
                    }

                    return {
                        success: true,
                        message: `Successfully ${action}ed ${activity.name} to Day ${day}`,
                        updatedTrip, // Return the full updated trip
                        day,
                        action
                    }
                }
            } as any)  // eslint-disable-line @typescript-eslint/no-explicit-any
        },
    })

    return (result as any).toDataStreamResponse()  // eslint-disable-line @typescript-eslint/no-explicit-any
}
