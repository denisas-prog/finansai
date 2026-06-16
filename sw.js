// Keisti CACHE pavadinimą su KIEKVIENA versija (cache busting)
const CACHE = 'finansai-v2.7';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  // Tyčia BE self.skipWaiting() — naujas SW lieka "waiting",
  // kol vartotojas paspaudžia "Atnaujinti" baneryje (žr. index.html).
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Vartotojas paspaudė "Atnaujinti" → leidžia naujam SW perimti valdymą
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;

  // HTML / navigacija: network-first (kad vartotojas pirmiausia gautų NAUJĄ versiją,
  // kol yra internetas; offline – fallback į cache)
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // Visi kiti resursai (ikonos, manifest, font/JS CDN): cache-first,
  // bet atnaujina cache fone, ir nekeičia cache, jei atsakymas ne ok (404/500)
  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
