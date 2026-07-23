// DOSIA Service Worker for PWA Installation and shortcut creation
const CACHE_NAME = 'dosia-app-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Allow network fetch
});
