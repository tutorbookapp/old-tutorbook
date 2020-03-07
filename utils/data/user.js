/**
 * Command line script to create a new Firebase Authentication account and it's
 * subsequent/corresponding Firestore user document.
 */

const to = require('await-to-js').default;
const readline = require('readline-sync');
const admin = require('firebase-admin');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});

const auth = admin.auth();
const firestore = admin.firestore();
const partitions = {
    test: firestore.collection('partitions').doc('test'),
    default: firestore.collection('partitions').doc('default'),
};

const USER_FIELDS = [
    'name',
    'type',
    'email',
    'phone',
    'gender',
    'grade',
    'subjects',
    'availability',
    'payments',
    'access',
];

const ARRAY_FIELDS = [
    'subjects',
    'access',
];

const PREFILLED_FIELDS = [
    'availability',
    'payments',
];

/**
 * Creates a new user Firestore document and Firebase Authentication account 
 * based on user input.
 * @param {Object} [user={}] - The pre-selected or pre-filled options (i.e. you 
 * can pre-fill options in this script such that you don't have to type them
 * into the terminal `readline` prompt).
 * @param {string} [partition='default'] - The database partition to create the
 * user in.
 * @return {Promise<undefined>} Promise that resolves when the user Firestore
 * document and Firebase Authentication account has been successfully created.
 * @todo Add support for availability and payments input via the command line.
 * @todo Make sure that this returns the command line once it's finished (right
 * now it just hangs there indefinitely).
 */
const create = async (user = {}, partition = 'default') => {
    PREFILLED_FIELDS.forEach(field => {
        if (!user[field]) return console.error('[ERROR] You must pre-fill the' +
            ' user\'s ' + field + ' before running this script.');
    });
    USER_FIELDS.forEach(field => {
        if (user[field] || PREFILLED_FIELDS.indexOf(field) >= 0) return;
        user[field] = readline.question('What is the user\'s ' + field + '? ');
        if (ARRAY_FIELDS.indexOf(field) < 0) return;
        user[field] = user[field].split(', ');
    });
    console.log('[DEBUG] Creating Firebase Authentication account...');
    const [err, res] = await to(auth.createUser({
        email: user.email,
        emailVerified: false,
        phoneNumber: user.phone || undefined,
        displayName: user.name,
        photoURL: 'https://tutorbook.app/app/img/' + (user.gender === 'Female' ?
            'female' : 'male') + '.png',
        disabled: false,
    }));
    if (err) return console.error('[ERROR] Could not create Firebase ' +
        'Authentication account (and skipped creating the Firestore document)' +
        ' b/c of ', err);
    console.log('[DEBUG] Created Firebase Authentication account (' + res.uid +
        '). Creating Firestore user document...');
    user.uid = res.uid;
    user.created = user.updated = new Date();
    user.authenticated = true;
    await partitions[partition].collection('users').doc(user.uid).set(user);
    console.log('[INFO] Created Firebase Authentication account and Firestore' +
        ' document for ' + user.name + ' (' + user.uid + ').');
};

create();