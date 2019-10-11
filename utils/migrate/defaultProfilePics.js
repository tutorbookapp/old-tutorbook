// This is a script to change all of the user's who do not have a valid profile
// pic set to the default image.

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
    console.log('[INFO] Updating user profile images...');
    return firestore.collection('users').get().then((snapshot) => {
        return snapshot.forEach((doc) => {
            var user = doc.data();
            if (!!!user.photo || user.photo === '') {
                console.log('[DEBUG] Updating ' + user.name + '\'s profile image...');
                switch (user.gender) {
                    case 'Male':
                        user.photo = 'https://tutorbook.app/app/img/male.png';
                        break;
                    case 'Female':
                        user.photo = 'https://tutorbook.app/app/img/female.png';
                        break;
                    default:
                        user.photo = 'https://tutorbook.app/app/img/male.png';
                        break;
                }
                updateUser(user);
            }
        });
    }).then(() => {
        console.log('[INFO] Updated all user profile images.');
    });
};


if (true) {
    main();
}