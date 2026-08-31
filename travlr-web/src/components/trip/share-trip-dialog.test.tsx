import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ShareTripDialog } from "./share-trip-dialog"

const fetchMock = vi.fn()

function response(body: unknown, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        text: async () => JSON.stringify(body),
    }
}

const tripId = "trip-1"
const shareEndpoint = `/api/trip/share?tripId=${tripId}`

const existingMember = {
    id: "member-1",
    name: "Ada Lovelace",
    email: "ada@example.com",
}

beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe("ShareTripDialog", () => {
    it("loads collaborators when opened and renders the member count", async () => {
        let resolveMembers: (value: ReturnType<typeof response>) => void = () => undefined
        const membersResponse = new Promise<ReturnType<typeof response>>((resolve) => {
            resolveMembers = resolve
        })
        fetchMock.mockReturnValueOnce(membersResponse)

        render(<ShareTripDialog tripId={tripId} />)
        fireEvent.click(screen.getByRole("button", { name: "Share" }))

        await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
            shareEndpoint,
            expect.objectContaining({ cache: "no-store" }),
        ))
        expect(screen.getByText("Loading collaborators…")).toBeInTheDocument()

        resolveMembers(response({
            members: [existingMember, {
                id: "member-2",
                name: "Grace Hopper",
                email: "grace@example.com",
            }],
            maxMembersPerTrip: 5,
        }))

        await waitFor(() => expect(screen.getByText("Ada Lovelace")).toBeInTheDocument())
        expect(screen.getByText("Grace Hopper")).toBeInTheDocument()
        expect(screen.getByText("2/5")).toBeInTheDocument()
    })

    it("refreshes the collaborator list after a successful invite", async () => {
        const invitedMember = {
            id: "member-2",
            name: "Grace Hopper",
            email: "grace@example.com",
        }
        fetchMock
            .mockResolvedValueOnce(response({ members: [existingMember], maxMembersPerTrip: 5 }))
            .mockResolvedValueOnce(response({ success: true }, 202))
            .mockResolvedValueOnce(response({
                members: [existingMember, invitedMember],
                maxMembersPerTrip: 5,
            }))

        render(<ShareTripDialog tripId={tripId} />)
        fireEvent.click(screen.getByRole("button", { name: "Share" }))
        await waitFor(() => expect(screen.getByText("Ada Lovelace")).toBeInTheDocument())

        fireEvent.change(screen.getByLabelText("Collaborator email"), {
            target: { value: "  GRACE@EXAMPLE.COM " },
        })
        fireEvent.click(screen.getByRole("button", { name: "Add" }))

        await waitFor(() => expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            "/api/trip/share",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({ tripId, email: "grace@example.com" }),
            }),
        ))
        await waitFor(() => expect(screen.getByText("Grace Hopper")).toBeInTheDocument())

        expect(fetchMock).toHaveBeenNthCalledWith(
            3,
            shareEndpoint,
            expect.objectContaining({ cache: "no-store" }),
        )
        expect(screen.getByText("2/5")).toBeInTheDocument()
        expect(screen.getByLabelText("Collaborator email")).toHaveValue("")
    })

    it("removes a collaborator only after confirmation", async () => {
        fetchMock
            .mockResolvedValueOnce(response({ members: [existingMember], maxMembersPerTrip: 5 }))
            .mockResolvedValueOnce(response({ success: true }))

        render(<ShareTripDialog tripId={tripId} />)
        fireEvent.click(screen.getByRole("button", { name: "Share" }))
        await waitFor(() => expect(screen.getByText("Ada Lovelace")).toBeInTheDocument())

        fireEvent.click(screen.getByRole("button", { name: "Remove Ada Lovelace" }))
        expect(screen.getByRole("heading", { name: "Remove collaborator?" })).toBeInTheDocument()
        expect(fetchMock).toHaveBeenCalledTimes(1)

        fireEvent.click(screen.getByRole("button", { name: "Remove collaborator" }))

        await waitFor(() => expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            "/api/trip/share?tripId=trip-1&memberId=member-1",
            { method: "DELETE" },
        ))
        await waitFor(() => expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument())
        expect(screen.getByText("0/5")).toBeInTheDocument()
        expect(screen.queryByRole("heading", { name: "Remove collaborator?" })).not.toBeInTheDocument()
    })
})
