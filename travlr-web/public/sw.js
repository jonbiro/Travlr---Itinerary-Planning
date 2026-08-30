const CACHE_NAME = "travlr-v5";

// Keep this list deliberately small. It contains only public shell assets;
// authenticated route HTML and API responses must never enter the cache.
const STATIC_ASSETS = [
    "/",
    "/offline.html",
    "/manifest.json",
    "/icons/icon-192x192.png",
    "/icons/icon-512x512.png",
];

const OFFLINE_PAGE = "/offline.html";
const PUBLIC_NAVIGATION_PATHS = new Set(["/", "/explore"]);

const isSameOrigin = (url) => url.origin === self.location.origin;

const isPrivateRoute = (pathname) => (
    pathname === "/dashboard"
    || pathname.startsWith("/dashboard/")
    || pathname === "/trips"
    || pathname.startsWith("/trips/")
    || pathname === "/stats"
    || pathname.startsWith("/stats/")
);

const isPublicNavigation = (pathname) => PUBLIC_NAVIGATION_PATHS.has(pathname);

const isRouterRequest = (request, url) => (
    request.headers.has("RSC")
    || request.headers.has("Next-Router-Prefetch")
    || request.headers.has("next-router-prefetch")
    || url.searchParams.has("_rsc")
);

const isCacheableStaticAsset = (url) => (
    url.pathname.startsWith("/_next/static/")
    || url.pathname.startsWith("/icons/")
    || url.pathname.startsWith("/images/")
    || url.pathname === "/manifest.json"
);

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => Promise.all(
            STATIC_ASSETS.map((asset) => cache.add(asset).catch(() => undefined)),
        )),
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => Promise.all(
            cacheNames
                .filter((name) => name !== CACHE_NAME)
                .map((name) => caches.delete(name)),
        )),
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== "GET" || !isSameOrigin(url)) return;

    // Let Next's flight requests and prefetches use the network. Caching a
    // flight response can hydrate the wrong route or user session.
    if (isRouterRequest(request, url)) return;

    // APIs and auth endpoints are always network-only. In particular, do not
    // synthesize an offline API response that could be mistaken for user data.
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

    if (request.mode === "navigate") {
        event.respondWith(
            // Avoid satisfying a private route from a stale browser HTTP
            // cache entry that may contain the public app shell.
            fetch(new Request(request, { cache: "no-store" })).catch(async () => {
                // Never substitute the public landing page for an
                // authenticated route. It makes a private URL appear to
                // have loaded successfully and can discard the route state.
                const offlinePage = await caches.match(OFFLINE_PAGE);
                if (!isPublicNavigation(url.pathname)) {
                    return offlinePage || new Response("Travlr is offline. Reconnect to continue.", {
                        status: 503,
                        headers: { "Content-Type": "text/plain; charset=utf-8" },
                    });
                }

                const cached = await caches.match(request) || await caches.match("/");
                return cached || offlinePage || new Response("Travlr is offline. Reconnect to continue.", {
                    status: 503,
                    headers: { "Content-Type": "text/plain; charset=utf-8" },
                });
            }),
        );
        return;
    }

    // Private route assets are network-only even if a browser asks for them
    // as a subresource. Only versioned/static public assets are cacheable.
    if (isPrivateRoute(url.pathname) || !isCacheableStaticAsset(url)) return;

    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;

            return fetch(request).then((response) => {
                if (response.ok) {
                    void caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
                }
                return response;
            });
        }),
    );
});

self.addEventListener("message", (event) => {
    if (event.data === "skipWaiting") self.skipWaiting();
});

self.addEventListener("push", (event) => {
    if (!event.data) return;

    let data;
    try {
        data = event.data.json();
    } catch {
        data = { body: event.data.text() };
    }

    event.waitUntil(
        self.registration.showNotification(data.title || "Travlr", {
            body: data.body || "You have an update from Travlr.",
            icon: "/icons/icon-192x192.png",
            badge: "/icons/icon-192x192.png",
            tag: data.tag || "travlr-notification",
            data: typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/",
        }),
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const requestedTarget = typeof event.notification.data === "string"
        ? event.notification.data
        : "/";
    const targetUrl = requestedTarget.startsWith("/") && !requestedTarget.startsWith("//")
        ? new URL(requestedTarget, self.location.origin)
        : new URL("/", self.location.origin);

    event.waitUntil(
        self.clients.matchAll({ type: "window" }).then((windowClients) => {
            for (const client of windowClients) {
                const clientUrl = new URL(client.url);
                if (
                    clientUrl.origin === targetUrl.origin
                    && clientUrl.pathname === targetUrl.pathname
                    && clientUrl.search === targetUrl.search
                    && "focus" in client
                ) {
                    return client.focus();
                }
            }
            if (self.clients.openWindow) return self.clients.openWindow(targetUrl.href);
            return undefined;
        }),
    );
});
