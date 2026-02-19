importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
firebase.initializeApp({
    apiKey: "AIzaSyBkIA1iDoDhLmyp9bIDKl4MHLrRX-CDgh4",
    authDomain: "dhermicaestetica.firebaseapp.com",
    projectId: "dhermicaestetica",
    storageBucket: "dhermicaestetica.appspot.com",
    messagingSenderId: "558318533556",
    appId: "1:558318533556:web:a64046d01548fafef990e1",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    // Standard notification payloads are handled by the browser automatically.
    // Redirection link is handled by the browser directly (fcm_options.link)
    // or via the 'notificationclick' event if the browser relies on Service Worker.
});

self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification clicked:', event.notification);
    event.notification.close();

    // Deep search for URL in various possible FCM payload locations
    const nData = event.notification.data || {};
    const targetUrl =
        nData.url ||
        (nData.FCM_MSG && nData.FCM_MSG.data && nData.FCM_MSG.data.url) ||
        (nData.notification && nData.notification.data && nData.notification.data.url) ||
        '/';

    console.log('[firebase-messaging-sw.js] Target URL identified:', targetUrl);

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Priority 1: Focus an existing window that is already open on the app area
            for (const client of windowClients) {
                // If the app is already open in a tab, navigate and focus it
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.navigate(targetUrl).then(c => c.focus());
                }
            }
            // Priority 2: If no window is open, open a new one with the target URL
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
