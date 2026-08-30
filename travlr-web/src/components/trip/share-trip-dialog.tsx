"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { Check, Copy, UserPlus, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
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

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

function classifyAuthFailure(payload: unknown): AuthState {
    const record = isRecord(payload) ? payload : null
    return record?.code === "AUTH_NOT_CONFIGURED" || record?.authConfigured === false
        ? "setup"
        : "auth"
}

export function ShareTripDialog({ tripId }: { tripId?: string }) {
    const [email, setEmail] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const [isCopied, setIsCopied] = useState(false)
    const [authState, setAuthState] = useState<AuthState | null>(null)
    const shareUrl = tripId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/trips/${encodeURIComponent(tripId)}` : "Select a trip first"

    useEffect(() => {
        setIsCopied(false)
        setAuthState(null)
    }, [tripId])

    const onInvite = async () => {
        const normalizedEmail = email.trim().toLowerCase()
        if (!normalizedEmail) return
        if (!tripId) {
            toast.error("No trip selected")
            return
        }

        setIsLoading(true)
        setAuthState(null)
        try {
            const response = await fetch("/api/trip/share", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tripId, email: normalizedEmail }),
            })

            const responseBody = await response.text()
            let payload: unknown = null
            try {
                payload = JSON.parse(responseBody)
            } catch {
                // The API also uses concise plain-text errors.
            }

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
            setEmail("")
            setOpen(false)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Something went wrong")
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
            toast.success("Trip link copied")
            window.setTimeout(() => setIsCopied(false), 2_000)
        } catch {
            toast.error("Could not copy the link. Select it and copy manually.")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" disabled={!tripId}>
                    <UserPlus className="h-4 w-4" aria-hidden="true" />
                    Share
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share Trip</DialogTitle>
                    <DialogDescription>
                        Add an existing Travlr account to this trip. Members can view the itinerary and manage shared expenses and memories; itinerary edits stay with the trip owner.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center space-x-2">
                    <div className="grid flex-1 gap-2">
                        <Label htmlFor="trip-share-link" className="sr-only">
                            Link
                        </Label>
                        <Input
                            id="trip-share-link"
                            value={shareUrl}
                            readOnly
                            disabled={!tripId}
                            aria-label="Trip sharing link"
                        />
                    </div>
                    <Button type="button" size="sm" className="px-3" onClick={() => void onCopyLink()} disabled={!tripId} aria-label="Copy trip sharing link">
                        {isCopied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                        <span className="sr-only">{isCopied ? "Copied" : "Copy link"}</span>
                    </Button>
                </div>
                <form className="flex items-center space-x-2" onSubmit={handleInviteSubmit}>
                    <div className="grid flex-1 gap-2">
                        <Label htmlFor="email" className="sr-only">Email</Label>
                        <Input
                            id="email"
                            placeholder="friend@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            type="email"
                            autoComplete="email"
                        />
                    </div>
                    <Button type="submit" disabled={isLoading || !email.trim()}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Add"}
                    </Button>
                </form>
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
    )
}
