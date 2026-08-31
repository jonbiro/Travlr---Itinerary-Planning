"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
    Plus,
    Loader2,
    Trash2,
    DollarSign,
    PieChart,
    TrendingUp,
    Utensils,
    Car,
    Hotel,
    Ticket,
    ShoppingBag,
    ReceiptText,
    RefreshCw,
    type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { cn } from "@/lib/utils"
import type { Expense, ExpenseCategory } from "@/lib/types/expense"
import { EXPENSE_CATEGORIES, getCategoryInfo, calculateExpenseSummary } from "@/lib/types/expense"

const categoryIcons: Record<ExpenseCategory, LucideIcon> = {
    food: Utensils,
    transport: Car,
    lodging: Hotel,
    activities: Ticket,
    shopping: ShoppingBag,
    other: ReceiptText,
}

function CategoryIcon({ category, className }: { category: ExpenseCategory; className?: string }) {
    const Icon = categoryIcons[category] ?? ReceiptText
    return <Icon className={className} aria-hidden="true" />
}

function formatDateOnly(value: Date | string): string {
    const source = typeof value === "string" ? value : value.toISOString()
    const dateOnly = source.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
    const date = new Date(dateOnly ? `${dateOnly}T00:00:00.000Z` : source)
    if (Number.isNaN(date.getTime())) return "Date unavailable"

    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    }).format(date)
}

