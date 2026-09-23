/**
 * Tourist Management System - Progressive Web App Service Worker
 * Version: 1.0.0
 * Provides robust offline support, intelligent caching, and network resilience.
 */

const CACHE_VERSION = 'tourmanager-v2';
const PRECACHE_NAME = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE_NAME = `${CACHE_VERSION}-runtime`;
const API_CACHE_NAME = `${CACHE_VERSION}-api`;

// Critical app shell assets to precache during service worker installation
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/static/style.css',
  '/static/app.js',
  '/manifest.json',
  '/favicon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/screenshot-desktop.png',
  '/screenshot-mobile.png'
];

// Installation: Precache application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE_NAME)
      .then((cache) => {
        return Promise.allSettled(
          PRECACHE_ASSETS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn(`[PWA SW] Precache warning for ${url}:`, err);
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activation: Clean up old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  const currentCaches = [PRECACHE_NAME, RUNTIME_CACHE_NAME, API_CACHE_NAME];
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!currentCaches.includes(cacheName)) {
              console.log('[PWA SW] Removing obsolete cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: Multi-tier caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests (e.g. POST, PUT, DELETE for transactions)
  if (request.method !== 'GET') {
    return;
  }

  // Strategy 1: HTML Navigation requests (App Shell) -> Network First with Cache Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(PRECACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Fallback to cached app shell
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallbackShell = await caches.match('/static/index.html') || await caches.match('/');
          return fallbackShell || new Response(
            `<!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>TourManager | Offline</title>
              <style>
                body { font-family: system-ui, sans-serif; text-align: center; padding: 3rem 1.5rem; background: #f8fafc; color: #1e293b; }
                .card { max-width: 480px; margin: 0 auto; background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
                h1 { color: #0f766e; margin-bottom: 0.5rem; }
                p { color: #64748b; line-height: 1.6; }
                button { background: #0f766e; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; margin-top: 1rem; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>🧭 TourManager</h1>
                <h2>You're Currently Offline</h2>
                <p>Please check your internet connection. Saved destinations and app views will be restored automatically once connection returns.</p>
                <button onclick="window.location.reload()">Retry Connection</button>
              </div>
            </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // Strategy 2: Read-Only API Endpoints (/packages, /destinations) -> Network First with Cache Fallback
  if (url.pathname.startsWith('/packages') || url.pathname.startsWith('/destinations')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(API_CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) {
            console.log('[PWA SW] Serving cached API data for:', request.url);
            return cached;
          }
          return new Response(JSON.stringify({ offline: true, error: "Network unavailable." }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // Strategy 3: Static Assets & External Fonts/Icons/CDNs -> Stale-While-Revalidate
  const isStaticAsset = (
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2') ||
    url.hostname.includes('cdnjs.cloudflare.com') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('images.unsplash.com')
  );

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              const clone = networkResponse.clone();
              caches.open(RUNTIME_CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default: Network with Cache Fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return cachedResponse || fetch(request).catch(() => {
        return new Response('', { status: 408, statusText: 'Request timed out' });
      });
    })
  );
});

// Communication event
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
