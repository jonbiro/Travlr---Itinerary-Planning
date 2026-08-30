"use client"

import { useState, useEffect } from "react"
import { Cloud, Sun, CloudRain, CloudSnow, Zap, Wind, Droplets, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { WeatherForecast } from "@/lib/weather-service"

interface WeatherForecastProps {
    destination?: string
}

const weatherIcons = {
    'sunny': Sun,
    'cloudy': Cloud,
    'rainy': CloudRain,
    'stormy': Zap,
    'snowy': CloudSnow,
    'partly-cloudy': Cloud,
}

function WeatherIcon({ condition, className }: { condition: string; className?: string }) {
    const Icon = weatherIcons[condition as keyof typeof weatherIcons] || Cloud
    return <Icon className={cn("h-8 w-8", className)} />
}

function formatDate(date: Date): { day: string; date: string } {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const d = new Date(date)
    return {
        day: days[d.getDay()],
        date: `${d.getMonth() + 1}/${d.getDate()}`
    }
}

export function WeatherForecastComponent({ destination }: WeatherForecastProps) {
    const [forecast, setForecast] = useState<WeatherForecast | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const hasDestination = Boolean(destination?.trim())

    useEffect(() => {
        const location = destination?.trim()
        if (!location) {
            setForecast(null)
            setError(null)
            setIsLoading(false)
            return
        }
        const requestedLocation: string = location

        const controller = new AbortController()
        let isCurrentRequest = true

        async function fetchWeather() {
            setIsLoading(true)
            setError(null)
            setForecast(null)
            try {
                const response = await fetch(`/api/weather?location=${encodeURIComponent(requestedLocation)}`, {
                    signal: controller.signal,
                })
                const payload = await response.json().catch(() => null) as unknown

                if (!response.ok) {
                    const serverMessage = isWeatherErrorPayload(payload) ? payload.error : null
                    throw new Error(
                        serverMessage || 'Could not load the weather forecast right now.',
                    )
                }

                if (isCurrentRequest) setForecast(payload as WeatherForecast)
            } catch (requestError) {
                if (controller.signal.aborted || !isCurrentRequest) return

                setError(
                    requestError instanceof Error
                        ? requestError.message
                        : 'Could not load the weather forecast right now.',
                )
            } finally {
                if (isCurrentRequest) setIsLoading(false)
            }
        }

        fetchWeather()

        return () => {
            isCurrentRequest = false
            controller.abort()
        }
    }, [destination])

    if (!hasDestination) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 h-full">
                <Cloud className="h-12 w-12 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Create or select a trip to see weather forecasts</p>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Loading weather...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center" role="alert">
                <p className="text-destructive">{error}</p>
            </div>
        )
    }

    if (!forecast) return null

    return (
        <div className="flex flex-col h-full p-4 space-y-4">
            {/* Current Weather */}
            <Card className="bg-gradient-to-br from-sky-500 to-blue-600 text-white border-0">
                <CardHeader className="pb-2">
                    <CardDescription className="text-white/80">{forecast.location}</CardDescription>
                    <CardTitle className="text-4xl font-bold">{forecast.current.temp}°C</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <WeatherIcon condition={forecast.current.condition} className="h-10 w-10" />
                            <span className="capitalize">{forecast.current.condition.replace('-', ' ')}</span>
                        </div>
                        <div className="flex gap-4 text-sm">
                            <div className="flex items-center gap-1">
                                <Droplets className="h-4 w-4" />
                                {forecast.current.humidity}%
                            </div>
                            <div className="flex items-center gap-1">
                                <Wind className="h-4 w-4" />
                                {forecast.current.windSpeed} km/h
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 10-Day Forecast */}
            <div>
                <h3 className="font-semibold mb-3">10-Day Forecast</h3>
                <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex gap-3 pb-4">
                        {forecast.daily.map((day, index) => {
                            const { day: dayName, date } = formatDate(day.date)
                            return (
                                <Card
                                    key={index}
                                    className={cn(
                                        "min-w-[100px] text-center hover:bg-muted/50 transition-colors",
                                        index === 0 && "border-primary"
                                    )}
                                >
                                    <CardContent className="p-3">
                                        <p className="text-xs text-muted-foreground">{index === 0 ? 'Today' : dayName}</p>
                                        <p className="text-xs text-muted-foreground">{date}</p>
                                        <WeatherIcon
                                            condition={day.condition}
                                            className={cn(
                                                "h-6 w-6 mx-auto my-2",
                                                day.condition === 'sunny' && "text-yellow-500",
                                                day.condition === 'rainy' && "text-blue-500",
                                                day.condition === 'stormy' && "text-purple-500",
                                                day.condition === 'snowy' && "text-cyan-400"
                                            )}
                                        />
                                        <p className="font-semibold">{day.tempHigh}°</p>
                                        <p className="text-sm text-muted-foreground">{day.tempLow}°</p>
                                        {day.precipitation > 20 && (
                                            <div className="flex items-center justify-center gap-1 text-xs text-blue-500 mt-1">
                                                <Droplets className="h-3 w-3" />
                                                {day.precipitation}%
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>
        </div>
    )
}

function isWeatherErrorPayload(value: unknown): value is { error: string } {
    return (
        typeof value === 'object'
        && value !== null
        && 'error' in value
        && typeof value.error === 'string'
        && value.error.trim().length > 0
    )
}
