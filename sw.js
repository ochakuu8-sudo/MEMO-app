/* 付箋マップ service worker: keeps the app shell cached so it opens offline.
   Every request is answered from the cache first and refreshed from the network in the background,
   so a new version shows up on the next launch. Bump VERSION when the list of files changes. */
const VERSION = 'v1';
const CACHE = 'fusenmap-' + VERSION;
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('fusenmap-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const key = req.mode === 'navigate' ? './index.html' : req;
    const hit = await cache.match(key, {ignoreSearch: req.mode === 'navigate'});
    const net = fetch(req).then(res => {
      if (res.ok && !res.redirected) cache.put(key, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || new Response('オフラインです', {status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8'}});
  }));
});
