
// Service Worker for PWA support
const CACHE_NAME = 'streamwise-ai-chat-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/android/android-launchericon-72-72.png',
  '/android/android-launchericon-96-96.png',
  '/ios/128.png',
  '/android/android-launchericon-144-144.png',
  '/ios/152.png',
  '/android/android-launchericon-192-192.png',
  '/ios/256.png',
  '/android/android-launchericon-512-512.png'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isStaticAsset = urlsToCache.includes(url.pathname);

  // Handle navigation requests for SPA offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Serve static assets from cache
  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((response) => response || fetch(event.request))
    );
    return;
  }

  // For all other requests (e.g., JS/CSS), always fetch from network
  event.respondWith(fetch(event.request));
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheAllowlist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheAllowlist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Handle offline fallback
