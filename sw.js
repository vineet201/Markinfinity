// Log the service worker initialization
console.log('[SW] Service Worker initializing');

// Force the base path
const BASE_PATH = '/weather/';
console.log('[SW] Base path:', BASE_PATH);

// Cache static assets
const CACHE_NAME = 'weather-app-v2.0.4';
const urlsToCache = [
  '/weather/',
  '/weather/index.html',
  '/weather/styles.css',
  '/weather/main.js',
  '/weather/manifest.json',
  '/weather/icon-192x192.png',
  '/weather/icon-512x512.png',
  '/weather/badge-96x96.png',
  '/weather/sw.js'
];

console.log('[SW] URLs to cache:', urlsToCache);

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] Service Worker installed');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Install error:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Removing old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] Service Worker activated');
    })
  );
});

// Fetch event - serve from cache
self.addEventListener('fetch', (event) => {
  // Log the fetch request
  console.log('[SW] Fetch:', event.request.url);
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          console.log('[SW] Serving from cache:', event.request.url);
          return response;
        }
        console.log('[SW] Fetching:', event.request.url);
        return fetch(event.request);
      })
      .catch(error => {
        console.error('[SW] Fetch error:', error);
        throw error;
      })
  );
});

// Import Firebase scripts
try {
  importScripts(
    'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
    'https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js'
  );
  console.log('[SW] Firebase scripts imported successfully');
} catch (error) {
  console.error('[SW] Error importing Firebase scripts:', error);
}

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyD2rYBmr5fu2HEkZJ-6OKUx6XQUcs9Ppg0",
  authDomain: "weather-notify-8bf63.firebaseapp.com",
  projectId: "weather-notify-8bf63",
  storageBucket: "weather-notify-8bf63.appspot.com",
  messagingSenderId: "541861104637",
  appId: "1:541861104637:web:f6307953860e1eaff96794",
  measurementId: "G-B9KXD8XYS6"
};

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();
  console.log('[SW] Firebase initialized successfully');

  // Handle background messages
  messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Received background message:', payload);

    const notificationTitle = payload.notification.title || 'Weather Alert';
    const notificationOptions = {
      body: payload.notification.body,
      icon: '/weather/icon-192x192.png',
      badge: '/weather/badge-96x96.png',
      vibrate: [200, 100, 200],
      tag: 'weather-notification',
      renotify: true,
      requireInteraction: true,
      actions: [
        { action: 'open', title: 'Open App' }
      ],
      data: payload.data
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (error) {
  console.error('[SW] Error initializing Firebase:', error);
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  event.notification.close();

  // Focus or open the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        if (clientList.length > 0) {
          clientList[0].focus();
        } else {
          clients.openWindow(BASE_PATH);
        }
      })
  );
});
