"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, CalendarDays, Database, LogIn, MapPin, Plus, RefreshCw, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type TripSummary = {
    id: string
    name: string
    destination: string | null
    startDate: string | null
    endDate: string | null
    budget: string | number | null
    currency: string
    dayCount: number
}

type TripsLoadError = {
    kind: "auth" | "setup" | "generic"
    message: string
}

function asString(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value : null
}

function normalizeTrip(value: unknown): TripSummary | null {
    if (!value || typeof value !== "object") return null

    const record = value as Record<string, unknown>
    const id = asString(record.id)
    if (!id) return null

    const budget = typeof record.budget === "string" || typeof record.budget === "number"
        ? record.budget
        : null

    return {
        id,
        name: asString(record.name) ?? asString(record.tripName) ?? "Untitled trip",
        destination: asString(record.destination),
        startDate: asString(record.startDate),
        endDate: asString(record.endDate),
        budget,
        currency: asString(record.currency) ?? "USD",
        dayCount: Array.isArray(record.days) ? record.days.length : 0,
    }
}

function formatDate(value: string | null): string | null {
    if (!value) return null

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null

    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    }).format(date)
}

function formatDateRange(startDate: string | null, endDate: string | null): string {
    const start = formatDate(startDate)
    const end = formatDate(endDate)

    if (start && end) return start === end ? start : `${start} – ${end}`
    return start ?? end ?? "Dates to be confirmed"
}

function formatBudget(trip: TripSummary): string | null {
    if (trip.budget === null || trip.budget === "") return null
    return `${trip.currency} ${trip.budget}`
}

function responseRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null
}

function classifyLoadError(response: Response, payload: unknown): TripsLoadError {
    const record = responseRecord(payload)
    const code = typeof record?.code === "string" ? record.code : ""
    const message = typeof record?.error === "string" && record.error.trim()
        ? record.error
        : "We couldn’t load your trips right now."

    if (
        response.status === 503
        || code === "DATABASE_NOT_CONFIGURED"
        || message.toLowerCase().includes("database is not configured")
    ) {
        return {
            kind: "setup",
            message: "Connect a database to load and save trips in this environment.",
        }
    }

    if (
        response.status === 401
        || code === "AUTH_REQUIRED"
        || code === "AUTH_NOT_CONFIGURED"
        || record?.authConfigured === false
    ) {
        return {
            kind: code === "AUTH_NOT_CONFIGURED" || record?.authConfigured === false ? "setup" : "auth",
            message: code === "AUTH_NOT_CONFIGURED" || record?.authConfigured === false
                ? "Sign-in is not configured for this environment yet."
                : "Sign in to view your private trip library.",
        }
    }

    return { kind: "generic", message }
}

