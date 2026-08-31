/**
 * Calculate the calendar date for an itinerary day from the trip's UTC
 * calendar start. Trip dates are date-only values, so all arithmetic stays in
 * UTC to avoid shifting a day for viewers in another timezone.
 */
export function dateForTripDay(startDate: Date, dayNumber: number): Date {
    const date = new Date(startDate.getTime())
    date.setUTCDate(date.getUTCDate() + dayNumber - 1)
    return date
}
