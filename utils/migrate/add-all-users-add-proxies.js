// This is a script to migrate the data of the current user base into a data
// structure that will function with the new app developments.


const admin = require('firebase-admin');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});

const firestore = admin.firestore();


// Main function that grabs all the user's profile documents and rewrites them
// with the correct data structures.
function updateUserProfiles() {
    return firestore.collection('users').get().then((snapshot) => {
        snapshot.forEach((doc) => {
            const id = doc.id;
            console.log('[INFO] Updating ' + id + '\'s user profile...');
            return firestore.collection('users').doc(id)
                .update({
                    proxy: ['pamsrazz7@yahoo.com', 'psteward@pausd.org', 'supervisor@tutorbook.me']
                }).then(() => {
                    console.log('[INFO] Successfully updated ' + id +
                        '\'s user profile document.');
                });
        });
    });
};


// Run the migration
if (true) {
    console.log('[INFO] Starting user profile migration...');
    updateUserProfiles();
};