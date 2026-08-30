"use client"

import { MapPin, Navigation, Car, Map, type LucideIcon } from "lucide-react"
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

type NavigationUrlGenerator = (location: string, coords?: { lat: number; lng: number }) => string

const navigationApps: Array<{
    name: string
    icon: LucideIcon
    generateUrl: NavigationUrlGenerator
}> = [
    {
        name: "Google Maps",
        icon: Map,
        generateUrl: generateGoogleMapsUrl,
    },
    {
        name: "Apple Maps",
        icon: MapPin,
        generateUrl: generateAppleMapsUrl,
    },
    {
        name: "Waze",
        icon: Navigation,
        generateUrl: generateWazeUrl,
    },
    {
        name: "Uber",
        icon: Car,
        generateUrl: generateUberUrl,
    },
]

export function NavigationButtons({
    location,
    coordinates,
    className,
    variant = "default"
}: NavigationButtonsProps) {
    const openInApp = (generateUrl: NavigationUrlGenerator) => {
        const url = generateUrl(location, coordinates)
        window.open(url, "_blank", "noopener,noreferrer")
    }

    if (variant === "compact") {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn("h-8 w-8", className)}
                        title="Open in maps"
                        aria-label="Open location in a maps app"
                    >
                        <Navigation className="h-4 w-4" aria-hidden="true" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {navigationApps.map((app) => (
                        <DropdownMenuItem
                            key={app.name}
                            onClick={() => openInApp(app.generateUrl)}
                            className="gap-2"
                        >
                            <app.icon className="h-4 w-4" aria-hidden="true" />
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
                    <Button type="button" variant="outline" size="sm" className="gap-2">
                        <MapPin className="h-4 w-4" aria-hidden="true" />
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
                            <app.icon className="h-4 w-4" aria-hidden="true" />
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
                onClick={() => window.open(generateGoogleMapsUrl(location, coordinates), "_blank", "noopener,noreferrer")}
                title="Open in Google Maps"
                aria-label="Open in Google Maps"
            >
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => window.open(generateWazeUrl(location, coordinates), "_blank", "noopener,noreferrer")}
                title="Get directions with Waze"
                aria-label="Get directions with Waze"
            >
                <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => window.open(generateUberUrl(location, coordinates), "_blank", "noopener,noreferrer")}
                title="Request Uber ride"
                aria-label="Request an Uber ride"
            >
                <Car className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
        </div>
    )
}
