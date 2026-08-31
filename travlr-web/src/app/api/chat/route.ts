import { openai } from "@ai-sdk/openai"
import { consumeStream, convertToModelMessages, safeValidateUIMessages, stepCountIs, streamText, tool, type UIMessage } from "ai"
import { z } from "zod"

import { getCurrentUser, unauthorizedResponse } from "@/lib/current-user"
import { getPrismaClient } from "@/lib/prisma"
import {
    itineraryChangeSchema,
    persistItineraryChange,
    type ItineraryChange,
} from "@/lib/trip-itinerary"
import { getWeatherForecast, WeatherServiceError } from "@/lib/weather-service"
import { consumeRateLimitAsync, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { JSON_BODY_LIMITS, jsonBodyErrorResponse, readJsonBody } from "@/lib/request-json"
import { PRODUCT_LIMITS } from "@/lib/product-limits"

export const maxDuration = 30

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

function cloneTrip(trip: unknown): JsonRecord {
    return isRecord(trip) ? JSON.parse(JSON.stringify(trip)) as JsonRecord : { days: [] }
}

function boundedString(value: unknown, maxLength: number) {
    return typeof value === "string" ? value.slice(0, maxLength) : ""
}

function compactTripContext(trip: unknown): JsonRecord | string {
    if (!isRecord(trip)) return "No trip selected."

    const compact: JsonRecord = {
        id: boundedString(trip.id, 100),
        name: boundedString(trip.name ?? trip.tripName, 200),
        destination: boundedString(trip.destination, 200),
        startDate: boundedString(trip.startDate, 40),
        endDate: boundedString(trip.endDate, 40),
    }

    if (Array.isArray(trip.days)) {
        compact.days = trip.days.slice(0, PRODUCT_LIMITS.maxTripDays).flatMap((rawDay) => {
            if (!isRecord(rawDay)) return []

            const activities = Array.isArray(rawDay.activities)
                ? rawDay.activities.slice(0, PRODUCT_LIMITS.maxActivitiesPerDay).flatMap((rawActivity) => {
                    if (!isRecord(rawActivity)) return []
                    return [{
                        name: boundedString(rawActivity.name, 200),
                        description: boundedString(rawActivity.description, 2_000),
                        time: boundedString(rawActivity.time ?? rawActivity.startTime, 100),
                        location: boundedString(rawActivity.location, 500),
                    }]
                })
                : []

            return [{
                day: typeof rawDay.day === "number" ? rawDay.day : rawDay.dayNumber,
                theme: boundedString(rawDay.theme, 200),
                activities,
            }]
        })
    } else {
        compact.days = []
    }

    return compact
}

function chatEnvelopeError(messages: unknown): string | null {
    if (!Array.isArray(messages)) return "Invalid chat messages."
    if (messages.length === 0 || messages.length > PRODUCT_LIMITS.maxChatMessages) {
        return `Chat history must contain between 1 and ${PRODUCT_LIMITS.maxChatMessages} messages.`
    }

    let totalTextLength = 0
    let totalPartPayload = 0
    for (const message of messages) {
        if (!isRecord(message) || !Array.isArray(message.parts)) {
            return "Invalid chat message format."
        }
        if (message.parts.length > PRODUCT_LIMITS.maxChatPartsPerMessage) {
            return "A chat message contains too many parts."
        }

        for (const part of message.parts) {
            if (!isRecord(part) || typeof part.type !== "string") {
                return "Invalid chat message part."
            }

            // AI SDK file/source parts can cause server-side downloads. Travlr
            // is a text-only assistant, so reject all of those before model
            // conversion rather than allowing a remote URL to be fetched.
            if (["file", "source-url", "source-document"].includes(part.type)) {
                return "File and remote source parts are not supported."
            }

            if (part.type === "text") {
                if (typeof part.text !== "string" || part.text.length > PRODUCT_LIMITS.maxChatTextPerPart) {
                    return "A chat text part is too long."
                }
                totalTextLength += part.text.length
            }

            let serializedPart: string
            try {
                serializedPart = JSON.stringify(part)
            } catch {
                return "Invalid chat message part."
            }
            if (serializedPart.length > PRODUCT_LIMITS.maxChatNonTextPart) {
                return "A chat message part is too large."
            }
            totalPartPayload += serializedPart.length
        }
    }

    if (totalTextLength > PRODUCT_LIMITS.maxChatTextTotal) return "Chat history text is too long."
    if (totalPartPayload > PRODUCT_LIMITS.maxChatPartPayload) return "Chat history is too large."
    return null
}

export async function POST(req: Request) {
    const currentUser = await getCurrentUser()
    if (!currentUser) return unauthorizedResponse()

    const prisma = getPrismaClient()
    const rateLimit = await consumeRateLimitAsync(`chat:${currentUser.id}`, RATE_LIMITS.chat, prisma)
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

        const envelopeError = chatEnvelopeError(payload.messages)
        if (envelopeError) {
            return Response.json({ error: envelopeError }, { status: 400 })
        }

        const trip = payload.trip
        const tripId = isRecord(trip) && typeof trip.id === "string" && trip.id.trim().length > 0
            ? trip.id.trim()
            : null
        let cumulativeTrip = cloneTrip(trip)
        let itineraryUpdateQueue: Promise<void> = Promise.resolve()

        const tools = {
            getWeather: tool({
                description: "Get the weather for a location",
                inputSchema: z.object({
                    location: z.string().describe("The city and state, e.g. San Francisco, CA"),
                }),
                execute: async ({ location }: { location: string }, { abortSignal }) => {
                    const weatherLimit = await consumeRateLimitAsync(
                        `weather:${currentUser.id}`,
                        RATE_LIMITS.weather,
                        prisma,
                    )
                    if (!weatherLimit.allowed) {
                        const limiterUnavailable = weatherLimit.unavailable === true
                        return {
                            success: false,
                            error: limiterUnavailable
                                ? "Weather request protection is temporarily unavailable. Please try again later."
                                : "Too many weather requests. Please try again in a few minutes.",
                            code: limiterUnavailable ? "RATE_LIMIT_UNAVAILABLE" : "RATE_LIMITED",
                            retryAfterSeconds: weatherLimit.retryAfterSeconds,
                            location,
                        }
                    }

                    try {
                        const forecast = await getWeatherForecast(location, abortSignal)
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
                execute: (change: ItineraryChange) => {
                    const operation = itineraryUpdateQueue.then(async () => {
                    if (!tripId) {
                        return {
                            success: false,
                            message: "Select a trip before changing its itinerary.",
                        }
                    }

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
                    const updatedTrip = cloneTrip(cumulativeTrip)
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

                    cumulativeTrip = updatedTrip

                    return {
                        success: true,
                        message: persisted.message,
                        updatedTrip,
                        day: change.day,
                        action: change.action,
                    }
                    })

                    // Models may emit multiple tool calls in one step. Queue
                    // them so each response builds on the last persisted/UI
                    // snapshot instead of replaying the original request trip.
                    itineraryUpdateQueue = operation.then(
                        () => undefined,
                        () => undefined,
                    )
                    return operation
                },
            }),
        }

        const validatedMessages = await safeValidateUIMessages({
            messages: payload.messages,
            // The route's tools are concrete implementations, while the
            // generic UIMessage type exposes an open tool map. Runtime
            // validation still checks these exact tool definitions; this cast
            // only bridges that intentionally wider SDK type.
            tools: tools as never,
        })
        if (!validatedMessages.success) {
            return Response.json({ error: "Invalid chat messages." }, { status: 400 })
        }

        const messages = validatedMessages.data as UIMessage[]
        const result = streamText({
            model: openai(process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna"),
            abortSignal: req.signal,
            messages: await convertToModelMessages(messages, { tools }),
            maxOutputTokens: 1_200,
            // Allow a tool result to be followed by a concise assistant reply,
            // while keeping one request bounded if the model chains tools.
            stopWhen: stepCountIs(3),
            system: `You are an expert travel assistant for 'Travlr'.
You help users plan trips, find activities, and check local information.
You have access to tools to get weather and update the itinerary.
Always be helpful, concise, and enthusiastic about travel.
Current Trip Context: ${JSON.stringify(compactTripContext(trip), null, 2)}`,
            tools,
        })

        return result.toUIMessageStreamResponse({
            consumeSseStream: consumeStream,
            headers: { "Cache-Control": "private, no-store" },
        })
    } catch (error) {
        console.error("Chat API error:", error)
        return Response.json({ error: "Unable to process chat request." }, { status: 500 })
    }
}
