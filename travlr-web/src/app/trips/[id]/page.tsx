"use client"

import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, CalendarDays, Loader2, MapPin, RefreshCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Activity = {
    id: string
    name: string
    description: string | null
    startTime: string | null
    endTime: string | null
    location: string | null
}

type TripDay = {
    id: string
    dayNumber: number
    date: string | null
    theme: string | null
    activities: Activity[]
}

type TripDetails = {
    id: string
    isOwner: boolean
    name: string
    destination: string | null
    startDate: string | null
    endDate: string | null
    budget: string | number | null
    currency: string
    days: TripDay[]
}

type AuthState = "auth" | "setup"

function asString(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value : null
}

function asNumber(value: unknown, fallback: number): number {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

function classifyAuthFailure(payload: unknown): AuthState {
    const record = isRecord(payload) ? payload : null
    return record?.code === "AUTH_NOT_CONFIGURED" || record?.authConfigured === false
        ? "setup"
        : "auth"
}

function normalizeActivity(value: unknown, index: number): Activity {
    const record = value && typeof value === "object" ? value as Record<string, unknown> : {}

    return {
        id: asString(record.id) ?? `activity-${index}`,
        name: asString(record.name) ?? "Untitled activity",
        description: asString(record.description),
        startTime: asString(record.startTime) ?? asString(record.time),
        endTime: asString(record.endTime),
        location: asString(record.location),
    }
}

function normalizeDay(value: unknown, index: number): TripDay {
    const record = value && typeof value === "object" ? value as Record<string, unknown> : {}
    const activities = Array.isArray(record.activities)
        ? record.activities.map(normalizeActivity)
        : []

    return {
        id: asString(record.id) ?? `day-${index}`,
        dayNumber: asNumber(record.dayNumber ?? record.day, index + 1),
        date: asString(record.date),
        theme: asString(record.theme),
        activities,
    }
}

function normalizeTrip(value: unknown): TripDetails | null {
    if (!value || typeof value !== "object") return null

    const record = value as Record<string, unknown>
    const id = asString(record.id)
    if (!id) return null

    const budget = typeof record.budget === "string" || typeof record.budget === "number"
        ? record.budget
        : null

    return {
        id,
        isOwner: record.isOwner === true,
        name: asString(record.name) ?? asString(record.tripName) ?? "Untitled trip",
        destination: asString(record.destination),
        startDate: asString(record.startDate),
        endDate: asString(record.endDate),
        budget,
        currency: asString(record.currency) ?? "USD",
        days: Array.isArray(record.days) ? record.days.map(normalizeDay) : [],
    }
}

function formatDate(value: string | null): string | null {
    if (!value) return null

    // Date-only values from the database represent a calendar day, not a
    // moment in the viewer's timezone. Formatting them in UTC prevents a
    // trip starting on July 1 from appearing as June 30 in the Americas.
    const dateOnly = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
    const date = new Date(dateOnly ? `${dateOnly}T00:00:00.000Z` : value)
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

function formatTime(activity: Activity): string | null {
    if (activity.startTime && activity.endTime) return `${activity.startTime} – ${activity.endTime}`
    return activity.startTime ?? activity.endTime
}

export default function TripDetailsPage() {
    const params = useParams<{ id: string | string[] }>()
    const router = useRouter()
    const tripId = Array.isArray(params.id) ? params.id[0] : params.id
    const [trip, setTrip] = useState<TripDetails | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [authState, setAuthState] = useState<AuthState | null>(null)

    const loadTrip = useCallback(async (signal?: AbortSignal) => {
        if (!tripId) return

        setIsLoading(true)
        setError(null)
        setAuthState(null)

        try {
            const response = await fetch(`/api/trips/${encodeURIComponent(tripId)}`, {
                signal,
                cache: "no-store",
            })
            const payload: unknown = await response.json().catch(() => null)
            if (response.status === 401) {
                const nextAuthState = classifyAuthFailure(payload)
                setAuthState(nextAuthState)
                throw new Error(nextAuthState === "setup"
                    ? "Sign-in is not configured for this environment yet."
                    : "Sign in to view this itinerary.")
            }
            if (response.status === 404) throw new Error("This trip could not be found.")
            if (!response.ok) throw new Error("We couldn’t load this itinerary right now.")

            const normalizedTrip = normalizeTrip(payload)
            if (!normalizedTrip) throw new Error("We couldn’t read this itinerary right now.")

            setTrip(normalizedTrip)
        } catch (loadError) {
            if (signal?.aborted) return
            setError(loadError instanceof Error ? loadError.message : "We couldn’t load this itinerary right now.")
        } finally {
            if (!signal?.aborted) setIsLoading(false)
        }
    }, [tripId])

    useEffect(() => {
        const controller = new AbortController()
        void loadTrip(controller.signal)

        return () => controller.abort()
    }, [loadTrip])

    if (isLoading) {
        return (
            <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading itinerary…
                </div>
            </main>
        )
    }

    if (error || !trip) {
        const isSetup = authState === "setup"
        const isAuth = authState === "auth"

        return (
            <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
                <div className="max-w-md text-center">
                    <h1 className="text-2xl font-bold">
                        {isAuth ? "Sign in to view this itinerary" : isSetup ? "Finish setting up Travlr" : "Itinerary unavailable"}
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        {isAuth
                            ? "Your trip details are private. Sign in to continue planning with your group."
                            : isSetup
                                ? "Sign-in is not configured for this environment yet. Add the required authentication settings, then try again."
                            : error ?? "This trip could not be found."}
                    </p>
                    <div className="mt-6 flex justify-center gap-2">
                        {isAuth ? (
                            <Button asChild>
                                <Link href="/api/auth/signin">Sign in</Link>
                            </Button>
                        ) : (
                            <Button type="button" variant="outline" onClick={() => void loadTrip()}>
                                <RefreshCw className="h-4 w-4" />
                                Try again
                            </Button>
                        )}
                        <Button asChild>
                            <Link href="/trips">Back to trips</Link>
                        </Button>
                    </div>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-[calc(100vh-4rem)]">
            <section className="border-b bg-muted/20">
                <div className="container px-4 py-8 md:px-6 md:py-10">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </button>
                    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-primary">
                                    {trip.isOwner ? "Your itinerary" : "Shared itinerary"}
                                </p>
                                {!trip.isOwner && <Badge variant="secondary">View only</Badge>}
                            </div>
                            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{trip.name}</h1>
                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                                <span className="inline-flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4 text-primary" />
                                    {trip.destination ?? "Destination to be confirmed"}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <CalendarDays className="h-4 w-4 text-primary" />
                                    {formatDateRange(trip.startDate, trip.endDate)}
                                </span>
                                {trip.budget !== null && trip.budget !== "" && (
                                    <span>{trip.currency} {trip.budget}</span>
                                )}
                            </div>
                        </div>
                        <Button asChild>
                            <Link href={`/dashboard?tripId=${encodeURIComponent(trip.id)}`}>
                                Open dashboard
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            <section className="container px-4 py-8 md:px-6 md:py-12">
                {trip.days.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-10 text-center">
                        <h2 className="text-lg font-semibold">Your itinerary is still taking shape</h2>
                        <p className="mt-2 text-sm text-muted-foreground">Open the dashboard to continue planning. Trip members can view the itinerary and manage shared expenses and memories.</p>
                        <Button asChild className="mt-5">
                            <Link href={`/dashboard?tripId=${encodeURIComponent(trip.id)}`}>Continue planning</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {trip.days.map((day) => (
                            <Card key={day.id}>
                                <CardHeader className="border-b">
                                    <CardTitle>Day {day.dayNumber}{day.theme ? ` · ${day.theme}` : ""}</CardTitle>
                                    {day.date && <CardDescription>{formatDate(day.date) ?? day.date}</CardDescription>}
                                </CardHeader>
                                <CardContent className="pt-6">
                                    {day.activities.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No activities planned for this day yet.</p>
                                    ) : (
                                        <ol className="space-y-4">
                                            {day.activities.map((activity) => {
                                                const time = formatTime(activity)

                                                return (
                                                    <li key={activity.id} className="relative rounded-lg border bg-card p-4">
                                                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                                                            <h3 className="font-medium">{activity.name}</h3>
                                                            {time && <span className="text-sm text-muted-foreground">{time}</span>}
                                                        </div>
                                                        {activity.description && (
                                                            <p className="mt-2 text-sm text-muted-foreground">{activity.description}</p>
                                                        )}
                                                        {activity.location && (
                                                            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                <MapPin className="h-3.5 w-3.5" />
                                                                {activity.location}
                                                            </p>
                                                        )}
                                                    </li>
                                                )
                                            })}
                                        </ol>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </section>
        </main>
    )
}
