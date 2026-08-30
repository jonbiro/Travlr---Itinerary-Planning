"use client"

import { useMemo } from "react"
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps"
import type { Trip } from "@/lib/types/trip"

const DEFAULT_CENTER = { lat: 20, lng: 0 }

export default function TripsMap({ trip }: { trip?: Trip | null }) {
    const markers = useMemo(() => (
        trip?.days.flatMap((day) => day.activities)
            .filter((activity) => activity.coordinates)
            .map((activity) => ({
                id: activity.id || `${activity.name}-${activity.time}`,
                name: activity.name,
                position: activity.coordinates!,
            })) || []
    ), [trip])

    const center = markers[0]?.position || DEFAULT_CENTER
    const zoom = markers.length > 0 ? 12 : 2
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || ""
    const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID?.trim()
        || (process.env.NODE_ENV !== "production" ? "DEMO_MAP_ID" : "")

    const mapOptions = useMemo(() => ({
        mapId,
        disableDefaultUI: false,
        clickableIcons: true,
        scrollwheel: true,
    }), [mapId])

    if (!apiKey || !mapId) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-muted/50 p-6 rounded-lg border border-dashed">
                <div className="text-center">
                    <h3 className="text-lg font-medium">Map Unavailable</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        {!apiKey
                            ? <>Add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your environment variables.</>
                            : <>Add a production Google Maps ID as <code>NEXT_PUBLIC_GOOGLE_MAP_ID</code>.</>}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full min-h-[300px] w-full rounded-lg overflow-hidden border shadow-sm relative">
            <APIProvider apiKey={apiKey}>
                <Map
                    key={`${center.lat}-${center.lng}-${markers.length}`}
                    defaultCenter={center}
                    defaultZoom={zoom}
                    {...mapOptions}
                    className="w-full h-full"
                >
                    {markers.map((marker) => (
                        <AdvancedMarker key={marker.id} position={marker.position} title={marker.name}>
                            <Pin background="#3b82f6" glyphColor="#fff" borderColor="#1d4ed8" />
                        </AdvancedMarker>
                    ))}
                </Map>
            </APIProvider>
        </div>
    )
}
