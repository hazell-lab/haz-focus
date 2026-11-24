// service worker: lets hazfocus open without a connection
// bump the version when the list of files changes
const CACHE = "hazfocus-v1";
const FONT_CACHE = "hazfocus-fonts-v1";

const APP_FILES = [
  "./",
  "index.html",
  "css/style.css",
  "js/script.js",
  "manifest.webmanifest",
  "assets/icons/favicon.svg",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/maskable-512.png",
  "assets/icons/apple-touch-icon.png"
];

// save the app files when it is installed
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(APP_FILES);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

// remove caches from older versions
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) {
        return key !== CACHE && key !== FONT_CACHE;
      }).map(function (key) {
        return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }
  const url = new URL(request.url);

  // fonts rarely change, use the saved copy first
  if (url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com") {
    event.respondWith(
      caches.open(FONT_CACHE).then(function (cache) {
        return cache.match(request).then(function (saved) {
          return saved || fetch(request).then(function (response) {
            if (response.ok || response.type === "opaque") {
              cache.put(request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  // app files: get the newest version online, fall back to the saved one offline
  event.respondWith(
    fetch(request).then(function (response) {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(function (cache) {
          cache.put(request, copy);
        });
      }
      return response;
    }).catch(function () {
      return caches.match(request, { ignoreSearch: true }).then(function (saved) {
        if (saved) {
          return saved;
        }
        if (request.mode === "navigate") {
          return caches.match("./");
        }
        return Response.error();
      });
    })
  );
});

// clicking a timer notification brings the app back
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (windows) {
      if (windows.length > 0) {
        return windows[0].focus();
      }
      return self.clients.openWindow("./");
    })
  );
});