function todayAsDateInput(): string {
    const now = new Date()
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

interface ExpenseTrackerProps {
    tripId?: string
    budget?: number
    currency?: string
}

type AuthState = "auth" | "setup"

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

function classifyAuthFailure(payload: unknown): AuthState {
    const record = isRecord(payload) ? payload : null
    return record?.code === "AUTH_NOT_CONFIGURED" || record?.authConfigured === false
        ? "setup"
        : "auth"
}

export function ExpenseTracker({ tripId, budget = 0, currency = "USD" }: ExpenseTrackerProps) {
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isAddingExpense, setIsAddingExpense] = useState(false)
    const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null)
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [authState, setAuthState] = useState<AuthState | null>(null)
    const [retryToken, setRetryToken] = useState(0)

    // Form state
    const [amount, setAmount] = useState("")
    const [category, setCategory] = useState<ExpenseCategory>("food")
    const [description, setDescription] = useState("")
    const [date, setDate] = useState(todayAsDateInput)

    // Load expenses
    useEffect(() => {
        if (!tripId) {
            setExpenses([])
            setIsLoading(false)
            setError(null)
            setAuthState(null)
            return
        }

        const requestedTripId = tripId
        const controller = new AbortController()

        async function loadExpenses() {
            setIsLoading(true)
            setError(null)
            setAuthState(null)
            try {
                const res = await fetch(`/api/trip/expenses?tripId=${encodeURIComponent(requestedTripId)}`, {
                    signal: controller.signal,
                })
                const data: unknown = await res.json().catch(() => null)
                if (res.status === 401) {
                    const nextAuthState = classifyAuthFailure(data)
                    setAuthState(nextAuthState)
                    throw new Error(nextAuthState === "setup"
                        ? "Sign-in is not configured for this environment yet."
                        : "Sign in to view and manage shared expenses.")
                }
                if (!res.ok) {
                    const message = typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
                        ? data.error
                        : "Unable to load expenses"
                    throw new Error(message)
                }
                const expenses = typeof data === "object" && data !== null && "expenses" in data && Array.isArray(data.expenses)
                    ? data.expenses as Expense[]
                    : []
                setExpenses(expenses)
            } catch (loadError) {
                if (controller.signal.aborted) return
                setError(loadError instanceof Error ? loadError.message : "Unable to load expenses")
            } finally {
                if (!controller.signal.aborted) setIsLoading(false)
            }
        }

        void loadExpenses()

        return () => controller.abort()
    }, [tripId, retryToken])

    const summary = calculateExpenseSummary(expenses, budget || null)

    async function handleAddExpense() {
        const numericAmount = Number(amount)
        if (!tripId || !amount || !Number.isFinite(numericAmount) || numericAmount < 0) {
            setError("Enter a valid non-negative amount.")
            return
        }

        setIsAddingExpense(true)
        setError(null)
        try {
            const res = await fetch("/api/trip/expenses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tripId,
                    amount: numericAmount,
                    currency,
                    category,
                    description: description || null,
                    date: new Date(`${date}T00:00:00.000Z`).toISOString(),
                }),
            })

            const payload: unknown = await res.json().catch(() => null)
            if (res.status === 401) {
                const nextAuthState = classifyAuthFailure(payload)
                setAuthState(nextAuthState)
                throw new Error(nextAuthState === "setup"
                    ? "Sign-in is not configured for this environment yet."
                    : "Sign in to add shared expenses.")
            }
            if (!res.ok) {
                const message = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
                    ? payload.error
                    : "Unable to add expense"
                throw new Error(message)
            }

            setExpenses((previousExpenses) => [payload as Expense, ...previousExpenses])
            setAmount("")
            setDescription("")
            setCategory("food")
            setDate(todayAsDateInput())
            setDialogOpen(false)
        } catch (addError) {
            setError(addError instanceof Error ? addError.message : "Unable to add expense")
        } finally {
            setIsAddingExpense(false)
        }
    }

    async function handleDeleteExpense(expense: Expense) {
        if (!expense.canDelete) return

        setDeletingExpenseId(expense.id)
        setError(null)
        try {
            const res = await fetch(`/api/trip/expenses?id=${encodeURIComponent(expense.id)}`, {
                method: "DELETE",
            })

            const payload: unknown = await res.json().catch(() => null)
            if (res.status === 401) {
                const nextAuthState = classifyAuthFailure(payload)
                setAuthState(nextAuthState)
                throw new Error(nextAuthState === "setup"
                    ? "Sign-in is not configured for this environment yet."
                    : "Sign in to manage shared expenses.")
            }
            if (!res.ok) {
                const message = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
                    ? payload.error
                    : "Unable to delete expense"
                throw new Error(message)
            }
            setExpenses((previousExpenses) => previousExpenses.filter((currentExpense) => currentExpense.id !== expense.id))
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : "Unable to delete expense")
        } finally {
            setDeletingExpenseId(null)
            setExpenseToDelete(null)
        }
    }

    if (!tripId) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 h-full">
                <DollarSign className="h-12 w-12 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Create or select a trip to track expenses</p>
            </div>
        )
    }

    if (authState) {
        const isSetup = authState === "setup"

        return (
            <div className="flex h-full flex-col items-center justify-center space-y-4 p-8 text-center" role="alert">
                <DollarSign className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
                <div>
                    <h3 className="font-semibold text-lg">{isSetup ? "Finish setting up Travlr" : "Sign in to manage shared expenses"}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {isSetup
                            ? "Sign-in is not configured for this environment yet. Add the required authentication settings, then try again."
                            : "Trip members can record and review shared spending after signing in."}
                    </p>
                </div>
                {isSetup ? (
                    <Button type="button" variant="outline" onClick={() => setRetryToken((token) => token + 1)}>
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        Try again
                    </Button>
                ) : (
                    <Button asChild>
                        <Link href="/api/auth/signin">Sign in</Link>
                    </Button>
                )}
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 h-full" role="status" aria-live="polite">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
                <p className="mt-2 text-sm text-muted-foreground">Loading expenses...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full p-4 space-y-4">
            {error && (
                <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
                    {error}
                </p>
            )}
            {/* Budget Overview Card */}
            <Card className={cn(
                "transition-colors",
                summary.percentUsed && summary.percentUsed > 90 && "border-destructive"
            )}>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Budget Overview</CardTitle>
                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                                <Button type="button" size="sm">
                                    <Plus className="h-4 w-4 mr-1" aria-hidden="true" /> Add expense
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add Expense</DialogTitle>
                                    <DialogDescription>
                                        Record a new expense for this trip
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="amount">Amount ({currency})</Label>
                                        <Input
                                            id="amount"
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="category">Category</Label>
                                        <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
                                            <SelectTrigger id="category">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {EXPENSE_CATEGORIES.map((cat) => (
                                                    <SelectItem key={cat.value} value={cat.value}>
                                                        <span className="flex items-center gap-2">
                                                        <CategoryIcon category={cat.value} className="h-4 w-4" />
                                                            <span>{cat.label}</span>
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="description">Description (optional)</Label>
                                        <Input
                                            id="description"
                                            placeholder="What was this for?"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="date">Date</Label>
                                        <Input
                                            id="date"
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                        />
                                    </div>
                                    <Button
                                        className="w-full"
                                        onClick={handleAddExpense}
                                        disabled={!amount || isAddingExpense}
                                    >
                                        {isAddingExpense ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : (
                                            <Plus className="h-4 w-4 mr-2" />
                                        )}
                                        Add Expense
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-3xl font-bold">{currency} {summary.total.toFixed(2)}</p>
                                <p className="text-sm text-muted-foreground">
                                    {budget ? `of ${currency} ${budget.toFixed(2)} budget` : 'spent so far'}
                                </p>
                            </div>
                            {summary.remaining !== null && (
                                <div className={cn(
                                    "text-right",
                                    summary.remaining < 0 && "text-destructive"
                                )}>
                                    <p className="font-medium">{currency} {summary.remaining.toFixed(2)}</p>
                                    <p className="text-xs text-muted-foreground">remaining</p>
                                </div>
                            )}
                        </div>
                        {summary.percentUsed !== null && (
                            <Progress
                                value={Math.min(summary.percentUsed, 100)}
                                aria-label="Budget spent"
                                aria-valuetext={`${currency} ${summary.total.toFixed(2)} of ${currency} ${budget.toFixed(2)}, ${Math.round(summary.percentUsed)}%`}
                                className={cn(
                                    "h-2",
                                    summary.percentUsed > 90 && "[&>div]:bg-destructive"
                                )}
                            />
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Category Breakdown */}
            {expenses.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <PieChart className="h-4 w-4" /> By Category
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            {EXPENSE_CATEGORIES.filter(cat => summary.byCategory[cat.value] > 0).map((cat) => (
                                <div key={cat.value} className="flex items-center justify-between bg-muted/50 rounded p-2">
                                    <span className="flex items-center gap-1">
                                        <CategoryIcon category={cat.value} className="h-4 w-4" />
                                        <span className="text-xs">{cat.label}</span>
                                    </span>
                                    <span className="font-medium text-xs">{currency} {summary.byCategory[cat.value].toFixed(0)}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Expense List */}
            <div className="flex-1 min-h-0">
                <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Recent Expenses
                </h3>
                <ScrollArea className="h-[calc(100%-2rem)]">
                    <div className="space-y-2 pr-4">
                        {expenses.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                No expenses yet. Add your first expense!
                            </p>
                        ) : (
                            expenses.map((expense) => {
                                const catInfo = getCategoryInfo(expense.category)
                                return (
                                    <div
                                        key={expense.id}
                                        className="flex items-center justify-between p-3 bg-card border rounded-lg group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <CategoryIcon category={expense.category} className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium text-sm">
                                                    {expense.description || catInfo.label}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDateOnly(expense.date)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">
                                                {expense.currency} {Number(expense.amount).toFixed(2)}
                                            </span>
                                            {expense.canDelete && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9"
                                                    onClick={() => setExpenseToDelete(expense)}
                                                    disabled={deletingExpenseId !== null}
                                                    aria-label={`Delete ${expense.description || catInfo.label} expense`}
                                                >
                                                    {deletingExpenseId === expense.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin text-destructive" aria-hidden="true" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </ScrollArea>
            </div>
            <ConfirmDialog
                open={expenseToDelete !== null}
                onOpenChange={(open) => {
                    if (!open) setExpenseToDelete(null)
                }}
                title="Delete expense?"
                description={expenseToDelete
                    ? `Delete ${expenseToDelete.description || getCategoryInfo(expenseToDelete.category).label} permanently? This cannot be undone.`
                    : "This expense will be permanently deleted."}
                confirmLabel="Delete expense"
                cancelLabel="Keep expense"
                isConfirming={deletingExpenseId !== null}
                onConfirm={() => {
                    if (expenseToDelete) return handleDeleteExpense(expenseToDelete)
                }}
            />
        </div>
    )
}
