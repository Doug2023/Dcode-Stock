const CACHE_NAME = 'dcode-stock-v2';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './Dcodelogo.png',
  './Dcodeanimation.mp4'
];

// Instala e adiciona ao cache
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(FILES_TO_CACHE);
      })
      .catch(err => console.error('Service Worker: Cache failed', err))
  );
  self.skipWaiting();
});

// Ativa e limpa caches antigos
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('Service Worker: Removing old cache', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// Estratégia de cache: Cache First com fallback para network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
          .then(fetchResponse => {
            // Clone the response before caching
            const responseClone = fetchResponse.clone();
            
            // Cache new responses (only for GET requests)
            if (event.request.method === 'GET') {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
              });
            }
            
            return fetchResponse;
          });
      })
      .catch(() => {
        // Return offline fallback if available
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      })
  );
});

