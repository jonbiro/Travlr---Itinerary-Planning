"use client"

import { useState } from "react"
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable"
import TripsMap from "@/components/map/trips-map"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
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

export default function DashboardPage() {
    const [trip, setTrip] = useState<Trip | null>(null)

    return (
        <div className="h-[calc(100vh-4rem)] w-full">
            <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                    <Tabs defaultValue="itinerary" className="flex flex-col h-full border-r">
                        <div className="p-4 border-b bg-muted/20">
                            <TabsList className="grid w-full grid-cols-6">
                                <TabsTrigger value="itinerary">Trips</TabsTrigger>
                                <TabsTrigger value="weather">Weather</TabsTrigger>
                                <TabsTrigger value="expenses">Expenses</TabsTrigger>
                                <TabsTrigger value="memories">Memories</TabsTrigger>
                                <TabsTrigger value="chat">AI</TabsTrigger>
                                <TabsTrigger value="packing">Packing</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="itinerary" className="flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden">
                            <div className="p-4 border-b flex items-center justify-between">
                                <div>
                                    <h2 className="font-semibold text-lg">{trip ? trip.tripName : "My Itinerary"}</h2>
                                    <p className="text-xs text-muted-foreground">{trip ? trip.destination : "No trip selected"}</p>
                                </div>
                                <div className="flex gap-2">
                                    <TripCustomizationDialog tripId={trip ? "demo-trip" : undefined} />
                                    {trip && <CalendarSyncDialog trip={trip} />}
                                    {trip && <ExportMenu trip={trip} />}
                                    <ShareTripDialog />
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button size="sm" variant="secondary"><Plus className="h-4 w-4 mr-1" /> New Trip</Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[425px]">
                                            <DialogHeader>
                                                <DialogTitle>Create a new trip</DialogTitle>
                                                <DialogDescription>
                                                    Let AI help you plan your perfect getaway.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <CreateTripForm onSuccess={(data) => setTrip(data)} />
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                            <ScrollArea className="flex-1 p-4">
                                <div className="space-y-4">
                                    {trip ? (
                                        trip.days.map((day: any) => (
                                            <div key={day.day} className="space-y-2">
                                                <h3 className="font-medium sticky top-0 bg-background/95 backdrop-blur p-2 border-b">
                                                    Day {day.day}: {day.theme}
                                                </h3>
                                                {day.activities.map((activity: any, i: number) => (
                                                    <div key={i} className="p-3 border rounded-lg bg-card shadow-sm text-sm group">
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
                            <TripChat trip={trip} onTripUpdate={setTrip} />
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
                            <ExpenseTracker tripId={trip ? "demo-trip" : undefined} budget={1500} currency="USD" />
                        </TabsContent>

                        <TabsContent value="memories" className="flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden">
                            <MemoryKeeper tripId={trip ? "demo-trip" : undefined} />
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
