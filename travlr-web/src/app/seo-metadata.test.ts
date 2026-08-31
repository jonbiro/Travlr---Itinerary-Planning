import { readFile } from "node:fs/promises"
import path from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"

import robots from "./robots"
import sitemap from "./sitemap"
import { getSiteUrl } from "@/lib/site-url"

afterEach(() => {
    vi.unstubAllEnvs()
})

const readAppFile = (fileName: string) =>
    readFile(path.join(process.cwd(), "src", "app", fileName), "utf8")

describe("public SEO metadata", () => {
    it("emits canonical public URLs in the sitemap and robots metadata", () => {
        const entries = sitemap()
        const publicUrls = entries.map((entry) => entry.url)
        const robotRules = robots()

        expect(publicUrls).toHaveLength(2)
        expect(publicUrls.map((url) => new URL(url).pathname)).toEqual(["/", "/explore"])
        expect(robotRules.sitemap).toBe(new URL("/sitemap.xml", publicUrls[0]).toString())
        expect(robotRules.rules).toEqual({
            userAgent: "*",
            allow: ["/", "/explore"],
            disallow: ["/api/", "/dashboard", "/trips", "/stats"],
        })
    })

    it("defines absolute-base canonical and social metadata for public pages", async () => {
        const layout = await readAppFile("layout.tsx")
        const explore = await readAppFile("explore/page.tsx")

        expect(layout).toContain("metadataBase: siteUrl")
        expect(layout).toContain("getSiteUrl()")
        expect(layout).toContain("isPreviewDeployment()")
        expect(layout).toContain('canonical: "/"')
        expect(layout).toContain('url: "/"')
        expect(layout).toContain('const socialImage = "/images/hero-travel-planning.webp"')
        expect(layout).toContain("images: [socialImage]")
        expect(layout).not.toContain("Geist_Mono")
        expect(layout).not.toContain("geistMono")
        expect(explore).toContain('canonical: "/explore"')
        expect(explore).toContain('url: "/explore"')
        expect(explore).toContain('url: "/images/destinations/lisbon.webp"')
        expect(explore).toContain('images: ["/images/destinations/lisbon.webp"]')
    })

    it("prefers an explicit public origin and blocks preview indexing", () => {
        vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://travel.example.com/app?ignored=1")
        vi.stubEnv("NEXTAUTH_URL", "https://auth.example.com")
        expect(getSiteUrl().toString()).toBe("https://travel.example.com/")

        vi.stubEnv("VERCEL_ENV", "preview")
        expect(robots().rules).toEqual({ userAgent: "*", disallow: "/" })
    })
})
