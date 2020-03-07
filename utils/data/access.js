/**
 * Command line script to add the `access` field to all Firestore documents.
 * This field will denote who is able to access what documents (based on what
 * school district they are a part of).
 * 
 * This script is NOT to be confused with the `district.js` script that actually
 * **creates** new school district (or `access`) Firestore documents.
 */

const ProgressBar = require('progress');
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
const db = firestore.collection('partitions').doc('default');

const COLLECTIONS = {
    'users': [
        'appointments',
        'modifiedAppointments',
        'canceledAppointments',
        'pastAppointments',
        'requestsIn',
        'modifiedRequestsIn',
        'canceledRequestsIn',
        'requestsOut',
        'modifiedRequestsOut',
        'rejectedRequestsOut',
        'approvedRequestsOut',
    ],
    'chats': [
        'messages',
    ],
    'locations': [
        'announcements',
        'clockIns',
        'approvedClockIns',
        'rejectedClockIns',
        'clockOuts',
        'approvedClockOuts',
        'rejectedClockOuts',
        'appointments',
        'modifiedAppointments',
        'canceledAppointments',
        'pastAppointments',
    ],
    'websites': [],
    'access': [],
    'auth': [],
    'stripeAccounts': [],
    'stripeCustomers': [],
};

/**
 * Get the current `access` configurations and locations. Then, ask the user to
 * assign each location's `access` property (using the `access`'s symbol).
 * @return {Array<Map>} An array of maps containing location IDs and their
 * corresponding `access` fields.
 */
const locations = async () => {
    const accessDocs = (await db.collection('access').get()).docs;
    const accessSymbols = accessDocs.map(d => d.data().symbol);
    const locations = (await db.collection('locations').get()).docs;
    return Promise.all(locations.map(async location => {
        const question = 'What is the ' + location.data().name +
            '\'s access? (' + accessSymbols.join(', ') + ') ';
        var access = readline.question(question).split(', ');
        while (!access.every(a => accessSymbols.includes(a)))
            access = readline.question(question).split(', ');
        await location.ref.update({
            access: access.map(a => accessDocs[accessSymbols.indexOf(a)].id),
        });
        return {
            id: location.id,
            access: access.map(a => accessDocs[accessSymbols.indexOf(a)].id),
        };
    }));
};

/**
 * Removes the `access` field from all users.
 */
const resetUserAccess = async () => {
    const users = (await db.collection('users').get()).docs;
    const bar = new ProgressBar(':bar', {
        total: users.length,
    });
    console.log('[INFO] Reseting ' + users.length + ' users access...');
    await Promise.all(users.map(async user => {
        await user.ref.update({
            access: [],
        });
        bar.tick();
    }));
    console.log('[INFO] Reset ' + users.length + ' users access.');
};

/**
 * Creates a `locations` field in those user Firestore documents (that do not
 * already have it) based on their `location` field.
 */
const addLocationsField = async () => {
    const users = (await db.collection('users').get()).docs;
    const bar = new ProgressBar(':bar', {
        total: users.length,
    });
    console.log('[INFO] Adding the locations field to ' + users.length +
        ' users...');
    await Promise.all(users.map(async user => {
        if (user.data().locations) return bar.tick();
        if (!user.data().location) return bar.tick();
        await user.ref.update({
            locations: [user.data().location],
        });
        bar.tick();
    }));
    console.log('[INFO] Added the locations field to ' + users.length +
        ' users.');
};

/**
 * Helper function that combines the two arrays (much like `concat` but it 
 * avoids duplicates).
 * @param {Array} a - One of the two arrays to combine.
 * @param {Array} b - One of the two arrays to combine.
 * @return {Array} The array resulting from the combination of array `a` and
 * array `b` (without duplicates).
 */
const combine = (a, b) => {
    a.map(a => {
        if (b.indexOf(a) < 0) b.push(a);
    });
    return b;
};

/**
 * Updates every user's `access` custom auth claim based on what claims are
 * specified in their Firestore document.
 */
const usersCustomAuth = async () => {
    const users = (await db.collection('users').get()).docs.map(u => u.data());
    const bar = new ProgressBar(':bar', {
        total: users.length,
    });
    console.log('[INFO] Updating access custom auth claims for ' +
        users.length + ' users...');
    await Promise.all(users.map(async user => {
        const [err, res] = await to(auth.setCustomUserClaims(user.uid, {
            access: user.access,
        }));
        if (err) console.error('[ERROR] Could not add custom auth claims b/c ' +
            'of error: ' + err.message);
        bar.tick();
    }));
    console.log('[INFO] Updated access custom auth claims for ' + users.length +
        ' users.');
};

/**
 * Populates every user at a given location with the location's `access` 
 * property. If a user has multiple locations (in their Firestore document's
 * `locations` field), their `access` property will be the combined `access`
 * properties of all of their locations.
 *
 * Note that this also populates each user's Firebase Authentication token (so
 * it cannot be used for just testing purposes).
 */
const users = async () => {
    await resetUserAccess();
    await addLocationsField();
    const locations = (await db.collection('locations').get()).docs;
    const bar = new ProgressBar(':bar', {
        total: locations.length,
    });
    console.log('[INFO] Populating ' + locations.length + ' locations\' users' +
        ' access...');
    for (location of locations) {
        var users = (await db.collection('users').where('locations',
            'array-contains', location.data().name).get()).docs;
        await Promise.all(users.map(user => user.ref.update({
            access: combine(user.data().access, location.data().access),
        })));
        bar.tick();
    }
    console.log('[INFO] Populated ' + locations.length + ' locations\' users ' +
        'access.');
    await usersCustomAuth();
};

/**
 * Populates every document's `access` field (in every user's subcollections) to
 * match it's user's `access` field.
 */
const propagateToSubcollections = async (collection = 'users') => {
    const docs = (await db.collection(collection).get()).docs;
    const collections = COLLECTIONS[collection];
    const bar = new ProgressBar(':bar', {
        total: docs.length * collections.length,
    });
    console.log('[INFO] Updating access on documents from ' + collections
        .length + ' subcollections of ' + docs.length + ' ' + collection +
        ' documents...');
    await Promise.all(docs.map(d => Promise.all(collections.map(async sub => {
        const docs = (await d.ref.collection(sub).get()).docs;
        await Promise.all(docs.map(doc => doc.ref.update({
            access: d.data().access,
        })));
        bar.tick();
    }))));
    console.log('[INFO] Updated access on documents from ' + collections
        .length + ' subcollections of ' + docs.length + ' ' + collection +
        ' documents.');
};

propagateToSubcollections('locations');