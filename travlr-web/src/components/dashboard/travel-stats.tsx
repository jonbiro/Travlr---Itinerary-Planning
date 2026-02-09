"use client"

import { useState, useEffect } from "react"
import {
    Globe,
    Plane,
    MapPin,
    Calendar,
    Clock,
    TrendingUp,
    Loader2,
    Trophy,
    Flag
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface TravelStats {
    totalTrips: number
    countriesVisited: number
    citiesVisited: number
    totalDaysTraveled: number
    totalDistanceKm: number
    totalFlightHours: number
    topDestinations: { name: string; visits: number }[]
    monthlyTrips: { month: string; count: number }[]
    travelGoal?: {
        target: number
        current: number
        label: string
    }
}

// Mock data generator (in production, this would come from the API)
function generateMockStats(): TravelStats {
    return {
        totalTrips: 12,
        countriesVisited: 8,
        citiesVisited: 23,
        totalDaysTraveled: 87,
        totalDistanceKm: 45230,
        totalFlightHours: 52,
        topDestinations: [
            { name: "Paris, France", visits: 3 },
            { name: "Tokyo, Japan", visits: 2 },
            { name: "New York, USA", visits: 2 },
            { name: "Barcelona, Spain", visits: 2 },
            { name: "Sydney, Australia", visits: 1 },
        ],
        monthlyTrips: [
            { month: "Jan", count: 1 },
            { month: "Feb", count: 0 },
            { month: "Mar", count: 2 },
            { month: "Apr", count: 1 },
            { month: "May", count: 0 },
            { month: "Jun", count: 2 },
            { month: "Jul", count: 3 },
            { month: "Aug", count: 2 },
            { month: "Sep", count: 0 },
            { month: "Oct", count: 1 },
            { month: "Nov", count: 0 },
            { month: "Dec", count: 0 },
        ],
        travelGoal: {
            target: 15,
            current: 12,
            label: "trips this year"
        }
    }
}

interface StatCardProps {
    icon: React.ReactNode
    label: string
    value: string | number
    description?: string
    trend?: "up" | "down" | "neutral"
    className?: string
}

function StatCard({ icon, label, value, description, trend, className }: StatCardProps) {
    return (
        <Card className={cn("hover:shadow-md transition-shadow", className)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        {trend === "up" && <TrendingUp className="h-3 w-3 text-green-500" />}
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    )
}

export function TravelStatsComponent() {
    const [stats, setStats] = useState<TravelStats | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Simulate loading stats (in production, fetch from API)
        setTimeout(() => {
            setStats(generateMockStats())
            setIsLoading(false)
        }, 800)
    }, [])

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Loading your travel stats...</p>
            </div>
        )
    }

    if (!stats) return null

    const distanceFormatted = stats.totalDistanceKm >= 1000
        ? `${(stats.totalDistanceKm / 1000).toFixed(1)}k`
        : stats.totalDistanceKm.toString()

    return (
        <div className="p-6 space-y-6">
            {/* Hero Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    icon={<Globe className="h-4 w-4 text-blue-500" />}
                    label="Countries"
                    value={stats.countriesVisited}
                    description="visited"
                />
                <StatCard
                    icon={<MapPin className="h-4 w-4 text-green-500" />}
                    label="Cities"
                    value={stats.citiesVisited}
                    description="explored"
                />
                <StatCard
                    icon={<Plane className="h-4 w-4 text-purple-500" />}
                    label="Total Trips"
                    value={stats.totalTrips}
                    description="+3 from last year"
                    trend="up"
                />
                <StatCard
                    icon={<Calendar className="h-4 w-4 text-orange-500" />}
                    label="Days Traveled"
                    value={stats.totalDaysTraveled}
                    description="this year"
                />
            </div>

            {/* Distance & Flight Hours */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-blue-500 to-purple-600 text-white border-0">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-white/80">Total Distance</CardDescription>
                        <CardTitle className="text-3xl font-bold flex items-baseline gap-2">
                            {distanceFormatted}
                            <span className="text-lg font-normal">km</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-white/80">
                            That&apos;s {Math.round(stats.totalDistanceKm / 40075 * 100)}% around the Earth! 🌍
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500 to-pink-600 text-white border-0">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-white/80">Flight Time</CardDescription>
                        <CardTitle className="text-3xl font-bold flex items-baseline gap-2">
                            {stats.totalFlightHours}
                            <span className="text-lg font-normal">hours</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-white/80 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {Math.round(stats.totalFlightHours / 24)} days in the air ✈️
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Travel Goal */}
            {stats.travelGoal && (
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Trophy className="h-4 w-4 text-yellow-500" />
                                {stats.travelGoal.current >= stats.travelGoal.target ? "Goal Achieved!" : "Travel Goal"}
                            </CardTitle>
                            <span className="text-sm text-muted-foreground">
                                {stats.travelGoal.current}/{stats.travelGoal.target} {stats.travelGoal.label}
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Progress
                            value={Math.min((stats.travelGoal.current / stats.travelGoal.target) * 100, 100)}
                            className={cn(
                                "h-3",
                                stats.travelGoal.current >= stats.travelGoal.target && "[&>div]:bg-green-500"
                            )}
                        />
                    </CardContent>
                </Card>
            )}

            {/* Top Destinations */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Flag className="h-4 w-4 text-red-500" />
                        Top Destinations
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {stats.topDestinations.map((dest, index) => (
                            <div key={dest.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className={cn(
                                        "text-lg font-bold w-6 text-center",
                                        index === 0 && "text-yellow-500",
                                        index === 1 && "text-gray-400",
                                        index === 2 && "text-orange-600"
                                    )}>
                                        {index + 1}
                                    </span>
                                    <span className="font-medium">{dest.name}</span>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                    {dest.visits} {dest.visits === 1 ? "visit" : "visits"}
                                </span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
