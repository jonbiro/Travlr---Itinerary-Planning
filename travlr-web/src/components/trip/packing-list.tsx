"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Luggage, RefreshCw } from "lucide-react"

interface PackingItem {
    item: string
    reason?: string
    checked: boolean
}

interface PackingCategory {
    name: string
    items: PackingItem[]
}

const STORAGE_PREFIX = "travlr:packing-list:"

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeCategories(value: unknown): PackingCategory[] {
    if (!Array.isArray(value)) return []

    return value.flatMap((category) => {
        if (!isRecord(category) || typeof category.name !== "string" || !Array.isArray(category.items)) {
            return []
        }

        const items = category.items.flatMap((item) => {
            if (!isRecord(item) || typeof item.item !== "string" || !item.item.trim()) return []
            return [{
                item: item.item.trim(),
                reason: typeof item.reason === "string" && item.reason.trim() ? item.reason.trim() : undefined,
                checked: item.checked === true,
            }]
        })

        return [{ name: category.name.trim() || "Essentials", items }]
    })
}

function getStorageKey(tripId: string | undefined, destination: string, days: number, activities: string[]) {
    const identity = tripId?.trim() || [destination.trim().toLowerCase(), days, activities.join("\u001f")].join("|")
    return `${STORAGE_PREFIX}${encodeURIComponent(identity)}`
}

export function PackingList({
    tripId,
    destination,
    days,
    activities,
}: {
    tripId?: string
    destination: string
    days: number
    activities: string[]
}) {
    const [categories, setCategories] = useState<PackingCategory[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [generated, setGenerated] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [authState, setAuthState] = useState<"auth" | "setup" | null>(null)
    const generationController = useRef<AbortController | null>(null)
    const storageKey = useMemo(
        () => getStorageKey(tripId, destination, days, activities),
        [activities, days, destination, tripId],
    )

    useEffect(() => {
        generationController.current?.abort()
        setCategories([])
        setGenerated(false)
        setIsLoading(false)
        setError(null)
        setAuthState(null)

        if (typeof window === "undefined") return

        try {
            const stored = window.localStorage.getItem(storageKey)
            if (!stored) return

            const savedCategories = normalizeCategories(JSON.parse(stored))
            if (savedCategories.length > 0) {
                setCategories(savedCategories)
                setGenerated(true)
            }
        } catch {
            // Ignore malformed or unavailable local storage and let the user
            // generate a fresh list.
        }
    }, [storageKey])

    useEffect(() => () => generationController.current?.abort(), [])

    const persistCategories = (nextCategories: PackingCategory[]) => {
        if (typeof window === "undefined") return

        try {
            window.localStorage.setItem(storageKey, JSON.stringify(nextCategories))
        } catch {
            // Local storage can be disabled or full; the in-memory list still works.
        }
    }

    const generateList = async () => {
        generationController.current?.abort()
        const controller = new AbortController()
        generationController.current = controller
        setIsLoading(true)
        setError(null)
        setAuthState(null)
        try {
            const response = await fetch("/api/trip/packing-list", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ destination, days, activities }),
                signal: controller.signal,
            })
            const data: unknown = await response.json().catch(() => null)
            if (response.status === 401) {
                const nextAuthState = isRecord(data)
                    && (data.code === "AUTH_NOT_CONFIGURED" || data.authConfigured === false)
                    ? "setup"
                    : "auth"
                setAuthState(nextAuthState)
                throw new Error(nextAuthState === "setup"
                    ? "Sign-in is not configured for this environment yet."
                    : "Sign in to generate and save a packing list.")
            }
            if (!response.ok) {
                const message = isRecord(data) && typeof data.error === "string" ? data.error : "Unable to generate packing list"
                throw new Error(message)
            }

            const nextCategories = normalizeCategories(isRecord(data) ? data.categories : null)
            setCategories(nextCategories)
            persistCategories(nextCategories)
            setGenerated(true)
        } catch (error) {
            if (controller.signal.aborted) return
            setError(error instanceof Error ? error.message : "Unable to generate packing list")
        } finally {
            if (!controller.signal.aborted) setIsLoading(false)
        }
    }

    const toggleItem = (categoryIndex: number, itemIndex: number) => {
        setCategories((previousCategories) => {
            const nextCategories = previousCategories.map((category, currentCategoryIndex) => (
                currentCategoryIndex !== categoryIndex
                    ? category
                    : {
                        ...category,
                        items: category.items.map((item, currentItemIndex) => (
                            currentItemIndex === itemIndex ? { ...item, checked: !item.checked } : item
                        )),
                    }
            ))
            persistCategories(nextCategories)
            return nextCategories
        })
    }

    if (authState) {
        const isSetup = authState === "setup"

        return (
            <div className="flex h-full flex-col items-center justify-center space-y-4 p-8 text-center" role="alert">
                <Luggage className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
                <div>
                    <h3 className="font-semibold text-lg">{isSetup ? "Finish setting up Travlr" : "Sign in to build a packing list"}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {isSetup
                            ? "Sign-in is not configured for this environment yet. Add the required authentication settings, then try again."
                            : "Packing lists are saved to your trip and need an authenticated account."}
                    </p>
                </div>
                {isSetup ? (
                    <Button type="button" variant="outline" onClick={() => void generateList()}>
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

    if (!generated) {
        return (
            <div className="flex flex-col items-center justify-center space-y-4 p-8 text-center" role="region" aria-label="Packing list generator">
                <div className="bg-primary/10 p-4 rounded-full">
                    <Luggage className="h-8 w-8 text-primary" aria-hidden="true" />
                </div>
                <div>
                    <h3 className="font-semibold text-lg">Smart Packing List</h3>
                    <p className="text-sm text-muted-foreground">
                        Get a personalized list based on your destination and planned activities. Your checklist stays on this device.
                    </p>
                </div>
                <Button type="button" onClick={generateList} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Luggage className="mr-2 h-4 w-4" aria-hidden="true" />}
                    {isLoading ? "Generating…" : "Generate list"}
                </Button>
                {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            </div>
        )
    }

    return (
        <div className="space-y-6 p-4" role="region" aria-label="Packing list">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Luggage className="h-5 w-5" aria-hidden="true" /> Packing list
                </h3>
                <Button type="button" variant="ghost" size="sm" onClick={() => setGenerated(false)}>
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    Regenerate
                </Button>
            </div>
            {error && <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{error}</p>}
            {categories.length === 0 && (
                <p className="text-sm text-muted-foreground">No items were returned. Try generating the list again.</p>
            )}
            {categories.map((category, catIdx) => (
                <div key={`${category.name}-${catIdx}`} className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">{category.name}</h4>
                    <div className="space-y-2">
                        {category.items.map((item, itemIdx) => (
                            <div key={itemIdx} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                <Checkbox
                                    id={`item-${catIdx}-${itemIdx}`}
                                    checked={item.checked}
                                    onCheckedChange={() => toggleItem(catIdx, itemIdx)}
                                    aria-label={`Mark ${item.item} as packed`}
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <label
                                        htmlFor={`item-${catIdx}-${itemIdx}`}
                                        className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${item.checked ? "line-through text-muted-foreground" : ""}`}
                                    >
                                        {item.item}
                                    </label>
                                    {item.reason && (
                                        <p className="text-xs text-muted-foreground">
                                            {item.reason}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
