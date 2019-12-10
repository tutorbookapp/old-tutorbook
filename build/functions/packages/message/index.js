const db = require('firebase-admin').firestore();
const getSupervisor = require('utils').getSupervisorForLocation;

class Message {
    constructor(params) {
        this.init(params).then(() => this.send());
    }

    async init(params) {
        if (!params.to && !params.from) throw new Error('Messages need users');
        if (!params.from) params.from = await getSupervisor(params.to.location);
        if (!params.to) params.to = await getSupervisor(params.from.location);
        if (!params.message || params.message === '') throw new Error(
            'Messages need valid content');
        Object.entries(params).forEach((entry) => this[entry[0]] = entry[1]);
    }

    async send() {
        return (await this.chat()).collection('messages').doc().set({
            sentBy: supervisor,
            timestamp: new Date(),
            message: message.text,
        });
    }

    async chat() {
        var chat;
        (await db
            .collection('chats')
            .where('chatterEmails', 'array-contains', params.to.email)
            .get()
        ).forEach((doc) => {
            if (doc.data().chatterEmails.indexOf(params.from.email) >= 0)
                chat = doc.ref
        });
        if (!chat) {
            chat = db.collection('chats').doc();
            chat.set({
                lastMessage: {
                    message: 'No messages so far. Click to send the first one.',
                    sentBy: params.from,
                    timestamp: new Date(),
                },
                chatters: [
                    params.to,
                    params.from,
                ],
                chatterEmails: [
                    params.to.email,
                    params.from.email,
                ],
                createdBy: params.from,
                name: '',
                photo: '',
            });
        }
        return chat;
    }
}

module.exports = Message;