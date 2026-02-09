// Calendar service for generating iCal files and Google Calendar links

export interface CalendarEvent {
    title: string
    description?: string
    location?: string
    startDate: Date
    endDate: Date
    allDay?: boolean
}

// Generate iCal (.ics) file content
export function generateICalFile(events: CalendarEvent[], tripName: string): string {
    const formatDate = (date: Date, allDay?: boolean): string => {
        if (allDay) {
            return date.toISOString().slice(0, 10).replace(/-/g, '')
        }
        return date.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
    }

    const escapeText = (text: string): string => {
        return text
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\n/g, '\\n')
    }

    const lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Travlr//Trip Planner//EN',
        `X-WR-CALNAME:${escapeText(tripName)}`,
    ]

    events.forEach((event, index) => {
        const uid = `${Date.now()}-${index}@travlr.app`

        lines.push('BEGIN:VEVENT')
        lines.push(`UID:${uid}`)
        lines.push(`DTSTAMP:${formatDate(new Date())}`)

        if (event.allDay) {
            lines.push(`DTSTART;VALUE=DATE:${formatDate(event.startDate, true)}`)
            lines.push(`DTEND;VALUE=DATE:${formatDate(event.endDate, true)}`)
        } else {
            lines.push(`DTSTART:${formatDate(event.startDate)}`)
            lines.push(`DTEND:${formatDate(event.endDate)}`)
        }

        lines.push(`SUMMARY:${escapeText(event.title)}`)

        if (event.description) {
            lines.push(`DESCRIPTION:${escapeText(event.description)}`)
        }

        if (event.location) {
            lines.push(`LOCATION:${escapeText(event.location)}`)
        }

        lines.push('END:VEVENT')
    })

    lines.push('END:VCALENDAR')

    return lines.join('\r\n')
}

// Generate Google Calendar URL for adding a single event
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
    const formatGoogleDate = (date: Date): string => {
        return date.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
    }

    const baseUrl = 'https://calendar.google.com/calendar/render'
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.title,
        dates: `${formatGoogleDate(event.startDate)}/${formatGoogleDate(event.endDate)}`,
    })

    if (event.description) {
        params.set('details', event.description)
    }

    if (event.location) {
        params.set('location', event.location)
    }

    return `${baseUrl}?${params.toString()}`
}

// Generate Outlook Calendar URL
export function generateOutlookCalendarUrl(event: CalendarEvent): string {
    const formatOutlookDate = (date: Date): string => {
        return date.toISOString()
    }

    const baseUrl = 'https://outlook.live.com/calendar/0/deeplink/compose'
    const params = new URLSearchParams({
        path: '/calendar/action/compose',
        rru: 'addevent',
        subject: event.title,
        startdt: formatOutlookDate(event.startDate),
        enddt: formatOutlookDate(event.endDate),
    })

    if (event.description) {
        params.set('body', event.description)
    }

    if (event.location) {
        params.set('location', event.location)
    }

    return `${baseUrl}?${params.toString()}`
}

// Convert trip activities to calendar events
export function tripToCalendarEvents(trip: {
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
            duration?: number // in minutes
        }>
    }>
}): CalendarEvent[] {
    const events: CalendarEvent[] = []

    if (!trip.startDate || !trip.days) return events

    const tripStartDate = new Date(trip.startDate)

    trip.days.forEach((day) => {
        const dayDate = new Date(tripStartDate)
        dayDate.setDate(dayDate.getDate() + day.day - 1)

        day.activities.forEach((activity) => {
            // Parse time (e.g., "9:00 AM")
            let startHour = 9 // Default
            let startMinute = 0

            if (activity.time) {
                const timeMatch = activity.time.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i)
                if (timeMatch) {
                    startHour = parseInt(timeMatch[1])
                    startMinute = parseInt(timeMatch[2] || '0')
                    if (timeMatch[3]?.toUpperCase() === 'PM' && startHour !== 12) {
                        startHour += 12
                    } else if (timeMatch[3]?.toUpperCase() === 'AM' && startHour === 12) {
                        startHour = 0
                    }
                }
            }

            const startDate = new Date(dayDate)
            startDate.setHours(startHour, startMinute, 0, 0)

            const endDate = new Date(startDate)
            endDate.setMinutes(endDate.getMinutes() + (activity.duration || 60)) // Default 1 hour

            events.push({
                title: activity.name,
                description: activity.description,
                location: activity.location,
                startDate,
                endDate,
            })
        })
    })

    return events
}

// Download iCal file helper
export function downloadICalFile(events: CalendarEvent[], tripName: string) {
    const icalContent = generateICalFile(events, tripName)
    const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `${tripName.replace(/\s+/g, '-').toLowerCase()}-itinerary.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}
