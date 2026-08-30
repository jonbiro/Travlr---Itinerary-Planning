"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Cloud, Sun, CloudRain, CloudSnow, Zap, Wind, Droplets, Loader2, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { WeatherForecast } from "@/lib/weather-service"

type AuthState = "auth" | "setup"

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
    return <Icon className={cn("h-8 w-8", className)} aria-hidden="true" />
}

function classifyAuthFailure(payload: unknown): AuthState {
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return "auth"

    const record = payload as Record<string, unknown>
    return record.code === "AUTH_NOT_CONFIGURED" || record.authConfigured === false
        ? "setup"
        : "auth"
}

export function formatWeatherDate(
    date: Date | string,
    timezone = 'UTC',
    timezoneOffset = 0,
): { day: string; date: string } {
    const instant = new Date(date)

    // The API returns an IANA timezone for the destination. Formatting with it
    // keeps the label stable even when the viewer is in another timezone.
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            weekday: 'short',
            month: 'numeric',
            day: 'numeric',
        }).formatToParts(instant)
        const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value
        const day = getPart('weekday')
        const month = getPart('month')
        const dayOfMonth = getPart('day')

        if (day && month && dayOfMonth) return { day, date: `${month}/${dayOfMonth}` }
    } catch {
        // Fall back to the provider's numeric offset for an invalid/unsupported
        // timezone identifier. OpenWeather supplies this offset in seconds.
    }

    const shiftedInstant = new Date(instant.getTime() + timezoneOffset * 1_000)
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        weekday: 'short',
        month: 'numeric',
        day: 'numeric',
    }).formatToParts(shiftedInstant)
    const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value

    return {
        day: getPart('weekday') ?? '',
        date: `${getPart('month') ?? ''}/${getPart('day') ?? ''}`,
    }
}

export function WeatherForecastComponent({ destination }: WeatherForecastProps) {
    const [forecast, setForecast] = useState<WeatherForecast | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [authState, setAuthState] = useState<AuthState | null>(null)
    const [retryToken, setRetryToken] = useState(0)
    const hasDestination = Boolean(destination?.trim())

    useEffect(() => {
        const location = destination?.trim()
        if (!location) {
            setForecast(null)
            setError(null)
            setIsLoading(false)
            setAuthState(null)
            return
        }
        const requestedLocation: string = location

        const controller = new AbortController()
        let isCurrentRequest = true

        async function fetchWeather() {
            setIsLoading(true)
            setError(null)
            setForecast(null)
            setAuthState(null)
            try {
                const response = await fetch(`/api/weather?location=${encodeURIComponent(requestedLocation)}`, {
                    signal: controller.signal,
                })
                const payload = await response.json().catch(() => null) as unknown

                if (response.status === 401) {
                    const nextAuthState = classifyAuthFailure(payload)
                    setAuthState(nextAuthState)
                    throw new Error(nextAuthState === "setup"
                        ? "Sign-in is not configured for this environment yet."
                        : "Sign in to view weather forecasts.")
                }

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
    }, [destination, retryToken])

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

    if (authState) {
        const isSetup = authState === "setup"

        return (
            <div className="flex h-full flex-col items-center justify-center space-y-4 p-8 text-center" role="alert">
                <Cloud className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
                <div>
                    <h3 className="font-semibold text-lg">{isSetup ? "Finish setting up Travlr" : "Sign in to see the forecast"}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {isSetup
                            ? "Sign-in is not configured for this environment yet. Add the required authentication settings, then try again."
                            : "Weather requests are tied to your Travlr account."}
                    </p>
                </div>
                {isSetup ? (
                    <Button type="button" variant="outline" onClick={() => setRetryToken((token) => token + 1)}>
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        Try again
                    </Button>
                ) : (
                    <Button asChild>
                        <Link href="/api/auth/signin">Sign in</Link>
                    </Button>
                )}
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center space-y-4 p-8 text-center" role="alert">
                <Cloud className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
                <p className="text-destructive">{error}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => setRetryToken((token) => token + 1)}>
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Try again
                </Button>
            </div>
        )
    }

    if (!forecast) return null

    return (
        <div className="flex flex-col h-full p-4 space-y-4">
            {/* Current Weather */}
            <Card className="bg-gradient-to-br from-sky-500 to-blue-600 text-white border-0">
                <CardHeader className="pb-2">
                    <CardDescription className="text-white/80">Current conditions · {forecast.location}</CardDescription>
                    <CardTitle className="text-4xl font-bold">
                        <span className="sr-only">Current temperature: </span>
                        {forecast.current.temp}°C
                    </CardTitle>
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
                <h3 className="mb-3 font-semibold">10-day forecast</h3>
                <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex gap-3 pb-4">
                        {forecast.daily.map((day, index) => {
                            const { day: dayName, date } = formatWeatherDate(
                                day.date,
                                forecast.timezone,
                                forecast.timezoneOffset,
                            )
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
