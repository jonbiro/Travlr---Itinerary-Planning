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
import type { Trip } from "@/lib/types/trip"
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

export default function DashboardPage() {
    const [trips, setTrips] = useState<Trip[]>([])
    const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Derived state for the currently selected trip
    const trip = trips.find(t => t.id === selectedTripId) || null

    useEffect(() => {
        fetchTrips()
    }, [])

    const fetchTrips = async () => {
        try {
            setIsLoading(true)
            const response = await fetch("/api/trips")
            if (response.ok) {
                const data = await response.json()
                // Map the backend data structure to our frontend types if needed
                // The API returns nested structure matching Prisma include, which needs mapping
                const mappedTrips = data.map((t: any) => ({
                    id: t.id,
                    tripName: t.name || t.tripName || "Untitled Trip",
                    destination: t.destination,
                    startDate: t.startDate,
                    endDate: t.endDate,
                    budget: t.budget,
                    currency: t.currency,
                    days: t.days.map((d: any) => ({
                        id: d.id,
                        day: d.dayNumber,
                        date: d.date,
                        theme: d.theme,
                        activities: d.activities.map((a: any) => ({
                            id: a.id,
                            name: a.name,
                            description: a.description,
                            time: a.startTime, // Using startTime as time
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
            }
        } catch (error) {
            console.error("Failed to fetch trips", error)
        } finally {
            setIsLoading(false)
        }
    }

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

    return (
        <div className="h-[calc(100vh-4rem)] w-full">
            <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                    <Tabs defaultValue="itinerary" className="flex flex-col h-full border-r">
                        <div className="p-4 border-b bg-muted/20">
                            <TabsList className="grid w-full grid-cols-7">
                                <TabsTrigger value="itinerary">Trips</TabsTrigger>
                                <TabsTrigger value="flights">Flights</TabsTrigger>
                                <TabsTrigger value="weather">Weather</TabsTrigger>
                                <TabsTrigger value="expenses">Expenses</TabsTrigger>
                                <TabsTrigger value="memories">Memories</TabsTrigger>
                                <TabsTrigger value="chat">AI</TabsTrigger>
                                <TabsTrigger value="packing">Packing</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="itinerary" className="flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden">
                            <div className="p-4 border-b flex items-center justify-between">
                                <div className="flex-1 min-w-0 mr-4">
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
                                <div className="flex gap-2">
                                    <TripCustomizationDialog tripId={trip ? trip.id : undefined} />
                                    {trip && <CalendarSyncDialog trip={trip} />}
                                    {trip && <ExportMenu trip={trip} />}
                                    <ShareTripDialog />
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
                                        trip.days.map((day: any) => (
                                            <div key={day.id || day.day} className="space-y-2">
                                                <h3 className="font-medium sticky top-0 bg-background/95 backdrop-blur p-2 border-b z-10">
                                                    Day {day.day}: {day.theme}
                                                </h3>
                                                {day.activities.map((activity: any, i: number) => (
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
                                            <p>No itinerary yet. Create a new trip to get started!</p>
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
                            {trip ? (
                                <PackingList
                                    destination={trip.destination}
                                    days={trip.days.length}
                                    activities={trip.days.flatMap((d: any) => d.activities.map((a: any) => a.name))}
                                />
                            ) : (
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
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={70}>
                    <div className="h-full w-full relative">
                        <div className="absolute inset-0 p-4">
                            <TripsMap />
                        </div>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    )
}
