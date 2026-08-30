import { NextResponse } from "next/server"
import { z } from "zod"

import { getPrismaClient } from "@/lib/prisma"
import { getCurrentUser, unauthorizedResponse } from "@/lib/current-user"
import { JSON_BODY_LIMITS, jsonBodyErrorResponse, readJsonBody } from "@/lib/request-json"

const tripIdQuerySchema = z.object({
    tripId: z.string().trim().min(1),
})

const amountSchema = z.preprocess(
    (value) => {
        if (typeof value !== "string") return value

        const trimmed = value.trim()
        return trimmed ? Number(trimmed) : value
    },
    z.number().finite().nonnegative(),
)

const expenseSchema = z.object({
    tripId: z.string().trim().min(1),
    amount: amountSchema,
    currency: z.string().trim().min(1).max(10).default("USD"),
    category: z.enum(["food", "transport", "lodging", "activities", "shopping", "other"]),
    description: z.string().trim().max(1_000).nullable().optional(),
    date: z.union([
        z.string().trim().min(1),
        z.date(),
    ]).pipe(z.coerce.date()),
})

const tripAccessFilter = (tripId: string, userId: string) => ({
    id: tripId,
    OR: [
        { userId },
        { members: { some: { userId } } },
    ],
})

function databaseUnavailable() {
    return NextResponse.json(
        { error: "Database is not configured. Add DATABASE_URL to use expenses." },
        { status: 503 },
    )
}

function invalidExpenseData(error: z.ZodError) {
    return NextResponse.json(
        { error: "Invalid expense data", issues: error.issues },
        { status: 400 },
    )
}

function serializeExpense(expense: { amount: unknown }) {
    return {
        ...expense,
        // Prisma returns Decimal for amounts; the client-side expense type uses a number.
        amount: Number(expense.amount),
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const parsedQuery = tripIdQuerySchema.safeParse({
        tripId: searchParams.get("tripId"),
    })

    if (!parsedQuery.success) {
        return NextResponse.json(
            { error: "tripId parameter is required" },
            { status: 400 },
        )
    }

    try {
        const currentUser = await getCurrentUser()
        if (!currentUser) return unauthorizedResponse()

        const prisma = getPrismaClient()
        if (!prisma) return databaseUnavailable()

        const trip = await prisma.trip.findFirst({
            where: tripAccessFilter(parsedQuery.data.tripId, currentUser.id),
            select: { id: true },
        })

        if (!trip) {
            return NextResponse.json({ error: "Trip not found" }, { status: 404 })
        }

        const expenses = await prisma.expense.findMany({
            where: { tripId: trip.id },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json({ expenses: expenses.map(serializeExpense) })
    } catch (error) {
        console.error("[TRIP_EXPENSES_GET]", error)
        return NextResponse.json({ error: "Failed to load expenses" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser) return unauthorizedResponse()

        const prisma = getPrismaClient()
        if (!prisma) return databaseUnavailable()

        const json = await readJsonBody(request, JSON_BODY_LIMITS.expense)
        if (!json.ok) return jsonBodyErrorResponse(json)

        const parsed = expenseSchema.safeParse(json.data)
        if (!parsed.success) return invalidExpenseData(parsed.error)

        const trip = await prisma.trip.findFirst({
            where: tripAccessFilter(parsed.data.tripId, currentUser.id),
            select: { id: true },
        })

        if (!trip) {
            return NextResponse.json({ error: "Trip not found" }, { status: 404 })
        }

        const expense = await prisma.expense.create({
            data: {
                tripId: trip.id,
                amount: parsed.data.amount,
                currency: parsed.data.currency,
                category: parsed.data.category,
                description: parsed.data.description ?? null,
                date: parsed.data.date,
            },
        })

        return NextResponse.json(serializeExpense(expense), { status: 201 })
    } catch (error) {
        console.error("[TRIP_EXPENSES_POST]", error)
        return NextResponse.json({ error: "Failed to create expense" }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url)
    const parsedQuery = z.object({ id: z.string().trim().min(1) }).safeParse({
        id: searchParams.get("id"),
    })

    if (!parsedQuery.success) {
        return NextResponse.json(
            { error: "id parameter is required" },
            { status: 400 },
        )
    }

    try {
        const currentUser = await getCurrentUser()
        if (!currentUser) return unauthorizedResponse()

        const prisma = getPrismaClient()
        if (!prisma) return databaseUnavailable()

        // Filter through the trip relation so an expense is never deleted
        // unless its trip is owned by, or shared with, the current user.
        const expense = await prisma.expense.findFirst({
            where: {
                id: parsedQuery.data.id,
                trip: {
                    OR: [
                        { userId: currentUser.id },
                        { members: { some: { userId: currentUser.id } } },
                    ],
                },
            },
            select: { id: true },
        })

        if (!expense) {
            return NextResponse.json({ error: "Expense not found" }, { status: 404 })
        }

        await prisma.expense.delete({ where: { id: expense.id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("[TRIP_EXPENSES_DELETE]", error)
        return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 })
    }
}
