"use client"

import { useState, useEffect } from "react"
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable"
import TripsMap from "@/components/map/trips-map"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { CreateTripForm } from "@/components/trip/create-trip-form"

import { ShareTripDialog } from "@/components/trip/share-trip-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TripChat } from "@/components/trip/trip-chat"
import { PackingList } from "@/components/trip/packing-list"
import type { Trip, TripTheme } from "@/lib/types/trip"
import { WeatherForecastComponent } from "@/components/trip/weather-forecast"
import { ExpenseTracker } from "@/components/trip/expense-tracker"
import { NavigationButtons } from "@/components/trip/navigation-buttons"
import { TripCustomizationDialog } from "@/components/trip/trip-customization-dialog"
import { MemoryKeeper } from "@/components/trip/memory-keeper"
import { CalendarSyncDialog } from "@/components/trip/calendar-sync-dialog"
import { ExportMenu } from "@/components/trip/export-menu"
import { FlightTracker } from "@/components/trip/flight-tracker"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

function normalizeTripTheme(value: unknown): TripTheme | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null

    const record = value as Record<string, unknown>
    if (typeof record.backgroundColor !== "string" || typeof record.accentColor !== "string") {
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

export default function DashboardPage() {
    const [trips, setTrips] = useState<Trip[]>([])
    const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [isDesktop, setIsDesktop] = useState<boolean | null>(null)

    // Derived state for the currently selected trip
    const trip = trips.find(t => t.id === selectedTripId) || null

    useEffect(() => {
        fetchTrips()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const mediaQuery = window.matchMedia("(min-width: 768px)")
        const updateViewport = () => setIsDesktop(mediaQuery.matches)

        updateViewport()
        mediaQuery.addEventListener("change", updateViewport)
        return () => mediaQuery.removeEventListener("change", updateViewport)
    }, [])

    const fetchTrips = async () => {
        try {
            setIsLoading(true)
            setLoadError(null)
            const response = await fetch("/api/trips")
            if (!response.ok) {
                const payload = await response.json().catch(() => null)
                throw new Error(payload?.error || "Unable to load trips")
            }

            const data = await response.json()
            const mappedTrips = data.map((t: any) => ({  // eslint-disable-line @typescript-eslint/no-explicit-any
                id: t.id,
                tripName: t.name || t.tripName || "Untitled Trip",
                destination: t.destination,
                startDate: t.startDate,
                endDate: t.endDate,
                budget: t.budget,
                currency: t.currency,
                theme: normalizeTripTheme(t.theme),
                days: t.days.map((d: any) => ({  // eslint-disable-line @typescript-eslint/no-explicit-any
                    id: d.id,
                    day: d.dayNumber,
                    date: d.date,
                    theme: d.theme,
                    activities: d.activities.map((a: any) => ({  // eslint-disable-line @typescript-eslint/no-explicit-any
                        id: a.id,
                        name: a.name,
                        description: a.description,
                        time: a.startTime,
                        location: a.location,
                        coordinates: a.lat && a.lng ? { lat: Number(a.lat), lng: Number(a.lng) } : undefined,
                        order: a.order
                    }))
                }))
            }))
            setTrips(mappedTrips)
            if (mappedTrips.length > 0 && !selectedTripId) {
                setSelectedTripId(mappedTrips[0].id)
            }
        } catch (error) {
            setLoadError(error instanceof Error ? error.message : "Unable to load trips")
        } finally {
            setIsLoading(false)
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleTripCreated = (newTrip: any) => {
        // Just refresh the list completely to be safe and simple
        fetchTrips().then(() => {
            // After refresh, select the new trip
            // Note: fetchTrips sets the FIRST trip if none selected. 
            // We might want to explicitly set the new ID.
            if (newTrip && newTrip.id) {
                setSelectedTripId(newTrip.id)
            }
        })
    }

    const activeTheme = trip?.theme ?? null
    const themeTint = activeTheme
        ? activeTheme.gradientFrom && activeTheme.gradientTo
            ? `linear-gradient(135deg, ${activeTheme.gradientFrom}1A, ${activeTheme.gradientTo}1A)`
            : `${activeTheme.backgroundColor}14`
        : undefined

    const workspace = (
        <Tabs defaultValue="itinerary" className="flex h-full flex-col md:border-r">
                        <div className="overflow-x-auto border-b bg-muted/20 p-2 md:p-4">
                            <TabsList className="flex w-max min-w-full justify-start md:grid md:w-full md:grid-cols-7">
                                <TabsTrigger className="shrink-0" value="itinerary">Trips</TabsTrigger>
                                <TabsTrigger className="shrink-0" value="flights">Flights</TabsTrigger>
                                <TabsTrigger className="shrink-0" value="weather">Weather</TabsTrigger>
                                <TabsTrigger className="shrink-0" value="expenses">Expenses</TabsTrigger>
                                <TabsTrigger className="shrink-0" value="memories">Memories</TabsTrigger>
                                <TabsTrigger className="shrink-0" value="chat">AI</TabsTrigger>
                                <TabsTrigger className="shrink-0" value="packing">Packing</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="itinerary" className="flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden">
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
                                    {/* Trip Selector or Title */}
                                    {trips.length > 0 ? (
                                        <Select value={selectedTripId || ""} onValueChange={setSelectedTripId}>
                                            <SelectTrigger className="w-full font-semibold text-lg border-none shadow-none p-0 h-auto focus:ring-0">
                                                <SelectValue placeholder="Select a trip" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {trips.map((t) => (
                                                    <SelectItem key={t.id} value={t.id}>
                                                        {t.tripName}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <h2 className="font-semibold text-lg">My Itinerary</h2>
                                    )}
                                    <p className="text-xs text-muted-foreground truncate">
                                        {trip ? `${trip.destination} • ${trip.days.length} Days` : "No trip selected"}
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
                                                currentTrip.id === trip.id
                                                    ? { ...currentTrip, theme }
                                                    : currentTrip
                                            )))
                                        }}
                                    />
                                    {trip && <CalendarSyncDialog trip={trip} />}
                                    {trip && <ExportMenu trip={trip} />}
                                    <ShareTripDialog tripId={trip?.id} />
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button size="sm" variant="secondary"><Plus className="h-4 w-4 mr-1" /> New</Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[425px]">
                                            <DialogHeader>
                                                <DialogTitle>Create a new trip</DialogTitle>
                                                <DialogDescription>
                                                    Let AI help you plan your perfect getaway.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <CreateTripForm onSuccess={handleTripCreated} />
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                            <ScrollArea className="flex-1 p-4">
                                <div className="space-y-4">
                                    {isLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : trip ? (
                                        trip.days.map((day: any) => (  // eslint-disable-line @typescript-eslint/no-explicit-any
                                            <div key={day.id || day.day} className="space-y-2">
                                                <h3 className="font-medium sticky top-0 bg-background/95 backdrop-blur p-2 border-b z-10">
                                                    Day {day.day}: {day.theme}
                                                </h3>
                                                {day.activities.map((activity: any, i: number) => (  // eslint-disable-line @typescript-eslint/no-explicit-any
                                                    <div key={activity.id || i} className="p-3 border rounded-lg bg-card shadow-sm text-sm group hover:border-primary/50 transition-colors">
                                                        <div className="flex justify-between items-start font-medium">
                                                            <span>{activity.name}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-muted-foreground text-xs">{activity.time}</span>
                                                                {activity.location && (
                                                                    <NavigationButtons
                                                                        location={activity.location}
                                                                        coordinates={activity.coordinates}
                                                                        variant="compact"
                                                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>
                                                        <p className="text-muted-foreground mt-1">{activity.description}</p>
                                                        {activity.location && (
                                                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                                                📍 {activity.location}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center text-muted-foreground p-8">
                                            <p>{loadError || "No itinerary yet. Create a new trip to get started!"}</p>
                                            {loadError && (
                                                <Button variant="outline" size="sm" className="mt-4" onClick={fetchTrips}>
                                                    Try again
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden">
                            <TripChat trip={trip} onTripUpdate={(updatedTrip) => {
                                // Optimistically update or refresh
                                // Ideally, update the trip in the `trips` list
                                setTrips(prev => prev.map(t => t.id === updatedTrip.id ? updatedTrip : t))
                            }} />
                        </TabsContent>

                        <TabsContent value="packing" className="flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden">
                            {trip ? (() => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const activityNames = trip.days.flatMap((d: any) => d.activities.map((a: any) => a.name))
                                return (
                                    <PackingList
                                        destination={trip.destination}
                                        days={trip.days.length}
                                        activities={activityNames}
                                    />
                                )
                            })() : (
                                <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 h-full">
                                    <p className="text-muted-foreground">Select or create a trip to generate a packing list.</p>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="weather" className="flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden">
                            <WeatherForecastComponent destination={trip?.destination} />
                        </TabsContent>

                        <TabsContent value="expenses" className="flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden">
                            <ExpenseTracker tripId={trip ? trip.id : undefined} budget={Number(trip?.budget) || 1500} currency={trip?.currency || "USD"} />
                        </TabsContent>

                        <TabsContent value="memories" className="flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden">
                            <MemoryKeeper tripId={trip ? trip.id : undefined} />
                        </TabsContent>

                        <TabsContent value="flights" className="flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden">
                            <FlightTracker tripId={trip ? trip.id : undefined} />
                        </TabsContent>
        </Tabs>
    )

    if (isDesktop === null) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!isDesktop) {
        return <div className="h-[calc(100vh-4rem)] w-full">{workspace}</div>
    }

    return (
        <div className="h-[calc(100vh-4rem)] w-full">
            <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                    {workspace}
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel className="max-md:hidden" defaultSize={70}>
                    <div className="h-full w-full relative">
                        <div className="absolute inset-0 p-4">
                            <TripsMap trip={trip} />
                        </div>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    )
}
