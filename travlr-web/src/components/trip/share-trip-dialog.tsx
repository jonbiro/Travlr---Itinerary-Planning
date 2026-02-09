"use client"

import { useState } from "react"
import { Copy, UserPlus, Loader2 } from "lucide-react"

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

export function ShareTripDialog({ tripId }: { tripId?: string }) {
    const [email, setEmail] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [open, setOpen] = useState(false)

    const onInvite = async () => {
        if (!email) return
        if (!tripId) {
            toast.error("No trip selected")
            return
        }

        setIsLoading(true)
        try {
            const response = await fetch("/api/trip/share", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tripId, email }),
            })

            if (!response.ok) {
                if (response.status === 404) throw new Error("User not found")
                if (response.status === 409) throw new Error("User is already a member")
                throw new Error("Failed to invite user")
            }

            toast.success(`Invited ${email} to the trip!`)
            setEmail("")
            setOpen(false)
        } catch (error) {
            console.error(error)
            toast.error(error instanceof Error ? error.message : "Something went wrong")
        } finally {
            setIsLoading(false)
        }
    }

    const onCopyLink = () => {
        if (!tripId) return
        navigator.clipboard.writeText(`${window.location.origin}/trips/${tripId}`)
        toast.success("Link copied to clipboard")
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" disabled={!tripId}>
                    <UserPlus className="h-4 w-4" />
                    Share
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share Trip</DialogTitle>
                    <DialogDescription>
                        Invite friends to plan this trip with you.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center space-x-2">
                    <div className="grid flex-1 gap-2">
                        <Label htmlFor="link" className="sr-only">
                            Link
                        </Label>
                        <Input
                            id="link"
                            defaultValue={tripId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/trips/${tripId}` : "Select a trip first"}
                            readOnly
                            disabled={!tripId}
                        />
                    </div>
                    <Button type="submit" size="sm" className="px-3" onClick={onCopyLink} disabled={!tripId}>
                        <span className="sr-only">Copy</span>
                        <Copy className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="grid flex-1 gap-2">
                        <Label htmlFor="email" className="sr-only">Email</Label>
                        <Input
                            id="email"
                            placeholder="friend@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <Button onClick={onInvite} disabled={isLoading || !email}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invite"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
