import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import TripDetailsPage from "./page"

const route = vi.hoisted(() => ({ id: "one" }))
vi.mock("next/navigation", () => ({ useParams: () => ({ id: route.id }), useRouter: () => ({ back: vi.fn() }) }))

afterEach(() => vi.unstubAllGlobals())

describe("trip itinerary navigation", () => {
    it("ignores a late response for the previous trip", async () => {
        route.id = "one"
        let resolveOld!: (response: { ok: boolean; status: number; json: () => Promise<unknown> }) => void
        const fetchMock = vi.fn()
            .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve }))
            .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: "two", name: "New itinerary" }) })
        vi.stubGlobal("fetch", fetchMock)
        const { rerender } = render(<TripDetailsPage />)
        const oldSignal = (fetchMock.mock.calls[0][1] as { signal: AbortSignal }).signal
        route.id = "two"
        rerender(<TripDetailsPage />)
        expect(oldSignal.aborted).toBe(true)
        await screen.findByRole("heading", { name: "New itinerary" })
        await act(async () => { resolveOld({ ok: true, status: 200, json: async () => ({ id: "one", name: "Old itinerary" }) }) })
        expect(screen.getByRole("heading", { name: "New itinerary" })).toBeInTheDocument()
        expect(screen.queryByRole("heading", { name: "Old itinerary" })).not.toBeInTheDocument()
    })

    it("shows loading and recovers when a failed itinerary is retried", async () => {
        route.id = "one"
        let resolveRetry!: (response: { ok: boolean; status: number; json: () => Promise<unknown> }) => void
        const fetchMock = vi.fn()
            .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
            .mockImplementationOnce(() => new Promise((resolve) => { resolveRetry = resolve }))
        vi.stubGlobal("fetch", fetchMock)
        render(<TripDetailsPage />)
        await screen.findByRole("heading", { name: "Itinerary unavailable" })
        fireEvent.click(screen.getByRole("button", { name: "Try again" }))
        expect(screen.getByText("Loading itinerary…")).toBeInTheDocument()
        await act(async () => { resolveRetry({ ok: true, status: 200, json: async () => ({ id: "one", name: "Recovered itinerary" }) }) })
        expect(screen.getByRole("heading", { name: "Recovered itinerary" })).toBeInTheDocument()
    })
})
