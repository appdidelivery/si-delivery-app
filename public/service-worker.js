// service-worker.js
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalado.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Ativado.');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          // Limpa caches antigos, se houver
          if (cache !== 'your-app-cache-v1') { // Mude 'your-app-cache-v1' se você adicionar caching real
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Por enquanto, apenas deixa o navegador buscar tudo normalmente.
  // Em um PWA completo, você adicionaria lógica de caching aqui.
  event.respondWith(fetch(event.request));
});