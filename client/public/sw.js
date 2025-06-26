// Service Worker for Push Notifications
self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  
  const options = {
    body: data.message,
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: data.tag || 'notification',
    data: data.data || {},
    actions: [
      {
        action: 'view',
        title: 'Anzeigen'
      },
      {
        action: 'dismiss',
        title: 'Schließen'
      }
    ],
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    // Open the app and navigate to the relevant content
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});

self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed');
});