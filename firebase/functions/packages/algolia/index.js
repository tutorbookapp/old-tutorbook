const functions = require('firebase-functions');
const client = require('algoliasearch')(
    functions.config().algolia.id,
    functions.config().algolia.key
);

class Algolia {
    static update(change, context, indexID, settings) {
        const index = client.initIndex(indexID);
        if (!change.after.exists) return index.deleteObject(context.params.id);
        const object = change.after.data();
        object.objectID = context.params.id;
        object.ref = change.after.ref.path;
        object.partition = context.params.partition;
        if (!settings) settings = {};
        if (!settings.attributesForFaceting)
            settings.attributesForFaceting = [];
        settings.attributesForFaceting.push('filterOnly(partition)');
        index.setSettings(settings);
        return index.saveObject(object);
    }

    static user(change, context) {
        Algolia.update(change, context, 'users', {
            attributesForFaceting: [
                'filterOnly(payments.type)',
                'filterOnly(location)',
            ],
        });
    }

    static appt(change, context) {
        Algolia.update(change, context, 'appts', {
            attributesForFaceting: [
                'filterOnly(location.id)',
            ],
        });
    }

    static activeAppt(change, context) {
        Algolia.update(change, context, 'activeAppts');
    }

    static pastAppt(change, context) {
        Algolia.update(change, context, 'pastAppts');
    }

    static chat(change, context) {
        Algolia.update(change, context, 'chats');
    }
};

module.exports = Algolia;