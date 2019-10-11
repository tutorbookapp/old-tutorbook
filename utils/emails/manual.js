const admin = require('firebase-admin');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://tutorbook-779d8.firebaseio.com"
});

const firestore = admin.firestore();

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

/*
 *firestore.collection('users').doc('brian.eidson2003@gmail.com')
 *    .collection('activeAppointments')
 *    .doc('JMlQlkfHQFghbGRNo2g4')
 *    .get().then((doc) => {
 *        var appt = doc.data();
 *        var pastAppt = combineMaps(appt, {
 *            clockOut: {
 *                sentTimestamp: new Date(),
 *                sentBy: {},
 *                approvedTimestamp: new Date(),
 *                approvedBy: {},
 *            },
 *        });
 *        firestore.collection('users').doc('brian.eidson2003@gmail.com')
 *            .collection('pastAppointments')
 *            .doc().set(pastAppt).then(() => {
 *                firestore.collection('users').doc('brian.eidson2003@gmail.com')
 *                    .collection('activeAppointments')
 *                    .doc('JMlQlkfHQFghbGRNo2g4').delete();
 *                console.log('[SUCCESS]');
 *            });
 *    });
 *
 */
firestore.collection('users').doc('brian.eidson2003@gmail.com')
    .collection('pastAppointments')
    .doc('aZuL5wTywDJJYGo9xjHq').get().then((doc) => {
        const appt = doc.data();
        firestore.collection('users').doc('biancapista@gmail.com')
            .collection('pastAppointments')
            .doc().set(appt).then(() => {
                console.log('[SUCCESS]');
            });
    });