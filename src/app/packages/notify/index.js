// Class that manages notifications (settings, webpush, etc) client side.
class Notify {

    constructor() {
        try {
            firebase.messaging().usePublicVapidKey(
                'BIEVpGqO_n9HSS_sGWdfXoOUpv3dWwB5P2-zRkUBUZH' +
                'OzvAvJ09nUL68hc5XpTjKZxb74_5DJlSs4oRdnJj8R4w'
            );
            const messaging = firebase.messaging();

            messaging.getToken().then((token) => {
                if (token) {
                    window.app.notificationsEnabled = true;
                    window.app.user.cards.setupNotifications = false;
                    window.app.updateUser();
                    this.updateToken(token);
                } else {
                    window.app.notificationsEnabled = false;
                    window.app.user.cards.setupNotifications = true;
                    window.app.updateUser();
                }
            }).catch((err) => {
                console.error('Error while retrieving token:', err);
            });

            messaging.onTokenRefresh(() => {
                messaging.getToken().then((token) => {
                    this.updateToken(token);
                }).catch((err) => {
                    console.error('Unable to retrieve refreshed token ', err);
                });
            });

            messaging.onMessage((payload) => {
                if (payload.notification.body === 'Authenticated account.')
                    return firebase.auth().currentUser.getIdToken(true);
                if (payload.notification.title.indexOf('Message from ') === 0)
                    return window.app.snackbar.view(payload.notification.title
                        .replace('Message from ', '') + ' says: ' + payload
                        .notification.body);
                window.app.snackbar.view(payload.notification.body);
            });
        } catch (e) {
            console.error('Error while initializing Firebase messaging token ' +
                'to manage webpush notifications:', e);
        }
    }

    welcome() {
        new Notification('Welcome, ' + window.app.user.name, {
            body: 'This is how we\'ll notify you of important app activity.',
            icon: 'https://tutorbook.app/favicon/webpush-icon.png',
            badge: 'https://tutorbook.app/favicon/webpush-badge.png',
        });
    }

    getPermission() {
        Notification.requestPermission().then(result => {

            if (result === 'denied') return;
            if (result === 'default') return;

            firebase.messaging().getToken().then((token) => { // Approved
                window.app.user.cards.setupNotifications = false;
                window.app.updateUser();
                this.updateToken(token);
                this.welcome();
            });

        }).catch(function(err) {
            console.error('Error while getting webpush notification permission:',
                err);
        });
    }

    updateToken(token) {
        window.app.user.notificationToken = token;
        window.app.updateUser().catch((err) => {
            console.error('Error while sending notificationToken ' +
                token + ' to Firestore Database:', err);
        });
    }
};

module.exports = Notify;