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

const DISTRICT_FIELDS = [
    'name',
    'symbol',
    'domains',
];

const ARRAY_FIELDS = [
    'domains',
];

/**
 * Creates a new district Firestore document based on command line input.
 * @param {Object} [district={}] - The pre-selected or pre-filled options (i.e. 
 * you can pre-fill options in this script such that you don't have to type them
 * into the terminal `readline` prompt).
 * @param {string} [partition='default'] - The database partition to create the
 * district configuration document in.
 * @return {Promise<undefined>} Promise that resolves when the district Firestore
 * document has been successfully created.
 */
const create = async (district = {}, partition = 'default') => {
    DISTRICT_FIELDS.forEach(field => {
        if (district[field]) return;
        district[field] = readline.question('What is the district\'s ' + field +
            '? ');
        if (ARRAY_FIELDS.indexOf(field) < 0) return;
        district[field] = district[field].split(', ');
    });
    const ref = partitions[partition].collection('access').doc();
    district.created = district.updated = new Date();
    await ref.set(district);
    console.log('[INFO] Created district/access configuration (' + ref.id +
        ') in ' + partition + ' database partition.');
};

create();