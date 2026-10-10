/* 공부 플랜 로더(index.html)만 기기에 저장해 두는 서비스 워커.
   인터넷이 없을 때도 껍데기가 열리고, 껍데기는 받아 둔 플랜(localStorage)을 연다.
   같은 주소의 페이지 이동만 다룬다. GitHub API 요청(다른 주소)은 건드리지 않는다. */
var CACHE = "plan-loader-v2";
self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.add("./"); }).catch(function(){}).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){ return k.indexOf("plan-loader-") === 0 && k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
function isShell(u){   // 껍데기(index.html) 주소일 때만 저장한다. sw.js·README 같은 다른 파일을 껍데기로 저장하지 않게
  var p = new URL(u).pathname, base = new URL(self.registration.scope).pathname;
  return p === base || p === base + "index.html";
}
self.addEventListener("fetch", function(e){
  var r = e.request;
  if (r.method !== "GET" || r.mode !== "navigate" || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith(new Promise(function(resolve){
    var done = false;
    function fromCache(orError){
      return caches.match("./", { ignoreSearch: true }).then(function(m){
        if (done) return;
        if (m) { done = true; resolve(m); }
        else if (orError) { done = true; resolve(Response.error()); }
      });
    }
    var slow = setTimeout(function(){ fromCache(false); }, 3000);   // 네트워크가 3초 넘게 걸리면 저장해 둔 껍데기부터
    fetch(r).then(function(res){
      clearTimeout(slow);
      if (res && res.ok && res.type === "basic" && isShell(r.url)) { var copy = res.clone(); caches.open(CACHE).then(function(c){ return c.put("./", copy); }).catch(function(){}); }
      if (!done) { done = true; resolve(res); }
    }, function(){ clearTimeout(slow); fromCache(true); });
  }));
});
