"use client"

import type { FormEvent } from "react"
import { useState } from "react"
import { CalendarDays, Loader2, LogOut, Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type ManagedTrip = {
    id: string
    isOwner: boolean
    name: string
    destination: string | null
    startDate: string | null
    endDate: string | null
    budget: string | number | null
    currency: string
    dayCount: number
}

type TripDraft = {
    name: string
    destination: string
    startDate: string
    endDate: string
    budget: string
}

type TripManagementControlsProps = {
    trip: ManagedTrip
    onSaved: (trip: ManagedTrip) => void
    onDeleted: (tripId: string) => void
}

function asString(value: unknown): string | null {
    return typeof value === "string" ? value : null
}

function asBudget(value: unknown): string | number | null {
    return typeof value === "string" || typeof value === "number" ? value : null
}

function asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === "object" && value !== null && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null
}

function dateInputValue(value: string | null): string {
    return value?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? ""
}

function makeDraft(trip: ManagedTrip): TripDraft {
    return {
        name: trip.name,
        destination: trip.destination ?? "",
        startDate: dateInputValue(trip.startDate),
        endDate: dateInputValue(trip.endDate),
        budget: trip.budget === null || trip.budget === "" ? "" : String(trip.budget),
    }
}

function getMutationError(response: Response, payload: unknown, fallback: string): string {
    const record = asRecord(payload)
    const code = typeof record?.code === "string" ? record.code : ""

    if (response.status === 401) {
        return code === "AUTH_NOT_CONFIGURED" || record?.authConfigured === false
            ? "Sign-in is not configured for this environment yet."
            : "Your session expired. Sign in again to manage this trip."
    }

    if (code === "RATE_LIMIT_UNAVAILABLE") {
        return typeof record?.error === "string" && record.error.trim()
            ? record.error
            : "Request protection is temporarily unavailable. Please try again."
    }

    if (response.status === 503) {
        return "Connect a database to manage trips in this environment."
    }

    if (response.status === 429) {
        return "Too many changes were submitted. Wait a moment and try again."
    }

    if (typeof record?.issues === "object" && Array.isArray(record.issues)) {
        const issue = record.issues.find((value) => (
            typeof value === "object"
            && value !== null
            && typeof (value as Record<string, unknown>).message === "string"
        )) as Record<string, unknown> | undefined
        if (typeof issue?.message === "string" && issue.message.trim()) return issue.message
    }

    return typeof record?.error === "string" && record.error.trim()
        ? record.error
        : fallback
}

function updatedTripFromResponse(payload: unknown, currentTrip: ManagedTrip): ManagedTrip | null {
    const record = asRecord(payload)
    if (!record || typeof record.id !== "string") return null

    const dayCount = Array.isArray(record.days) ? record.days.length : currentTrip.dayCount

    return {
        ...currentTrip,
        id: record.id,
        isOwner: record.isOwner === true || currentTrip.isOwner,
        name: asString(record.name) ?? asString(record.tripName) ?? currentTrip.name,
        destination: record.destination === null ? null : asString(record.destination),
        startDate: record.startDate === null ? null : asString(record.startDate),
        endDate: record.endDate === null ? null : asString(record.endDate),
        budget: record.budget === null ? null : asBudget(record.budget),
        currency: asString(record.currency) ?? currentTrip.currency,
        dayCount,
    }
}

