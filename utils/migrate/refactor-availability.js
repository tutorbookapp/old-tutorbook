const admin = require('firebase-admin');
const to = require('await-to-js').default;
const cliProgress = require('cli-progress');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});

const db = admin.firestore().collection('partitions').doc('test');

/**
 * Returns a map where the keys are the location's names and the values are the
 * location's IDs.
 */
const getLocations = async () => {
    const locations = await db.collection('locations').get();
    const res = {};
    locations.forEach(doc => res[doc.data().name] = doc.id);
    return res;
};

/**
 * Refactors the given availability.
 */
const refactor = async (original, locations) => {
    if (!locations) locations = await getLocations();
    const res = [];
    Object.entries(original).forEach(([locationName, times]) => {
        const locationId = locations[locationName] || '';
        if (!locationId) console.warn('[WARNING] Could not get ID for ' +
            'location (' + locationName + '), adding it w/ an empty ID...');
        Object.entries(times).forEach(([day, ts]) => ts.forEach(t => res.push({
            location: {
                id: locationId,
                name: locationName,
            },
            day: day,
            from: t.open,
            to: t.close,
        })));
    });
    return res;
};

/**
 * Updates the existing availability fields that look a little like this:
 * availability: {
 *   'Gunn Academic Center': {
 *     'Monday': [{
 *       open: '2:45 PM',
 *       close: '3:45 PM',
 *     }],
 *   },
 * };
 * To something that is (more) easily indexable:
 * availability: [{
 *   location: {
 *     id: 'NJp0Y6wyMh2fDdxSuRSx',
 *     name: 'Gunn Academic Center',
 *     type: 'School',
 *   },
 *   day: 'Monday',
 *   open: '2:45 PM',
 *   close: '3:45 PM',
 * }];
 */
const main = async () => {
    const snapshot = await db.collection('users').get();
    const locations = await getLocations();
    const bar = new cliProgress.SingleBar({}, cliProgress.Presets.legacy);
    var count = 0;
    bar.start(snapshot.docs.length, 0);
    console.log('[INFO] Refactoring availability on ' + snapshot.docs.length +
        ' user profiles...');
    return Promise.all(snapshot.docs.map(async (doc) => {
        const original = doc.data().availability;
        if (!original) {
            count++;
            bar.update(count);
            return console.warn('[WARNING] Skipping profile (' + doc.id + ') ' +
                'without availability...');
        }
        const [err, refactored] = await to(refactor(original, locations));
        if (err) {
            count++;
            bar.update(count);
            console.error('[ERROR] While refactoring profile (' + doc.id + '):',
                err.message);
            debugger;
        }
        await db.collection('users').doc(doc.id).update({
            availability: refactored,
        });
        count++;
        bar.update(count);
    }));
};

/**
 * Function for testing purposes.
 */
const test = async () => {
    const locations = await getLocations();
    const original = {
        'Gunn Academic Center': {
            'Monday': [{
                open: '2:45 PM',
                close: '3:45 PM',
            }],
        },
        'Paly Peer Tutoring Center': {
            'Tuesday': [{
                open: 'Lunch',
                close: 'Lunch',
            }],
        },
    };
    const refactored = await refactor(original, locations);
    debugger;
};

main();