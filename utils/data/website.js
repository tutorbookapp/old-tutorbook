/**
 * Command line script to create a new website configuration Firestore document.
 * @todo Also create a new Firebase Hosting site, Git `*-app` branch, and add
 * the site's subdomain to `tutorbook.app`'s Netlify DNS.
 */

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

const WEBSITE_FIELDS = [
    'url',
    'grades',
    'locations',
    'access',
    'name',
];

const ARRAY_FIELDS = [
    'grades',
    'locations',
    'access',
    'domains',
];

/**
 * Creates a new website Firestore document based on command line input.
 * @param {Object} [website={}] - The pre-selected or pre-filled options (i.e. 
 * you can pre-fill options in this script such that you don't have to type them
 * into the terminal `readline` prompt).
 * @param {string} [partition='default'] - The database partition to create the
 * website configuration document in.
 * @return {Promise<undefined>} Promise that resolves when the website Firestore
 * document has been successfully created.
 */
const create = async (website = {}, partition = 'default') => {
    WEBSITE_FIELDS.forEach(field => {
        if (website[field]) return;
        website[field] = readline.question('What is the website\'s ' + field +
            '? ');
        if (ARRAY_FIELDS.indexOf(field) < 0) return;
        website[field] = website[field].split(', ');
    });
    const ref = partitions[partition].collection('websites').doc();
    website.created = website.updated = new Date();
    await ref.set(website);
    console.log('[INFO] Created website configuration (' + ref.id + ') in ' +
        partition + ' database partition.');
};

create();