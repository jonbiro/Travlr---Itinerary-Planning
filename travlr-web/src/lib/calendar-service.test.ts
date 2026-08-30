import { describe, expect, it } from "vitest"

import {
    generateGoogleCalendarUrl,
    generateICalFile,
    generateOutlookCalendarUrl,
    tripToCalendarEvents,
} from "./calendar-service"

function calendarComponents(date: Date) {
    return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        hour: date.getUTCHours(),
        minute: date.getUTCMinutes(),
    }
}

describe("tripToCalendarEvents", () => {
    it("keeps date-only arithmetic stable and stores destination wall-clock components", () => {
        const events = tripToCalendarEvents({
            tripName: "Tokyo weekend",
            startDate: "2026-12-31T00:00:00.000Z",
            days: [
                {
                    day: 1,
                    activities: [{ name: "Breakfast", time: "9:00 AM", duration: 90 }],
                },
                {
                    day: 2,
                    activities: [{ name: "Night walk", time: "8:30 PM", duration: 60 }],
                },
            ],
        })

        expect(events).toHaveLength(2)
        // Timed event Dates are UTC-backed tuples. Their UTC components are
        // the destination's local date and time, not UTC instants.
        expect(calendarComponents(events[0].startDate)).toEqual({
            year: 2026,
            month: 12,
            day: 31,
            hour: 9,
            minute: 0,
        })
        expect(calendarComponents(events[0].endDate)).toEqual({
            year: 2026,
            month: 12,
            day: 31,
            hour: 10,
            minute: 30,
        })
        expect(calendarComponents(events[1].startDate)).toEqual({
            year: 2027,
            month: 1,
            day: 1,
            hour: 20,
            minute: 30,
        })
    })
})

describe("calendar export formats", () => {
    const event = tripToCalendarEvents({
        tripName: "Tokyo morning",
        startDate: "2026-07-01T00:00:00.000Z",
        days: [{
            day: 1,
            activities: [{
                name: "Breakfast",
                time: "9:00 AM",
                duration: 90,
                description: "Local breakfast",
                location: "Shibuya",
            }],
        }],
    })[0]

    it("emits RFC 5545 floating local date-times in iCalendar", () => {
        const ical = generateICalFile([event], "Tokyo morning")

        expect(ical).toContain("X-TRAVLR-TIME-SEMANTICS:FLOATING-LOCAL")
        expect(ical).toContain("DTSTART:20260701T090000\r\n")
        expect(ical).toContain("DTEND:20260701T103000\r\n")
        expect(ical).not.toContain("DTSTART:20260701T090000Z")
        expect(ical).toMatch(/DTSTAMP:\d{8}T\d{6}Z\r\n/)
    })

    it("keeps Google Calendar template links offset-less", () => {
        const url = new URL(generateGoogleCalendarUrl(event))

        expect(url.searchParams.get("dates")).toBe("20260701T090000/20260701T103000")
        expect(url.searchParams.get("dates")).not.toContain("Z")
    })

    it("keeps Outlook compose links offset-less", () => {
        const url = new URL(generateOutlookCalendarUrl(event))

        expect(url.searchParams.get("startdt")).toBe("2026-07-01T09:00:00")
        expect(url.searchParams.get("enddt")).toBe("2026-07-01T10:30:00")
        expect(url.searchParams.get("startdt")).not.toContain("Z")
    })
})
