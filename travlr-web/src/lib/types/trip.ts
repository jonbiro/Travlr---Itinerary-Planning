export interface Activity {
    name: string
    description: string
    time: string
    location: string
    coordinates?: { lat: number; lng: number }
}

export interface DayPlan {
    day: number
    theme: string
    activities: Activity[]
}

export interface Trip {
    tripName: string
    summary: string
    destination: string
    startDate: string
    endDate: string
    budget: string
    days: DayPlan[]
}
