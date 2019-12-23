const admin = require('firebase-admin');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});

const auth = admin.auth();

const addSupervisorAuth = (options) => {
    auth.setCustomUserClaims(options.uid, {
        supervisor: true,
        parent: false,
        locations: options.locationIds,
        children: [],
    });
};

addSupervisorAuth({
    uid: 'OAmavOtc6GcL2BuxFJu4sd5rwDu1',
    locationIds: ['NJp0Y6wyMh2fDdxSuRSx'],
});