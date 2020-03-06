const readline = require('readline-sync');
const admin = require('firebase-admin');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});

const firestore = admin.firestore();
const partitions = {
    test: firestore.collection('partitions').doc('test'),
    default: firestore.collection('partitions').doc('default'),
};

const LOCATION_FIELDS = [
    'name',
    'description',
    'hours',
    'supervisors',
    'config',
    'access',
];

const ARRAY_FIELDS = [
    'supervisors',
    'access',
];

const PREFILLED_FIELDS = [
    'hours',
    'config',
];

/**
 * Creates a new location Firestore document based on command line input.
 * @param {Object} [location={}] - The pre-selected or pre-filled options (i.e. 
 * you can pre-fill options in this script such that you don't have to type them
 * into the terminal `readline` prompt).
 * @param {string} [partition='default'] - The database partition to create the
 * location document in.
 * @return {Promise<undefined>} Promise that resolves when the location Firestore
 * document has been successfully created.
 */
const create = async (location = {}, partition = 'default') => {
    PREFILLED_FIELDS.forEach(field => {
        if (!location[field]) return console.error('[ERROR] You must pre-fill' +
            ' the location\'s ' + field + ' before running this script.');
    });
    LOCATION_FIELDS.forEach(field => {
        if (location[field] || PREFILLED_FIELDS.indexOf(field) >= 0) return;
        location[field] = readline.question('What is the location\'s ' + field +
            '? ');
        if (ARRAY_FIELDS.indexOf(field) < 0) return;
        location[field] = location[field].split(', ');
    });
    const ref = partitions[partition].collection('locations').doc();
    location.created = location.updated = new Date();
    await ref.set(location);
    console.log('[INFO] Created location (' + ref.id + ') in ' + partition +
        ' database partition.');
};

create({
    hours: {
        Monday: [{
            open: '2:45 PM',
            close: '3:45 PM',
        }],
    },
    config: {
        hrs: {
            rounding: 'Normally',
            threshold: '15 Minutes',
            timeThreshold: '5 Minutes',
        },
    },
});