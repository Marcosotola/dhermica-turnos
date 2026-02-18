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
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon.svg'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
