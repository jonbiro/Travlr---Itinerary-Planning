export interface Activity {
    id?: string
    name: string
    description: string
    time: string // or startTime/endTime
    location: string
    coordinates?: { lat: number; lng: number }
    order?: number
}

export interface DayPlan {
    id?: string
    day: number // dayNumber
    date?: string // ISO string
    theme: string
    activities: Activity[]
}

export interface Trip {
    id: string
    tripName: string // or name
    destination: string
    startDate: string // ISO string
    endDate: string // ISO string
    budget: string | number
    days: DayPlan[]
    // Add other fields as needed
    currency?: string
}
