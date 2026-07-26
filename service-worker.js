const CACHE_NAME = "clout-calc-v1";

const PRECACHE_URLS = [
    "./",
    "./index.html",
    "./about.html",
    "./offline.html",
    "./manifest.webmanifest",
    "./css/styles.css",
    "./js/theme.js",
    "./js/clout-calc.js",
    "./js/score-sim.js",
    "./js/score-svg.js",
    "./js/ux-state.js",
    "./js/ux-calc-ui.js",
    "./js/ux-saved.js",
    "./js/ux.js",
    "./js/pwa.js",
    "./vendor/bootstrap/bootstrap.min.css",
    "./vendor/bootstrap/bootstrap.bundle.min.js",
    "./vendor/bootstrap-icons/bootstrap-icons.css",
    "./vendor/bootstrap-icons/fonts/bootstrap-icons.woff2",
    "./vendor/bootstrap-icons/fonts/bootstrap-icons.woff",
    "./icons/icon.svg"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => Promise.all(
            cacheNames
                .filter((cacheName) => cacheName !== CACHE_NAME)
                .map((cacheName) => caches.delete(cacheName))
        ))
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") {
        return;
    }

    const requestUrl = new URL(event.request.url);
    if (requestUrl.origin !== self.location.origin) {
        return;
    }

    if (event.request.mode === "navigate") {
        event.respondWith((async () => {
            try {
                const networkResponse = await fetch(event.request);
                const cache = await caches.open(CACHE_NAME);
                cache.put(event.request, networkResponse.clone());
                return networkResponse;
            } catch {
                const cache = await caches.open(CACHE_NAME);
                return (
                    await cache.match(event.request, { ignoreSearch: true }) ||
                    await cache.match("./index.html") ||
                    await cache.match("./offline.html")
                );
            }
        })());
        return;
    }

    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
            return cachedResponse;
        }

        const networkResponse = await fetch(event.request);
        cache.put(event.request, networkResponse.clone());
        return networkResponse;
    })());
});