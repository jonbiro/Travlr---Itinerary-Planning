"use client"

import { useState } from "react"
import { Calendar, Download, ExternalLink, Loader2 } from "lucide-react"
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
        icon: "📅",
        description: "Add events to Google Calendar",
        action: "open",
    },
    {
        id: "outlook",
        name: "Outlook Calendar",
        icon: "📆",
        description: "Add events to Outlook Calendar",
        action: "open",
    },
    {
        id: "apple",
        name: "Apple Calendar",
        icon: "🍎",
        description: "Download .ics file for Apple Calendar",
        action: "download",
    },
    {
        id: "ical",
        name: "Download iCal File",
        icon: "📥",
        description: "Works with any calendar app",
        action: "download",
    },
]

export function CalendarSyncDialog({ trip, className }: CalendarSyncDialogProps) {
    const [isExporting, setIsExporting] = useState<string | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)

    if (!trip || !trip.days || trip.days.length === 0) {
        return null // Don't render if no trip data
    }

    const events = tripToCalendarEvents(trip)
    const totalEvents = events.length

    const handleCalendarAction = async (optionId: string) => {
        if (events.length === 0) return

        setIsExporting(optionId)

        try {
            switch (optionId) {
                case "google":
                    // For multiple events, we'll open the first one and suggest downloading the .ics
                    if (events.length > 1) {
                        // Open first event in new tab
                        window.open(generateGoogleCalendarUrl(events[0]), "_blank")
                        // Suggest downloading full itinerary
                        setTimeout(() => {
                            downloadICalFile(events, trip.tripName)
                        }, 500)
                    } else {
                        window.open(generateGoogleCalendarUrl(events[0]), "_blank")
                    }
                    break

                case "outlook":
                    if (events.length > 1) {
                        window.open(generateOutlookCalendarUrl(events[0]), "_blank")
                        setTimeout(() => {
                            downloadICalFile(events, trip.tripName)
                        }, 500)
                    } else {
                        window.open(generateOutlookCalendarUrl(events[0]), "_blank")
                    }
                    break

                case "apple":
                case "ical":
                    downloadICalFile(events, trip.tripName)
                    break
            }
        } catch (error) {
            console.error("Calendar export failed:", error)
        } finally {
            setTimeout(() => setIsExporting(null), 1000)
        }
    }

    return (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className={cn("gap-2", className)}>
                    <Calendar className="h-4 w-4" />
                    Sync to Calendar
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Export to Calendar</DialogTitle>
                    <DialogDescription>
                        Add {totalEvents} {totalEvents === 1 ? "event" : "events"} from your itinerary to your calendar
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2 pt-4">
                    {calendarOptions.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => handleCalendarAction(option.id)}
                            disabled={isExporting !== null}
                            className={cn(
                                "w-full flex items-center gap-3 p-3 rounded-lg border",
                                "hover:bg-muted transition-colors text-left",
                                "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                        >
                            <span className="text-2xl">{option.icon}</span>
                            <div className="flex-1">
                                <p className="font-medium text-sm">{option.name}</p>
                                <p className="text-xs text-muted-foreground">{option.description}</p>
                            </div>
                            {isExporting === option.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : option.action === "download" ? (
                                <Download className="h-4 w-4 text-muted-foreground" />
                            ) : (
                                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            )}
                        </button>
                    ))}
                </div>

                <p className="text-xs text-muted-foreground mt-4 text-center">
                    💡 For multiple events, we&apos;ll also download a .ics file
                </p>
            </DialogContent>
        </Dialog>
    )
}
