"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, LockKeyhole, MapPin, Plus, RefreshCw, Settings2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreateTripForm, type GeneratedTrip } from "@/components/trip/create-trip-form"
import { NavigationButtons } from "@/components/trip/navigation-buttons"
import { TripCustomizationDialog } from "@/components/trip/trip-customization-dialog"
import type { Activity, DayPlan, Trip, TripTheme } from "@/lib/types/trip"

const TripsMap = dynamic(() => import("@/components/map/trips-map"), {
    ssr: false,
    loading: () => (
        <div className="flex h-full min-h-[300px] items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
            Loading map…
        </div>
    ),
})

const TripChat = dynamic(
    () => import("@/components/trip/trip-chat").then((module) => module.TripChat),
    { ssr: false },
)
const PackingList = dynamic(
    () => import("@/components/trip/packing-list").then((module) => module.PackingList),
    { ssr: false },
)
const WeatherForecastComponent = dynamic(
    () => import("@/components/trip/weather-forecast").then((module) => module.WeatherForecastComponent),
    { ssr: false },
)
const ExpenseTracker = dynamic(
    () => import("@/components/trip/expense-tracker").then((module) => module.ExpenseTracker),
    { ssr: false },
)
const MemoryKeeper = dynamic(
    () => import("@/components/trip/memory-keeper").then((module) => module.MemoryKeeper),
    { ssr: false },
)
const CalendarSyncDialog = dynamic(
    () => import("@/components/trip/calendar-sync-dialog").then((module) => module.CalendarSyncDialog),
    { ssr: false },
)
const ExportMenu = dynamic(
    () => import("@/components/trip/export-menu").then((module) => module.ExportMenu),
    { ssr: false },
)
const ShareTripDialog = dynamic(
    () => import("@/components/trip/share-trip-dialog").then((module) => module.ShareTripDialog),
    { ssr: false },
)

type DashboardError = {
    kind: "auth" | "setup" | "generic"
    message: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === "object" && value !== null && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null
}

function asString(value: unknown, fallback = ""): string {
    return typeof value === "string" ? value : fallback
}

function asFiniteNumber(value: unknown): number | null {
    const number = typeof value === "number" ? value : Number(value)
    return Number.isFinite(number) ? number : null
}

function normalizeTripTheme(value: unknown): TripTheme | null {
    const record = asRecord(value)
    if (!record || typeof record.backgroundColor !== "string" || typeof record.accentColor !== "string") {
        return null
    }

    return {
        backgroundColor: record.backgroundColor,
        accentColor: record.accentColor,
        backgroundImage: typeof record.backgroundImage === "string" ? record.backgroundImage : undefined,
        gradientFrom: typeof record.gradientFrom === "string" ? record.gradientFrom : undefined,
        gradientTo: typeof record.gradientTo === "string" ? record.gradientTo : undefined,
    }
}

function mapActivity(value: unknown, index: number): Activity {
    const record = asRecord(value) || {}
    const lat = asFiniteNumber(record.lat)
    const lng = asFiniteNumber(record.lng)

    return {
        id: typeof record.id === "string" ? record.id : undefined,
        name: asString(record.name, "Untitled activity"),
        description: asString(record.description),
        time: asString(record.startTime || record.time),
        location: asString(record.location),
        coordinates: lat !== null && lng !== null ? { lat, lng } : undefined,
        order: typeof record.order === "number" ? record.order : index,
    }
}

function mapDay(value: unknown, index: number): DayPlan {
    const record = asRecord(value) || {}
    const activities = Array.isArray(record.activities)
        ? record.activities.map(mapActivity)
        : []

    return {
        id: typeof record.id === "string" ? record.id : undefined,
        day: typeof record.dayNumber === "number" ? record.dayNumber : index + 1,
        date: typeof record.date === "string" ? record.date : undefined,
        theme: asString(record.theme, `Day ${index + 1}`),
        activities,
    }
}

function mapTrip(value: unknown): Trip | null {
    const record = asRecord(value)
    const id = record && typeof record.id === "string" ? record.id : null
    if (!record || !id) return null

    const budget = typeof record.budget === "string" || typeof record.budget === "number"
        ? record.budget
        : ""

    return {
        id,
        tripName: asString(record.name || record.tripName, "Untitled trip"),
        destination: asString(record.destination, "Destination to be confirmed"),
        startDate: asString(record.startDate),
        endDate: asString(record.endDate),
        budget,
        currency: asString(record.currency, "USD"),
        theme: normalizeTripTheme(record.theme),
        days: Array.isArray(record.days) ? record.days.map(mapDay) : [],
    }
}

function getResponseError(payload: unknown, fallback: string): string {
    const record = asRecord(payload)
    return typeof record?.error === "string" && record.error.trim()
        ? record.error
        : fallback
}

