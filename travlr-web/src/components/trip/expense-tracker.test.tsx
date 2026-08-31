import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ExpenseTracker } from "./expense-tracker"

const fetchMock = vi.fn()

function response(body: unknown, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
    }
}

const ownerExpense = {
    id: "expense-owner",
    tripId: "trip-1",
    amount: 42,
    currency: "USD",
    category: "food" as const,
    description: "Dinner",
    date: "2026-08-30T00:00:00.000Z",
    createdAt: "2026-08-30T00:00:00.000Z",
    canDelete: true,
}

const memberExpense = {
    ...ownerExpense,
    id: "expense-member",
    description: "Shared booking",
    canDelete: false,
}

beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe("ExpenseTracker deletion permissions", () => {
    it("hides deletion for records the current user cannot delete", async () => {
        fetchMock.mockResolvedValueOnce(response({ expenses: [ownerExpense, memberExpense] }))

        render(<ExpenseTracker tripId="trip-1" budget={1_000} />)

        await waitFor(() => expect(screen.getByText("Dinner")).toBeInTheDocument())

        expect(screen.getByRole("button", { name: "Delete Dinner expense" })).toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "Delete Shared booking expense" })).not.toBeInTheDocument()
    })

    it("requires confirmation before deleting an expense", async () => {
        fetchMock.mockResolvedValueOnce(response({ expenses: [ownerExpense] }))

        render(<ExpenseTracker tripId="trip-1" budget={1_000} />)

        await waitFor(() => expect(screen.getByRole("button", { name: "Delete Dinner expense" })).toBeInTheDocument())

        fireEvent.click(screen.getByRole("button", { name: "Delete Dinner expense" }))
        expect(screen.getByRole("heading", { name: "Delete expense?" })).toBeInTheDocument()
        expect(fetchMock).toHaveBeenCalledTimes(1)

        fireEvent.click(screen.getByRole("button", { name: "Keep expense" }))
        expect(screen.queryByRole("heading", { name: "Delete expense?" })).not.toBeInTheDocument()
        expect(fetchMock).toHaveBeenCalledTimes(1)

        fetchMock.mockResolvedValueOnce(response({ success: true }))
        fireEvent.click(screen.getByRole("button", { name: "Delete Dinner expense" }))
        fireEvent.click(screen.getByRole("button", { name: "Delete expense" }))

        await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(
            "/api/trip/expenses?id=expense-owner",
            { method: "DELETE" },
        ))
        await waitFor(() => expect(screen.queryByText("Dinner")).not.toBeInTheDocument())
    })
})
