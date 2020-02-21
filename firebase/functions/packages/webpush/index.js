const admin = require('firebase-admin'); // Initialized in ../index.js
const functions = require('firebase-functions');
const firestore = admin.firestore();
const partitions = {
    test: firestore.collection('partitions').doc('test'),
    default: firestore.collection('partitions').doc('default'),
};
const getSupervisor = require('utils').getSupervisorForLocation;
const Message = require('message');

class Webpush {

    constructor(options = {}) {
        this.recipient = options.recipient;
        this.sender = options.sender;
        this.title = options.title;
        this.body = options.body;
        const bool = (val, def) => typeof val === 'boolean' ? val : def;
        this.isTest = bool(options.isTest, false);
        this.botOnSuccess = bool(options.botOnSuccess, false);
        this.botOnFailure = bool(options.botOnFailure, true);
        this.botMessage = options.botMessage || 'Sent ' + this + ':\n' +
            this.body;
    }

    get valid() {
        if (this.recipient.location === 'Paly Peer Tutoring Center')
            return console.error('[ERROR] Cannot send webpush to Paly users.');
        if (!this.title || typeof this.title !== 'string')
            return console.error('[ERROR] Webpush must have a valid title.');
        if (!this.body || typeof this.body !== 'string')
            return console.error('[ERROR] Webpush must have a valid body.');
        if (functions.config().SKIP_WEBPUSH) return console.warn('[WARNING] ' +
            'Skipping webpush notification b/c the SKIP_WEBPUSH configuration' +
            ' variable is set.');
        return true;
    }

    async render() {
        if (!this.recipient.notificationToken) {
            console.log('[DEBUG] Fetching recipient (' + this.recipient.uid +
                ') again b/c original did not have a notification token.');
            this.recipient = (await (this.isTest ? partitions.test : partitions.default)
                .collection('users')
                .doc(this.recipient.uid)
                .get()
            ).data();
        }
        return {
            notification: {
                title: this.title,
                body: this.body,
            },
            webpush: {
                headers: {
                    'Urgency': 'high',
                },
                notification: {
                    title: this.title,
                    body: this.body,
                    requireInteraction: true,
                    icon: 'https://tutorbook.app/favicon/webpush-icon.png',
                    badge: 'https://tutorbook.app/favicon/webpush-badge.png',
                    actions: [{}],
                    data: this.data,
                },
            },
            token: this.recipient.notificationToken,
        };
    }

    async send() {
        if (!this.valid) return console.log('[DEBUG] Skipped invalid webpush.');
        const message = await this.render();
        try {
            await admin.messaging().send(message);
            console.log('[DEBUG] Sent ' + this + '.');
            if (this.botOnSuccess) return new Message({
                message: this.botMessage,
                to: [
                    this.recipient,
                    this.sender || await getSupervisor(this.recipient.location),
                ],
            }).send();
        } catch (err) {
            console.error('[ERROR] Could not send ' + this + ' b/c of', err);
            if (this.botOnFailure) return new Message({
                message: this.botMessage.replace('Sent', 'Could not send'),
                to: [
                    this.recipient,
                    this.sender || await getSupervisor(this.recipient.location),
                ],
            }).send();
        }
    }

    toString() {
        return 'webpush notification to ' + this.recipient.name;
    }
};


module.exports = Webpush;