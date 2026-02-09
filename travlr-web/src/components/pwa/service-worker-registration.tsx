"use client"

import { useEffect } from "react"

export function ServiceWorkerRegistration() {
    useEffect(() => {
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
                                    // New version available
                                    if (window.confirm('A new version is available. Refresh to update?')) {
                                        newWorker.postMessage('skipWaiting')
                                        window.location.reload()
                                    }
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

// Hook to check online/offline status
export function useOnlineStatus() {
    if (typeof window === 'undefined') return true
    return navigator.onLine
}

// Hook to check if app is installed
export function useIsInstalled() {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(display-mode: standalone)').matches
}
