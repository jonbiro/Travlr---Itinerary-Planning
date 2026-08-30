"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
    Activity,
    AlertCircle,
    ArrowRight,
    Database,
    Flag,
    Globe,
    Loader2,
    LogIn,
    MapPin,
    Plane,
    RefreshCw,
    ShieldCheck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    topDestinations: { name: string; tripCount: number }[]
}

export type StatsLoadError = {
    kind: "auth" | "setup" | "generic"
    message: string
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
    if (!record || !Array.isArray(record.days)) return null

    const days = record.days
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
    const destinations = new Map<string, { name: string; tripCount: number }>()

    for (const trip of trips) {
        if (!trip.destination) continue

        const key = trip.destination.toLocaleLowerCase()
        const existing = destinations.get(key)

        if (existing) {
            existing.tripCount += 1
        } else {
            destinations.set(key, { name: trip.destination, tripCount: 1 })
        }
    }

    return {
        totalTrips: trips.length,
        totalDestinations: destinations.size,
        totalDaysPlanned: trips.reduce((total, trip) => total + trip.dayCount, 0),
        totalActivities: trips.reduce((total, trip) => total + trip.activityCount, 0),
        topDestinations: Array.from(destinations.values())
            .sort((a, b) => b.tripCount - a.tripCount || a.name.localeCompare(b.name))
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

function AccessState({ error, onRetry }: { error: StatsLoadError; onRetry: () => void }) {
    const isAuth = error.kind === "auth"
    const isSetup = error.kind === "setup"

    return (
        <div className="mx-auto flex min-h-64 max-w-xl flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center" role="alert">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
                {isAuth ? <ShieldCheck className="h-6 w-6" /> : <Database className="h-6 w-6" />}
            </div>
            <h2 className="mt-4 text-lg font-semibold">
                {isAuth ? "Sign in to see your stats" : isSetup ? "Travlr needs a little setup" : "Stats are temporarily unavailable"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
                {isAuth && (
                    <Button asChild>
                        <Link href="/api/auth/signin?callbackUrl=%2Fstats">
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
    const [error, setError] = useState<StatsLoadError | null>(null)
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
                const record = asRecord(payload)
                const responseMessage = typeof record?.error === "string" && record.error.trim()
                    ? record.error
                    : "We couldn’t load your trips right now."
                const code = typeof record?.code === "string" ? record.code : ""
                const lowerMessage = responseMessage.toLowerCase()
                const kind: StatsLoadError["kind"] = response.status === 503
                    || code === "DATABASE_NOT_CONFIGURED"
                    || lowerMessage.includes("database is not configured")
                    ? "setup"
                    : response.status === 401
                        || code === "AUTH_REQUIRED"
                        || code === "AUTH_NOT_CONFIGURED"
                        || record?.authConfigured === false
                        ? (code === "AUTH_NOT_CONFIGURED" || record?.authConfigured === false ? "setup" : "auth")
                        : "generic"

                throw {
                    kind,
                    message: kind === "setup" && (response.status === 503 || code === "DATABASE_NOT_CONFIGURED" || lowerMessage.includes("database is not configured"))
                        ? "Connect a database to load and save trips in this environment."
                        : kind === "setup"
                            ? "Sign-in is not configured for this environment yet."
                            : kind === "auth"
                                ? "Sign in to view your private travel stats."
                                : responseMessage,
                } satisfies StatsLoadError
            }

            const normalizedTrips = normalizeTrips(payload)
            if (controller.signal.aborted) return

            setTrips(normalizedTrips)
        } catch (loadError) {
            if (controller.signal.aborted || (loadError instanceof Error && loadError.name === "AbortError")) return

            setTrips([])
            setError(
                typeof loadError === "object" && loadError !== null && "kind" in loadError && "message" in loadError
                    ? loadError as StatsLoadError
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

    const stats = useMemo(() => deriveTravelStats(trips), [trips])

    if (isLoading) return <LoadingState />
    if (error) {
        if (error.kind !== "generic") return <AccessState error={error} onRetry={() => void loadTrips()} />
        return <ErrorState message={error.message} onRetry={() => void loadTrips()} />
    }
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
                                        {destination.tripCount} {destination.tripCount === 1 ? "planned trip" : "planned trips"}
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
