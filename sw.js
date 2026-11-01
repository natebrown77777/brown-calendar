/* Brown Calendar service worker: works offline and checks reminders in the background where the phone allows it. */
importScripts("brown-core.js");

const CACHE = "brown-calendar-v1";
const SHELL = [
  "./", "index.html", "brown-core.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/apple-touch-icon.png", "icons/badge-96.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Serve from the cache first so the app opens instantly and offline; refresh the cache in the background.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!sameOrigin && !isFont) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = req.mode === "navigate" ? "index.html" : req;
    const cached = await cache.match(key, { ignoreSearch: req.mode === "navigate" });
    const network = fetch(req).then(res => {
      if (res && (res.ok || res.type === "opaque")) cache.put(key, res.clone());
      return res;
    }).catch(() => null);
    if (cached) { e.waitUntil(network); return cached; }
    const res = await network;
    return res || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
  })());
});

async function checkReminders(){
  let tasks = {};
  try { tasks = (await idbGet("tasks")) || {}; } catch (e) {}
  await notifyDue(tasks, x => self.registration.showNotification("Brown Calendar", {
    body: reminderText(x), tag: x.key, icon: "icons/icon-192.png", badge: "icons/badge-96.png"
  }));
}

// Android (Chrome) only, once the app is installed: the phone wakes this a few times a day.
self.addEventListener("periodicsync", e => {
  if (e.tag === "brown-reminders") e.waitUntil(checkReminders());
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) { if ("focus" in c) return c.focus(); }
    return self.clients.openWindow("./");
  })());
});
