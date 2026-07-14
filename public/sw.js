const CACHE="rocky-shell-v2";const SHELL=["/login","/offline","/icon.svg"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL))));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;const url=new URL(e.request.url);if(url.origin!==self.location.origin)return;if(url.pathname.startsWith("/api/")||url.pathname.startsWith("/admin")||url.pathname.startsWith("/employee")){e.respondWith(fetch(e.request).catch(()=>caches.match("/offline")));return}if(!SHELL.includes(url.pathname))return;e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request)))});
