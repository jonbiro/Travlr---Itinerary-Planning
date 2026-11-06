import { act, fireEvent, render, screen } from "@testing-library/react"
import { StrictMode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import DashboardPage from "./page"

vi.mock("next/dynamic", () => ({ default: () => () => null }))
afterEach(() => { vi.unstubAllGlobals(); window.history.replaceState({}, "", "/") })

describe("dashboard request isolation", () => {
    it("does not show a late authorization error from an aborted request", async () => {
        let resolveOld!: (value: { ok: boolean; status: number; json: () => Promise<unknown> }) => void
        const fetchMock = vi.fn()
            .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve }))
            .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] })
        vi.stubGlobal("fetch", fetchMock)
        render(<StrictMode><DashboardPage /></StrictMode>)
        expect((fetchMock.mock.calls[0][1] as { signal: AbortSignal }).signal.aborted).toBe(true)
        await screen.findByText("Create your first trip")
        await act(async () => { resolveOld({ ok: false, status: 401, json: async () => ({}) }) })
        expect(screen.getByText("Create your first trip")).toBeInTheDocument()
        expect(screen.queryByText("Sign in to view your trips")).not.toBeInTheDocument()
    })

    it("retries a failed request and restores the empty dashboard", async () => {
        let resolveRetry!: (value: { ok: boolean; status: number; json: () => Promise<unknown> }) => void
        vi.stubGlobal("fetch", vi.fn()
            .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
            .mockImplementationOnce(() => new Promise((resolve) => { resolveRetry = resolve })))
        render(<DashboardPage />)
        const retry = await screen.findByRole("button", { name: "Try again" })
        fireEvent.click(retry)
        expect(screen.getByText("Loading trips")).toBeInTheDocument()
        await act(async () => { resolveRetry({ ok: true, status: 200, json: async () => [] }) })
        expect(screen.getByText("Create your first trip")).toBeInTheDocument()
    })

    it("opens the requested saved trip and does not default to the first one", async () => {
        window.history.replaceState({}, "", "/dashboard?tripId=two")
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [
            { id: "one", name: "First", destination: "Paris", days: [] },
            { id: "two", name: "Second", destination: "Tokyo", days: [] },
        ] }))
        render(<DashboardPage />)
        expect(await screen.findByText("Tokyo • 0 days")).toBeInTheDocument()
        expect(screen.queryByText("Paris • 0 days")).not.toBeInTheDocument()
    })

    it("removes an unavailable requested trip and falls back to an available trip", async () => {
        window.history.replaceState({}, "", "/dashboard?tripId=missing")
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [
            { id: "one", name: "First", destination: "Paris", days: [] },
        ] }))
        render(<DashboardPage />)
        await screen.findByText("Paris • 0 days")
        expect(new URL(window.location.href).searchParams.has("tripId")).toBe(false)
    })

    it("opens the create dialog from a query and clears the query when closed", async () => {
        window.history.replaceState({}, "", "/dashboard?create=true&destination=Paris&interests=art")
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] }))
        render(<DashboardPage />)
        await screen.findByRole("dialog", { name: "Create a new trip" })
        fireEvent.keyDown(document, { key: "Escape" })
        expect(screen.queryByRole("dialog", { name: "Create a new trip" })).not.toBeInTheDocument()
        expect(window.location.search).toBe("")
    })
})
