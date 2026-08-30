import { readFile } from "node:fs/promises"
import path from "node:path"
import { describe, expect, it } from "vitest"

const readPublicFile = (fileName: string) =>
    readFile(path.join(process.cwd(), "public", fileName), "utf8")

describe("offline service worker", () => {
    it("ships an explicit fallback document", async () => {
        const offlinePage = await readPublicFile("offline.html")

        expect(offlinePage).toContain("<title>Offline | Travlr</title>")
        expect(offlinePage).toContain("Travlr offline")
        expect(offlinePage).toContain("private Travlr route was kept intact")
        expect(offlinePage).not.toContain("✈")
    })

    it("never falls back to the public landing page for private navigation", async () => {
        const worker = await readPublicFile("sw.js")

        expect(worker).toContain('const CACHE_NAME = "travlr-v5"')
        expect(worker).toContain('const OFFLINE_PAGE = "/offline.html"')
        expect(worker).toContain("const PUBLIC_NAVIGATION_PATHS = new Set([\"/\", \"/explore\"])")
        expect(worker).toContain("const offlinePage = await caches.match(OFFLINE_PAGE)")
        expect(worker).toContain('fetch(new Request(request, { cache: "no-store" }))')
        expect(worker).toContain('return offlinePage || new Response("Travlr is offline. Reconnect to continue."')
        expect(worker).not.toContain("cached || caches.match('/dashboard')")
    })

    it("matches notification windows by exact same-origin path and query", async () => {
        const worker = await readPublicFile("sw.js")

        expect(worker).toContain("clientUrl.origin === targetUrl.origin")
        expect(worker).toContain("clientUrl.pathname === targetUrl.pathname")
        expect(worker).toContain("clientUrl.search === targetUrl.search")
        expect(worker).toContain("self.clients.openWindow(targetUrl.href)")
        expect(worker).not.toContain("client.url.includes(targetUrl)")
    })
})
