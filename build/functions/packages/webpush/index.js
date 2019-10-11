const admin = require('firebase-admin'); // Initialized in ../index.js


class Webpush {

    constructor(id, title, body, actions) {
        if (!title || title === '' || typeof title !== 'string') {
            throw new Error('Webpush must have a valid title.');
        } else if (!body || body === '' || typeof body !== 'string') {
            throw new Error('Webpush must have a valid body.');
        }
        admin.firestore().collection('users') // Constructor can't be async
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
                            actions: [actions || {}],
                        },
                    },
                    token: token,
                };
                this.send();
            });
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