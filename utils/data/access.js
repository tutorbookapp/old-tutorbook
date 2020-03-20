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
 * Populates each user's `access` field (and resets each `access`'s 
 * `exceptions`) by:
 * 1. Checking if the user's email fits within an `access`'s domain rules.
 * 2. If it does, add that `access` to the user's profile and continue.
 * 3. If it doesn't, check if the user has availability in one of the `access`'s
 * locations.
 * 4. If it does, ask if we should add the user as an exception to the `access`.
 *
 * @todo Perhaps don't add `root` access to each user's profile (because then
 * they're viewable from the public app).
 *
 * @todo Why do we store location `access` in an array? Won't there only ever be
 * one `access` per location?
 */
const users = async (ask = false) => {
    const grades = ['Freshman', 'Sophomore', 'Junior', 'Senior'];
    const locations = (await db.collection('locations').get()).docs;
    const accesses = (await db.collection('access').get()).docs;
    const users = (await db.collection('users').get()).docs;
    console.log('[INFO] Updating access for ' + users.length + ' users...');
    const bar = new ProgressBar(':bar', {
        total: users.length * accesses.length,
    });
    for (const user of users) {
        const profile = user.data();
        if (!profile.email) {
            console.warn('[WARNING] Profile (' + user.id + ') did not have an' +
                ' email, skipping...');
            for (var i = 0; i < accesses.length; i++) bar.tick();
            continue;
        }
        profile.access = [];
        for (const access of accesses) {
            for (const emailDomain of access.data().domains) {
                if (profile.email.endsWith(emailDomain)) {
                    profile.access.push(access.id);
                    bar.tick();
                    break;
                }
            }
            if (profile.access.indexOf(access.id) >= 0) continue;
            const exceptions = access.data().exceptions;
            if (exceptions.indexOf(profile.email) >= 0) {
                profile.access.push(access.id);
                bar.tick();
                continue;
            }
            for (const name of Object.keys(profile.availability || {})) {
                const index = locations.findIndex(d => d.data().name === name);
                if (index < 0) {
                    console.warn('[WARNING] No location (' + name + '), ' +
                        'skipping...');
                    continue;
                }
                const accessId = locations[index].data().access[0];
                if (accessId !== access.id) continue;
                if (profile.email.endsWith('example.com')) {
                    console.log('[DEBUG] Skipped example user.');
                } else if (profile.payments.type === 'Paid') {
                    console.log('[DEBUG] Skipped paid user.');
                } else if (grades.indexOf(profile.grade) >= 0) {
                    console.log('[DEBUG] Automatically added ' +
                        profile.name + ' (' + profile.email + ') to ' +
                        access.data().symbol + '\'s exceptions.');
                    profile.access.push(access.id);
                    exceptions.push(profile.email);
                } else {
                    console.log('[DEBUG] ' + profile.name + ' (' + profile.uid +
                        ')\'s profile:', profile);
                    const addToExceptions = readline.question('Add ' +
                        profile.name + ' (' + profile.email + ') to ' +
                        access.data().symbol + '\'s exceptions? (yes, no) ');
                    if (addToExceptions === 'yes') {
                        profile.access.push(access.id);
                        exceptions.push(profile.email);
                    }
                }
            }
            if (exceptions !== access.data().exceptions) {
                await access.ref.update({
                    exceptions: exceptions,
                });
                accesses[accesses.indexOf(access)] = await access.ref.get();
            }
            bar.tick();
        }
        if (profile.access.length > 1)
            profile.access.splice(profile.access.indexOf('root'), 1);
        if (profile.access === user.data().access) continue;
        await user.ref.update({
            access: profile.access,
        });
    }
    console.log('[INFO] Updated access for ' + users.length + ' users.');
};

/**
 * Populates every document's `access` field (in every user's subcollections) to
 * match it's user's `access` field.
 * @deprecated We don't need this b/c our Firestore rules don't refer to 
 * `access` for user subcollections.
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

users();