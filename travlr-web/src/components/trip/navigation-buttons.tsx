"use client"

import { MapPin, Navigation, Car } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface NavigationButtonsProps {
    location: string
    coordinates?: { lat: number; lng: number }
    className?: string
    variant?: "default" | "compact"
}

// Deep link generators for various navigation apps
function generateGoogleMapsUrl(location: string, coords?: { lat: number; lng: number }): string {
    if (coords) {
        return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
}

function generateWazeUrl(location: string, coords?: { lat: number; lng: number }): string {
    if (coords) {
        return `https://waze.com/ul?ll=${coords.lat},${coords.lng}&navigate=yes`
    }
    return `https://waze.com/ul?q=${encodeURIComponent(location)}&navigate=yes`
}

function generateAppleMapsUrl(location: string, coords?: { lat: number; lng: number }): string {
    if (coords) {
        return `https://maps.apple.com/?ll=${coords.lat},${coords.lng}&q=${encodeURIComponent(location)}`
    }
    return `https://maps.apple.com/?q=${encodeURIComponent(location)}`
}

function generateUberUrl(location: string, coords?: { lat: number; lng: number }): string {
    // Uber universal link for requesting a ride to destination
    if (coords) {
        return `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${coords.lat}&dropoff[longitude]=${coords.lng}&dropoff[nickname]=${encodeURIComponent(location)}`
    }
    return `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(location)}`
}

const navigationApps = [
    {
        name: "Google Maps",
        icon: "🗺️",
        generateUrl: generateGoogleMapsUrl,
        color: "text-green-600",
    },
    {
        name: "Apple Maps",
        icon: "🍎",
        generateUrl: generateAppleMapsUrl,
        color: "text-gray-600",
    },
    {
        name: "Waze",
        icon: "🚗",
        generateUrl: generateWazeUrl,
        color: "text-blue-500",
    },
    {
        name: "Uber",
        icon: "🚕",
        generateUrl: generateUberUrl,
        color: "text-black",
    },
]

export function NavigationButtons({
    location,
    coordinates,
    className,
    variant = "default"
}: NavigationButtonsProps) {
    const openInApp = (generateUrl: typeof generateGoogleMapsUrl) => {
        const url = generateUrl(location, coordinates)
        window.open(url, "_blank", "noopener,noreferrer")
    }

    if (variant === "compact") {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-8 w-8", className)}
                        title="Open in maps"
                    >
                        <Navigation className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {navigationApps.map((app) => (
                        <DropdownMenuItem
                            key={app.name}
                            onClick={() => openInApp(app.generateUrl)}
                            className="gap-2"
                        >
                            <span>{app.icon}</span>
                            <span>{app.name}</span>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        )
    }

    return (
        <div className={cn("flex items-center gap-1", className)}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                        <MapPin className="h-4 w-4" />
                        Navigate
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    {navigationApps.map((app) => (
                        <DropdownMenuItem
                            key={app.name}
                            onClick={() => openInApp(app.generateUrl)}
                            className="gap-2 cursor-pointer"
                        >
                            <span className="text-lg">{app.icon}</span>
                            <span>Open in {app.name}</span>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}

// Quick navigation icon buttons for inline use
export function QuickNavigationButtons({
    location,
    coordinates,
    className
}: NavigationButtonsProps) {
    return (
        <div className={cn("flex items-center gap-1", className)}>
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => window.open(generateGoogleMapsUrl(location, coordinates), "_blank")}
                title="Open in Google Maps"
            >
                <MapPin className="h-3.5 w-3.5" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => window.open(generateWazeUrl(location, coordinates), "_blank")}
                title="Get directions with Waze"
            >
                <Navigation className="h-3.5 w-3.5" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => window.open(generateUberUrl(location, coordinates), "_blank")}
                title="Request Uber ride"
            >
                <Car className="h-3.5 w-3.5" />
            </Button>
        </div>
    )
}
