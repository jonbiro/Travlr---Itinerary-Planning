import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PackingList } from "./packing-list"

beforeEach(() => {
    const values = new Map<string, string>()
    vi.stubGlobal("localStorage", {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
    })
})
afterEach(() => vi.unstubAllGlobals())

describe("packing list trip isolation", () => {
    it("restores only the selected trip's stored list", () => {
        window.localStorage.setItem("travlr:packing-list:one", JSON.stringify([{ name: "Essentials", items: [{ item: "Hat", checked: true }] }]))
        window.localStorage.setItem("travlr:packing-list:two", JSON.stringify([{ name: "Essentials", items: [{ item: "Coat", checked: false }] }]))
        const { rerender } = render(<PackingList tripId="one" destination="Paris" days={2} activities={[]} />)
        expect(screen.getByRole("checkbox", { name: "Mark Hat as packed" })).toBeChecked()
        rerender(<PackingList tripId="two" destination="Tokyo" days={2} activities={[]} />)
        expect(screen.queryByRole("checkbox", { name: "Mark Hat as packed" })).not.toBeInTheDocument()
        expect(screen.getByRole("checkbox", { name: "Mark Coat as packed" })).not.toBeChecked()
        fireEvent.click(screen.getByRole("checkbox", { name: "Mark Coat as packed" }))
        rerender(<PackingList tripId="one" destination="Paris" days={2} activities={[]} />)
        rerender(<PackingList tripId="two" destination="Tokyo" days={2} activities={[]} />)
        expect(screen.getByRole("checkbox", { name: "Mark Coat as packed" })).toBeChecked()
    })

    it("aborts old generation and never stores a late result for another trip", async () => {
        let resolveOld!: (value: { ok: boolean; status: number; json: () => Promise<unknown> }) => void
        const fetchMock = vi.fn().mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve }))
        vi.stubGlobal("fetch", fetchMock)
        const { rerender } = render(<PackingList tripId="one" destination="Paris" days={2} activities={[]} />)
        fireEvent.click(screen.getByRole("button", { name: "Generate list" }))
        const signal = (fetchMock.mock.calls[0][1] as { signal: AbortSignal }).signal
        rerender(<PackingList tripId="two" destination="Tokyo" days={2} activities={[]} />)
        expect(signal.aborted).toBe(true)
        await act(async () => { resolveOld({ ok: true, status: 200, json: async () => ({ categories: [{ name: "Old", items: [{ item: "Hat" }] }] }) }) })
        expect(screen.queryByText("Hat")).not.toBeInTheDocument()
        expect(window.localStorage.getItem("travlr:packing-list:one")).toBeNull()
        expect(window.localStorage.getItem("travlr:packing-list:two")).toBeNull()
    })
})
