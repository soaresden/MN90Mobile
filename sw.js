/* MN90 Mobile — service worker : appli installable et utilisable hors ligne.
   Stratégie "réseau d'abord" : en ligne on a toujours la dernière version ;
   hors ligne, on sert la dernière copie gardée en cache. */
const CACHE = 'mn90-v3';
const CORE = [
  './', './index.html', './manifest.webmanifest',
  './shared/style.css', './shared/theme.js', './shared/mn90.js', './shared/profile.js', './shared/glossary.js',
  './shared/procedures.js', './shared/buhlmann.js', './shared/intro.js', './shared/wear-version.js', './shared/vendor/qrcode.js',
  './planner/index.html', './planner/app.js',
  './nitrox/index.html', './nitrox/app.js',
  './procedures/index.html', './saturation/index.html', './saturation/app.js',
  './briefing/index.html', './watch/index.html',
  './icons/icon-192.png', './icons/icon-512.png',
];
// Gros fichiers 3D : jamais mis en cache (trop lourds pour un téléphone)
const SKIP = /\.(glb|glbb|mp3)$/i;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || SKIP.test(url.pathname)) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});
