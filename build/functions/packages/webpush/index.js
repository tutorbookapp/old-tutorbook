const admin = require('firebase-admin'); // Initialized in ../index.js
const db = admin.firestore().collection('partitions').doc('default');

class Webpush {

    constructor(id, title, body, data) {
        if (this.valid(title, body)) db.collection('users')
            .doc(id).get().then((userRef) => {
                const token = userRef.data().notificationToken;
                this.id = id;
                this.message = {
                    notification: {
                        title: title,
                        body: body,
                    },
                    webpush: {
                        headers: {
                            'Urgency': 'high',
                        },
                        notification: {
                            title: title,
                            body: body,
                            requireInteraction: true,
                            icon: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                                'on/logo.svg',
                            image: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                                'on/logo.svg',
                            badge: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                                'on/notification-badge.svg',
                            actions: [{}],
                            data: data || {},
                        },
                    },
                    token: token,
                };
                this.send();
            });
    }

    valid(title, body) {
        if (!title || title === '' || typeof title !== 'string')
            return console.error('[ERROR] Webpush must have a valid title.');
        if (!body || body === '' || typeof body !== 'string')
            return console.error('[ERROR] Webpush must have a valid body.');
        return true;
    }

    send() {
        return admin.messaging().send(this.message).then((res) => {
            console.log('Sent (' + this.id + ') webpush notification:', res);
        }).catch((err) => {
            console.error('Error while sending (' + this.id +
                ') webpush notification:', err);
        });
    }
};


module.exports = Webpush;