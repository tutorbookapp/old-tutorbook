importScripts('/__/firebase/7.11.0/firebase-app.js');
importScripts('/__/firebase/7.11.0/firebase-messaging.js');
importScripts('/__/firebase/init.js');

const messaging = firebase.messaging();

self.addEventListener('notificationclick', function(event) {
    console.log('[DEBUG] Notification clicked, opening Tutorbook...');
    clients.openWindow('https://tutorbook.app').then((windowClient) => {
        windowClient.focus();
    });
    event.notification.close();
});

messaging.setBackgroundMessageHandler(function(payload) {
    console.log('[DEBUG] Received notification, displaying...', payload);
    //if (payload.notification.body === 'Authenticated account') return;
    //return self.registration.showNotification(payload.notification.title);
});