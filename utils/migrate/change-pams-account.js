// This is a script to change all of the user's payment types to FREE

const admin = require('firebase-admin');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});

const db = admin.firestore();


function updateUser(user) {
    return db.collection('users').doc(user.email).update(user).then(() => {
        console.log('[DEBUG] Updated ' + user.email + '\'s user profile doc.');
    }).catch((err) => {
        console.error('[ERROR] Error while updating ' + user.email + '\'s profile doc:', err);
    });
};


function combineMaps(mapA, mapB) {
    // NOTE: This function gives priority to mapB over mapA
    var result = {};
    for (var i in mapA) {
        result[i] = mapA[i];
    }
    for (var i in mapB) {
        result[i] = mapB[i];
    }
    return result;
};


function main() {
    db.collection('users').doc('pamsrazz7@yahoo.com').get().then((doc) => {
        const data = doc.data();
        console.log(combineMaps(data, {
            id: 'psteward@pausd.org',
            email: 'psteward@pausd.org',
            name: 'Pam Steward',
            grade: 'Adult',
        }));
        updateUser(combineMaps(data, {
            id: 'psteward@pausd.org',
            email: 'psteward@pausd.org',
            name: 'Pam Steward',
            grade: 'Adult',
        }));
    });
};


main();