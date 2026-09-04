const CACHE='cosmic-planner-alpha3-v2';
const CORE=['./','./index.html','./icon.svg','./styles.css?v=alpha3-0','./alpha-fix.css?v=alpha3-0','./alpha27-quality.css?v=alpha3-0','./insights-alpha30.css?v=alpha3-0','./planner-alpha28.css?v=alpha3-0','./planner-alpha29.css?v=alpha3-0','./planner-alpha29-fix.css?v=alpha3-0','./experience-alpha31.css?v=alpha3-1','./experience-alpha31-fix.css?v=alpha3-1','./app.js?v=alpha3-0','./rpc-fix.js?v=alpha3-0','./auth-fix.js?v=alpha3-0','./password-policy.js?v=alpha3-0','./astrology-alpha2.js?v=alpha3-0','./insights-alpha30.js?v=alpha3-0','./notifications-alpha2.js?v=alpha3-0','./calendar-alpha2.js?v=alpha3-0','./planner-alpha28.js?v=alpha3-0','./planner-alpha28-compat.js?v=alpha3-0','./planner-alpha29.js?v=alpha3-0','./planner-alpha29-fix.js?v=alpha3-0','./palm-alpha2.js?v=alpha3-0','./palm-ai-alpha27.js?v=alpha3-0','./privacy-alpha2.js?v=alpha3-0','./push-alpha2.js?v=alpha3-0','./diagnostics-alpha27.js?v=alpha3-0','./experience-alpha31.js?v=alpha3-1','./experience-alpha31-fix.js?v=alpha3-1','./manifest.json?v=alpha3-1'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const req=event.request;
  const url=new URL(req.url);
  const sameOrigin=url.origin===self.location.origin;

  if(req.mode==='navigate' || (sameOrigin && ['document','script','style','manifest'].includes(req.destination))){
    event.respondWith(
      fetch(req)
        .then(response=>{
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(req,copy));
          return response;
        })
        .catch(()=>caches.match(req).then(hit=>hit||caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(caches.match(req).then(hit=>hit||fetch(req)));
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
