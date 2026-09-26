// Offline-Speicher. Die Versionsnummer ändert sich bei jeder neuen Fassung.
const CACHE = 'rezeptordner-titel1';
const FILES = ['./', 'index.html', 'rezepte.js', 'manifest.json', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== CDN_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Firebase-Programmteile und Schriften: einmal laden, dann aus dem Speicher (auch offline)
const CDN_CACHE = 'rezeptordner-cdn';
const CDN = ['https://www.gstatic.com', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'];
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const origin = new URL(e.request.url).origin;
  if (CDN.includes(origin)) {
    e.respondWith(caches.open(CDN_CACHE).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok || res.type === 'opaque') c.put(e.request, res.clone());
      return res;
    }))));
    return;
  }
  // Alles andere Fremde (z. B. die Firebase-Datenbank) normal laden
  if (origin !== self.location.origin) return;
  // Erst aus dem Netz holen (damit neue Rezepte ankommen). Hängt das Netz länger als 4 Sekunden,
  // oder gibt es keins, kommt die gespeicherte Fassung.
  const net = fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  });
  const cached = () => caches.match(e.request, { ignoreSearch: true });
  const timeout = new Promise(r => setTimeout(r, 4000)).then(cached);
  e.respondWith(
    Promise.race([net.catch(() => null), timeout])
      .then(res => res || cached())
      .then(res => res || net)
  );
});
