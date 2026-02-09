"use client"

import { useState, useEffect } from "react"
import { Plane, Clock, AlertTriangle, RefreshCw, Plus, Loader2 } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
    type Flight,

    FLIGHT_STATUS_INFO,
    generateMockFlight,
    formatFlightTime,
    formatDuration,
    formatDelay,
    getFlightProgress,
    isFlightActive,
} from "@/lib/flight-service"

interface FlightTrackerProps {
    tripId?: string
}

export function FlightTracker({ tripId }: FlightTrackerProps) {
    const [flights, setFlights] = useState<Flight[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isAdding, setIsAdding] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [flightNumber, setFlightNumber] = useState("")
    const [flightDate, setFlightDate] = useState(format(new Date(), "yyyy-MM-dd"))
    const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

    // Refresh flights periodically for active ones
    useEffect(() => {
        const hasActiveFlights = flights.some(isFlightActive)
        if (!hasActiveFlights) return

        const interval = setInterval(() => {
            // In production, this would fetch real updates
            setLastUpdated(new Date())
        }, 60000) // Update every minute

        return () => clearInterval(interval)
    }, [flights])

    const handleAddFlight = async () => {
        if (!flightNumber.trim()) return

        setIsAdding(true)
        try {
            // Generate mock flight (in production, would call flight API)
            await new Promise(resolve => setTimeout(resolve, 500))
            const flight = generateMockFlight(flightNumber, new Date(flightDate))
            setFlights([...flights, flight])
            setFlightNumber("")
            setDialogOpen(false)
        } catch (error) {
            console.error("Failed to add flight:", error)
        } finally {
            setIsAdding(false)
        }
    }

    const handleRefresh = async () => {
        setIsLoading(true)
        try {
            // In production, this would fetch real updates
            await new Promise(resolve => setTimeout(resolve, 800))
            setLastUpdated(new Date())
        } finally {
            setIsLoading(false)
        }
    }

    const handleRemoveFlight = (flightId: string) => {
        setFlights(flights.filter(f => f.id !== flightId))
        setSelectedFlight(null)
    }

    if (!tripId) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 h-full">
                <Plane className="h-12 w-12 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Create or select a trip to track flights</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
                <div>
                    <h3 className="font-semibold">Flight Tracker</h3>
                    <p className="text-xs text-muted-foreground">
                        {flights.length} flight{flights.length !== 1 ? 's' : ''} tracked
                        {lastUpdated && ` • Updated ${format(lastUpdated, 'h:mm a')}`}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading}>
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    </Button>
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="h-4 w-4 mr-1" /> Add Flight
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[400px]">
                            <DialogHeader>
                                <DialogTitle>Track a Flight</DialogTitle>
                                <DialogDescription>
                                    Enter your flight number to get real-time updates
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="flightNumber">Flight Number</Label>
                                    <Input
                                        id="flightNumber"
                                        placeholder="e.g., AA123, UA456"
                                        value={flightNumber}
                                        onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="flightDate">Departure Date</Label>
                                    <Input
                                        id="flightDate"
                                        type="date"
                                        value={flightDate}
                                        onChange={(e) => setFlightDate(e.target.value)}
                                    />
                                </div>
                                <Button
                                    className="w-full"
                                    onClick={handleAddFlight}
                                    disabled={!flightNumber.trim() || isAdding}
                                >
                                    {isAdding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Track Flight
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Flight List */}
            <ScrollArea className="flex-1 p-4">
                {flights.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12">
                        <Plane className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No flights tracked</p>
                        <p className="text-xs mt-1">Add a flight to get updates</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {flights.map((flight) => (
                            <FlightCard
                                key={flight.id}
                                flight={flight}
                                onClick={() => setSelectedFlight(flight)}
                            />
                        ))}
                    </div>
                )}
            </ScrollArea>

            {/* Flight Detail Modal */}
            <Dialog open={!!selectedFlight} onOpenChange={() => setSelectedFlight(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    {selectedFlight && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Plane className="h-5 w-5" />
                                    {selectedFlight.flightNumber}
                                </DialogTitle>
                            </DialogHeader>
                            <FlightDetail
                                flight={selectedFlight}
                                onRemove={() => handleRemoveFlight(selectedFlight.id)}
                            />
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

// Flight Card Component
function FlightCard({ flight, onClick }: { flight: Flight; onClick: () => void }) {
    const statusInfo = FLIGHT_STATUS_INFO[flight.status]
    const departureTime = formatFlightTime(flight.departure.time, flight.departure.actualTime)
    const progress = getFlightProgress(flight)

    return (
        <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={onClick}
        >
            <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold">{flight.flightNumber}</span>
                            <Badge variant={flight.status === 'delayed' || flight.status === 'cancelled' ? 'destructive' : 'secondary'}>
                                {statusInfo.icon} {statusInfo.label}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{flight.airline}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                    <div className="text-center">
                        <p className="font-bold text-lg">{flight.departure.airport}</p>
                        <p className={cn(departureTime.isDelayed && "text-red-500 line-through")}>
                            {departureTime.time}
                        </p>
                        {departureTime.isDelayed && flight.departure.actualTime && (
                            <p className="text-red-500 font-medium">
                                {formatFlightTime(flight.departure.actualTime).time}
                            </p>
                        )}
                    </div>

                    <div className="flex-1 mx-4 flex flex-col items-center">
                        <p className="text-xs text-muted-foreground">
                            {flight.duration ? formatDuration(flight.duration) : '—'}
                        </p>
                        <div className="w-full flex items-center gap-2 my-1">
                            <div className="h-px flex-1 bg-border" />
                            <Plane className="h-4 w-4 text-muted-foreground" />
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        {flight.status === 'in_air' && (
                            <Progress value={progress} className="h-1.5 w-full" />
                        )}
                    </div>

                    <div className="text-center">
                        <p className="font-bold text-lg">{flight.arrival.airport}</p>
                        <p className="text-muted-foreground">
                            {formatFlightTime(flight.arrival.time).time}
                        </p>
                    </div>
                </div>

                {flight.delay && flight.delay > 0 && (
                    <div className="mt-3 flex items-center gap-2 text-red-500 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        {formatDelay(flight.delay)}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// Flight Detail Component
function FlightDetail({ flight, onRemove }: { flight: Flight; onRemove: () => void }) {
    const statusInfo = FLIGHT_STATUS_INFO[flight.status]
    const progress = getFlightProgress(flight)

    return (
        <div className="space-y-6">
            {/* Status Banner */}
            <div className={cn(
                "p-4 rounded-lg",
                flight.status === 'delayed' || flight.status === 'cancelled'
                    ? "bg-red-50 dark:bg-red-950/30"
                    : "bg-muted/50"
            )}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{statusInfo.icon}</span>
                        <div>
                            <p className="font-medium">{statusInfo.label}</p>
                            {flight.delay && flight.delay > 0 && (
                                <p className="text-sm text-red-500">{formatDelay(flight.delay)}</p>
                            )}
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{flight.airline}</p>
                </div>
            </div>

            {/* Flight Progress */}
            {flight.status === 'in_air' && (
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span>{flight.departure.city}</span>
                        <span>{flight.arrival.city}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-center text-xs text-muted-foreground">
                        {progress}% complete
                    </p>
                </div>
            )}

            {/* Departure/Arrival Info */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Departure</p>
                    <div>
                        <p className="font-bold text-xl">{flight.departure.airport}</p>
                        <p className="text-muted-foreground">{flight.departure.city}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4" />
                        <span>{formatFlightTime(flight.departure.time).time}</span>
                    </div>
                    {flight.departure.terminal && (
                        <p className="text-sm">Terminal {flight.departure.terminal}</p>
                    )}
                    {flight.departure.gate && (
                        <p className="text-sm font-medium text-primary">Gate {flight.departure.gate}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Arrival</p>
                    <div>
                        <p className="font-bold text-xl">{flight.arrival.airport}</p>
                        <p className="text-muted-foreground">{flight.arrival.city}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4" />
                        <span>{formatFlightTime(flight.arrival.time).time}</span>
                    </div>
                    {flight.arrival.terminal && (
                        <p className="text-sm">Terminal {flight.arrival.terminal}</p>
                    )}
                </div>
            </div>

            {/* Duration */}
            {flight.duration && (
                <div className="text-center py-2 border-t border-b">
                    <p className="text-sm text-muted-foreground">Flight Duration</p>
                    <p className="font-medium">{formatDuration(flight.duration)}</p>
                </div>
            )}

            {/* Actions */}
            <Button variant="destructive" className="w-full" onClick={onRemove}>
                Remove Flight
            </Button>
        </div>
    )
}
