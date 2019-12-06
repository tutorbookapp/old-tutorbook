const functions = require('firebase-functions');
const client = require('algoliasearch')(
    functions.config().algolia.id,
    functions.config().algolia.key
);

class Algolia {
    update(change, context, indexID) {
        const index = client.initIndex(indexID);
        if (!change.after.exists) return index.deleteObject(context.params.id);
        const object = change.after.data();
        object.objectID = context.params.id;
        object.ref = change.after.ref.path;
        return index.saveObject(object);
    }

    user(change, context) {
        this.update(change, context, 'users');
        client.initIndex('users').setSettings({
            attributesForFaceting: ['filterOnly(payments.type)'],
        });
    }

    appt(change, context) {
        this.update(change, context, 'appts');
    }

    activeAppt(change, context) {
        this.update(change, context, 'activeAppts');
    }

    pastAppt(change, context) {
        this.update(change, context, 'pastAppts');
    }

    chat(change, context) {
        this.update(change, context, 'chats');
    }
};

module.exports = Algolia;