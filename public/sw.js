self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || 'Beam notification';
  const options = {
    body: payload.body || '',
    data: { url: payload.url || '/' },
    icon: '/images/beamlogo.png',
    badge: '/images/beamlogo.png',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
