"use client"

import { useEffect } from "react"
import { toast } from "sonner"

export function ServiceWorkerRegistration() {
    useEffect(() => {
        // Development assets change continuously; caching them breaks hot
        // reloads and can hydrate a new client bundle against stale HTML.
        if (process.env.NODE_ENV !== "production") return

        if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

        let cancelled = false
        let refreshing = false
        let registration: ServiceWorkerRegistration | null = null
        let updateToastId: string | number | undefined
        let cleanupWorkerStateListener: (() => void) | null = null

        const onControllerChange = () => {
            if (cancelled || refreshing) return

            refreshing = true
            window.location.reload()
        }

        const showUpdatePrompt = (worker: ServiceWorker) => {
            if (cancelled || updateToastId !== undefined) return

            updateToastId = toast("A Travlr update is ready", {
                description: "Refresh when you are ready to use the latest version.",
                duration: Infinity,
                action: {
                    label: "Refresh",
                    onClick: () => {
                        if (cancelled) return

                        if (updateToastId !== undefined) toast.dismiss(updateToastId)
                        updateToastId = undefined
                        worker.postMessage("skipWaiting")
                    },
                },
            })
        }

        const onUpdateFound = () => {
            cleanupWorkerStateListener?.()
            cleanupWorkerStateListener = null

            const newWorker = registration?.installing
            if (!newWorker) return

            const onStateChange = () => {
                if (newWorker.state !== "installed") return

                cleanupWorkerStateListener?.()
                cleanupWorkerStateListener = null

                // The first install has no active controller, so it can
                // activate normally. Only prompt when replacing a live worker.
                if (navigator.serviceWorker.controller) showUpdatePrompt(newWorker)
            }

            cleanupWorkerStateListener = () => {
                newWorker.removeEventListener("statechange", onStateChange)
            }
            newWorker.addEventListener("statechange", onStateChange)
            onStateChange()
        }

        navigator.serviceWorker.addEventListener("controllerchange", onControllerChange)

        navigator.serviceWorker
            .register("/sw.js")
            .then((nextRegistration) => {
                if (cancelled) return

                registration = nextRegistration
                console.log("Service Worker registered:", registration.scope)
                registration.addEventListener("updatefound", onUpdateFound)
                if (registration.waiting && navigator.serviceWorker.controller) {
                    showUpdatePrompt(registration.waiting)
                }
            })
            .catch((error) => {
                if (!cancelled) console.error("Service Worker registration failed:", error)
            })

        return () => {
            cancelled = true
            navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange)
            registration?.removeEventListener("updatefound", onUpdateFound)
            cleanupWorkerStateListener?.()
            if (updateToastId !== undefined) toast.dismiss(updateToastId)
        }
    }, [])

    return null
}
