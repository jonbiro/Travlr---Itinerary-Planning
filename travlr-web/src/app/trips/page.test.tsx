import { act, fireEvent, render, screen } from "@testing-library/react"
import { StrictMode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import TripsPage from "./page"

afterEach(() => vi.unstubAllGlobals())

describe("trip library loading", () => {
    it("ignores an aborted response after the initial request is restarted", async () => {
        let resolveOld!: (response: { ok: boolean; status: number; json: () => Promise<unknown> }) => void
        const fetchMock = vi.fn()
            .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve }))
            .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [{ id: "two", name: "Current trip" }] })
        vi.stubGlobal("fetch", fetchMock)
        render(<StrictMode><TripsPage /></StrictMode>)
        expect((fetchMock.mock.calls[0][1] as { signal: AbortSignal }).signal.aborted).toBe(true)
        await screen.findByText("Current trip")
        await act(async () => { resolveOld({ ok: true, status: 200, json: async () => [{ id: "one", name: "Old trip" }] }) })
        expect(screen.getByText("Current trip")).toBeInTheDocument()
        expect(screen.queryByText("Old trip")).not.toBeInTheDocument()
    })

    it("shows loading and recovers on retry after an error", async () => {
        let resolveRetry!: (response: { ok: boolean; status: number; json: () => Promise<unknown> }) => void
        const fetchMock = vi.fn()
            .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
            .mockImplementationOnce(() => new Promise((resolve) => { resolveRetry = resolve }))
        vi.stubGlobal("fetch", fetchMock)
        render(<TripsPage />)
        await screen.findByText("Trips are temporarily unavailable")
        fireEvent.click(screen.getByRole("button", { name: "Try again" }))
        expect(screen.getByText("Loading your trips…")).toBeInTheDocument()
        await act(async () => { resolveRetry({ ok: true, status: 200, json: async () => [{ id: "one", name: "Recovered trip" }] }) })
        expect(screen.getByText("Recovered trip")).toBeInTheDocument()
    })
})
