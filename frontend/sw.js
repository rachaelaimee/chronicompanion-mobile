// 🧹 CLEAN SERVICE WORKER - No conflicts, clean authentication
// Version: CLEAN-AUTH-v3000

const CACHE_NAME = 'chronicompanion-CLEAN-AUTH-v3000';
const urlsToCache = [
    '/',
    '/index.html',
    '/js/main.js',
    '/js/clean-auth.js',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker: Installing CLEAN-AUTH-v3000');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
            .then(() => {
                console.log('✅ Service Worker: Clean auth resources cached');
                self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker: Activating CLEAN-AUTH-v3000');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ Service Worker: Old caches cleaned up');
            self.clients.claim();
        })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            })
    );
});