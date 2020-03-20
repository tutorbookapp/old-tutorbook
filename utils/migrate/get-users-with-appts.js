/**
 * Script that prints all of the user emails with appointments at a given
 * location.
 */

const admin = require('firebase-admin');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});

const db = admin.firestore().collection('partitions').doc('default');

const main = async (locationId) => {
    const appts = (await db.collection('locations').doc(locationId)
        .collection('appointments').get()).docs;
    const tutorEmails = [];
    const pupilEmails = [];
    appts.map(appt => {
        tutorEmails.push(appt.data().for.toUser.email);
        pupilEmails.push(appt.data().for.fromUser.email);
    });
    console.log('[INFO] All tutor emails:', tutorEmails.join(', '));
    console.log('[INFO] All pupil emails:', pupilEmails.join(', '));
};

main('NJp0Y6wyMh2fDdxSuRSx');