"use client"

import { Info, Plane } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

interface FlightTrackerProps {
    tripId?: string
}

/**
 * Flight data is intentionally not rendered until Travlr is connected to a
 * flight-data provider. Keeping this state explicit prevents the UI from
 * presenting generated airport, timing, or status data as real information.
 */
export function FlightTracker({ tripId }: FlightTrackerProps) {
    if (!tripId) {
        return (
            <div className="flex h-full flex-col items-center justify-center space-y-4 p-8 text-center">
                <Plane className="h-12 w-12 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Create or select a trip to track flights</p>
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col">
            <div className="border-b p-4">
                <h3 className="font-semibold">Flight Tracker</h3>
                <p className="text-xs text-muted-foreground">Live status unavailable</p>
            </div>

            <div className="flex flex-1 items-center justify-center p-6">
                <Card className="w-full max-w-sm border-dashed">
                    <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
                        <div className="rounded-full bg-muted p-3">
                            <Info className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-medium">Live flight tracking isn&apos;t connected</h4>
                            <p className="text-sm text-muted-foreground">
                                Travlr does not currently have a flight-data provider configured, so it
                                won&apos;t invent flight status, airport, or timing details.
                            </p>
                        </div>
                        <Badge variant="secondary">Integration required</Badge>
                        <p className="text-xs text-muted-foreground">
                            No flight data has been saved for this trip.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
