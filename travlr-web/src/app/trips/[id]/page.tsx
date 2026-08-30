"use client"

import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, CalendarDays, Loader2, MapPin, RefreshCw } from "lucide-react"

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
    name: string
    destination: string | null
    startDate: string | null
    endDate: string | null
    budget: string | number | null
    currency: string
    days: TripDay[]
}

function asString(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value : null
}

function asNumber(value: unknown, fallback: number): number {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback
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

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null

    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
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

    const loadTrip = useCallback(async () => {
        if (!tripId) return

        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch(`/api/trips/${encodeURIComponent(tripId)}`)
            if (response.status === 404) throw new Error("This trip could not be found.")
            if (!response.ok) throw new Error("We couldn’t load this itinerary right now.")

            const payload: unknown = await response.json()
            const normalizedTrip = normalizeTrip(payload)
            if (!normalizedTrip) throw new Error("We couldn’t read this itinerary right now.")

            setTrip(normalizedTrip)
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "We couldn’t load this itinerary right now.")
        } finally {
            setIsLoading(false)
        }
    }, [tripId])

    useEffect(() => {
        void loadTrip()
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
        return (
            <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
                <div className="max-w-md text-center">
                    <h1 className="text-2xl font-bold">Itinerary unavailable</h1>
                    <p className="mt-2 text-muted-foreground">{error ?? "This trip could not be found."}</p>
                    <div className="mt-6 flex justify-center gap-2">
                        <Button type="button" variant="outline" onClick={() => void loadTrip()}>
                            <RefreshCw className="h-4 w-4" />
                            Try again
                        </Button>
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
                            <p className="text-sm font-medium text-primary">Your itinerary</p>
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
                            <Link href="/dashboard">
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
                        <p className="mt-2 text-sm text-muted-foreground">Open the dashboard to add activities and make this trip yours.</p>
                        <Button asChild className="mt-5">
                            <Link href="/dashboard">Continue planning</Link>
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
