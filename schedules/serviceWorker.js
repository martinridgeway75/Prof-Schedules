/*global self*/
/*global caches*/
/*global fetch*/

var CACHE_NAME = "schedules-cache-v1.5";
var urlsToCache = [
    "../schedules/main.min.js",
    "../schedules/autoBldr_14.min.js",
    "../schedules/msc-script.min.js",
    "../schedules/papaparse.min.js",
    "../schedules/vfs_fonts.js",
    "../schedules/pdfMake_v0.1.36.min.js",
    "../schedules/pdfWorker.js",
    "../schedules/main.min.css",
    "../schedules/font/fontello.eot",
    "../schedules/font/fontello.svg",
    "../schedules/font/fontello.ttf",
    "../schedules/font/fontello.woff",
    "../schedules/font/fontello.woff2",
    "../schedules/index.html",
    "../schedules/404.html",
    "../schedules/schedules192.png",
    "../schedules/schedules512.png"
];

self.addEventListener("install", function(event) {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener("fetch", function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});