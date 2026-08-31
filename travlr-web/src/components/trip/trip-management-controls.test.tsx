import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { TripManagementControls, type ManagedTrip } from "./trip-management-controls"

const fetchMock = vi.fn()

function response(body: unknown, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
    }
}

const ownerTrip: ManagedTrip = {
    id: "trip-1",
    isOwner: true,
    name: "Lisbon",
    destination: "Lisbon, Portugal",
    startDate: "2026-09-01T00:00:00.000Z",
    endDate: "2026-09-04T00:00:00.000Z",
    budget: "1200",
    currency: "USD",
    dayCount: 4,
}

beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe("TripManagementControls", () => {
    it("hides owner controls and lets a shared member leave with confirmation", async () => {
        const onDeleted = vi.fn()
        fetchMock.mockResolvedValueOnce(response({ success: true }))
        render(
            <TripManagementControls
                trip={{ ...ownerTrip, isOwner: false }}
                onSaved={vi.fn()}
                onDeleted={onDeleted}
            />,
        )

        expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument()
        fireEvent.click(screen.getByRole("button", { name: "Leave trip" }))
        expect(screen.getByRole("heading", { name: "Leave “Lisbon”?" })).toBeInTheDocument()
        expect(fetchMock).not.toHaveBeenCalled()

        fireEvent.click(screen.getByRole("button", { name: "Leave this trip" }))
        await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
            "/api/trip/share?tripId=trip-1",
            { method: "DELETE" },
        ))
        expect(onDeleted).toHaveBeenCalledWith("trip-1")
    })

    it("updates an owned trip through the edit dialog", async () => {
        const onSaved = vi.fn()
        fetchMock.mockResolvedValueOnce(response({
            ...ownerTrip,
            name: "Lisbon long weekend",
            isOwner: true,
            days: [{ id: "day-1" }, { id: "day-2" }, { id: "day-3" }, { id: "day-4" }],
        }))

        render(<TripManagementControls trip={ownerTrip} onSaved={onSaved} onDeleted={vi.fn()} />)
        fireEvent.click(screen.getByRole("button", { name: "Edit" }))
        fireEvent.change(screen.getByLabelText("Trip name"), { target: { value: "Lisbon long weekend" } })
        fireEvent.click(screen.getByRole("button", { name: "Save changes" }))

        await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
            "/api/trips/trip-1",
            expect.objectContaining({
                method: "PATCH",
                body: JSON.stringify({
                    name: "Lisbon long weekend",
                    destination: "Lisbon, Portugal",
                    startDate: "2026-09-01",
                    endDate: "2026-09-04",
                    budget: 1200,
                }),
            }),
        ))
        expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({
            name: "Lisbon long weekend",
            isOwner: true,
            dayCount: 4,
        }))
    })

    it("requires confirmation before deleting an owned trip", async () => {
        const onDeleted = vi.fn()
        fetchMock.mockResolvedValueOnce(response(null, 204))

        render(<TripManagementControls trip={ownerTrip} onSaved={vi.fn()} onDeleted={onDeleted} />)
        fireEvent.click(screen.getByRole("button", { name: "Delete" }))

        expect(screen.getByRole("heading", { name: "Delete “Lisbon”?" })).toBeInTheDocument()
        expect(fetchMock).not.toHaveBeenCalled()

        fireEvent.click(screen.getByRole("button", { name: "Keep trip" }))
        expect(screen.queryByRole("heading", { name: "Delete “Lisbon”?" })).not.toBeInTheDocument()
        expect(fetchMock).not.toHaveBeenCalled()

        fireEvent.click(screen.getByRole("button", { name: "Delete" }))
        fireEvent.click(screen.getByRole("button", { name: "Delete trip" }))

        await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
            "/api/trips/trip-1",
            { method: "DELETE" },
        ))
        expect(onDeleted).toHaveBeenCalledWith("trip-1")
    })
})
