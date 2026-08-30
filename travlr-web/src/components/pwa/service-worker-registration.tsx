"use client"

import { useEffect } from "react"
import { toast } from "sonner"

export function ServiceWorkerRegistration() {
    useEffect(() => {
        // Development assets change continuously; caching them breaks hot
        // reloads and can hydrate a new client bundle against stale HTML.
        if (process.env.NODE_ENV !== "production") return

        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            // Register service worker
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => {
                    console.log('Service Worker registered:', registration.scope)

                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    toast("A Travlr update is ready", {
                                        description: "Refresh when you are ready to use the latest version.",
                                        duration: Infinity,
                                        action: {
                                            label: "Refresh",
                                            onClick: () => newWorker.postMessage("skipWaiting"),
                                        },
                                    })
                                }
                            })
                        }
                    })
                })
                .catch((error) => {
                    console.error('Service Worker registration failed:', error)
                })

            // Handle controller change (new service worker activated)
            let refreshing = false
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    refreshing = true
                    window.location.reload()
                }
            })
        }
    }, [])

    return null
}
