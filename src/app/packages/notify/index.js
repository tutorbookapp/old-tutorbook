// Class that manages notifications (settings, webpush, etc) client side.
class Notify {

    constructor() {
        try {
            firebase.messaging().usePublicVapidKey(
                "BIEVpGqO_n9HSS_sGWdfXoOUpv3dWwB5P2-zRkUBUZH" +
                "OzvAvJ09nUL68hc5XpTjKZxb74_5DJlSs4oRdnJj8R4w"
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
                if (payload.notification.body === 'Authenticated account.') {
                    return firebase.auth().currentUser.getIdToken(true);
                } else if (payload.notification.title.indexOf('Message') >= 0) {
                    if (window.app.nav.selected !== 'Messages') {
                        return window.app.snackbar.view(
                            payload.notification.title + ': ' +
                            payload.notification.body, 'view', () => {
                                window.app.chats.chat(
                                    payload.notification.data.id);
                            }, false);
                    } else {
                        return;
                    }
                }
                window.app.snackbar.view(payload.notification.body);
            });
        } catch (e) {
            console.error('Error while initializing Firebase messaging token to ' +
                'manage webpush notifications:', e);
        }
    }

    welcome() {
        new Notification('Welcome, ' + this.user.name, {
            body: "This is how we'll notify you of important window.app " +
                'activity.',
            icon: 'https://tutorbook-779d8.firebasewindow.app.com/favic' +
                'on/logo.svg',
            badge: 'https://tutorbook-779d8.firebasewindow.app.com/favic' +
                'on/notification-badge.svg',
        });
    }

    getPermission() {
        Notification.requestPermission().then((result) => {

            if (result === 'denied') { // Cannot ask again
                return;
            }
            if (result === 'default') { // Can ask again, but wasn't window.approved
                return;
            }

            firebase.messaging().getToken().then(function(token) { // Approved
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
        // Right now, tokens are stored in the currentUser's Firestore document
        window.app.user.notificationToken = token;
        window.app.updateUser().catch((err) => {
            console.error('Error while sending notificationToken ' +
                token + ' to Firestore Database:', err);
        });
    }
};

module.exports = Notify;