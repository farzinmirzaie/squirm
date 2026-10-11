// Service worker: precaches the whole game so it plays offline.
// tools/build.js fills in VERSION and ASSETS; a new build gets a new cache.
const VERSION = '__VERSION__';
const ASSETS = __ASSETS__;
const CACHE = 'squirm-' + VERSION;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  // Only touch our own caches: other projects can share this origin (e.g. GitHub Pages).
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('squirm-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try { return await fetch(req); }
    catch (err) {
      if (req.mode === 'navigate') return c.match('./');
      throw err;
    }
  }));
});
