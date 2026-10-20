// Service worker (D-010): caches only static assets, never private or API responses; displays push.
const CACHE = "static-v2";
const PRIVATE = ["/api", "/account", "/admin", "/checkout", "/track", "/cart", "/auth", "/login", "/orders"];

const TEXT = {
  en: {
    "order.placed": ["New order", "Open the order queue to review it."],
    "order.confirmed": ["Order confirmed", "Your order was confirmed."],
    "order.processing": ["Order processing", "Your order is being prepared."],
    "order.dispatched": ["Order on the way", "Your order has been dispatched."],
    "order.delivered": ["Order delivered", "Your order was delivered."],
    "order.cancelled": ["Order cancelled", "An order was cancelled."],
    "order.rejected": ["Order rejected", "An order was rejected."],
    "payment.needed": ["Payment to verify", "A payment proof needs review."],
    "stock.low": ["Low stock", "A product is running low."],
    "review.pending": ["Review to moderate", "A new review is waiting."],
  },
  ne: {
    "order.placed": ["नयाँ अर्डर", "अर्डर हेर्न अर्डर सूची खोल्नुहोस्।"],
    "order.confirmed": ["अर्डर पुष्टि भयो", "तपाईंको अर्डर पुष्टि भयो।"],
    "order.processing": ["अर्डर तयारीमा", "तपाईंको अर्डर तयार हुँदैछ।"],
    "order.dispatched": ["अर्डर पठाइयो", "तपाईंको अर्डर पठाइयो।"],
    "order.delivered": ["अर्डर पुग्यो", "तपाईंको अर्डर पुग्यो।"],
    "order.cancelled": ["अर्डर रद्द भयो", "एउटा अर्डर रद्द भयो।"],
    "order.rejected": ["अर्डर अस्वीकृत", "एउटा अर्डर अस्वीकृत भयो।"],
    "payment.needed": ["भुक्तानी जाँच्नुहोस्", "भुक्तानी प्रमाण जाँच्न बाँकी छ।"],
    "stock.low": ["कम स्टक", "एउटा उत्पादनको स्टक कम छ।"],
    "review.pending": ["समीक्षा जाँच्नुहोस्", "नयाँ समीक्षा पर्खिरहेको छ।"],
  },
};

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) =>
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
);

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch {}
  const lang = d.locale === "ne" ? "ne" : "en";
  const [title, body] = (TEXT[lang][d.type]) || ["Notification", "Open the app for details."];
  e.waitUntil(self.registration.showNotification(title, { body, icon: "/icon.svg", badge: "/icon.svg", tag: d.id, data: { url: d.url || "/" } }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    for (const c of cs) { if ("focus" in c) { c.navigate(url); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || PRIVATE.some((p) => url.pathname.startsWith(p))) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => new Response("<!doctype html><meta name=viewport content='width=device-width'><body style='font-family:sans-serif;text-align:center;padding:3rem'><h1>You're offline</h1><p>Some features are unavailable. Check your connection and retry.</p><button onclick='location.reload()'>Retry</button>", { headers: { "Content-Type": "text/html" } })));
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || /\.(?:svg|png|jpg|webp|woff2)$/.test(url.pathname)) {
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const hit = await c.match(req);
        const net = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