function DashboardErrorState({ error, onRetry }: { error: DashboardError; onRetry: () => void }) {
    if (error.kind === "auth") {
        return (
            <div className="mx-auto flex max-w-lg flex-col items-center justify-center rounded-xl border border-primary/20 bg-primary/5 p-8 text-center">
                <div className="rounded-full bg-primary/10 p-3 text-primary">
                    <LockKeyhole className="h-6 w-6" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-lg font-semibold">Sign in to view your trips</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    Your itineraries are private. Sign in to load them, or configure Google OAuth in a local workspace first.
                </p>
                <Button asChild className="mt-5">
                    <Link href="/api/auth/signin">Sign in to Travlr</Link>
                </Button>
            </div>
        )
    }

    if (error.kind === "setup") {
        return (
            <div className="mx-auto flex max-w-lg flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
                <div className="rounded-full bg-muted p-3 text-muted-foreground">
                    <Settings2 className="h-6 w-6" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-lg font-semibold">Finish setting up Travlr</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    {error.message} Add the required environment settings to this workspace, then try again.
                </p>
                <Button type="button" variant="outline" className="mt-5" onClick={onRetry}>
                    Try again
                </Button>
            </div>
        )
    }

    return (
        <div className="mx-auto flex max-w-lg flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
            <h2 className="text-lg font-semibold">We couldn’t load your trips</h2>
            <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
            <Button type="button" variant="outline" className="mt-5" onClick={onRetry}>
                <RefreshCw className="h-4 w-4" />
                Try again
            </Button>
        </div>
    )
}

