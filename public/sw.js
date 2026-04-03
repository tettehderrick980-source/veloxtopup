/**
 * VeloxTopUp Service Worker
 * Provides offline support, caching, and background sync
 * @version 1.0.0
 */

const CACHE_NAME = 'veloxtopup-v2';
const STATIC_CACHE = 'veloxtopup-static-v1';
const DYNAMIC_CACHE = 'veloxtopup-dynamic-v1';
const IMAGE_CACHE = 'veloxtopup-images-v1';

// Precache essential static assets
const STATIC_ASSETS = [
  '/offline.html',
  '/manifest.json',
  '/Velox-Logo.png',
  '/icons/icon-72x72.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - precache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Error caching static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName.startsWith('veloxtopup-') && 
                     cacheName !== STATIC_CACHE && 
                     cacheName !== DYNAMIC_CACHE && 
                     cacheName !== IMAGE_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and non-http(s) protocols
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Strategy for API requests (network first, cache fallback)
  if (url.pathname.startsWith('/api/') || url.pathname.includes('supabase')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Strategy for images (cache first, network fallback)
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // Strategy for static assets (cache first, network fallback)
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Strategy for pages and HTML requests (stale-while-revalidate)
  // This caches index.html but updates in background for fresh content
  event.respondWith(staleWhileRevalidate(request));
});

/**
 * Network First Strategy
 * Try network first, fall back to cache if offline
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return offline fallback for API requests
    return new Response(
      JSON.stringify({ error: 'You are offline. Please check your connection.' }),
      { 
        status: 503, 
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Cache First Strategy
 * Serve from cache if available, otherwise fetch and cache
 */
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for:', request.url);
    // Return a fallback image if available
    if (request.destination === 'image') {
      return caches.match('/Velox-Logo.png');
    }
    throw error;
  }
}

/**
 * Stale While Revalidate Strategy
 * Serve from cache immediately, then update cache in background
 */
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  // If we have a cached response, return it immediately
  // and update cache in background
  if (cachedResponse) {
    // Update cache in background (don't await)
    fetch(request)
      .then(async (networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const responseToCache = networkResponse.clone();
          const cache = await caches.open(DYNAMIC_CACHE);
          await cache.put(request, responseToCache);
        }
      })
      .catch((error) => {
        console.log('[SW] Background fetch failed (using cache):', request.url);
      });
    
    return cachedResponse;
  }
  
  // No cache - must fetch from network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, responseToCache);
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Fetch failed, no cache available:', request.url, error);
    // Return offline page for HTML requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    // Return a simple error response for other requests
    return new Response('Offline - content not available', { status: 503 });
  }
}

/**
 * Check if request is for a static asset
 */
function isStaticAsset(request) {
  const staticExtensions = [
    '.js', '.css', '.json', '.woff', '.woff2', 
    '.ttf', '.eot', '.otf', '.svg'
  ];
  const url = new URL(request.url);
  return staticExtensions.some((ext) => url.pathname.endsWith(ext));
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data === 'clearCache') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  }
});

async function syncOrders() {
  // Implement order syncing when back online
  console.log('[SW] Syncing pending orders...');
}

// Push notifications (future implementation)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: data.tag || 'default',
      requireInteraction: true,
      actions: data.actions || []
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});
