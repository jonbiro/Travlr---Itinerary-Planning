import { NextResponse } from 'next/server'

// Mock expense storage (in production, use Prisma)
// This is a temporary in-memory store for demonstration
const mockExpenses: Map<string, any[]> = new Map()

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const tripId = searchParams.get('tripId')

    if (!tripId) {
        return NextResponse.json(
            { error: 'tripId parameter is required' },
            { status: 400 }
        )
    }

    // In production, use: prisma.expense.findMany({ where: { tripId } })
    const expenses = mockExpenses.get(tripId) || []

    return NextResponse.json({ expenses })
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { tripId, amount, currency, category, description, date } = body

        if (!tripId || amount === undefined || !category || !date) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Create new expense (in production, use Prisma)
        const newExpense = {
            id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            tripId,
            amount,
            currency: currency || 'USD',
            category,
            description,
            date: new Date(date),
            createdAt: new Date(),
            updatedAt: new Date(),
        }

        // Store in mock storage
        const tripExpenses = mockExpenses.get(tripId) || []
        tripExpenses.unshift(newExpense)
        mockExpenses.set(tripId, tripExpenses)

        return NextResponse.json(newExpense)
    } catch (error) {
        console.error('Error creating expense:', error)
        return NextResponse.json(
            { error: 'Failed to create expense' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url)
    const expenseId = searchParams.get('id')

    if (!expenseId) {
        return NextResponse.json(
            { error: 'id parameter is required' },
            { status: 400 }
        )
    }

    // In production, use: prisma.expense.delete({ where: { id: expenseId } })
    // For mock storage, find and remove the expense
    for (const [tripId, expenses] of mockExpenses) {
        const index = expenses.findIndex(e => e.id === expenseId)
        if (index !== -1) {
            expenses.splice(index, 1)
            mockExpenses.set(tripId, expenses)
            return NextResponse.json({ success: true })
        }
    }

    return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
    )
}
