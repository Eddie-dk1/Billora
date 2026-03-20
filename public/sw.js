self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || 'Billora Reminder';
  const options = {
    body: payload.body || 'You have a payment reminder.',
    data: {
      url: payload.url || '/reminders',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/reminders';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const windowClient of windows) {
        if ('focus' in windowClient) {
          windowClient.focus();
          if ('navigate' in windowClient) {
            return windowClient.navigate(targetUrl);
          }
          return undefined;
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
