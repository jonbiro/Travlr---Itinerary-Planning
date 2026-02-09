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
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            // Defer state update to avoid warning about calling setState synchronously in effect
            setTimeout(() => setIsInstalled(true), 0)
            return
        }

        // Check if previously dismissed
        const wasDismissed = localStorage.getItem('pwa-install-dismissed')
        if (wasDismissed) {
            const dismissedTime = parseInt(wasDismissed)
            // Don't show for 7 days after dismissal
            if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
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
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true)
            setInstallPrompt(null)
        })

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
        }
    }, [])

    const handleInstall = async () => {
        if (!installPrompt) return

        await installPrompt.prompt()
        const { outcome } = await installPrompt.userChoice

        if (outcome === 'accepted') {
            setIsInstalled(true)
        }
        setInstallPrompt(null)
    }

    const handleDismiss = () => {
        localStorage.setItem('pwa-install-dismissed', Date.now().toString())
        setDismissed(true)
    }

    // Don't show if installed, dismissed, or no prompt available
    if (isInstalled || dismissed || !installPrompt) {
        return null
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-background border rounded-lg shadow-lg p-4 z-50 animate-in slide-in-from-bottom-4">
            <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            >
                <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Download className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                    <h3 className="font-medium text-sm">Install Travlr</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                        Install the app for quick access and offline support
                    </p>
                    <Button
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
