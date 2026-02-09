import { TravelStatsComponent } from "@/components/dashboard/travel-stats"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Travel Stats | Travlr",
    description: "Track your travel statistics - countries visited, flight hours, distance traveled and more",
}

export default function StatsPage() {
    return (
        <div className="min-h-[calc(100vh-4rem)]">
            <div className="container py-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold tracking-tight">Your Travel Stats</h1>
                    <p className="text-muted-foreground">
                        Track your adventures around the world
                    </p>
                </div>
                <TravelStatsComponent />
            </div>
        </div>
    )
}
