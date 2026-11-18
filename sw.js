// CACHE and CORE are supplied by scripts/offline-site.cjs for this export.
const assets = new Set(CORE);
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE.map(url => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('cosmic-planner-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  const page = { '/': '/index.html', '/index.html': '/index.html', '/privacy/': '/privacy/index.html' }[url.pathname];
  if (request.mode === 'navigate' && page) {
    event.respondWith(fetch(request).catch(async () => (await caches.open(CACHE)).match(page)));
  } else if (assets.has(url.pathname + url.search)) {
    event.respondWith((async () => (await (await caches.open(CACHE)).match(request)) || fetch(request))());
  }
});

self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch { payload = { body: event.data ? event.data.text() : '' }; }

  const title = String(payload.title || 'Cosmic Planner reminder');
  const options = {
    body: String(payload.body || 'You have a scheduled reminder.'),
    tag: String(payload.tag || 'cosmic-background-reminder'),
    renotify: false,
    data: { url: String(payload.url || './') },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification?.data?.url || './', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        if ('navigate' in client && client.url !== target) await client.navigate(target);
        return client.focus();
      }
    }
    if (clients.openWindow) return clients.openWindow(target);
    return null;
  })());
});