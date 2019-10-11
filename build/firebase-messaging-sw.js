// Import and configure the Firebase SDK
// These scripts are made available when the app is served or deployed on Firebase Hosting
// If you do not serve/host your project using Firebase Hosting see https://firebase.google.com/docs/web/setup
importScripts('/__/firebase/5.5.6/firebase-app.js');
importScripts('/__/firebase/5.5.6/firebase-messaging.js');
importScripts('/__/firebase/init.js');

const messaging = firebase.messaging();


self.addEventListener('notificationclick', function(e) {
    console.log('[firebase-messaging-sw.js] Click detected, opening website ', e);
    var notification = e.notification;
    var primaryKey = notification.data.primaryKey;
    var action = e.action;

    if (action === 'view_request') {
        // TODO: Actually show individual request (i.e. make our router
        // recognize certain query links.)
        console.log('[firebase-messaging-sw.js] Opening website ', action);
        clients.openWindow('https://tutorbook.me/app').then((windowClient) => {
            windowClient.focus();
        });
        notification.close();
    } else if (action === 'reject_request') {
        // TODO: Make this work
        clients.openWindow('https://tutorbook.me/app').then((windowClient) => {
            windowClient.focus();
        });
        notification.close();
    } else {
        clients.openWindow('https://tutorbook.me').then((windowClient) => {
            windowClient.focus();
        });
        notification.close();
    }
});


// If you would like to customize notifications that are received in the
// background (Web app is closed or not in browser focus) then you should
// implement this optional method.
// [START background_handler]
messaging.setBackgroundMessageHandler(function(payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    if (payload.notification.body === 'Authenticated account.') {
        return;
    }
    return self.registration.showNotification(payload);
});
// [END background_handler]