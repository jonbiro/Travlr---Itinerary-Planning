import { getServerSession } from "next-auth/next"

import { authOptions, hasAuthConfiguration, isAuthConfigured } from "@/lib/auth"
import { DEMO_USER_ID } from "@/lib/prisma"

export type CurrentUser = {
    id: string
    email: string | null
    isDemo: boolean
}

/**
 * Demo mode is intentionally limited to non-production environments. It is
 * useful for a fresh checkout before OAuth and a database have been set up,
 * but it must never become a production fallback that shares one account.
 *
 * Set TRAVLR_DEMO_MODE=false locally to exercise the authenticated path. If
 * Google/NextAuth is configured, local runs also default to the authenticated
 * path unless demo mode is explicitly enabled.
 */
export function isDemoMode() {
    if (process.env.NODE_ENV === "production") return false

    const configured = process.env.TRAVLR_DEMO_MODE?.trim().toLowerCase()
    if (configured === "true") return true
    if (configured === "false") return false

    return !hasAuthConfiguration()
}

/**
 * Resolve the signed-in user for server-side API routes. Returning null is a
 * deliberate unauthenticated result; callers should respond with HTTP 401.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
    if (isDemoMode()) {
        return {
            id: DEMO_USER_ID,
            email: "demo@example.com",
            isDemo: true,
        }
    }

    // A partially configured or entirely missing provider cannot produce a
    // valid session. Fail closed without invoking NextAuth's configuration
    // error path, which would otherwise turn an expected 401 into noisy logs.
    if (!isAuthConfigured()) return null

    try {
        const session = await getServerSession(authOptions)
        const userId = session?.user?.id

        if (!userId) return null

        return {
            id: userId,
            email: session.user.email?.trim().toLowerCase() || null,
            isDemo: false,
        }
    } catch (error) {
        // A missing/invalid OAuth or session configuration should fail closed
        // for API callers instead of exposing data or turning into a 500.
        console.error("[AUTH_SESSION] Unable to resolve current user", error)
        return null
    }
}

export function unauthorizedResponse() {
    const authConfigured = isAuthConfigured()

    return Response.json(
        {
            error: authConfigured
                ? "Authentication required. Sign in to use Travlr."
                : "Sign-in is not configured for this environment yet.",
            code: authConfigured ? "AUTH_REQUIRED" : "AUTH_NOT_CONFIGURED",
            authConfigured,
        },
        { status: 401 },
    )
}
