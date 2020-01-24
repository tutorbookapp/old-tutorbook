const admin = require('firebase-admin');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});

const auth = admin.auth();

const addSupervisorAuth = (options) => {
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

/*
 *createUser({
 *    email: 'dluu@pausd.org',
 *    emailVerified: false,
 *    displayName: 'Diane Luu',
 *    photoURL: 'https://www.google.com/s2/u/3/photos/private/AIbEiAIAAABECLz8h' +
 *        'ZH_ueKopwEiC3ZjYXJkX3Bob3RvKihlYzE4NGY3Y2ZiNTZmZDEwZDNkYjc5ZjkzMzgxM' +
 *        'mY2N2YxYzZiNzM4MAHmhhGklYzXpzQov7BVCWZ0YMtuqA?sz=40',
 *    disabled: false,
 *});
 */
addSupervisorAuth({
    uid: 'ON8HMcTZCodjBdMmZsRHT01C4242',
    locationIds: [
        'WfAGnrtG87CJsYRnOmwn',
    ],
});