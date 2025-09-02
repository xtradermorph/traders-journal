// Service Worker for Trader's Journal App
// Handles push notifications, offline functionality, and caching

const CACHE_NAME = 'traders-journal-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Files to cache for offline use
const STATIC_FILES = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/notification-icon.png',
  '/icons/badge-icon.png'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Static files cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Failed to cache static files:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip non-HTTP requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Handle different types of requests
  if (request.destination === 'document') {
    // Handle page requests
    event.respondWith(handlePageRequest(request));
  } else if (request.destination === 'image') {
    // Handle image requests
    event.respondWith(handleImageRequest(request));
  } else {
    // Handle other requests
    event.respondWith(handleOtherRequest(request));
  }
});

// Handle page requests
async function handlePageRequest(request) {
  try {
    // Try to fetch from network first
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('Page request failed, trying cache:', request.url);
    
    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If not in cache, show offline page
    return caches.match('/offline');
  }
}

// Handle image requests
async function handleImageRequest(request) {
  try {
    // Try to fetch from network first
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('Image request failed, trying cache:', request.url);
    
    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return a placeholder image if not available
    return new Response('Image not available', {
      status: 404,
      statusText: 'Not Found'
    });
  }
}

// Handle other requests
async function handleOtherRequest(request) {
  try {
    // Try to fetch from network first
    const response = await fetch(request);
    
    // Cache successful responses for static assets
    if (response.status === 200 && isStaticAsset(request.url)) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('Request failed, trying cache:', request.url);
    
    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return error response
    return new Response('Resource not available offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Check if URL is a static asset
function isStaticAsset(url) {
  const staticExtensions = ['.css', '.js', '.woff', '.woff2', '.ttf', '.eot'];
  return staticExtensions.some(ext => url.includes(ext));
}

// Push notification event
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body || 'New notification from Trader\'s Journal',
        icon: data.icon || '/icons/notification-icon.png',
        badge: data.badge || '/icons/badge-icon.png',
        image: data.image,
        tag: data.tag || 'default',
        data: data.data || {},
        actions: data.actions || [],
        requireInteraction: data.requireInteraction || false,
        silent: data.silent || false,
        vibrate: [200, 100, 200],
        timestamp: Date.now()
      };

      event.waitUntil(
        self.registration.showNotification(data.title || 'Trader\'s Journal', options)
      );
    } catch (error) {
      console.error('Failed to parse push data:', error);
      
      // Fallback notification
      const options = {
        body: 'New notification from Trader\'s Journal',
        icon: '/icons/notification-icon.png',
        badge: '/icons/badge-icon.png',
        tag: 'fallback'
      };

      event.waitUntil(
        self.registration.showNotification('Trader\'s Journal', options)
      );
    }
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action) {
    handleNotificationAction(event.action, event.notification.data);
  } else {
    // Default action - open the app
    handleNotificationAction('open-app', event.notification.data);
  }
});

// Handle notification actions
function handleNotificationAction(action, data) {
  switch (action) {
    case 'open-app':
      openApp();
      break;
    case 'view-trade':
      openTrade(data.tradeId);
      break;
    case 'accept':
      handleFriendRequest(data.userId, 'accept');
      break;
    case 'decline':
      handleFriendRequest(data.userId, 'decline');
      break;
    default:
      openApp();
  }
}

// Open the main app
function openApp() {
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
}

// Open specific trade
function openTrade(tradeId) {
  if (tradeId) {
    event.waitUntil(
      clients.openWindow(`/trades/${tradeId}`)
    );
  } else {
    openApp();
  }
}

// Handle friend request actions
function handleFriendRequest(userId, action) {
  // This would typically make an API call to handle the friend request
  // For now, we'll just open the app
  console.log(`Friend request ${action} for user:`, userId);
  openApp();
}

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event);
  
  if (event.tag === 'offline-sync') {
    event.waitUntil(syncOfflineData());
  }
});

// Sync offline data
async function syncOfflineData() {
  try {
    console.log('Starting offline data sync...');
    
    // Get all clients
    const clients = await self.clients.matchAll();
    
    // Notify clients about sync
    clients.forEach(client => {
      client.postMessage({
        type: 'OFFLINE_SYNC_START',
        timestamp: Date.now()
      });
    });
    
    // Simulate sync process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Notify clients about sync completion
    clients.forEach(client => {
      client.postMessage({
        type: 'OFFLINE_SYNC_COMPLETE',
        timestamp: Date.now()
      });
    });
    
    console.log('Offline data sync completed');
  } catch (error) {
    console.error('Offline data sync failed:', error);
    
    // Notify clients about sync failure
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'OFFLINE_SYNC_FAILED',
        error: error.message,
        timestamp: Date.now()
      });
    });
  }
}

// Message event - handle communication with main app
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
    case 'CLEAR_CACHE':
      clearAllCaches();
      break;
    default:
      console.log('Unknown message type:', event.data.type);
  }
});

// Clear all caches
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('All caches cleared');
  } catch (error) {
    console.error('Failed to clear caches:', error);
  }
}

// Error event
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error);
});

// Unhandled rejection event
self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker unhandled rejection:', event.reason);
});

console.log('Service Worker loaded successfully');