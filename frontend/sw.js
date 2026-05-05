/* ============================================================
   EcoVecinos — Service Worker (CORREGIDO)
============================================================ */

const CACHE_NAME = 'ecovecinos-v5'; // Subimos a v2 para forzar limpieza

const ARCHIVOS_CACHE = [
  './',
  'login.html',
  'dashboard.html',
  'css/estilos.css',
  'css/estilos_dashboard.css',
  'js/app.js',
  'images/logo.png',
  'images/icon-192_v2.png',
  'images/icon-512_v2.png'
];

/* ── Instalación ── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Guardando archivos en caché');
      // Usamos map para capturar qué archivo falla si uno da error 404
      return cache.addAll(ARCHIVOS_CACHE);
    })
  );
  self.skipWaiting();
});

/* ── Activación ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  return self.clients.claim();
});

/* ── Fetch (Corregido: Sin eventos anidados) ── */
self.addEventListener('fetch', e => {
  // 1. Las llamadas a la API siempre van a la red
  if (e.request.url.includes('/backend/api.php')) {
    return; // Dejamos que el navegador maneje la petición normal
  }

  // 2. Estrategia: Primero caché, si no, red
  e.respondWith(
    caches.match(e.request).then(response => {
      if (response) {
        return response; // Si está en caché, lo devolvemos
      }
      
      // Si no está en caché, vamos a la red
      return fetch(e.request).then(networkResponse => {
        // Guardamos una copia para la próxima vez
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      });
    }).catch(() => {
      // Si falla todo (offline y sin caché), mostrar login si es una navegación
      if (e.request.mode === 'navigate') {
        return caches.match('./login.html');
      }
    })
  );
});
