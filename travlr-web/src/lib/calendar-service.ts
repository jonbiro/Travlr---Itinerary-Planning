// Calendar service for generating iCal files and calendar links.

/**
 * A calendar event's timed Date values are UTC-backed calendar components,
 * rather than instants. The UTC components hold the destination's wall-clock
 * date and time because the trip model does not include a destination IANA
 * timezone. Serializers below therefore emit them as floating local times
 * (without a `Z` suffix or a fabricated `TZID`).
 */

export interface CalendarEvent {
    title: string
    description?: string
    location?: string
    startDate: Date
    endDate: Date
    allDay?: boolean
}

const pad = (value: number, length: number) => String(value).padStart(length, '0')

/**
 * Format the UTC-backed calendar components as an iCalendar floating
 * DATE-TIME. A DATE-TIME without `Z` or `TZID` is intentionally floating under
 * RFC 5545: it represents the same wall-clock time regardless of the
 * calendar's timezone.
 */
function formatFloatingICalDateTime(date: Date): string {
    return [
        pad(date.getUTCFullYear(), 4),
        pad(date.getUTCMonth() + 1, 2),
        pad(date.getUTCDate(), 2),
    ].join('') + 'T' + [
        pad(date.getUTCHours(), 2),
        pad(date.getUTCMinutes(), 2),
        pad(date.getUTCSeconds(), 2),
    ].join('')
}

/** Format an actual instant for iCalendar's required UTC DTSTAMP value. */
function formatUtcICalDateTime(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
}

/** Format floating local components as an offset-less ISO date-time. */
function formatFloatingIsoDateTime(date: Date): string {
    return [
        [
            pad(date.getUTCFullYear(), 4),
            pad(date.getUTCMonth() + 1, 2),
            pad(date.getUTCDate(), 2),
        ].join('-'),
        [
            pad(date.getUTCHours(), 2),
            pad(date.getUTCMinutes(), 2),
            pad(date.getUTCSeconds(), 2),
        ].join(':'),
    ].join('T')
}

// Generate iCal (.ics) file content
export function generateICalFile(events: CalendarEvent[], tripName: string): string {
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
        // This extension documents why timed values intentionally omit Z and
        // TZID. Consumers that do not understand it still receive valid RFC
        // 5545 floating DATE-TIME values.
        'X-TRAVLR-TIME-SEMANTICS:FLOATING-LOCAL',
    ]

    events.forEach((event, index) => {
        const uid = `${Date.now()}-${index}@travlr.app`

        lines.push('BEGIN:VEVENT')
        lines.push(`UID:${uid}`)
        lines.push(`DTSTAMP:${formatUtcICalDateTime(new Date())}`)

        if (event.allDay) {
            const formatDateOnly = (date: Date) => [
                pad(date.getUTCFullYear(), 4),
                pad(date.getUTCMonth() + 1, 2),
                pad(date.getUTCDate(), 2),
            ].join('')

            lines.push(`DTSTART;VALUE=DATE:${formatDateOnly(event.startDate)}`)
            lines.push(`DTEND;VALUE=DATE:${formatDateOnly(event.endDate)}`)
        } else {
            lines.push(`DTSTART:${formatFloatingICalDateTime(event.startDate)}`)
            lines.push(`DTEND:${formatFloatingICalDateTime(event.endDate)}`)
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
        // Google accepts an offset-less local date-time for template links.
        // There is no destination IANA timezone to send as `ctz`, so do not
        // turn the destination wall-clock time into a falsely UTC timestamp.
        return formatFloatingICalDateTime(date)
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
        // An offset-less ISO date-time keeps this as a local wall-clock value.
        // Supplying `Z` here would claim that the activity occurs in UTC.
        return formatFloatingIsoDateTime(date)
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

    const parsedTripStart = new Date(trip.startDate)
    if (Number.isNaN(parsedTripStart.getTime())) return events

    // Trip dates are date-only product values. Keep all calendar arithmetic
    // in UTC so a midnight database value never rolls back a day west of UTC.
    const tripStartDate = new Date(Date.UTC(
        parsedTripStart.getUTCFullYear(),
        parsedTripStart.getUTCMonth(),
        parsedTripStart.getUTCDate(),
    ))

    trip.days.forEach((day) => {
        const dayDate = new Date(tripStartDate)
        dayDate.setUTCDate(dayDate.getUTCDate() + day.day - 1)

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
            startDate.setUTCHours(startHour, startMinute, 0, 0)

            const endDate = new Date(startDate)
            endDate.setUTCMinutes(endDate.getUTCMinutes() + (activity.duration || 60)) // Default 1 hour

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
