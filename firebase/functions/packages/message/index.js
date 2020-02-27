const admin = require('firebase-admin');
const firestore = admin.firestore();
const partitions = {
    test: firestore.collection('partitions').doc('test'),
    default: firestore.collection('partitions').doc('default'),
};
const getSupervisor = require('utils').getSupervisorForLocation;

// Creates and sends an in-app message from a given sender to a given recipient.
// Usage:
// await new Message({
//   to: [User, User], // Default recipient is the supervisor of the sender.
//   from: [User], // Default sender is the Operator bot.
//   message: 'Hello, world!',
//   // Below are optional parameters
//   sms: 'Nicholas says: Hello, world!', // Already sent SMS notification 
//   // message (stored in Firestore database and used to route incoming SMS). 
//   timestamp: new Date(), // Initialize the Date() asap.
// }).send();
class Message {
    constructor(params) {
        this.params = params;
        this.initialization = this.init();
    }

    async init() {
        const params = this.params;
        if (typeof params.isTest !== 'boolean') params.isTest === false;
        if (!params.to && !params.from) throw new Error('Message needs users.');
        if (!params.to) params.to = [await getSupervisor(params.from.location)];
        if (!(params.to instanceof Array)) params.to = [params.to];
        if (!params.from) params.from = [{
            name: 'Operator',
            uid: 'operator',
            id: 'operator',
            email: 'help@tutorbook.app',
            location: params.to[0].location || params.to[0].uid ?
                (await (params.isTest ? partitions.test : partitions.default)
                    .collection('users')
                    .doc(params.to[0].uid)
                    .get()).data().location : 'Any',
            photo: 'https://tutorbook.app/app/img/bot.png',
        }];
        if (!(params.from instanceof Array)) params.from = [params.from];
        if (!params.message) throw new Error('Message needs valid content.');
        if (!params.sms) params.sms = params.from[0].name.split(' ')[0] +
            ' says: ' + params.message;
        if (!params.chats) params.chats = ['default'];
        Object.entries(params).forEach((entry) => this[entry[0]] = entry[1]);
    }

    async send() {
        await this.initialization;
        console.log('[DEBUG] Sending message (' + this.message + ') from ' +
            this.from.map(u => u.name).join(', ') + ' to ' +
            this.to.map(u => u.name).join(', ') + '...');
        this.msg = {
            sentBy: this.from[0],
            timestamp: this.timestamp || new Date(),
            message: this.message,
            sms: this.sms,
        };
        await this.updateChats();
        await Promise.all(this.chats.map(chat => chat.collection('messages')
            .doc().set(this.msg)));
        console.log('[DEBUG] Sent message (' + this.message + ') from ' +
            this.from.map(u => u.name).join(', ') + ' to ' +
            this.to.map(u => u.name).join(', ') + '.');
    }

    async updateChats() {
        await Promise.all(this.chats.map(async chat => {
            if (chat !== 'default') return chat.update({
                lastMessage: this.msg,
            });
            (await (this.isTest ? partitions.test : partitions.default)
                .collection('chats')
                .where('chatterUIDs', 'array-contains', this.to[0].uid)
                .orderBy('lastMessage.timestamp', 'asc')
                .get()
            ).forEach(doc => {
                const d = doc.data();
                for (var i = 0; i < this.to.length; i++) {
                    if (this.to[i].uid !== 'operator' && d.chatterUIDs.indexOf(
                            this.to[i].uid) < 0) return;
                }
                for (var i = 0; i < this.from.length; i++) {
                    if (this.from[i].uid !== 'operator' && d.chatterUIDs.indexOf(
                            this.from[i].uid) < 0) return;
                }
                chat = doc.ref; // Uses the most recent chat if multiple exist.
            });
            if (!chat) {
                chat = (this.isTest ? partitions.test : partitions.default)
                    .collection('chats').doc();
                await chat.set({
                    lastMessage: this.msg,
                    chatters: this.to.concat(this.from)
                        .filter(u => u.uid !== 'operator'),
                    chatterEmails: this.to.concat(this.from)
                        .filter(u => u.uid !== 'operator')
                        .map(u => u.email),
                    chatterUIDs: this.to.concat(this.from)
                        .filter(u => u.uid !== 'operator')
                        .map(u => u.uid),
                    createdBy: this.from[0],
                    name: '',
                    photo: '',
                });
            } else {
                await chat.update({
                    lastMessage: this.msg,
                });
            }
            this.chats[this.chats.findIndex(c => c === 'default')] = chat;
        }));
    }
}

module.exports = Message;