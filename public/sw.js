const CACHE_NAME = 'brh-habitat-v7-images-fix-2026-05-08'
const STATIC_ASSETS = ['/', '/index.html']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // Ne jamais cacher les appels API Supabase / Edge Functions
  if (url.pathname.startsWith('/functions/') || url.hostname.includes('supabase.co')) return

  // Assets statiques (JS, CSS, images, fonts) : cache-first avec fallback reseau
  const isStaticAsset =
    url.pathname.match(/\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|webp|ico|gif)$/) ||
    url.pathname.startsWith('/assets/')

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // Pages HTML : network-first avec fallback cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/index.html')))
  )
})
