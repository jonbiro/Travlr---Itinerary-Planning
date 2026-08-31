"use client"

import { useState } from "react"
import {
    CalendarArrowUp,
    CalendarDays,
    CalendarRange,
    Download,
    ExternalLink,
    Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
    downloadICalFile,
    generateGoogleCalendarUrl,
    generateOutlookCalendarUrl,
    tripToCalendarEvents,
} from "@/lib/calendar-service"

interface CalendarSyncDialogProps {
    trip?: {
        tripName: string
        startDate?: string | Date
        days?: Array<{
            day: number
            theme?: string
            activities: Array<{
                name: string
                time?: string
                description?: string
                location?: string
                duration?: number
            }>
        }>
    }
    className?: string
}

const calendarOptions = [
    {
        id: "google",
        name: "Google Calendar",
        icon: CalendarDays,
        description: "Open the first event with destination-local time",
        action: "open",
    },
    {
        id: "outlook",
        name: "Outlook Calendar",
        icon: CalendarRange,
        description: "Open the first event with destination-local time",
        action: "open",
    },
    {
        id: "apple",
        name: "Apple Calendar",
        icon: CalendarArrowUp,
        description: "Download an .ics file with destination-local times",
        action: "download",
    },
    {
        id: "ical",
        name: "Download iCal File",
        icon: Download,
        description: "Works with any calendar app using destination-local times",
        action: "download",
    },
]

export function CalendarSyncDialog({ trip, className }: CalendarSyncDialogProps) {
    const [isExporting, setIsExporting] = useState<string | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [exportError, setExportError] = useState<string | null>(null)
    const [statusMessage, setStatusMessage] = useState("")

    if (!trip || !trip.days || trip.days.length === 0) {
        return null
    }

    const events = tripToCalendarEvents(trip)
    const totalEvents = events.length

    if (totalEvents === 0) return null

    const handleCalendarAction = async (optionId: string) => {
        if (events.length === 0) return

        setIsExporting(optionId)
        setExportError(null)
        const option = calendarOptions.find((calendarOption) => calendarOption.id === optionId)
        setStatusMessage(`${option?.name ?? "Calendar"} export in progress.`)

        try {
            switch (optionId) {
                case "google":
                    // For multiple events, we'll open the first one and suggest downloading the .ics
                    if (events.length > 1) {
                        // Open first event in new tab
                        window.open(generateGoogleCalendarUrl(events[0]), "_blank", "noopener,noreferrer")
                        // Suggest downloading full itinerary
                        setTimeout(() => {
                            downloadICalFile(events, trip.tripName)
                        }, 500)
                    } else {
                        window.open(generateGoogleCalendarUrl(events[0]), "_blank", "noopener,noreferrer")
                    }
                    break

                case "outlook":
                    if (events.length > 1) {
                        window.open(generateOutlookCalendarUrl(events[0]), "_blank", "noopener,noreferrer")
                        setTimeout(() => {
                            downloadICalFile(events, trip.tripName)
                        }, 500)
                    } else {
                        window.open(generateOutlookCalendarUrl(events[0]), "_blank", "noopener,noreferrer")
                    }
                    break

                case "apple":
                case "ical":
                    downloadICalFile(events, trip.tripName)
                    break
            }
            setStatusMessage(`${option?.name ?? "Calendar"} export started.`)
            setDialogOpen(false)
        } catch (error) {
            const message = error instanceof Error ? error.message : "Calendar export failed."
            setExportError(message)
            setStatusMessage(message)
        } finally {
            setTimeout(() => setIsExporting(null), 1000)
        }
    }

    return (
        <>
        <Dialog
            open={dialogOpen}
            onOpenChange={(nextOpen) => {
                setDialogOpen(nextOpen)
                if (nextOpen) {
                    setExportError(null)
                    setStatusMessage("")
                }
            }}
        >
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className={cn("gap-2", className)}>
                    <CalendarArrowUp className="h-4 w-4" aria-hidden="true" />
                    Export calendar
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Export itinerary to a calendar</DialogTitle>
                    <DialogDescription>
                        Create a one-time calendar export with {totalEvents} {totalEvents === 1 ? "event" : "events"} from this itinerary. Activity times are local to the trip destination. Because no destination time zone is stored, exports use floating local times without converting them to UTC.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2 pt-4">
                    {calendarOptions.map((option) => (
                        <button
                            type="button"
                            key={option.id}
                            onClick={() => handleCalendarAction(option.id)}
                            disabled={isExporting !== null}
                            aria-label={`${option.name}: ${option.description}`}
                            aria-busy={isExporting === option.id}
                            className={cn(
                                "w-full flex items-center gap-3 p-3 rounded-lg border",
                                "hover:bg-muted transition-colors text-left",
                                "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                        >
                            <option.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                            <div className="flex-1">
                                <p className="font-medium text-sm">{option.name}</p>
                                <p className="text-xs text-muted-foreground">{option.description}</p>
                            </div>
                            {isExporting === option.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
                            ) : option.action === "download" ? (
                                <Download className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            ) : (
                                <ExternalLink className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            )}
                        </button>
                    ))}
                </div>

                {exportError && (
                    <p className="text-sm text-destructive" role="alert">
                        {exportError}
                    </p>
                )}

                <p className="text-xs text-muted-foreground mt-4 text-center">
                    For multiple events, the full itinerary is also downloaded as an .ics file. The .ics file preserves these floating local times for calendar apps that support them.
                </p>
            </DialogContent>
        </Dialog>
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {statusMessage}
        </p>
        </>
    )
}
