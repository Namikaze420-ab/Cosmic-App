const CACHE='cosmic-planner-alpha1-v6';
const CORE=['./','./index.html','./styles.css?v=alpha1-6','./alpha-fix.css?v=alpha1-6','./app.js?v=alpha1-6','./rpc-fix.js?v=alpha1-6','./auth-fix.js?v=alpha1-6','./password-policy.js?v=alpha1-6','./manifest.json?v=alpha1-6'];

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
