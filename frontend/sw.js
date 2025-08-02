const CACHE_NAME = 'chronicompanion-v4-COMPLETE-REBUILD';
const urlsToCache = [
  '/',
  '/index.html',
  '/js/main.js',
  '/manifest.json'
  // Note: External CDNs removed due to CORS restrictions
];

// Install service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch requests
self.addEventListener('fetch', event => {
  // Skip caching external resources to avoid CORS issues
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        
        // Clone the request for fetch
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response for cache
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        }).catch(() => {
          // Return offline page if available
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
      }
    )
  );
});

// Background sync for journal entries
self.addEventListener('sync', event => {
  if (event.tag === 'journal-entry-sync') {
    event.waitUntil(syncJournalEntries());
  }
});

async function syncJournalEntries() {
  // Get entries from IndexedDB that need syncing
  const db = await openDB();
  const tx = db.transaction(['pending_entries'], 'readonly');
  const store = tx.objectStore('pending_entries');
  const entries = await store.getAll();
  
  for (const entry of entries) {
    try {
      const response = await fetch('/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(entry.data)
      });
      
      if (response.ok) {
        // Remove from pending entries
        const deleteTx = db.transaction(['pending_entries'], 'readwrite');
        const deleteStore = deleteTx.objectStore('pending_entries');
        await deleteStore.delete(entry.id);
      }
    } catch (error) {
      console.log('Sync failed for entry:', entry.id);
    }
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ChroniCompanionDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('pending_entries')) {
        db.createObjectStore('pending_entries', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
} 