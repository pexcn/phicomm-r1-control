// Build placeholders are replaced by build-pwa.mjs; this file is not served directly.
const VERSION = "__BUILD_HASH__";
const ASSETS = /* __PRECACHE__ */ [];
const scope = self.registration.scope;
const base = new URL(scope);
const prefix = `r1-control:${base.pathname}:`;
const cacheName = prefix + VERSION;
const assets = ASSETS.map((asset) => ({
  url: new URL(asset.path, scope).href,
  integrity: asset.integrity,
}));
const precached = new Set(assets.map((asset) => asset.url));

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(cacheName);
        await cache.addAll(
          assets.map(({ url, integrity }) => new Request(url, { cache: "reload", integrity })),
        );
      } catch (error) {
        await caches.delete(cacheName);
        throw error;
      }
      // Updates wait for the user's reload action or for all old tabs to close.
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const owned = (await caches.keys()).filter((key) => key.startsWith(prefix));
      const previous = owned.filter((key) => key !== cacheName).at(-1);
      await Promise.all(
        owned
          .filter((key) => key !== cacheName && key !== previous)
          .map((key) => caches.delete(key)),
      );
      // Keep one previous build's hashed assets for other tabs that are still open.
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") event.waitUntil(self.skipWaiting());
});

async function appAsset(url, request) {
  const cached = await (await caches.open(cacheName)).match(url.href);
  if (cached) return cached;
  if (url.pathname.startsWith(base.pathname + "_app/")) {
    for (const key of await caches.keys()) {
      if (!key.startsWith(prefix) || key === cacheName) continue;
      const previous = await (await caches.open(key)).match(url.href);
      if (previous) return previous;
    }
  }
  return fetch(request);
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== base.origin) return;
  const navigation =
    event.request.mode === "navigate" &&
    (url.pathname === base.pathname || url.pathname === base.pathname + "index.html");
  if (navigation) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(new Request(event.request, { cache: "no-cache" }));
          if (response.ok) return response;
        } catch {
          /* Use the complete installed build when the host is unreachable. */
        }
        return (await caches.open(cacheName)).match(new URL("index.html", scope).href);
      })(),
    );
    return;
  }
  // Only cache this build's app shell. APIs, media, proxies and upstream pass through.
  url.search = "";
  if (precached.has(url.href) || url.pathname.startsWith(base.pathname + "_app/"))
    event.respondWith(appAsset(url, event.request));
});
