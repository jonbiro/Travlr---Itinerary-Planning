// Timezone utilities for travel planning

// Common travel destination timezones
export const COMMON_TIMEZONES: { value: string; label: string; offset: string }[] = [
    { value: 'America/New_York', label: 'New York (EST)', offset: '-05:00' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (PST)', offset: '-08:00' },
    { value: 'America/Chicago', label: 'Chicago (CST)', offset: '-06:00' },
    { value: 'Europe/London', label: 'London (GMT)', offset: '+00:00' },
    { value: 'Europe/Paris', label: 'Paris (CET)', offset: '+01:00' },
    { value: 'Europe/Berlin', label: 'Berlin (CET)', offset: '+01:00' },
    { value: 'Europe/Rome', label: 'Rome (CET)', offset: '+01:00' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)', offset: '+09:00' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST)', offset: '+08:00' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)', offset: '+08:00' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)', offset: '+04:00' },
    { value: 'Australia/Sydney', label: 'Sydney (AEDT)', offset: '+11:00' },
    { value: 'Pacific/Auckland', label: 'Auckland (NZDT)', offset: '+13:00' },
    { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)', offset: '-03:00' },
    { value: 'Asia/Bangkok', label: 'Bangkok (ICT)', offset: '+07:00' },
    { value: 'Europe/Amsterdam', label: 'Amsterdam (CET)', offset: '+01:00' },
    { value: 'Asia/Seoul', label: 'Seoul (KST)', offset: '+09:00' },
    { value: 'America/Mexico_City', label: 'Mexico City (CST)', offset: '-06:00' },
]

// Guess timezone from city name
export function guessTimezoneFromCity(city: string): string | null {
    const cityLower = city.toLowerCase()

    const cityTimezoneMap: Record<string, string> = {
        'new york': 'America/New_York',
        'nyc': 'America/New_York',
        'los angeles': 'America/Los_Angeles',
        'la': 'America/Los_Angeles',
        'chicago': 'America/Chicago',
        'london': 'Europe/London',
        'paris': 'Europe/Paris',
        'berlin': 'Europe/Berlin',
        'rome': 'Europe/Rome',
        'tokyo': 'Asia/Tokyo',
        'shanghai': 'Asia/Shanghai',
        'beijing': 'Asia/Shanghai',
        'singapore': 'Asia/Singapore',
        'dubai': 'Asia/Dubai',
        'sydney': 'Australia/Sydney',
        'auckland': 'Pacific/Auckland',
        'sao paulo': 'America/Sao_Paulo',
        'são paulo': 'America/Sao_Paulo',
        'bangkok': 'Asia/Bangkok',
        'amsterdam': 'Europe/Amsterdam',
        'seoul': 'Asia/Seoul',
        'mexico city': 'America/Mexico_City',
        'barcelona': 'Europe/Madrid',
        'madrid': 'Europe/Madrid',
        'milan': 'Europe/Rome',
        'hong kong': 'Asia/Hong_Kong',
        'mumbai': 'Asia/Kolkata',
        'delhi': 'Asia/Kolkata',
        'cairo': 'Africa/Cairo',
        'johannesburg': 'Africa/Johannesburg',
        'cape town': 'Africa/Johannesburg',
        'istanbul': 'Europe/Istanbul',
        'moscow': 'Europe/Moscow',
        'vancouver': 'America/Vancouver',
        'toronto': 'America/Toronto',
        'montreal': 'America/Toronto',
        'miami': 'America/New_York',
        'san francisco': 'America/Los_Angeles',
        'seattle': 'America/Los_Angeles',
        'denver': 'America/Denver',
        'athens': 'Europe/Athens',
        'lisbon': 'Europe/Lisbon',
        'vienna': 'Europe/Vienna',
        'zurich': 'Europe/Zurich',
        'stockholm': 'Europe/Stockholm',
        'oslo': 'Europe/Oslo',
        'copenhagen': 'Europe/Copenhagen',
        'helsinki': 'Europe/Helsinki',
        'warsaw': 'Europe/Warsaw',
        'prague': 'Europe/Prague',
        'budapest': 'Europe/Budapest',
    }

    for (const [key, tz] of Object.entries(cityTimezoneMap)) {
        if (cityLower.includes(key)) {
            return tz
        }
    }

    return null
}

// Format time for a specific timezone
export function formatTimeInTimezone(
    date: Date,
    timezone: string,
    options?: Intl.DateTimeFormatOptions
): string {
    const defaultOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: timezone,
    }

    return date.toLocaleTimeString('en-US', { ...defaultOptions, ...options })
}

// Format date for a specific timezone
export function formatDateInTimezone(
    date: Date,
    timezone: string,
    options?: Intl.DateTimeFormatOptions
): string {
    const defaultOptions: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: timezone,
    }

    return date.toLocaleDateString('en-US', { ...defaultOptions, ...options })
}

// Get current time in a timezone
export function getCurrentTimeInTimezone(timezone: string): Date {
    const now = new Date()
    const localTime = now.toLocaleString('en-US', { timeZone: timezone })
    return new Date(localTime)
}

// Get timezone offset description
export function getTimezoneOffset(timezone: string): string {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en', {
        timeZone: timezone,
        timeZoneName: 'shortOffset',
    })

    const parts = formatter.formatToParts(now)
    const offsetPart = parts.find(p => p.type === 'timeZoneName')
    return offsetPart?.value || 'UTC'
}

// Calculate time difference between two timezones
export function getTimezoneDifference(
    fromTz: string,
    toTz: string,
    date: Date = new Date()
): number {
    const fromTime = new Date(date.toLocaleString('en-US', { timeZone: fromTz }))
    const toTime = new Date(date.toLocaleString('en-US', { timeZone: toTz }))

    return Math.round((toTime.getTime() - fromTime.getTime()) / (1000 * 60 * 60))
}

// Format time difference in human readable format
export function formatTimeDifference(hours: number): string {
    if (hours === 0) return 'same time'

    const absHours = Math.abs(hours)
    const direction = hours > 0 ? 'ahead' : 'behind'

    if (absHours === 1) return `1 hour ${direction}`
    return `${absHours} hours ${direction}`
}

// Parse time string like "9:00 AM" to hours and minutes
export function parseTimeString(timeStr: string): { hours: number; minutes: number } | null {
    const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i)
    if (!match) return null

    let hours = parseInt(match[1])
    const minutes = parseInt(match[2] || '0')
    const period = match[3]?.toUpperCase()

    if (period === 'PM' && hours !== 12) hours += 12
    else if (period === 'AM' && hours === 12) hours = 0

    return { hours, minutes }
}

// Create a Date object for a specific time in a timezone
export function createDateInTimezone(
    year: number,
    month: number, // 0-indexed
    day: number,
    hours: number,
    minutes: number,
    timezone: string
): Date {
    // Create date string in ISO format
    const isoString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`

    // Parse as if in the target timezone
    const date = new Date(isoString)

    return date
}
