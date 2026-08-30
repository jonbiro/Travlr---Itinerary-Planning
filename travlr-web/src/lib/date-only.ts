import { z } from "zod"

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Format a Date as the calendar date selected by the user.
 *
 * Trip dates are calendar days, not instants. Date#getFullYear/getMonth/
 * getDate intentionally use the browser's local timezone so a date picked at
 * local midnight is not shifted when it is sent over JSON.
 */
export function formatDateOnly(date: Date): string {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        throw new Error("Cannot format an invalid date")
    }

    const year = String(date.getFullYear()).padStart(4, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")

    return `${year}-${month}-${day}`
}

/**
 * Parse a YYYY-MM-DD value as UTC midnight. This is the storage boundary for
 * date-only values: Prisma receives a Date whose UTC components are exactly
 * the selected calendar day.
 */
export function parseDateOnly(value: string): Date | null {
    const match = DATE_ONLY_PATTERN.exec(value)
    if (!match) return null

    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const date = new Date(Date.UTC(year, month - 1, day))

    // Date.UTC normalizes values such as 2026-02-30. Keep those invalid rather
    // than silently storing a different calendar day.
    if (
        date.getUTCFullYear() !== year
        || date.getUTCMonth() !== month - 1
        || date.getUTCDate() !== day
    ) {
        return null
    }

    return date
}

/**
 * Accept browser Date values for form validation and canonical date-only
 * strings for API requests. Timestamp strings are deliberately rejected: an
 * offset-bearing timestamp has already turned a calendar day into an instant,
 * so its original selected day cannot be recovered reliably.
 */
export const dateOnlySchema = z.preprocess(
    (value) => {
        if (value instanceof Date) return value

        if (typeof value === "string") {
            return parseDateOnly(value) ?? new Date(Number.NaN)
        }

        return new Date(Number.NaN)
    },
    z.date(),
)

export type DateOnlyInput = z.input<typeof dateOnlySchema>
