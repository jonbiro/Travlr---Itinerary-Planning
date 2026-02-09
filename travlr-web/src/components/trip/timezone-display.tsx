"use client"

import { useState, useEffect } from "react"
import { Clock, Globe } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    formatTimeInTimezone,
    getTimezoneOffset,
    getTimezoneDifference,
    formatTimeDifference,
    guessTimezoneFromCity,
    COMMON_TIMEZONES,
} from "@/lib/timezone-service"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface TimezoneDisplayProps {
    destination?: string
    className?: string
}

export function TimezoneDisplay({ destination, className }: TimezoneDisplayProps) {
    const [currentTime, setCurrentTime] = useState<Date>(new Date())
    const [destinationTz, setDestinationTz] = useState<string | null>(null)

    // Get user's local timezone
    const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone

    // Try to guess destination timezone from city name
    useEffect(() => {
        if (destination) {
            const guessedTz = guessTimezoneFromCity(destination)
            setDestinationTz(guessedTz)
        }
    }, [destination])

    // Update time every minute
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date())
        }, 60000)
        return () => clearInterval(interval)
    }, [])

    if (!destination || !destinationTz) {
        return null
    }

    const timeDiff = getTimezoneDifference(localTz, destinationTz)
    const destinationTimeDisplay = formatTimeInTimezone(currentTime, destinationTz)
    const localTimeDisplay = formatTimeInTimezone(currentTime, localTz)
    const offsetDisplay = getTimezoneOffset(destinationTz)

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 text-sm",
                            className
                        )}
                    >
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{destinationTimeDisplay}</span>
                        <span className="text-muted-foreground text-xs">
                            ({offsetDisplay})
                        </span>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <div className="space-y-1">
                        <p className="font-medium">{destination}</p>
                        <p className="text-xs text-muted-foreground">
                            {formatTimeDifference(timeDiff)} from your time ({localTimeDisplay})
                        </p>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}

interface TimezoneSelectorProps {
    value?: string
    onChange: (timezone: string) => void
    className?: string
}

export function TimezoneSelector({ value, onChange, className }: TimezoneSelectorProps) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className={cn("w-full", className)}>
                <SelectValue placeholder="Select timezone">
                    {value && (
                        <span className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            {COMMON_TIMEZONES.find(tz => tz.value === value)?.label || value}
                        </span>
                    )}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {COMMON_TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                        <span className="flex items-center justify-between w-full gap-4">
                            <span>{tz.label}</span>
                            <span className="text-xs text-muted-foreground">{tz.offset}</span>
                        </span>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

interface LocalTimeDisplayProps {
    time: string // e.g., "9:00 AM"
    destinationTimezone?: string
    className?: string
}

export function LocalTimeDisplay({
    time,
    destinationTimezone,
    className
}: LocalTimeDisplayProps) {
    const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone

    if (!destinationTimezone || destinationTimezone === localTz) {
        return <span className={className}>{time}</span>
    }

    const timeDiff = getTimezoneDifference(localTz, destinationTimezone)

    if (timeDiff === 0) {
        return <span className={className}>{time}</span>
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className={cn("flex items-center gap-1", className)}>
                        <span>{time}</span>
                        <span className="text-xs text-muted-foreground">
                            (local)
                        </span>
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="text-xs">
                        {formatTimeDifference(timeDiff)} from your timezone
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
