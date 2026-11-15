/* Plate Count service worker — app shell works offline; data calls always go to the network. */
var VERSION = "pc-v39";   /* when you change app files, bump this AND the ?v= numbers in index.html */
var SHELL = [
  "index.html","css/plate.css?v=32","js/app.js?v=39","foods.js?v=28","programs.js?v=39","starter-program.js?v=28","spotify.js?v=28",
  "manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","icons/icon-180.png","../js/supabase-client.js"
];
var CDN = /^https:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

// Push notifications (the PM session reminder, sent by the send-pm-reminders function).
self.addEventListener("push", function(e){
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = {}; }
  e.waitUntil(self.registration.showNotification(d.title || "Plate Count", {
    body: d.body || "", icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: "pm-session", data: { url: d.url || "/plate-count/index.html" }
  }));
});
self.addEventListener("notificationclick", function(e){
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || "/plate-count/index.html";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(list){
    for (var i = 0; i < list.length; i++) { if (list[i].url.indexOf("/plate-count/") > -1 && "focus" in list[i]) return list[i].focus(); }
    return self.clients.openWindow(url);
  }));
});

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

