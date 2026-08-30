"use client"

interface FlightTrackerProps {
    tripId?: string
}

/**
 * Flight tracking is intentionally hidden until Travlr is connected to a
 * flight-data provider. Rendering an unavailable integration as a dashboard
 * destination creates a dead end, so the dashboard should omit its tab too.
 */
export function FlightTracker(_props: FlightTrackerProps) {
    return null
}
