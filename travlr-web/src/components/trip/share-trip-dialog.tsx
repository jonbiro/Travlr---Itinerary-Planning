"use client"

import { FormEvent, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Check, Copy, Loader2, Trash2, UserPlus, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

type AuthState = "auth" | "setup"

type TripMember = {
    id: string
    name: string | null
    email: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

function classifyAuthFailure(payload: unknown): AuthState {
    const record = isRecord(payload) ? payload : null
    return record?.code === "AUTH_NOT_CONFIGURED" || record?.authConfigured === false
        ? "setup"
        : "auth"
}

function payloadMessage(payload: unknown, fallback: string) {
    const record = isRecord(payload) ? payload : null
    return typeof record?.error === "string" && record.error.trim()
        ? record.error
        : fallback
}

async function readPayload(response: Response): Promise<{ payload: unknown; text: string }> {
    const text = await response.text()
    try {
        return { payload: JSON.parse(text), text }
    } catch {
        return { payload: null, text }
    }
}

function normalizeMember(value: unknown): TripMember | null {
    if (!isRecord(value) || typeof value.id !== "string") return null

    return {
        id: value.id,
        name: typeof value.name === "string" ? value.name : null,
        email: typeof value.email === "string" ? value.email : null,
    }
}

export function ShareTripDialog({ tripId }: { tripId?: string }) {
    const [email, setEmail] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const [isCopied, setIsCopied] = useState(false)
    const [authState, setAuthState] = useState<AuthState | null>(null)
    const [statusMessage, setStatusMessage] = useState("")
    const [members, setMembers] = useState<TripMember[]>([])
    const [maxMembers, setMaxMembers] = useState(25)
    const [membersError, setMembersError] = useState<string | null>(null)
    const [isMembersLoading, setIsMembersLoading] = useState(false)
    const [memberToRemove, setMemberToRemove] = useState<TripMember | null>(null)
    const [isRemoving, setIsRemoving] = useState(false)
    const memberRequestRef = useRef<AbortController | null>(null)
    const shareUrl = tripId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/trips/${encodeURIComponent(tripId)}` : "Select a trip first"

    const loadMembers = useCallback(async () => {
        if (!tripId) return

        memberRequestRef.current?.abort()
        const controller = new AbortController()
        memberRequestRef.current = controller
        setIsMembersLoading(true)
        setMembersError(null)

        try {
            const response = await fetch(`/api/trip/share?tripId=${encodeURIComponent(tripId)}`, {
                cache: "no-store",
                signal: controller.signal,
            })
            const { payload, text } = await readPayload(response)

            if (!response.ok) {
                if (response.status === 401) setAuthState(classifyAuthFailure(payload))
                throw new Error(payloadMessage(payload, text || "Could not load collaborators."))
            }

            const record = isRecord(payload) ? payload : null
            const nextMembers = Array.isArray(record?.members)
                ? record.members.map(normalizeMember).filter((member): member is TripMember => member !== null)
                : []

            if (!controller.signal.aborted) {
                setMembers(nextMembers)
                if (typeof record?.maxMembersPerTrip === "number") {
                    setMaxMembers(record.maxMembersPerTrip)
                }
            }
        } catch (error) {
            if (controller.signal.aborted || (error instanceof Error && error.name === "AbortError")) return
            setMembersError(error instanceof Error ? error.message : "Could not load collaborators.")
        } finally {
            if (memberRequestRef.current === controller) {
                memberRequestRef.current = null
                setIsMembersLoading(false)
            }
        }
    }, [tripId])

    useEffect(() => {
        memberRequestRef.current?.abort()
        setIsCopied(false)
        setAuthState(null)
        setStatusMessage("")
        setMembers([])
        setMembersError(null)
        setMemberToRemove(null)
    }, [tripId])

    useEffect(() => {
        if (open) void loadMembers()
        return () => memberRequestRef.current?.abort()
    }, [loadMembers, open])

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen)
        if (nextOpen) setStatusMessage("")
    }

    const onInvite = async () => {
        const normalizedEmail = email.trim().toLowerCase()
        if (!normalizedEmail) return
        if (!tripId) {
            setStatusMessage("No trip selected.")
            toast.error("No trip selected")
            return
        }

        setIsLoading(true)
        setAuthState(null)
        setStatusMessage("Adding collaborator.")
        try {
            const response = await fetch("/api/trip/share", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tripId, email: normalizedEmail }),
            })

            const { payload, text: responseBody } = await readPayload(response)

            if (response.status === 401) {
                const nextAuthState = classifyAuthFailure(payload)
                setAuthState(nextAuthState)
                throw new Error(nextAuthState === "setup"
                    ? "Sign-in is not configured for this environment yet."
                    : "Sign in to invite collaborators.")
            }

            if (!response.ok) {
                const message = isRecord(payload) && typeof payload.error === "string"
                    ? payload.error
                    : responseBody
                throw new Error(message || "Failed to invite user")
            }

            toast.success("Share request accepted")
            setStatusMessage("Share request accepted.")
            setEmail("")
            await loadMembers()
        } catch (error) {
            const message = error instanceof Error ? error.message : "Something went wrong"
            setStatusMessage(message)
            toast.error(message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleInviteSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        void onInvite()
    }

    const onCopyLink = async () => {
        if (!tripId) return
        const link = `${window.location.origin}/trips/${encodeURIComponent(tripId)}`

        try {
            await navigator.clipboard.writeText(link)
            setIsCopied(true)
            setStatusMessage("Trip link copied to clipboard.")
            toast.success("Trip link copied")
            window.setTimeout(() => setIsCopied(false), 2_000)
        } catch {
            const message = "Could not copy the link. Select it and copy manually."
            setStatusMessage(message)
            toast.error(message)
        }
    }

    const removeMember = async () => {
        if (!tripId || !memberToRemove) return

        setIsRemoving(true)
        setMembersError(null)
        try {
            const query = new URLSearchParams({
                tripId,
                memberId: memberToRemove.id,
            })
            const response = await fetch(`/api/trip/share?${query.toString()}`, { method: "DELETE" })
            const { payload, text } = await readPayload(response)
            if (response.status === 401) setAuthState(classifyAuthFailure(payload))
            if (!response.ok) {
                throw new Error(payloadMessage(payload, text || "Could not remove this collaborator."))
            }

            setMembers((current) => current.filter((member) => member.id !== memberToRemove.id))
            setStatusMessage(`${memberToRemove.name || memberToRemove.email || "Collaborator"} removed from the trip.`)
            toast.success("Collaborator removed")
            setMemberToRemove(null)
        } catch (error) {
            const message = error instanceof Error ? error.message : "Could not remove this collaborator."
            setMembersError(message)
            setStatusMessage(message)
            toast.error(message)
        } finally {
            setIsRemoving(false)
        }
    }

    const isAtMemberLimit = members.length >= maxMembers

    return (
        <>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2" disabled={!tripId}>
                        <UserPlus className="h-4 w-4" aria-hidden="true" />
                        Share
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Share trip</DialogTitle>
                        <DialogDescription>
                            Add an existing Travlr account. Members can view the itinerary and manage shared expenses and memories; itinerary edits stay with the owner.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center space-x-2">
                        <div className="grid flex-1 gap-2">
                            <Label htmlFor="trip-share-link" className="sr-only">
                                Trip link
                            </Label>
                            <Input
                                id="trip-share-link"
                                value={shareUrl}
                                readOnly
                                disabled={!tripId}
                                aria-label="Trip sharing link"
                            />
                        </div>
                        <Button type="button" size="sm" className="px-3" onClick={() => void onCopyLink()} disabled={!tripId} aria-label={isCopied ? "Trip sharing link copied" : "Copy trip sharing link"}>
                            {isCopied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                            <span className="sr-only">{isCopied ? "Copied" : "Copy link"}</span>
                        </Button>
                    </div>
                    <form className="flex items-center space-x-2" onSubmit={handleInviteSubmit}>
                        <div className="grid flex-1 gap-2">
                            <Label htmlFor="trip-share-email" className="sr-only">Collaborator email</Label>
                            <Input
                                id="trip-share-email"
                                placeholder="friend@example.com"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                type="email"
                                autoComplete="email"
                                disabled={isAtMemberLimit || isLoading}
                            />
                        </div>
                        <Button type="submit" disabled={isAtMemberLimit || isLoading || !email.trim()} aria-busy={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                    Adding…
                                </>
                            ) : (
                                "Add"
                            )}
                        </Button>
                    </form>
                    {isAtMemberLimit && (
                        <p className="text-sm text-muted-foreground" role="status">
                            This trip has reached its {maxMembers}-collaborator limit.
                        </p>
                    )}
                    <section className="rounded-lg border" aria-labelledby="trip-collaborators-heading" aria-busy={isMembersLoading}>
                        <div className="flex items-center justify-between border-b px-3 py-2">
                            <h3 id="trip-collaborators-heading" className="flex items-center gap-2 text-sm font-medium">
                                <Users className="h-4 w-4" aria-hidden="true" />
                                Collaborators
                            </h3>
                            <span className="text-xs text-muted-foreground">{members.length}/{maxMembers}</span>
                        </div>
                        <div className="max-h-48 overflow-y-auto p-2">
                            {isMembersLoading ? (
                                <p className="flex items-center justify-center gap-2 py-5 text-sm text-muted-foreground" role="status">
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                    Loading collaborators…
                                </p>
                            ) : membersError ? (
                                <div className="space-y-2 p-2 text-sm" role="alert">
                                    <p className="text-destructive">{membersError}</p>
                                    <Button type="button" variant="outline" size="sm" onClick={() => void loadMembers()}>
                                        Try again
                                    </Button>
                                </div>
                            ) : members.length === 0 ? (
                                <p className="px-2 py-5 text-center text-sm text-muted-foreground">
                                    No collaborators yet.
                                </p>
                            ) : (
                                <ul className="space-y-1">
                                    {members.map((member) => {
                                        const label = member.name || member.email || "Travlr member"
                                        return (
                                            <li key={member.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium">{label}</p>
                                                    {member.name && member.email && (
                                                        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                                                    )}
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="shrink-0 text-muted-foreground hover:text-destructive"
                                                    onClick={() => setMemberToRemove(member)}
                                                    aria-label={`Remove ${label}`}
                                                >
                                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                </Button>
                                            </li>
                                        )
                                    })}
                                </ul>
                            )}
                        </div>
                    </section>
                    {authState && (
                        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm" role="alert">
                            <p className="font-medium">
                                {authState === "setup" ? "Finish setting up Travlr" : "Sign in to invite collaborators"}
                            </p>
                            <p className="mt-1 text-muted-foreground">
                                {authState === "setup"
                                    ? "Sign-in is not configured for this environment yet. Add the required authentication settings, then try again."
                                    : "You need to sign in before you can invite someone to this trip."}
                            </p>
                            {authState === "auth" && (
                                <Button asChild type="button" variant="link" size="sm" className="mt-1 h-auto px-0">
                                    <Link href="/api/auth/signin">Sign in</Link>
                                </Button>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
            <ConfirmDialog
                open={memberToRemove !== null}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) setMemberToRemove(null)
                }}
                title="Remove collaborator?"
                description={memberToRemove
                    ? `${memberToRemove.name || memberToRemove.email || "This collaborator"} will lose access to this trip.`
                    : "This collaborator will lose access to this trip."}
                confirmLabel="Remove collaborator"
                cancelLabel="Keep collaborator"
                isConfirming={isRemoving}
                onConfirm={removeMember}
            />
            <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                {statusMessage}
            </p>
        </>
    )
}
