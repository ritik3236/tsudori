// Minimal offline shell for the Tsudori PWA / Android TWA.
//
// This app is server-rendered and auth-gated, so we deliberately DO NOT cache page
// HTML or app chunks — that would serve stale or wrong-user content. The only job
// here is: when a top-level navigation fails because the device is offline, show a
// branded fallback instead of Chrome's blank dinosaur page. Everything else hits the
// network untouched. Bump CACHE to invalidate the precache when the assets change.
const CACHE = "tsudori-offline-v1"
const OFFLINE_URL = "/offline.html"
// Precache ONLY the offline page. cache.addAll is atomic — one 404 rejects the whole
// install and silently disables the fallback — and offline.html is fully self-contained
// (inline logo + CSS), so it needs nothing else cached.
const PRECACHE = [OFFLINE_URL]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  // Network-first, and only for full-page navigations. Non-navigation requests
  // (data, chunks, images) are left entirely to the browser.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .match(OFFLINE_URL)
          .then((cached) => cached ?? new Response("Offline", { status: 503 })),
      ),
    )
  }
})
