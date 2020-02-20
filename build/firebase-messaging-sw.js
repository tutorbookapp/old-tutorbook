importScripts('/__/firebase/5.5.6/firebase-app.js');
importScripts('/__/firebase/5.5.6/firebase-messaging.js');
importScripts('/init.js');

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