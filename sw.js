// Träningsloggen service worker – cachar appen så att den startar snabbt och fungerar på gymmet utan täckning.
const CACHE = 'tl-v3';
const SHELL = ['/', '/index.html', '/styles.css', '/app.js', '/program.js', '/manifest.webmanifest', '/icon-192.png', '/d1-1.jpg','/d1-2.jpg','/d1-3.jpg','/d1-4.jpg','/d1-5.jpg','/d1-6.jpg','/d2-1.jpg','/d2-2.jpg','/d2-3.jpg','/d2-4.jpg','/d2-5.jpg','/d2-6.jpg','/d3-1.jpg','/d3-2.jpg','/d3-3.jpg','/d3-4.jpg','/d3-5.jpg','/d3-6.jpg','/d4-1.jpg','/d4-2.jpg','/d4-3.jpg','/d4-4.jpg','/d4-5.jpg','/d4-6.jpg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/.netlify/')) return;
  if (url.pathname.startsWith('/') || url.pathname.startsWith('/icons/')) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
    return;
  }
  // Nätverk först, cache som reserv
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r;
  }).catch(() => caches.match(e.request).then(r => r || caches.match('/index.html'))));
});
