import { NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentUser, unauthorizedResponse } from "@/lib/current-user"
import { ensureDemoUser, getPrismaClient } from "@/lib/prisma"
import { tripThemeSchema } from "@/lib/validators/trip-theme"
import { JSON_BODY_LIMITS, jsonBodyErrorResponse, readJsonBody } from "@/lib/request-json"

function databaseUnavailable() {
    return NextResponse.json(
        { error: "Database is not configured. Add DATABASE_URL to save trip appearance." },
        { status: 503 },
    )
}

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const currentUser = await getCurrentUser()
    if (!currentUser) return unauthorizedResponse()

    const prisma = getPrismaClient()
    if (!prisma) return databaseUnavailable()

    const json = await readJsonBody(req, JSON_BODY_LIMITS.tripTheme)
    if (!json.ok) return jsonBodyErrorResponse(json)

    const result = tripThemeSchema.safeParse(json.data)
    if (!result.success) {
        return NextResponse.json(
            { error: "Invalid trip theme", issues: result.error.issues },
            { status: 400 },
        )
    }

    try {
        if (currentUser.isDemo) await ensureDemoUser(prisma)

        const { id } = await params
        const existingTrip = await prisma.trip.findFirst({
            where: { id, userId: currentUser.id },
            select: { id: true },
        })

        if (!existingTrip) {
            return NextResponse.json({ error: "Trip not found" }, { status: 404 })
        }

        const trip = await prisma.trip.update({
            where: { id: existingTrip.id },
            data: { theme: result.data },
            select: { id: true, theme: true },
        })

        return NextResponse.json(trip)
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid trip theme", issues: error.issues },
                { status: 400 },
            )
        }

        console.error("[TRIP_THEME_PUT]", error)
        return NextResponse.json({ error: "Unable to save trip appearance" }, { status: 500 })
    }
}
