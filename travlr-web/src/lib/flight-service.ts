// Flight tracking service for real-time flight updates

export interface Flight {
    id: string
    flightNumber: string
    airline: string
    departure: {
        airport: string
        city: string
        time: Date | string
        terminal?: string
        gate?: string
        actualTime?: Date | string
    }
    arrival: {
        airport: string
        city: string
        time: Date | string
        terminal?: string
        gate?: string
        actualTime?: Date | string
    }
    status: FlightStatus
    duration?: number // in minutes
    delay?: number // in minutes
}

export type FlightStatus =
    | 'scheduled'
    | 'boarding'
    | 'departed'
    | 'in_air'
    | 'landed'
    | 'arrived'
    | 'delayed'
    | 'cancelled'

export const FLIGHT_STATUS_INFO: Record<FlightStatus, { label: string; color: string; icon: string }> = {
    scheduled: { label: 'Scheduled', color: 'text-blue-500', icon: '📅' },
    boarding: { label: 'Boarding', color: 'text-orange-500', icon: '🚶' },
    departed: { label: 'Departed', color: 'text-green-500', icon: '✈️' },
    in_air: { label: 'In Air', color: 'text-purple-500', icon: '🛫' },
    landed: { label: 'Landed', color: 'text-green-600', icon: '🛬' },
    arrived: { label: 'Arrived', color: 'text-green-700', icon: '✅' },
    delayed: { label: 'Delayed', color: 'text-red-500', icon: '⏰' },
    cancelled: { label: 'Cancelled', color: 'text-red-700', icon: '❌' },
}

// Common airlines
export const COMMON_AIRLINES: { code: string; name: string }[] = [
    { code: 'AA', name: 'American Airlines' },
    { code: 'UA', name: 'United Airlines' },
    { code: 'DL', name: 'Delta Air Lines' },
    { code: 'SW', name: 'Southwest Airlines' },
    { code: 'BA', name: 'British Airways' },
    { code: 'LH', name: 'Lufthansa' },
    { code: 'AF', name: 'Air France' },
    { code: 'EK', name: 'Emirates' },
    { code: 'QF', name: 'Qantas' },
    { code: 'SQ', name: 'Singapore Airlines' },
    { code: 'CX', name: 'Cathay Pacific' },
    { code: 'JL', name: 'Japan Airlines' },
    { code: 'NH', name: 'All Nippon Airways' },
    { code: 'KL', name: 'KLM' },
    { code: 'IB', name: 'Iberia' },
]

// Parse flight number to get airline code
export function parseFlightNumber(flightNumber: string): { airline: string; number: string } | null {
    const match = flightNumber.toUpperCase().match(/^([A-Z]{2})?\s*(\d+)$/)
    if (!match) return null
    return {
        airline: match[1] || '',
        number: match[2],
    }
}

// Format time with delay indicator
export function formatFlightTime(
    scheduledTime: Date | string,
    actualTime?: Date | string
): { time: string; isDelayed: boolean; delayMinutes: number } {
    const scheduled = new Date(scheduledTime)
    const actual = actualTime ? new Date(actualTime) : scheduled

    const delayMinutes = Math.round((actual.getTime() - scheduled.getTime()) / (1000 * 60))
    const isDelayed = delayMinutes > 15 // Consider delayed if more than 15 minutes

    const time = actual.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    })

    return { time, isDelayed, delayMinutes }
}

// Generate mock flight data (in production, this would call a flight API)
export function generateMockFlight(flightNumber: string, date: Date): Flight {
    const parsed = parseFlightNumber(flightNumber)
    const airlineCode = parsed?.airline || 'AA'
    const airline = COMMON_AIRLINES.find(a => a.code === airlineCode)?.name || 'Unknown Airline'

    // Random departure time during the day
    const departureTime = new Date(date)
    departureTime.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), 0, 0)

    // Random duration 2-12 hours
    const durationMinutes = 120 + Math.floor(Math.random() * 600)
    const arrivalTime = new Date(departureTime.getTime() + durationMinutes * 60000)

    // Random status
    const statuses: FlightStatus[] = ['scheduled', 'boarding', 'departed', 'in_air', 'landed', 'arrived', 'delayed']
    const status = statuses[Math.floor(Math.random() * statuses.length)]

    // Random delay for delayed flights
    const delay = status === 'delayed' ? 30 + Math.floor(Math.random() * 120) : 0

    return {
        id: `flight-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        flightNumber: flightNumber.toUpperCase(),
        airline,
        departure: {
            airport: 'JFK',
            city: 'New York',
            time: departureTime,
            terminal: String(Math.floor(Math.random() * 8) + 1),
            gate: `${String.fromCharCode(65 + Math.floor(Math.random() * 4))}${Math.floor(Math.random() * 30) + 1}`,
        },
        arrival: {
            airport: 'LHR',
            city: 'London',
            time: arrivalTime,
            terminal: String(Math.floor(Math.random() * 5) + 1),
        },
        status,
        duration: durationMinutes,
        delay,
    }
}

// Check if flight is active (useful for refresh intervals)
export function isFlightActive(flight: Flight): boolean {
    return ['boarding', 'departed', 'in_air'].includes(flight.status)
}

// Calculate progress percentage for in-flight
export function getFlightProgress(flight: Flight): number {
    if (!flight.duration) return 0
    if (flight.status === 'scheduled' || flight.status === 'boarding') return 0
    if (flight.status === 'landed' || flight.status === 'arrived') return 100

    const departureTime = new Date(flight.departure.time).getTime()
    const now = Date.now()
    const elapsed = now - departureTime
    const totalDuration = flight.duration * 60000

    return Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)))
}

// Format duration in hours and minutes
export function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
}

// Format delay
export function formatDelay(minutes: number): string {
    if (minutes <= 0) return 'On time'
    if (minutes < 60) return `${minutes} min delay`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m delay`
}
