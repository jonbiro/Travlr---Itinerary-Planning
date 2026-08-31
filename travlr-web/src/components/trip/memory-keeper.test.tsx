import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { MemoryKeeper } from "./memory-keeper"

const fetchMock = vi.fn()

function response(body: unknown, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
    }
}

const ownerMemory = {
    id: "memory-owner",
    tripId: "trip-1",
    type: "note" as const,
    title: "Sunset note",
    description: null,
    content: "A great evening.",
    date: "2026-08-30T00:00:00.000Z",
    location: null,
    createdAt: "2026-08-30T00:00:00.000Z",
    canDelete: true,
}

const memberMemory = {
    ...ownerMemory,
    id: "memory-member",
    title: "Shared note",
    canDelete: false,
}

beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe("MemoryKeeper deletion permissions", () => {
    it("only exposes deletion for memories marked as deletable", async () => {
        fetchMock.mockResolvedValueOnce(response({ memories: [ownerMemory, memberMemory] }))

        render(<MemoryKeeper tripId="trip-1" />)

        await waitFor(() => expect(screen.getByRole("button", { name: "View memory: Shared note" })).toBeInTheDocument())

        fireEvent.click(screen.getByRole("button", { name: "View memory: Shared note" }))
        expect(screen.getByRole("heading", { name: /Shared note/ })).toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "Delete memory: Shared note" })).not.toBeInTheDocument()
    })

    it("requires confirmation before deleting an owned memory", async () => {
        fetchMock.mockResolvedValueOnce(response({ memories: [ownerMemory] }))

        render(<MemoryKeeper tripId="trip-1" />)

        await waitFor(() => expect(screen.getByRole("button", { name: "View memory: Sunset note" })).toBeInTheDocument())
        fireEvent.click(screen.getByRole("button", { name: "View memory: Sunset note" }))
        fireEvent.click(screen.getByRole("button", { name: "Delete memory: Sunset note" }))

        expect(screen.getByRole("heading", { name: "Delete memory?" })).toBeInTheDocument()
        expect(fetchMock).toHaveBeenCalledTimes(1)

        fireEvent.click(screen.getByRole("button", { name: "Keep memory" }))
        expect(screen.queryByRole("heading", { name: "Delete memory?" })).not.toBeInTheDocument()
        expect(fetchMock).toHaveBeenCalledTimes(1)

        fetchMock.mockResolvedValueOnce(response({ success: true }))
        fireEvent.click(screen.getByRole("button", { name: "Delete memory: Sunset note" }))
        fireEvent.click(screen.getByRole("button", { name: "Delete memory" }))

        await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(
            "/api/trip/memories?id=memory-owner",
            { method: "DELETE" },
        ))
        await waitFor(() => expect(screen.queryByRole("button", { name: "View memory: Sunset note" })).not.toBeInTheDocument())
    })
})
