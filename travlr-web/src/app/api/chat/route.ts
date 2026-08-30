import { openai } from "@ai-sdk/openai"
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai"
import { z } from "zod"

import { getCurrentUser, unauthorizedResponse } from "@/lib/current-user"
import { getPrismaClient } from "@/lib/prisma"
import {
    itineraryChangeSchema,
    persistItineraryChange,
    type ItineraryChange,
} from "@/lib/trip-itinerary"
import { getWeatherForecast, WeatherServiceError } from "@/lib/weather-service"
import { consumeRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { JSON_BODY_LIMITS, jsonBodyErrorResponse, readJsonBody } from "@/lib/request-json"

export const maxDuration = 30

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

function cloneTrip(trip: unknown): JsonRecord {
    return isRecord(trip) ? JSON.parse(JSON.stringify(trip)) as JsonRecord : { days: [] }
}

export async function POST(req: Request) {
    const currentUser = await getCurrentUser()
    if (!currentUser) return unauthorizedResponse()

    const rateLimit = consumeRateLimit(`chat:${currentUser.id}`, RATE_LIMITS.chat)
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit)

    if (!process.env.OPENAI_API_KEY?.trim()) {
        return Response.json(
            { error: "AI chat is not configured. Add OPENAI_API_KEY before using the assistant." },
            { status: 503 },
        )
    }

    try {
        const body = await readJsonBody(req, JSON_BODY_LIMITS.chat)
        if (!body.ok) {
            return jsonBodyErrorResponse(body, {
                invalidMessage: "Invalid JSON body.",
                tooLargeMessage: "Chat request is too large.",
            })
        }
        const rawPayload = body.data

        if (!isRecord(rawPayload)) {
            return Response.json({ error: "Invalid chat request." }, { status: 400 })
        }

        const payload = rawPayload as { messages?: unknown; trip?: unknown }

        if (!Array.isArray(payload.messages) || payload.messages.length > 100) {
            return Response.json({ error: "Invalid chat messages." }, { status: 400 })
        }

        const messages = payload.messages as UIMessage[]
        const trip = payload.trip
        const tripId = isRecord(trip) && typeof trip.id === "string" && trip.id.trim().length > 0
            ? trip.id.trim()
            : null

        const tools = {
            getWeather: tool({
                description: "Get the weather for a location",
                inputSchema: z.object({
                    location: z.string().describe("The city and state, e.g. San Francisco, CA"),
                }),
                execute: async ({ location }: { location: string }) => {
                    try {
                        const forecast = await getWeatherForecast(location)
                        return {
                            success: true,
                            temperature: forecast.current.temp,
                            unit: "C",
                            condition: forecast.current.condition,
                            humidity: forecast.current.humidity,
                            windSpeed: forecast.current.windSpeed,
                            location: forecast.location,
                        }
                    } catch (error) {
                        if (error instanceof WeatherServiceError) {
                            return {
                                success: false,
                                error: error.message,
                                code: error.code,
                                location,
                            }
                        }

                        return {
                            success: false,
                            error: "The weather provider is unavailable right now. Please try again later.",
                            code: "WEATHER_PROVIDER_ERROR",
                            location,
                        }
                    }
                },
            }),
            updateItinerary: tool({
                description: "Update the trip itinerary with new activities",
                inputSchema: itineraryChangeSchema.describe("The itinerary change to apply"),
                execute: async (change: ItineraryChange) => {
                    if (!tripId) {
                        return {
                            success: false,
                            message: "Select a trip before changing its itinerary.",
                        }
                    }

                    const prisma = getPrismaClient()
                    if (!prisma) {
                        return {
                            success: false,
                            message: "The itinerary could not be saved because the database is not configured.",
                        }
                    }

                    let persisted
                    try {
                        persisted = await persistItineraryChange(prisma, tripId, currentUser.id, change)
                    } catch (error) {
                        console.error("[CHAT_ITINERARY_UPDATE]", error)
                        return {
                            success: false,
                            message: "The itinerary could not be saved right now. Please try again.",
                        }
                    }
                    if (persisted.status !== "updated") {
                        return {
                            success: false,
                            message: persisted.message,
                        }
                    }

                    // Return the same lightweight shape the dashboard supplied,
                    // so it can update immediately while the database remains
                    // the source of truth for the next reload.
                    const updatedTrip = cloneTrip(trip)
                    const days = Array.isArray(updatedTrip.days) ? updatedTrip.days : []
                    updatedTrip.days = days

                    let dayPlan = days.find((candidate): candidate is JsonRecord => (
                        isRecord(candidate) && candidate.day === change.day
                    ))

                    if (!dayPlan) {
                        dayPlan = { day: change.day, theme: "New Day", activities: [] }
                        days.push(dayPlan)
                        days.sort((first, second) => {
                            const firstDay = isRecord(first) && typeof first.day === "number" ? first.day : 0
                            const secondDay = isRecord(second) && typeof second.day === "number" ? second.day : 0
                            return firstDay - secondDay
                        })
                    }

                    const activities = Array.isArray(dayPlan.activities) ? dayPlan.activities : []
                    dayPlan.activities = activities

                    if (change.action === "add") {
                        activities.push(change.activity)
                    } else if (change.action === "remove") {
                        dayPlan.activities = activities.filter((candidate) => (
                            !isRecord(candidate) || candidate.name !== change.activity.name
                        ))
                    } else {
                        dayPlan.activities = activities.map((candidate) => (
                            isRecord(candidate) && candidate.name === change.activity.name ? change.activity : candidate
                        ))
                    }

                    return {
                        success: true,
                        message: persisted.message,
                        updatedTrip,
                        day: change.day,
                        action: change.action,
                    }
                },
            }),
        }

        const result = streamText({
            model: openai(process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna"),
            messages: await convertToModelMessages(messages, { tools }),
            // Allow a tool result to be followed by a concise assistant reply,
            // while keeping one request bounded if the model chains tools.
            stopWhen: stepCountIs(3),
            system: `You are an expert travel assistant for 'Travlr'.
You help users plan trips, find activities, and check local information.
You have access to tools to get weather and update the itinerary.
Always be helpful, concise, and enthusiastic about travel.
Current Trip Context: ${JSON.stringify(trip ?? "No trip selected.", null, 2)}`,
            tools,
        })

        return result.toUIMessageStreamResponse()
    } catch (error) {
        console.error("Chat API error:", error)
        return Response.json({ error: "Unable to process chat request." }, { status: 500 })
    }
}
