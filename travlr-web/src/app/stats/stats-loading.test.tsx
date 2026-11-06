import { act, fireEvent, render, screen } from "@testing-library/react"
import { StrictMode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { TravelStatsDashboard } from "./stats-view"

const stats = { totalTrips: 1, totalDestinations: 1, totalDaysPlanned: 2, totalActivities: 3, topDestinations: [{ name: "Tokyo", tripCount: 1 }] }
afterEach(() => vi.unstubAllGlobals())

describe("travel stats loading", () => {
    it("ignores a late error from an aborted request", async () => {
        let resolveOld!: (value: { ok: boolean; status: number; json: () => Promise<unknown> }) => void
        const fetchMock = vi.fn()
            .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve }))
            .mockResolvedValueOnce({ ok: true, status: 200, json: async () => stats })
        vi.stubGlobal("fetch", fetchMock)
        render(<StrictMode><TravelStatsDashboard /></StrictMode>)
        expect((fetchMock.mock.calls[0][1] as { signal: AbortSignal }).signal.aborted).toBe(true)
        await screen.findByText("Tokyo")
        await act(async () => { resolveOld({ ok: false, status: 401, json: async () => ({}) }) })
        expect(screen.getByText("Tokyo")).toBeInTheDocument()
        expect(screen.queryByText("Sign in to see your stats")).not.toBeInTheDocument()
    })

    it("shows loading and recovers after retry", async () => {
        let resolveRetry!: (value: { ok: boolean; status: number; json: () => Promise<unknown> }) => void
        vi.stubGlobal("fetch", vi.fn()
            .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
            .mockImplementationOnce(() => new Promise((resolve) => { resolveRetry = resolve })))
        render(<TravelStatsDashboard />)
        await screen.findByText("Stats are temporarily unavailable")
        fireEvent.click(screen.getByRole("button", { name: "Try again" }))
        expect(screen.getByText("Loading your travel stats…")).toBeInTheDocument()
        await act(async () => { resolveRetry({ ok: true, status: 200, json: async () => stats }) })
        expect(screen.getByText("Tokyo")).toBeInTheDocument()
    })
})
