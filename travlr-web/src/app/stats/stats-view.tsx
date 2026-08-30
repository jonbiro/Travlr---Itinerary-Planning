"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
    Activity,
    AlertCircle,
    ArrowRight,
    Clock,
    Flag,
    Globe,
    Loader2,
    MapPin,
    Plane,
    RefreshCw,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface StatsTrip {
    destination: string | null
    dayCount: number
    activityCount: number
}

export interface TravelStats {
    totalTrips: number
    totalDestinations: number
    totalDaysPlanned: number
    totalActivities: number
    topDestinations: { name: string; visits: number }[]
}

function asRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === "object"
        ? value as Record<string, unknown>
        : null
}

function asOptionalString(value: unknown): string | null {
    if (typeof value !== "string") return null

    const normalized = value.trim().replace(/\s+/g, " ")
    return normalized.length > 0 ? normalized : null
}

function normalizeTrip(value: unknown): StatsTrip | null {
    const record = asRecord(value)
    if (!record) return null

    const days = Array.isArray(record.days) ? record.days : []
    const activityCount = days.reduce((total, day) => {
        const dayRecord = asRecord(day)
        return total + (Array.isArray(dayRecord?.activities) ? dayRecord.activities.length : 0)
    }, 0)

    return {
        destination: asOptionalString(record.destination),
        dayCount: days.length,
        activityCount,
    }
}

/**
 * Convert the API response into the small set of fields the stats view needs.
 * Keeping this boundary defensive prevents a malformed response from looking
 * like a real trip with fabricated numbers.
 */
export function normalizeTrips(payload: unknown): StatsTrip[] {
    if (!Array.isArray(payload)) {
        throw new Error("We couldn’t read your trips right now.")
    }

    const trips = payload
        .map(normalizeTrip)
        .filter((trip): trip is StatsTrip => trip !== null)

    if (payload.length > 0 && trips.length === 0) {
        throw new Error("We received an unexpected trips response.")
    }

    return trips
}

export function deriveTravelStats(trips: StatsTrip[]): TravelStats {
    const destinations = new Map<string, { name: string; visits: number }>()

    for (const trip of trips) {
        if (!trip.destination) continue

        const key = trip.destination.toLocaleLowerCase()
        const existing = destinations.get(key)

        if (existing) {
            existing.visits += 1
        } else {
            destinations.set(key, { name: trip.destination, visits: 1 })
        }
    }

    return {
        totalTrips: trips.length,
        totalDestinations: destinations.size,
        totalDaysPlanned: trips.reduce((total, trip) => total + trip.dayCount, 0),
        totalActivities: trips.reduce((total, trip) => total + trip.activityCount, 0),
        topDestinations: Array.from(destinations.values())
            .sort((a, b) => b.visits - a.visits || a.name.localeCompare(b.name))
            .slice(0, 5),
    }
}

interface StatCardProps {
    icon: React.ReactNode
    label: string
    value: string | number
    description?: string
    className?: string
}

function StatCard({ icon, label, value, description, className }: StatCardProps) {
    return (
        <Card className={cn("transition-shadow hover:shadow-md", className)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
            </CardContent>
        </Card>
    )
}

function UnavailableMetric({
    icon,
    label,
    description,
    className,
}: {
    icon: React.ReactNode
    label: string
    description: string
    className?: string
}) {
    return (
        <Card className={cn("border-dashed", className)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-sm">{label}</CardDescription>
                {icon}
            </CardHeader>
            <CardContent>
                <CardTitle className="text-3xl font-bold">—</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    )
}

function LoadingState() {
    return (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed p-12" role="status">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Loading your travel stats…</p>
        </div>
    )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <div className="mx-auto flex min-h-64 max-w-xl flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center" role="alert">
            <div className="rounded-full bg-destructive/10 p-3 text-destructive">
                <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Stats are temporarily unavailable</h2>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <Button type="button" variant="outline" className="mt-5" onClick={onRetry}>
                <RefreshCw className="h-4 w-4" />
                Try again
            </Button>
        </div>
    )
}

function EmptyState() {
    return (
        <div className="mx-auto flex min-h-64 max-w-xl flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
                <MapPin className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">No travel stats yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
                Create your first trip and your stats will appear here automatically.
            </p>
            <Button asChild className="mt-5">
                <Link href="/dashboard">
                    Plan your first trip
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </Button>
        </div>
    )
}

export function TravelStatsDashboard() {
    const [trips, setTrips] = useState<StatsTrip[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const loadTrips = useCallback(async (signal?: AbortSignal) => {
        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch("/api/trips", {
                cache: "no-store",
                signal,
            })
            const payload: unknown = await response.json().catch(() => null)

            if (!response.ok) {
                const responseMessage = asRecord(payload)?.error
                throw new Error(
                    typeof responseMessage === "string" && responseMessage.trim()
                        ? responseMessage
                        : "We couldn’t load your trips right now.",
                )
            }

            const normalizedTrips = normalizeTrips(payload)
            if (signal?.aborted) return

            setTrips(normalizedTrips)
        } catch (loadError) {
            if (signal?.aborted || (loadError instanceof Error && loadError.name === "AbortError")) return

            setTrips([])
            setError(loadError instanceof Error ? loadError.message : "We couldn’t load your trips right now.")
        } finally {
            if (!signal?.aborted) setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        const controller = new AbortController()
        void loadTrips(controller.signal)

        return () => controller.abort()
    }, [loadTrips])

    const stats = useMemo(() => deriveTravelStats(trips), [trips])

    if (isLoading) return <LoadingState />
    if (error) return <ErrorState message={error} onRetry={() => void loadTrips()} />
    if (trips.length === 0) return <EmptyState />

    return (
        <div className="space-y-6" aria-live="polite">
            <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => void loadTrips()} disabled={isLoading}>
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard
                    icon={<Globe className="h-4 w-4 text-blue-500" />}
                    label="Destinations"
                    value={stats.totalDestinations}
                    description="saved in your trips"
                />
                <StatCard
                    icon={<MapPin className="h-4 w-4 text-green-500" />}
                    label="Days Planned"
                    value={stats.totalDaysPlanned}
                    description="across your itineraries"
                />
                <StatCard
                    icon={<Plane className="h-4 w-4 text-purple-500" />}
                    label="Total Trips"
                    value={stats.totalTrips}
                    description="in your travel library"
                />
                <StatCard
                    icon={<Activity className="h-4 w-4 text-orange-500" />}
                    label="Activities"
                    value={stats.totalActivities}
                    description="on saved itineraries"
                />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <UnavailableMetric
                    icon={<Globe className="h-4 w-4 text-blue-500" />}
                    label="Total Distance"
                    description="Distance data will appear once trip routes are recorded."
                />
                <UnavailableMetric
                    icon={<Clock className="h-4 w-4 text-orange-500" />}
                    label="Flight Time"
                    description="Flight details will appear once flights are added to a trip."
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <Flag className="h-4 w-4 text-red-500" />
                        Top Destinations
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {stats.topDestinations.length > 0 ? (
                        <div className="space-y-3">
                            {stats.topDestinations.map((destination, index) => (
                                <div key={destination.name.toLocaleLowerCase()} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={cn(
                                                "w-6 text-center text-lg font-bold",
                                                index === 0 && "text-yellow-500",
                                                index === 1 && "text-gray-400",
                                                index === 2 && "text-orange-600",
                                            )}
                                        >
                                            {index + 1}
                                        </span>
                                        <span className="font-medium">{destination.name}</span>
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                        {destination.visits} {destination.visits === 1 ? "trip" : "trips"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Add destinations to your trips to see them ranked here.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
