"use client"

import { useState, useEffect } from "react"
import { Download, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [isInstalled, setIsInstalled] = useState(false)
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        // Check if already installed. iOS exposes standalone separately from
        // the display-mode media query, so support both signals.
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
        if (isStandalone) {
            setTimeout(() => setIsInstalled(true), 0)
            return
        }

        // Check if previously dismissed
        let wasDismissed: string | null = null
        try {
            wasDismissed = localStorage.getItem('pwa-install-dismissed')
        } catch {
            // Private browsing contexts can deny localStorage access. The
            // prompt should still remain usable in that case.
        }
        if (wasDismissed) {
            const dismissedTime = parseInt(wasDismissed)
            // Don't show for 7 days after dismissal
            if (Number.isFinite(dismissedTime) && Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
                setTimeout(() => setDismissed(true), 0)
            }
        }

        // Listen for install prompt
        const handleBeforeInstall = (e: Event) => {
            e.preventDefault()
            setInstallPrompt(e as BeforeInstallPromptEvent)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstall)

        // Listen for successful install
        const handleAppInstalled = () => {
            setIsInstalled(true)
            setInstallPrompt(null)
        }
        window.addEventListener('appinstalled', handleAppInstalled)

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
            window.removeEventListener('appinstalled', handleAppInstalled)
        }
    }, [])

    const handleInstall = async () => {
        if (!installPrompt) return

        try {
            await installPrompt.prompt()
            const { outcome } = await installPrompt.userChoice

            if (outcome === 'accepted') {
                setIsInstalled(true)
            }
        } catch {
            // The browser can reject a stale prompt after a navigation or
            // when the install affordance is no longer available.
        } finally {
            setInstallPrompt(null)
        }
    }

    const handleDismiss = () => {
        try {
            localStorage.setItem('pwa-install-dismissed', Date.now().toString())
        } catch {
            // Dismiss this session even when persistent storage is unavailable.
        }
        setDismissed(true)
    }

    // Don't show if installed, dismissed, or no prompt available
    if (isInstalled || dismissed || !installPrompt) {
        return null
    }

    return (
        <div
            role="dialog"
            aria-labelledby="install-travlr-title"
            aria-describedby="install-travlr-description"
            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-background border rounded-lg shadow-lg p-4 z-50 animate-in slide-in-from-bottom-4"
        >
            <button
                type="button"
                onClick={handleDismiss}
                aria-label="Dismiss install prompt"
                className="absolute right-2 top-2 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <X aria-hidden="true" className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3">
                <div aria-hidden="true" className="p-2 bg-primary/10 rounded-lg">
                    <Download className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                    <h2 id="install-travlr-title" className="font-medium text-sm">Install Travlr</h2>
                    <p id="install-travlr-description" className="text-xs text-muted-foreground mt-1">
                        Add Travlr to your home screen for faster access. Your saved itineraries still require a connection to load.
                    </p>
                    <Button
                        type="button"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={handleInstall}
                    >
                        Install App
                    </Button>
                </div>
            </div>
        </div>
    )
}
