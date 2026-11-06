import { act, fireEvent, render, screen } from "@testing-library/react"
import { StrictMode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import DashboardPage from "./page"

vi.mock("next/dynamic", () => ({ default: () => () => null }))
afterEach(() => vi.unstubAllGlobals())

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
})
