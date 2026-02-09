"use client"

import { useMemo, useState } from "react"
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps"

// Default center (San Francisco)
const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 }
const DEFAULT_ZOOM = 12

export default function TripsMap() {
    const [center, setCenter] = useState(DEFAULT_CENTER)
    const [zoom, setZoom] = useState(DEFAULT_ZOOM)

    const mapOptions = useMemo(() => ({
        mapId: "DEMO_MAP_ID", // Using a demo map ID for development as required by Advanced Markers
        disableDefaultUI: false,
        clickableIcons: true,
        scrollwheel: true,
    }), [])

    // In a real app, API Key should come from ENV
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""

    if (!apiKey) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-muted/50 p-6 rounded-lg border border-dashed">
                <div className="text-center">
                    <h3 className="text-lg font-medium">Map Unavailable</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Google Maps API Key is missing. Please add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your environment variables.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-[600px] w-full rounded-lg overflow-hidden border shadow-sm relative">
            <APIProvider apiKey={apiKey}>
                <Map
                    defaultCenter={center}
                    defaultZoom={zoom}
                    {...mapOptions}
                    className="w-full h-full"
                >
                    <AdvancedMarker position={center}>
                        <Pin background={'#FBBC04'} glyphColor={'#000'} borderColor={'#000'} />
                    </AdvancedMarker>
                </Map>
            </APIProvider>
        </div>
    )
}
