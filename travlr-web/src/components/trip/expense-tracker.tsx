"use client"

import { useState, useEffect } from "react"
import { Plus, Loader2, Trash2, DollarSign, PieChart, TrendingUp } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { cn } from "@/lib/utils"
import type { Expense, ExpenseCategory } from "@/lib/types/expense"
import { EXPENSE_CATEGORIES, getCategoryInfo, calculateExpenseSummary } from "@/lib/types/expense"

interface ExpenseTrackerProps {
    tripId?: string
    budget?: number
    currency?: string
}

export function ExpenseTracker({ tripId, budget = 0, currency = "USD" }: ExpenseTrackerProps) {
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isAddingExpense, setIsAddingExpense] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)

    // Form state
    const [amount, setAmount] = useState("")
    const [category, setCategory] = useState<ExpenseCategory>("food")
    const [description, setDescription] = useState("")
    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"))

    // Load expenses
    useEffect(() => {
        if (!tripId) return

        async function loadExpenses() {
            setIsLoading(true)
            try {
                const res = await fetch(`/api/trip/expenses?tripId=${tripId}`)
                if (res.ok) {
                    const data = await res.json()
                    setExpenses(data.expenses || [])
                }
            } catch (error) {
                console.error("Failed to load expenses:", error)
            } finally {
                setIsLoading(false)
            }
        }

        loadExpenses()
    }, [tripId])

    const summary = calculateExpenseSummary(expenses, budget || null)

    async function handleAddExpense() {
        if (!tripId || !amount) return

        setIsAddingExpense(true)
        try {
            const res = await fetch("/api/trip/expenses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tripId,
                    amount: parseFloat(amount),
                    currency,
                    category,
                    description: description || null,
                    date: new Date(date).toISOString(),
                }),
            })

            if (res.ok) {
                const newExpense = await res.json()
                setExpenses([newExpense, ...expenses])
                // Reset form
                setAmount("")
                setDescription("")
                setCategory("food")
                setDialogOpen(false)
            }
        } catch (error) {
            console.error("Failed to add expense:", error)
        } finally {
            setIsAddingExpense(false)
        }
    }

    async function handleDeleteExpense(expenseId: string) {
        try {
            const res = await fetch(`/api/trip/expenses?id=${expenseId}`, {
                method: "DELETE",
            })

            if (res.ok) {
                setExpenses(expenses.filter(e => e.id !== expenseId))
            }
        } catch (error) {
            console.error("Failed to delete expense:", error)
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

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Loading expenses...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full p-4 space-y-4">
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
                                <Button size="sm">
                                    <Plus className="h-4 w-4 mr-1" /> Add
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
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {EXPENSE_CATEGORIES.map((cat) => (
                                                    <SelectItem key={cat.value} value={cat.value}>
                                                        <span className="flex items-center gap-2">
                                                            <span>{cat.icon}</span>
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
                                        <span>{cat.icon}</span>
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
                                            <span className="text-lg">{catInfo.icon}</span>
                                            <div>
                                                <p className="font-medium text-sm">
                                                    {expense.description || catInfo.label}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {format(new Date(expense.date), "MMM d, yyyy")}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">
                                                {expense.currency} {Number(expense.amount).toFixed(2)}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => handleDeleteExpense(expense.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    )
}
