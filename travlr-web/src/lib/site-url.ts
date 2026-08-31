const LOCAL_SITE_URL = "http://localhost:3000"

function asAbsoluteUrl(value: string | undefined): URL | null {
    const normalized = value?.trim()
    if (!normalized) return null

    try {
        return new URL(/^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`)
    } catch {
        return null
    }
}

/**
 * Resolve one stable public origin for canonical metadata. Explicit product
 * configuration wins, followed by the auth origin and Vercel's production
 * project URL. VERCEL_URL is retained only as a final preview fallback.
 */
export function getSiteUrl(): URL {
    const resolved = [
        process.env.NEXT_PUBLIC_SITE_URL,
        process.env.NEXTAUTH_URL,
        process.env.VERCEL_PROJECT_PRODUCTION_URL,
        process.env.VERCEL_URL,
    ].map(asAbsoluteUrl).find((value): value is URL => value !== null)

    const siteUrl = resolved ?? new URL(LOCAL_SITE_URL)
    siteUrl.pathname = "/"
    siteUrl.search = ""
    siteUrl.hash = ""
    return siteUrl
}

export function isPreviewDeployment() {
    return process.env.VERCEL_ENV?.trim().toLowerCase() === "preview"
}