export function TripManagementControls({
    trip,
    onSaved,
    onDeleted,
}: TripManagementControlsProps) {
    const [editOpen, setEditOpen] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [draft, setDraft] = useState<TripDraft>(() => makeDraft(trip))
    const [editError, setEditError] = useState<string | null>(null)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [leaveOpen, setLeaveOpen] = useState(false)
    const [leaveError, setLeaveError] = useState<string | null>(null)
    const [isLeaving, setIsLeaving] = useState(false)

    const openEdit = () => {
        setDraft(makeDraft(trip))
        setEditError(null)
        setEditOpen(true)
    }

    const handleEditOpenChange = (nextOpen: boolean) => {
        if (isSaving) return
        setEditOpen(nextOpen)
        if (!nextOpen) setEditError(null)
    }

    const handleSave = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const name = draft.name.trim()
        if (!name) {
            setEditError("Trip name must not be empty.")
            return
        }

        const budget = draft.budget.trim() === "" ? null : Number(draft.budget)
        if (budget !== null && (!Number.isFinite(budget) || budget < 0)) {
            setEditError("Budget must be zero or greater.")
            return
        }

        setIsSaving(true)
        setEditError(null)

        try {
            const response = await fetch(`/api/trips/${encodeURIComponent(trip.id)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    destination: draft.destination.trim() || null,
                    startDate: draft.startDate || null,
                    endDate: draft.endDate || null,
                    budget,
                }),
            })
            const payload: unknown = await response.json().catch(() => null)

            if (!response.ok) {
                throw new Error(getMutationError(response, payload, "Unable to save trip changes."))
            }

            const updatedTrip = updatedTripFromResponse(payload, trip)
            if (!updatedTrip) throw new Error("The saved trip response was incomplete.")

            onSaved(updatedTrip)
            setEditOpen(false)
        } catch (error) {
            setEditError(error instanceof Error ? error.message : "Unable to save trip changes.")
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        setIsDeleting(true)
        setDeleteError(null)

        try {
            const response = await fetch(`/api/trips/${encodeURIComponent(trip.id)}`, {
                method: "DELETE",
            })
            const payload: unknown = await response.json().catch(() => null)

            if (!response.ok) {
                throw new Error(getMutationError(response, payload, "Unable to delete this trip."))
            }

            onDeleted(trip.id)
            setDeleteOpen(false)
        } catch (error) {
            setDeleteError(error instanceof Error ? error.message : "Unable to delete this trip.")
        } finally {
            setIsDeleting(false)
        }
    }

    const handleLeave = async () => {
        setIsLeaving(true)
        setLeaveError(null)

        try {
            const response = await fetch(`/api/trip/share?tripId=${encodeURIComponent(trip.id)}`, {
                method: "DELETE",
            })
            const payload: unknown = await response.json().catch(() => null)

            if (!response.ok) {
                throw new Error(getMutationError(response, payload, "Unable to leave this trip."))
            }

            onDeleted(trip.id)
            setLeaveOpen(false)
        } catch (error) {
            setLeaveError(error instanceof Error ? error.message : "Unable to leave this trip.")
        } finally {
            setIsLeaving(false)
        }
    }

    if (!trip.isOwner) {
        return (
            <>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-fit text-muted-foreground hover:text-destructive"
                    onClick={() => {
                        setLeaveError(null)
                        setLeaveOpen(true)
                    }}
                >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Leave trip
                </Button>
                <Dialog
                    open={leaveOpen}
                    onOpenChange={(nextOpen) => {
                        if (!isLeaving) setLeaveOpen(nextOpen)
                    }}
                >
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Leave “{trip.name}”?</DialogTitle>
                            <DialogDescription>
                                This removes the trip from your library. The owner can add you again later.
                            </DialogDescription>
                        </DialogHeader>
                        {leaveError && <p className="text-sm text-destructive" role="alert">{leaveError}</p>}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setLeaveOpen(false)} disabled={isLeaving}>
                                Keep trip
                            </Button>
                            <Button type="button" variant="destructive" onClick={() => void handleLeave()} disabled={isLeaving}>
                                {isLeaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                Leave this trip
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        )
    }

    return (
        <>
            <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={openEdit}>
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Edit
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                        setDeleteError(null)
                        setDeleteOpen(true)
                    }}
                >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete
                </Button>
            </div>

            <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
                <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit trip</DialogTitle>
                        <DialogDescription>Update the details that identify this itinerary.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(event) => void handleSave(event)} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor={`trip-name-${trip.id}`}>Trip name</Label>
                            <Input
                                id={`trip-name-${trip.id}`}
                                value={draft.name}
                                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                                maxLength={200}
                                required
                                disabled={isSaving}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor={`trip-destination-${trip.id}`}>Destination</Label>
                            <Input
                                id={`trip-destination-${trip.id}`}
                                value={draft.destination}
                                onChange={(event) => setDraft((current) => ({ ...current, destination: event.target.value }))}
                                maxLength={200}
                                placeholder="Optional"
                                disabled={isSaving}
                            />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor={`trip-start-${trip.id}`}>Start date</Label>
                                <div className="relative">
                                    <CalendarDays className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                    <Input
                                        id={`trip-start-${trip.id}`}
                                        type="date"
                                        value={draft.startDate}
                                        onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))}
                                        className="pl-9"
                                        disabled={isSaving}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor={`trip-end-${trip.id}`}>End date</Label>
                                <div className="relative">
                                    <CalendarDays className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                    <Input
                                        id={`trip-end-${trip.id}`}
                                        type="date"
                                        value={draft.endDate}
                                        onChange={(event) => setDraft((current) => ({ ...current, endDate: event.target.value }))}
                                        className="pl-9"
                                        disabled={isSaving}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor={`trip-budget-${trip.id}`}>Budget</Label>
                            <Input
                                id={`trip-budget-${trip.id}`}
                                type="number"
                                min="0"
                                step="0.01"
                                value={draft.budget}
                                onChange={(event) => setDraft((current) => ({ ...current, budget: event.target.value }))}
                                placeholder="Optional"
                                disabled={isSaving}
                            />
                        </div>
                        {editError && <p className="text-sm text-destructive" role="alert">{editError}</p>}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={isSaving}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                Save changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={deleteOpen}
                onOpenChange={(nextOpen) => {
                    if (!isDeleting) setDeleteOpen(nextOpen)
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete “{trip.name}”?</DialogTitle>
                        <DialogDescription>
                            This permanently removes the trip and its itinerary. Shared members will lose access, and this cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    {deleteError && <p className="text-sm text-destructive" role="alert">{deleteError}</p>}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)} disabled={isDeleting}>
                            Keep trip
                        </Button>
                        <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                            Delete trip
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
