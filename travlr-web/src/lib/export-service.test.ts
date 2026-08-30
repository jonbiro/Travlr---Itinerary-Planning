import { describe, expect, it } from "vitest"

import { exportItineraryToMarkdown, generateCSV, neutralizeSpreadsheetFormula } from "./export-service"

describe("CSV exports", () => {
    it("neutralizes spreadsheet formulas without changing ordinary values", () => {
        expect(neutralizeSpreadsheetFormula("=SUM(A1:A2)")).toBe("'=SUM(A1:A2)")
        expect(neutralizeSpreadsheetFormula(" @cmd")).toBe("' @cmd")
        expect(neutralizeSpreadsheetFormula("ordinary text")).toBe("ordinary text")
    })

    it("protects formula-like cells and still escapes CSV delimiters", () => {
        const csv = generateCSV(
            [{ description: "=HYPERLINK(\"https://example.com\")", note: "hello, world" }],
            [
                { key: "description", header: "Description" },
                { key: "note", header: "Note" },
            ],
        )

        expect(csv).toBe("Description,Note\n\"'=HYPERLINK(\"\"https://example.com\"\")\",\"hello, world\"")
    })

    it("creates a clear text-only itinerary export", () => {
        const markdown = exportItineraryToMarkdown({
            tripName: "Tokyo weekend",
            destination: "Tokyo, Japan",
            startDate: "2026-07-01T00:00:00.000Z",
            endDate: "2026-07-03T00:00:00.000Z",
            days: [{
                id: "day-1",
                day: 1,
                theme: "Neighborhoods",
                activities: [{
                    id: "activity-1",
                    name: "Morning market",
                    description: "Browse the stalls before lunch.",
                    time: "9:00 AM",
                    location: "Tsukiji",
                }],
            }],
        })

        expect(markdown).toContain("**Destination:** Tokyo, Japan")
        expect(markdown).toContain("**Dates:** 2026-07-01 - 2026-07-03")
        expect(markdown).toContain("**Location:** *Tsukiji*")
        expect(markdown).not.toMatch(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u)
    })
})
