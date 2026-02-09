"use client"

import { useState } from "react"
import { Check, Copy, UserPlus } from "lucide-react"

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

    const onInvite = async () => {
        if (!email) return
        setIsLoading(true)
        // Mock invite for now
        await new Promise((resolve) => setTimeout(resolve, 1000))
        toast.success(`Invited ${email} to the trip!`)
        setIsLoading(false)
        setEmail("")
    }

    const onCopyLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/trips/${tripId}`)
        toast.success("Link copied to clipboard")
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
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
                            defaultValue={`${typeof window !== 'undefined' ? window.location.origin : ''}/trips/${tripId}`}
                            readOnly
                        />
                    </div>
                    <Button type="submit" size="sm" className="px-3" onClick={onCopyLink}>
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
                    <Button onClick={onInvite} disabled={isLoading}>
                        Invite
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
