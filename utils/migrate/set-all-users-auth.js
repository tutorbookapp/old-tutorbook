// This is a script to change all of the user's payment types to FREE

const admin = require('firebase-admin');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});

const firestore = admin.firestore();


function updateUser(user) {
    return firestore.collection('users').doc(user.email).update(user).then(() => {
        console.log('[DEBUG] Updated ' + user.email + '\'s user profile doc.');
    }).catch((err) => {
        console.error('[ERROR] Error while updating ' + user.email + '\'s profile doc:', err);
    });
};


function main() {
    console.log('[INFO] Updating tutors and pupils to be authenticated...');
    return firestore.collection('users').get().then((snapshot) => {
        return snapshot.forEach((doc) => {
            var user = doc.data();
            if (user.type !== 'Supervisor' && user.type !== 'Admin') {
                user.authenticated = true;
            }
            updateUser(user);
        });
    }).then(() => {
        console.log('[INFO] Updated all tutors and pupils to be authenticated.');
    });
};


if (true) {
    main();
}