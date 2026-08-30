// Expense types for the expense tracker

export interface Expense {
    id: string
    tripId: string
    amount: number
    currency: string
    category: ExpenseCategory
    description: string | null
    date: Date | string
    createdAt: Date | string
}

export type ExpenseCategory =
    | 'food'
    | 'transport'
    | 'lodging'
    | 'activities'
    | 'shopping'
    | 'other'

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
    { value: 'food', label: 'Food & Dining' },
    { value: 'transport', label: 'Transportation' },
    { value: 'lodging', label: 'Accommodation' },
    { value: 'activities', label: 'Activities & Tours' },
    { value: 'shopping', label: 'Shopping' },
    { value: 'other', label: 'Other' },
]

export function getCategoryInfo(category: ExpenseCategory) {
    return EXPENSE_CATEGORIES.find(c => c.value === category) || EXPENSE_CATEGORIES[5]
}

export interface ExpenseSummary {
    total: number
    byCategory: Record<ExpenseCategory, number>
    budget: number | null
    remaining: number | null
    percentUsed: number | null
}

export function calculateExpenseSummary(expenses: Expense[], budget: number | null): ExpenseSummary {
    const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

    const byCategory: Record<ExpenseCategory, number> = {
        food: 0,
        transport: 0,
        lodging: 0,
        activities: 0,
        shopping: 0,
        other: 0,
    }

    expenses.forEach(e => {
        byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount)
    })

    return {
        total,
        byCategory,
        budget,
        remaining: budget ? budget - total : null,
        percentUsed: budget ? (total / budget) * 100 : null,
    }
}
