import { openai } from "@ai-sdk/openai"
import { generateText, Output } from "ai"
import { z } from "zod"

import { getCurrentUser, unauthorizedResponse } from "@/lib/current-user"
import { consumeRateLimitAsync, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { JSON_BODY_LIMITS, jsonBodyErrorResponse, readJsonBody } from "@/lib/request-json"
import { getPrismaClient } from "@/lib/prisma"
import { PRODUCT_LIMITS } from "@/lib/product-limits"

export const maxDuration = 30

const requestSchema = z.object({
    destination: z.string().trim().min(2).max(200),
    days: z.number().int().positive().max(PRODUCT_LIMITS.maxTripDays),
    activities: z.array(z.string().trim().min(1).max(200)).max(PRODUCT_LIMITS.maxActivitiesPerTrip),
}).strict()

const packingListSchema = z.object({
    categories: z.array(z.object({
        name: z.string().trim().min(1).max(100),
        items: z.array(z.object({
            item: z.string().trim().min(1).max(200),
            reason: z.string().trim().max(500).optional(),
            checked: z.boolean().default(false),
        }).strict()).max(30),
    }).strict()).max(12),
}).strict()

export async function POST(req: Request) {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser) return unauthorizedResponse()

        const rateLimit = await consumeRateLimitAsync(
            `packing-list:${currentUser.id}`,
            RATE_LIMITS.packingList,
            getPrismaClient(),
        )
        if (!rateLimit.allowed) return rateLimitResponse(rateLimit)

        const json = await readJsonBody(req, JSON_BODY_LIMITS.packingList)
        if (!json.ok) return jsonBodyErrorResponse(json)
        const { destination, days, activities } = requestSchema.parse(json.data)

        if (!process.env.OPENAI_API_KEY) {
            return Response.json(
                { error: "AI packing lists are not configured. Add OPENAI_API_KEY." },
                { status: 503 },
            )
        }

        const result = await generateText({
            model: openai(process.env.OPENAI_MODEL || "gpt-5.6-luna"),
            abortSignal: req.signal,
            output: Output.object({ schema: packingListSchema }),
            maxOutputTokens: 2_000,
            system: "You are a pragmatic travel assistant. Generate a packing list based only on the supplied destination, duration, and planned activities. Do not claim to know the forecast.",
            prompt: `Generate a packing list for a ${days}-day trip to ${destination}. Activities: ${activities.join(", ")}.`,
        })

        return Response.json(result.output)
    } catch (error) {
        if (error instanceof z.ZodError) {
            return Response.json({ error: "Invalid packing-list details", issues: error.issues }, { status: 400 })
        }
        console.error("Failed to generate packing list:", error)
        return Response.json({ error: "Failed to generate packing list" }, { status: 500 })
    }
}
