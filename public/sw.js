/*
 * Service worker de la boutique (cahier des charges, 20.1 et 20.2).
 * - Pages : réseau d'abord, puis la dernière version en cache, puis la page « hors ligne ».
 * - Fichiers de l'application (JS, CSS, polices) : cache d'abord, ils sont versionnés par leur nom.
 * - Images : cache, rafraîchi en arrière-plan.
 * - Données de l'API : non interceptées. L'application garde elle-même une copie des données publiques
 *   du catalogue (src/api/offlineCache.ts) ; les données personnelles ne sont jamais conservées.
 */
const VERSION = 'v3';
const SHELL = `shell-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const IMAGES = `images-${VERSION}`;
const API = new URL(self.location.href).searchParams.get('api');

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(['/', '/offline.html', '/manifest.webmanifest', '/favicon.svg']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  // Les caches des versions précédentes sont supprimés ; la copie du catalogue appartient à l'application
  const keep = [SHELL, ASSETS, IMAGES, 'catalogue-data-v1'];
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Limite la taille d'un cache en supprimant les entrées les plus anciennes. */
async function trim(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((k) => cache.delete(k)));
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(cacheName)).put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then(async (response) => {
      if (response.ok || response.type === 'opaque') {
        await (await caches.open(cacheName)).put(request, response.clone());
        void trim(cacheName, 300);
      }
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // L'API passe directement par le réseau
  if (API && request.url.startsWith(API)) return;

  if (request.mode === 'navigate') {
    if (url.pathname.startsWith('/admin')) return;
    // Application monopage : toute navigation sert la même page d'accueil de l'application
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          (await caches.open(SHELL)).put('/', response.clone());
          return response;
        })
        .catch(async () => (await caches.match('/')) || caches.match('/offline.html')),
    );
    return;
  }

  if (request.destination === 'image') {
    event.respondWith(staleWhileRevalidate(request, IMAGES));
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request, ASSETS));
  }
});

/*
 * Notifications push (cahier des charges, 10.2 et 10.3). Le message vient du serveur : titre, texte, page à
 * ouvrir et étiquette (la notification la plus récente d'un même sujet remplace l'ancienne).
 */
self.addEventListener('push', (event) => {
  let message;
  try {
    message = event.data ? event.data.json() : null;
  } catch {
    message = null;
  }
  if (!message || typeof message.title !== 'string') return;
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: typeof message.body === 'string' ? message.body : '',
      tag: typeof message.tag === 'string' ? message.tag : undefined,
      data: { url: typeof message.url === 'string' ? message.url : '/' },
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      lang: 'fr',
    }),
  );
});

/** Au clic : la page de la boutique concernée, dans un onglet déjà ouvert si possible. Jamais un autre site. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url ?? '/', self.location.origin);
  const url = target.origin === self.location.origin ? target.href : self.location.origin;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      return open ? open.navigate(url).then((w) => (w ?? open).focus()) : self.clients.openWindow(url);
    }),
  );
});
