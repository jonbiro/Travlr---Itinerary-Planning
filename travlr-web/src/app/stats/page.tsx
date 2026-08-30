import type { Metadata } from "next"

import { TravelStatsDashboard } from "./stats-view"

export const metadata: Metadata = {
    title: "Travel Stats | Travlr",
    description: "Track your saved trips, destinations, itinerary days, and activities",
    robots: {
        index: false,
        follow: false,
    },
}

export default function StatsPage() {
    return (
        <main className="min-h-[calc(100vh-4rem)]">
            <div className="container py-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold tracking-tight">Your Travel Stats</h1>
                    <p className="text-muted-foreground">
                        See the destinations, days, and activities you have planned.
                    </p>
                </div>
                <TravelStatsDashboard />
            </div>
        </main>
    )
}
