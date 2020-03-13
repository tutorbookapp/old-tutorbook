const ProgressBar = require('progress');
const admin = require('firebase-admin');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});

function main() {
    console.log('[INFO] Fetching active appointments...');
    return admin.firestore().collectionGroup('activeAppointments').get()
        .then(async (snapshot) => {
            console.log('[INFO] Fetched ' + snapshot.size + ' active ' +
                'appointments.');
            console.log('[INFO] Deleting ' + snapshot.size + ' active ' +
                'appointments...');
            const appts = [];
            snapshot.forEach((doc) => {
                appts.push(doc);
            });
            await Promise.all(appts.map(async (doc) => {
                console.log('[DEBUG] Deleting (' + doc.id + ') active ' +
                    'appointment between ' + doc.data().attendees[0].name
                    .split(' ')[0] + ' and ' + doc.data().attendees[1].name
                    .split(' ')[0] + '...');
                await doc.ref.delete();
            }));
            console.log('[INFO] Deleted ' + snapshot.size + ' active ' +
                'appointments.');
        });
};

main();