const admin = require('firebase-admin');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});

const db = admin.firestore().collection('partitions').doc('default');
const auth = admin.auth();

const addSupervisorAuth = async (options) => {
    await Promise.all(options.locationIds.map(async (id) => {
        const location = await db.collection('locations').doc(id).get();
        if (location.exists && location.data().supervisors.indexOf(options
                .uid) < 0) {
            console.log('Adding uID (' + options.uid + ') to location ' +
                'with supervisors:', location.data().supervisors);
            return location.ref.update({
                supervisors: [options.uid].concat(location.data().supervisors),
            });
        }
    }));
    return auth.setCustomUserClaims(options.uid, {
        supervisor: true,
        parent: false,
        locations: options.locationIds,
        children: [],
    });
};

const removeSupervisorAuth = (options) => {
    return auth.setCustomUserClaims(options.uid, {
        supervisor: false,
        parent: false,
        locations: [],
        children: [],
    });
};

const createUser = (user) => {
    return auth.createUser(user);
};

const createAndAuth = async (user, locations) => {
    try {
        user = await createUser(user);
    } catch (e) {
        console.warn('Could not create ' + user.name + '\'s account b/c of', e);
        user = await auth.getUserByEmail(user.email);
    }
    return addSupervisorAuth({
        uid: user.uid,
        locationIds: locations,
    });
};

const createAndAuthMany = async (users, locations) => {
    for (var user of users) {
        await createAndAuth(user, locations);
    }
};

createAndAuth({
    name: 'Supervisor Tutorbook',
    email: 'supervisor@tutorbook.app',
    uid: 'OAmavOtc6GcL2BuxFJu4sd5rwDu1',
}, [
    'IVYL0RYSqXcLPxZoNGss',
    'IchZg5QANcmrVDQemYU2',
    'NJp0Y6wyMh2fDdxSuRSx',
    'WfAGnrtG87CJsYRnOmwn',
    'fcKWyRWy124H4M34mS1r',
    'gh3jFbjry0DE8WcQqAGi',
    'hnmaaoUbdM2QGtgyCPV8',
]);

/*
 *createAndAuthMany([{
 *    name: 'Molly Hawkinson',
 *    email: 'mhawkinson@pausd.org',
 *}, {
 *    name: 'Amy Sheward',
 *    email: 'asheward@pausd.org',
 *}, {
 *    name: 'Ander Lucia',
 *    email: 'alucia@pausd.org',
 *}, {
 *    name: 'Sue Duffek',
 *    email: 'sduffek@pausd.org',
 *}, {
 *    name: 'Ashley Lucey',
 *    email: 'alucey@pausd.org',
 *}, {
 *    name: 'Diane Luu',
 *    email: 'dluu@pausd.org',
 *}, {
 *    name: 'Samuel Franco Fewell',
 *    email: 'sfrancofewell@pausd.org',
 *}], [
 *    'WfAGnrtG87CJsYRnOmwn',
 *]);
 */