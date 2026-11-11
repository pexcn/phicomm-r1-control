self.addEventListener("install", function (event) {
  console.log("sw install success");
});

self.addEventListener("fetch", function (event) {
  if (event.request.url.startsWith(new URL("upstream/", self.registration.scope).href)) return;
  event.respondWith(
    caches.match(event.request).then(function (response) {
      return response || fetch(event.request);
    }),
  );
});
