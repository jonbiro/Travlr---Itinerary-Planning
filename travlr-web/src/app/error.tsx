"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        // Keep the error boundary quiet for expected navigation retries while
        // preserving a useful signal in production diagnostics.
        console.error("[TRAVLR_ERROR_BOUNDARY] Unexpected application error")
    }, [])

    return (
        <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
            <div className="max-w-md text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    <AlertTriangle className="h-6 w-6" aria-hidden="true" />
                </div>
                <h1 className="mt-5 text-2xl font-bold tracking-tight">Something went off course</h1>
                <p className="mt-3 text-muted-foreground">
                    Travlr hit an unexpected problem. Try the page again, and your itinerary will remain safe.
                </p>
                <Button type="button" className="mt-6" onClick={() => reset()}>
                    <RefreshCw className="h-4 w-4" />
                    Try again
                </Button>
            </div>
        </main>
    )
}
