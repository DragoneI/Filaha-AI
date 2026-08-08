const CACHE_VERSION = 'v2';
const CACHE_NAME = `filaha-${CACHE_VERSION}`;
const ASSETS = [
  '/',
  '/index.html',
  '/app.html',
  '/app.css',
  '/app.js',
  '/translations.json',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  // Force le nouveau Service Worker à prendre le contrôle immédiatement,
  // sans attendre la fermeture de tous les onglets ouverts.
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  // Network-first : on essaie toujours le réseau en premier pour avoir
  // la dernière version déployée. On ne retombe sur le cache que si le
  // réseau échoue (vrai mode hors-ligne). On met aussi à jour le cache
  // à chaque requête réussie, pour que le mode hors-ligne reste à jour.
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseClone));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
