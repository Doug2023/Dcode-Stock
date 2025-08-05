const CACHE_NAME = 'dcode-stock-v3';
const STATIC_CACHE = 'dcode-stock-static-v3';
const DYNAMIC_CACHE = 'dcode-stock-dynamic-v3';

const FILES_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './payment.js',
  './manifest.json',
  './Dcodelogo.png',
  './Dcodeanimation.mp4'
];

// URLs que devem sempre buscar da rede primeiro
const NETWORK_FIRST_URLS = [
  '/api/',
  '/payment/'
];

// URLs que podem usar cache stale-while-revalidate
const STALE_WHILE_REVALIDATE_URLS = [
  '.css',
  '.js',
  '.png',
  '.jpg',
  '.jpeg',
  '.svg',
  '.gif',
  '.mp4',
  '.webp'
];

// Instala e adiciona ao cache
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(FILES_TO_CACHE);
      }),
      caches.open(DYNAMIC_CACHE).then(cache => {
        console.log('Service Worker: Dynamic cache initialized');
        return cache;
      })
    ]).catch(err => console.error('Service Worker: Cache failed', err))
  );
  self.skipWaiting();
});

// Ativa e limpa caches antigos
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    Promise.all([
      // Limpar caches antigos
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(key => !key.includes('dcode-stock-static-v3') && !key.includes('dcode-stock-dynamic-v3'))
            .map(key => {
              console.log('Service Worker: Removing old cache', key);
              return caches.delete(key);
            })
        )
      ),
      // Limitar tamanho do cache dinâmico
      limitCacheSize(DYNAMIC_CACHE, 50)
    ])
  );
  self.clients.claim();
});

// Função para limitar o tamanho do cache
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    const keysToDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
    console.log(`Service Worker: Cache ${cacheName} limited to ${maxItems} items`);
  }
}

// Estratégias de cache avançadas
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorar requisições não-HTTP
  if (!request.url.startsWith('http')) return;
  
  // Estratégia Network First para APIs críticas
  if (NETWORK_FIRST_URLS.some(pattern => request.url.includes(pattern))) {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // Estratégia Stale While Revalidate para recursos estáticos
  if (STALE_WHILE_REVALIDATE_URLS.some(ext => request.url.includes(ext))) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  
  // Estratégia Cache First para arquivos estáticos principais
  if (FILES_TO_CACHE.some(file => request.url.endsWith(file))) {
    event.respondWith(cacheFirst(request));
    return;
  }
  
  // Estratégia padrão: Cache First com fallback
  event.respondWith(cacheFirstWithFallback(request));
});

// Cache First - prioriza cache
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    console.log('Cache First failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

// Network First - prioriza rede
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Offline', { status: 503 });
  }
}

// Stale While Revalidate - retorna cache e atualiza em background
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then(response => {
    const cache = caches.open(DYNAMIC_CACHE);
    cache.then(c => c.put(request, response.clone()));
    return response;
  }).catch(() => cachedResponse);
  
  return cachedResponse || fetchPromise;
}

// Cache First com fallback melhorado
async function cacheFirstWithFallback(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    // Cache apenas respostas GET bem-sucedidas
    if (request.method === 'GET' && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      
      // Limitar cache dinâmico
      limitCacheSize(DYNAMIC_CACHE, 50);
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback para documento principal
    if (request.destination === 'document') {
      const fallback = await caches.match('./index.html');
      if (fallback) return fallback;
    }
    
    // Fallback genérico
    return new Response('Conteúdo não disponível offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

