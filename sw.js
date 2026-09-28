// Träningsloggen service worker – cachar appen så att den startar snabbt och fungerar på gymmet utan täckning.
const CACHE = 'tl-v1';
const SHELL = ['/', '/index.html', '/styles.css', '/app.js', '/program.js', '/manifest.webmanifest', '/icons/icon-192.png', '/img/d1-1.jpg','/img/d1-2.jpg','/img/d1-3.jpg','/img/d1-4.jpg','/img/d1-5.jpg','/img/d1-6.jpg','/img/d2-1.jpg','/img/d2-2.jpg','/img/d2-3.jpg','/img/d2-4.jpg','/img/d2-5.jpg','/img/d2-6.jpg','/img/d3-1.jpg','/img/d3-2.jpg','/img/d3-3.jpg','/img/d3-4.jpg','/img/d3-5.jpg','/img/d3-6.jpg','/img/d4-1.jpg','/img/d4-2.jpg','/img/d4-3.jpg','/img/d4-4.jpg','/img/d4-5.jpg','/img/d4-6.jpg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/.netlify/')) return;
  if (url.pathname.startsWith('/img/') || url.pathname.startsWith('/icons/')) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
    return;
  }
  // Nätverk först, cache som reserv
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r;
  }).catch(() => caches.match(e.request).then(r => r || caches.match('/index.html'))));
});
