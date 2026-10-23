/* Plan Vol : cache hors ligne. Change VERSION à chaque nouvelle version de l'app pour forcer la mise à jour. */
var VERSION="planvol-v4",TILES="planvol-tiles",FONTS="planvol-fonts";
var CORE=["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","icon-maskable-512.png"];
self.addEventListener("install",function(e){
  e.waitUntil(caches.open(VERSION).then(function(c){return c.addAll(CORE)}).then(function(){return self.skipWaiting()}));
});
self.addEventListener("activate",function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return k!==VERSION&&k!==TILES&&k!==FONTS}).map(function(k){return caches.delete(k)}));
  }).then(function(){return self.clients.claim()}));
});
function trim(name,max){
  caches.open(name).then(function(c){c.keys().then(function(ks){
    if(ks.length>max)ks.slice(0,ks.length-max+200).forEach(function(k){c.delete(k)});
  })});
}
function withTimeout(p,ms){
  return new Promise(function(res,rej){var t=setTimeout(function(){rej(new Error("timeout"))},ms);p.then(function(v){clearTimeout(t);res(v)},function(e){clearTimeout(t);rej(e)})});
}
self.addEventListener("fetch",function(e){
  var r=e.request;
  if(r.method!=="GET")return;
  var u=new URL(r.url);
  if(u.origin===location.origin){
    /* l'app : le réseau d'abord (version à jour), le cache si pas de réseau ou réseau trop lent */
    e.respondWith(withTimeout(fetch(r),4000).then(function(res){
      if(res&&res.ok){var cp=res.clone();caches.open(VERSION).then(function(c){c.put(r,cp)})}
      return res;
    }).catch(function(){
      return caches.match(r).then(function(m){return m||caches.match("index.html")});
    }));
    return;
  }
  if(u.hostname==="tile.openstreetmap.org"){
    /* fonds de carte : le cache d'abord, enregistrés au fur et à mesure */
    e.respondWith(caches.open(TILES).then(function(c){
      return c.match(r).then(function(m){
        if(m)return m;
        return fetch(r).then(function(res){c.put(r,res.clone());trim(TILES,2500);return res});
      });
    }));
    return;
  }
  if(u.hostname==="fonts.googleapis.com"||u.hostname==="fonts.gstatic.com"){
    e.respondWith(caches.open(FONTS).then(function(c){
      return c.match(r).then(function(m){
        var net=fetch(r).then(function(res){c.put(r,res.clone());return res}).catch(function(){return m});
        return m||net;
      });
    }));
  }
  /* tout le reste (météo, OpenAIP) passe directement par le réseau */
});
