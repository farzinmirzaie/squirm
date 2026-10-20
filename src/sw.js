// Service worker: precaches the whole game so it plays offline.
// tools/build.js fills in VERSION and ASSETS; a new build gets a new cache.
const VERSION = '__VERSION__';
const ASSETS = __ASSETS__;
const CACHE = 'squirm-' + VERSION;
// small settings the page hands over for the daily reminder (a worker can't read localStorage)
const STATE = 'squirm-state';

self.addEventListener('install', e => {
  // cache: 'reload' skips the HTTP cache, so a new version never precaches files from the old one
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  // Only touch our own caches: other projects can share this origin (e.g. GitHub Pages).
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('squirm-') && k !== CACHE && k !== STATE).map(k => caches.delete(k))))
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

// Daily reminder. There is no server: an installed app may ask the browser to wake this worker now
// and then (periodic background sync). If today's daily patch is still waiting and it's past the
// hour the player picked, show one gentle notification for the day.
const dayKey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

async function remindDaily() {
  const c = await caches.open(STATE);
  const hit = await c.match('reminder');
  if (!hit) return;
  const s = await hit.json();
  if (!s.on) return;
  const now = new Date(), today = dayKey(now);
  if (s.done === today) return;
  try { if (self.navigator.setAppBadge) await self.navigator.setAppBadge(1); } catch (e) {}
  if (s.told === today || now.getHours() < s.hour || now.getHours() >= 22) return;
  if (self.Notification && Notification.permission !== 'granted') return;
  const wins = await self.clients.matchAll({ type: 'window' });
  if (wins.some(w => w.visibilityState === 'visible')) return;
  const y = new Date(now); y.setDate(y.getDate() - 1);
  const streak = s.done === dayKey(y) && s.streak > 0 ? s.streak : 0;
  await self.registration.showNotification('A fresh daily patch is ready', {
    body: streak ? `Keep your ${streak} day streak going. The worm is waiting!` : 'One cozy puzzle, the same for everyone today.',
    icon: 'icons/icon-192.png', tag: 'squirm-daily', data: { url: './?play=daily' }
  });
  await c.put('reminder', new Response(JSON.stringify({ ...s, told: today }), { headers: { 'content-type': 'application/json' } }));
}

self.addEventListener('periodicsync', e => {
  if (e.tag === 'squirm-daily') e.waitUntil(remindDaily());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
    const w = wins[0];
    if (w) { w.postMessage('squirm-daily'); return w.focus(); }
    return self.clients.openWindow((e.notification.data && e.notification.data.url) || './');
  }));
});
