/* Plate Count service worker — app shell works offline; data calls always go to the network. */
var VERSION = "pc-v14";   /* when you change app files, bump this AND the ?v= numbers in index.html */
var SHELL = [
  "index.html","css/plate.css?v=14","js/app.js?v=14","foods.js?v=14","programs.js?v=14","starter-program.js?v=14","spotify.js?v=14",
  "manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","icons/icon-180.png","../js/supabase-client.js"
];
var CDN = /^https:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(VERSION).then(function(c){ return c.addAll(SHELL); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k!==VERSION && /^pc-/.test(k); }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener("fetch", function(e){
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  if (url.hostname.endsWith("supabase.co")) return;                      // auth + data: never cached
  var sameScope = url.origin === location.origin && url.pathname.indexOf("/plate-count/") === 0;
  var sharedJs  = url.origin === location.origin && url.pathname === "/js/supabase-client.js";
  if (!(sameScope || sharedJs || CDN.test(req.url))) return;
  // Pages: network first so updates arrive, fall back to cache offline.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(function(r){
      var copy = r.clone(); caches.open(VERSION).then(function(c){ c.put("index.html", copy); }); return r;
    }).catch(function(){ return caches.match("index.html"); }));
    return;
  }
  // Everything else: serve cached copy fast, refresh in the background.
  e.respondWith(caches.open(VERSION).then(function(c){
    return c.match(req).then(function(hit){
      var net = fetch(req).then(function(r){ if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; }).catch(function(){ return hit; });
      return hit || net;
    });
  }));
});

