// Offline cache for Cliffmatt Ad Studio (version c706a56a9c)
const CACHE = 'adstudio-c706a56a9c';
const ASSETS = ["./", "index.html", "manifest.webmanifest", "css/app.css?v=c706a56a9c", "css/fonts.css?v=c706a56a9c", "js/app.js?v=c706a56a9c", "vendor/three.min.js?v=c706a56a9c", "vendor/jszip.min.js?v=c706a56a9c", "vendor/mp4-muxer.min.js?v=c706a56a9c", "fonts/anton-latin-400-normal.woff2", "fonts/montserrat-latin-500-normal.woff2", "fonts/montserrat-latin-600-normal.woff2", "fonts/montserrat-latin-700-normal.woff2", "fonts/montserrat-latin-800-normal.woff2", "fonts/montserrat-latin-900-normal.woff2", "fonts/dm-serif-display-latin-400-normal.woff2", "fonts/plus-jakarta-sans-latin-400-normal.woff2", "fonts/plus-jakarta-sans-latin-600-normal.woff2", "fonts/plus-jakarta-sans-latin-700-normal.woff2", "fonts/plus-jakarta-sans-latin-800-normal.woff2", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/favicon-64.png"];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); return r; })
      .catch(() => caches.match('index.html').then(r => r || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; })));
});