export default function DashboardPage() {
    const [trips, setTrips] = useState<Trip[]>([])
    const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
    const [requestedTripId, setRequestedTripId] = useState<string | null>(null)
    const [initialDestination, setInitialDestination] = useState("")
    const [initialInterests, setInitialInterests] = useState<string[]>([])
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState<DashboardError | null>(null)
    const requestRef = useRef<AbortController | null>(null)

    const trip = trips.find((currentTrip) => currentTrip.id === selectedTripId) || null

    const fetchTrips = useCallback(async () => {
        requestRef.current?.abort()
        const controller = new AbortController()
        requestRef.current = controller
        setIsLoading(true)
        setLoadError(null)

        try {
            const response = await fetch("/api/trips", { signal: controller.signal })
            const payload: unknown = await response.json().catch(() => null)

            if (!response.ok) {
                if (response.status === 401) {
                    const authConfigured = asRecord(payload)?.authConfigured !== false
                    setLoadError({
                        kind: authConfigured ? "auth" : "setup",
                        message: authConfigured
                            ? "Authentication is required to load trips."
                            : getResponseError(payload, "Google OAuth and NextAuth must be configured before you can sign in."),
                    })
                    return
                }

                if (response.status === 503) {
                    setLoadError({
                        kind: "setup",
                        message: getResponseError(payload, "The database is not configured."),
                    })
                    return
                }

                throw new Error(getResponseError(payload, "Unable to load trips right now."))
            }

            if (!Array.isArray(payload)) {
                throw new Error("We received an unexpected trips response.")
            }

            const mappedTrips = payload
                .map(mapTrip)
                .filter((value): value is Trip => value !== null)

            if (payload.length > 0 && mappedTrips.length === 0) {
                throw new Error("We couldn’t read your saved trips right now.")
            }

            if (!controller.signal.aborted) setTrips(mappedTrips)
        } catch (error) {
            if (controller.signal.aborted) return

            setLoadError({
                kind: "generic",
                message: error instanceof Error ? error.message : "Unable to load trips right now.",
            })
        } finally {
            if (requestRef.current === controller) {
                requestRef.current = null
                if (!controller.signal.aborted) setIsLoading(false)
            }
        }
    }, [])

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const tripId = params.get("tripId")?.trim()
        const destination = params.get("destination")?.trim()
        const interests = params.get("interests")
            ?.split(",")
            .map((interest) => interest.trim().toLowerCase())
            .filter(Boolean) ?? []
        const shouldCreate = ["1", "true"].includes(params.get("create")?.toLowerCase() || "")

        setRequestedTripId(tripId || null)
        setInitialDestination(destination || "")
        setInitialInterests(interests)
        if (shouldCreate) setIsCreateOpen(true)
    }, [])

    useEffect(() => {
        void fetchTrips()
        return () => requestRef.current?.abort()
    }, [fetchTrips])

    useEffect(() => {
        if (isLoading || loadError) return

        if (requestedTripId) {
            if (trips.some((currentTrip) => currentTrip.id === requestedTripId)) {
                setSelectedTripId(requestedTripId)
            } else {
                setSelectedTripId(null)
                const url = new URL(window.location.href)
                url.searchParams.delete("tripId")
                window.history.replaceState({}, "", url)
                toast.error("That trip isn’t available. Choose another trip from your list.")
            }
            setRequestedTripId(null)
            return
        }

        if (trips.length === 0) {
            setSelectedTripId(null)
            return
        }

        setSelectedTripId((currentSelection) => {
            if (currentSelection && trips.some((currentTrip) => currentTrip.id === currentSelection)) {
                return currentSelection
            }
            return trips[0].id
        })
    }, [isLoading, loadError, requestedTripId, trips])

    const clearCreateQuery = useCallback(() => {
        const url = new URL(window.location.href)
        for (const parameter of ["create", "destination", "interests"]) {
            url.searchParams.delete(parameter)
        }
        window.history.replaceState({}, "", url)
        setInitialDestination("")
        setInitialInterests([])
    }, [])

    const handleCreateOpenChange = useCallback((nextOpen: boolean) => {
        setIsCreateOpen(nextOpen)
        if (!nextOpen) clearCreateQuery()
    }, [clearCreateQuery])

    const handleTripCreated = useCallback((newTrip: GeneratedTrip) => {
        const mappedTrip = mapTrip(newTrip)
        if (mappedTrip) {
            setTrips((currentTrips) => [
                mappedTrip,
                ...currentTrips.filter((currentTrip) => currentTrip.id !== mappedTrip.id),
            ])
        }

        setSelectedTripId(newTrip.id)
        setRequestedTripId(null)
        const url = new URL(window.location.href)
        url.searchParams.delete("tripId")
        window.history.replaceState({}, "", url)
        setIsCreateOpen(false)
        clearCreateQuery()
        void fetchTrips()
    }, [clearCreateQuery, fetchTrips])

    const activeTheme = trip?.theme ?? null
    const themeTint = activeTheme
        ? activeTheme.gradientFrom && activeTheme.gradientTo
            ? `linear-gradient(135deg, ${activeTheme.gradientFrom}1A, ${activeTheme.gradientTo}1A)`
            : `${activeTheme.backgroundColor}14`
        : undefined

    const workspace = (
        <Tabs defaultValue="itinerary" className="flex h-full min-h-0 flex-col md:border-r">
            <div className="overflow-x-auto border-b bg-muted/20 p-2 md:p-4">
                <TabsList className="flex w-max min-w-full justify-start md:grid md:w-full md:grid-cols-6">
                    <TabsTrigger className="shrink-0" value="itinerary">Itinerary</TabsTrigger>
                    <TabsTrigger className="shrink-0" value="weather">Weather</TabsTrigger>
                    <TabsTrigger className="shrink-0" value="expenses">Expenses</TabsTrigger>
                    <TabsTrigger className="shrink-0" value="memories">Memories</TabsTrigger>
                    <TabsTrigger className="shrink-0" value="chat">AI assistant</TabsTrigger>
                    <TabsTrigger className="shrink-0" value="packing">Packing</TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="itinerary" className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
                <div
                    className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between"
                    style={activeTheme ? {
                        background: activeTheme.backgroundImage ? undefined : themeTint,
                        backgroundImage: activeTheme.backgroundImage
                            ? `linear-gradient(color-mix(in oklab, var(--background) 84%, transparent), color-mix(in oklab, var(--background) 84%, transparent)), url("${activeTheme.backgroundImage}")`
                            : undefined,
                        backgroundPosition: "center",
                        backgroundSize: "cover",
                        borderBottomColor: activeTheme.accentColor,
                    } : undefined}
                >
                    <div className="min-w-0 flex-1 sm:mr-4">
                        {trips.length > 0 ? (
                            <Select value={selectedTripId || ""} onValueChange={setSelectedTripId}>
                                <SelectTrigger className="h-auto w-full border-none p-0 text-left text-lg font-semibold shadow-none focus:ring-0">
                                    <SelectValue placeholder="Select a trip" />
                                </SelectTrigger>
                                <SelectContent>
                                    {trips.map((currentTrip) => (
                                        <SelectItem key={currentTrip.id} value={currentTrip.id}>
                                            {currentTrip.tripName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <h2 className="text-lg font-semibold">My itinerary</h2>
                        )}
                        <p className="truncate text-xs text-muted-foreground">
                            {trip ? `${trip.destination} • ${trip.days.length} ${trip.days.length === 1 ? "day" : "days"}` : "Create a trip to get started"}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <TripCustomizationDialog
                            key={trip?.id || "no-trip"}
                            tripId={trip?.id}
                            currentTheme={trip?.theme ?? undefined}
                            onThemeChange={(theme) => {
                                if (!trip) return
                                setTrips((previousTrips) => previousTrips.map((currentTrip) => (
                                    currentTrip.id === trip.id ? { ...currentTrip, theme } : currentTrip
                                )))
                            }}
                        />
                        {trip && <CalendarSyncDialog trip={trip} />}
                        {trip && <ExportMenu trip={trip} />}
                        <ShareTripDialog tripId={trip?.id} />
                        <Dialog open={isCreateOpen} onOpenChange={handleCreateOpenChange}>
                            <DialogTrigger asChild>
                                <Button type="button" size="sm" variant="secondary">
                                    <Plus className="h-4 w-4" aria-hidden="true" />
                                    New trip
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-[500px]">
                                <DialogHeader>
                                    <DialogTitle>Create a new trip</DialogTitle>
                                    <DialogDescription>
                                        Tell Travlr where you’re going and what you enjoy. It will build a day-by-day starting point.
                                    </DialogDescription>
                                </DialogHeader>
                                <CreateTripForm
                                    initialDestination={initialDestination}
                                    initialInterests={initialInterests}
                                    onSuccess={handleTripCreated}
                                />
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <ScrollArea className="min-h-0 flex-1 p-4">
                    <div className="space-y-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12" aria-live="polite">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
                                <span className="sr-only">Loading trips</span>
                            </div>
                        ) : loadError && !trip ? (
                            <DashboardErrorState error={loadError} onRetry={() => void fetchTrips()} />
                        ) : trip ? (
                            trip.days.map((day) => (
                                <div key={day.id || day.day} className="space-y-2">
                                    <h3 className="sticky top-0 z-10 border-b bg-background/95 p-2 font-medium backdrop-blur">
                                        Day {day.day}: {day.theme}
                                    </h3>
                                    {day.activities.length > 0 ? day.activities.map((activity, index) => (
                                        <div key={activity.id || `${activity.name}-${index}`} className="group rounded-lg border bg-card p-3 text-sm shadow-sm transition-colors hover:border-primary/50">
                                            <div className="flex items-start justify-between gap-3 font-medium">
                                                <span>{activity.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                                                    {activity.location && (
                                                        <NavigationButtons
                                                            location={activity.location}
                                                            coordinates={activity.coordinates}
                                                            variant="compact"
                                                            className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                            {activity.description && <p className="mt-1 text-muted-foreground">{activity.description}</p>}
                                            {activity.location && (
                                                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                                                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                                                    {activity.location}
                                                </p>
                                            )}
                                        </div>
                                    )) : (
                                        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                                            No activities planned for this day yet.
                                        </p>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
                                <div className="rounded-full bg-primary/10 p-3 text-primary">
                                    <MapPin className="h-6 w-6" aria-hidden="true" />
                                </div>
                                <h2 className="mt-4 font-semibold">Your next adventure starts here</h2>
                                <p className="mt-2 text-sm text-muted-foreground">Create an itinerary and keep every detail in one place.</p>
                                <Button type="button" className="mt-5" onClick={() => setIsCreateOpen(true)}>
                                    <Plus className="h-4 w-4" aria-hidden="true" />
                                    Create your first trip
                                </Button>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </TabsContent>

            <TabsContent value="chat" className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
                <TripChat key={trip?.id ?? "no-trip"} trip={trip} onTripUpdate={(updatedTrip) => {
                    setTrips((previousTrips) => previousTrips.map((currentTrip) => (
                        currentTrip.id === updatedTrip.id ? updatedTrip : currentTrip
                    )))
                }} />
            </TabsContent>

            <TabsContent value="packing" className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
                {trip ? (
                    <PackingList
                        tripId={trip.id}
                        destination={trip.destination}
                        days={trip.days.length}
                        activities={trip.days.flatMap((day) => day.activities.map((activity) => activity.name))}
                    />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center space-y-4 p-8 text-center">
                        <p className="text-muted-foreground">Select or create a trip to generate a packing list.</p>
                    </div>
                )}
            </TabsContent>

            <TabsContent value="weather" className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
                <WeatherForecastComponent destination={trip?.destination} />
            </TabsContent>

            <TabsContent value="expenses" className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
                <ExpenseTracker tripId={trip?.id} budget={Number(trip?.budget) || 1500} currency={trip?.currency || "USD"} />
            </TabsContent>

            <TabsContent value="memories" className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
                <MemoryKeeper tripId={trip?.id} />
            </TabsContent>
        </Tabs>
    )

    return (
        <main className="h-[calc(100vh-4rem)] min-h-[36rem] w-full">
            <div className="grid h-full min-h-0 md:grid-cols-[minmax(20rem,0.42fr)_minmax(0,0.58fr)]">
                <section className="min-h-0 min-w-0">{workspace}</section>
                <aside className="hidden min-h-0 min-w-0 p-4 md:block" aria-label="Trip map">
                    <TripsMap trip={trip} />
                </aside>
            </div>
        </main>
    )
}