function AccessState({ error, onRetry }: { error: TripsLoadError; onRetry: () => void }) {
    const isAuth = error.kind === "auth"
    const isSetup = error.kind === "setup"

    return (
        <div className="mx-auto flex min-h-64 max-w-xl flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center" role="alert">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
                {isAuth ? <ShieldCheck className="h-6 w-6" /> : <Database className="h-6 w-6" />}
            </div>
            <h2 className="mt-4 text-lg font-semibold">
                {isAuth ? "Sign in to see your trips" : isSetup ? "Travlr needs a little setup" : "Trips are temporarily unavailable"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
                {isAuth && (
                    <Button asChild>
                        <Link href="/api/auth/signin?callbackUrl=%2Ftrips">
                            <LogIn className="h-4 w-4" />
                            Sign in
                        </Link>
                    </Button>
                )}
                <Button type="button" variant={isAuth ? "outline" : "default"} onClick={onRetry}>
                    <RefreshCw className="h-4 w-4" />
                    Try again
                </Button>
                {isAuth && (
                    <Button asChild type="button" variant="ghost">
                        <Link href="/">Back home</Link>
                    </Button>
                )}
            </div>
        </div>
    )
}

export default function TripsPage() {
    const [trips, setTrips] = useState<TripSummary[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<TripsLoadError | null>(null)
    const requestRef = useRef<AbortController | null>(null)

    const loadTrips = useCallback(async () => {
        requestRef.current?.abort()
        const controller = new AbortController()
        requestRef.current = controller
        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch("/api/trips", {
                cache: "no-store",
                signal: controller.signal,
            })
            const payload: unknown = await response.json().catch(() => null)
            if (!response.ok) {
                throw classifyLoadError(response, payload)
            }

            if (!Array.isArray(payload)) throw new Error("We couldn’t read your trips right now.")

            if (controller.signal.aborted) return
            setTrips(payload.map(normalizeTrip).filter((trip): trip is TripSummary => trip !== null))
        } catch (loadError) {
            if (controller.signal.aborted || (loadError instanceof Error && loadError.name === "AbortError")) return

            setError(
                typeof loadError === "object" && loadError !== null && "kind" in loadError && "message" in loadError
                    ? loadError as TripsLoadError
                    : {
                        kind: "generic",
                        message: loadError instanceof Error ? loadError.message : "We couldn’t load your trips right now.",
                    },
            )
        } finally {
            if (requestRef.current === controller) {
                requestRef.current = null
                setIsLoading(false)
            }
        }
    }, [])

    useEffect(() => {
        void loadTrips()
        return () => {
            requestRef.current?.abort()
            requestRef.current = null
        }
    }, [loadTrips])

    return (
        <main className="min-h-[calc(100vh-4rem)]">
            <section className="border-b bg-muted/20">
                <div className="container flex flex-col gap-5 px-4 py-8 md:flex-row md:items-end md:justify-between md:px-6">
                    <div>
                        <p className="text-sm font-medium text-primary">Your travel library</p>
                        <h1 className="mt-1 text-3xl font-bold tracking-tight">My Trips</h1>
                        <p className="mt-2 text-muted-foreground">Keep every itinerary close, from the first idea to the last memory.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" onClick={() => void loadTrips()} disabled={isLoading}>
                            <RefreshCw className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                            Refresh
                        </Button>
                        <Button asChild>
                            <Link href="/dashboard">
                                <Plus className="h-4 w-4" />
                                Plan a trip
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            <section className="container px-4 py-8 md:px-6 md:py-12" aria-live="polite">
                {isLoading ? (
                    <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed text-muted-foreground">
                        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                        Loading your trips…
                    </div>
                ) : error ? (
                    <AccessState error={error} onRetry={() => void loadTrips()} />
                ) : trips.length === 0 ? (
                    <div className="mx-auto flex min-h-64 max-w-xl flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
                        <div className="rounded-full bg-primary/10 p-3 text-primary">
                            <MapPin className="h-6 w-6" />
                        </div>
                        <h2 className="mt-4 text-lg font-semibold">Your next adventure starts here</h2>
                        <p className="mt-2 text-sm text-muted-foreground">Create your first itinerary and keep all the details in one place.</p>
                        <Button asChild className="mt-5">
                            <Link href="/dashboard">
                                Create your first trip
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {trips.map((trip) => {
                            const budget = formatBudget(trip)

                            return (
                                <Card key={trip.id} className="flex flex-col transition-shadow hover:shadow-md">
                                    <CardHeader>
                                        <CardTitle className="line-clamp-2">{trip.name}</CardTitle>
                                        <CardDescription className="flex items-center gap-1.5">
                                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                                            {trip.destination ?? "Destination to be confirmed"}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex flex-1 flex-col gap-3">
                                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                            <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                            <span>{trip.dayCount} {trip.dayCount === 1 ? "day" : "days"}</span>
                                            {budget && <span>{budget}</span>}
                                        </div>
                                        <Button asChild variant="outline" className="mt-auto w-full">
                                            <Link href={`/trips/${encodeURIComponent(trip.id)}`}>
                                                View itinerary
                                                <ArrowRight className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </section>
        </main>
    )
}
