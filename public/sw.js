/// <reference lib="webworker" />

const SW_VERSION = "1.0.0";

// Install — activate immediately
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Activate — claim all clients
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for messages from the main app
self.addEventListener("message", (event) => {
  const data = event.data;

  if (data && data.type === "TIMER_DONE") {
    const title = data.title || "Vespera";
    const body = data.body || "Süre doldu!";
    const tag = data.tag || "vespera-timer";

    // Show notification
    self.registration.showNotification(title, {
      body: body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: tag,
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      silent: false,
    });
  }
});

// When user clicks the notification, focus the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If the app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow("/");
    })
  );
});
