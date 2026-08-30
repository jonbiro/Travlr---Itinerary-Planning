import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { isDemoMode } from "./current-user"

beforeEach(() => {
    vi.stubEnv("TRAVLR_DEMO_MODE", "")
    vi.stubEnv("NEXTAUTH_SECRET", "")
    vi.stubEnv("GOOGLE_CLIENT_ID", "")
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "")
})

afterEach(() => {
    vi.unstubAllEnvs()
})

describe("isDemoMode", () => {
    it("defaults to demo mode for a fresh non-production checkout", () => {
        vi.stubEnv("NODE_ENV", "development")

        expect(isDemoMode()).toBe(true)
    })

    it("requires authentication when Google auth is configured", () => {
        vi.stubEnv("NODE_ENV", "development")
        vi.stubEnv("NEXTAUTH_SECRET", "test-secret")
        vi.stubEnv("GOOGLE_CLIENT_ID", "test-client")
        vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret")

        expect(isDemoMode()).toBe(false)
    })

    it("cannot be enabled in production", () => {
        vi.stubEnv("NODE_ENV", "production")
        vi.stubEnv("TRAVLR_DEMO_MODE", "true")

        expect(isDemoMode()).toBe(false)
    })
})
