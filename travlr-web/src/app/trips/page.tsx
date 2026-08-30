"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, CalendarDays, MapPin, Plus, RefreshCw } from "lucide-react"

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

export default function TripsPage() {
    const [trips, setTrips] = useState<TripSummary[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const loadTrips = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch("/api/trips")
            if (!response.ok) throw new Error("We couldn’t load your trips right now.")

            const payload: unknown = await response.json()
            if (!Array.isArray(payload)) throw new Error("We couldn’t read your trips right now.")

            setTrips(payload.map(normalizeTrip).filter((trip): trip is TripSummary => trip !== null))
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "We couldn’t load your trips right now.")
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        void loadTrips()
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
                    <div className="mx-auto flex min-h-64 max-w-xl flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
                        <h2 className="text-lg font-semibold">Trips are temporarily unavailable</h2>
                        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
                        <Button type="button" variant="outline" className="mt-5" onClick={() => void loadTrips()}>
                            Try again
                        </Button>
                    </div>
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
