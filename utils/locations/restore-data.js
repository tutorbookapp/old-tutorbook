// Over Winter Break, I accidentally deleted all user data stored in 
// subcollections of each user document. We can, however, restore that data as
// it is also stored in the location's document.

const to = require('await-to-js').default;
const admin = require('firebase-admin');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});

const db = admin.firestore().collection('partitions').doc('default');
const auth = admin.auth();

const getSubcollectionDocs = async (subcollection) => {
    const locations = (await db.collection('locations').get()).docs;
    var docs = [];
    await Promise.all(locations.map(async (d) => {
        docs = docs.concat((await d.ref.collection(subcollection).get()).docs);
    }));
    return docs;
};

const addUIDs = async (doc, appt) => {
    console.log('[DEBUG] Adding uIDs to document (' + doc.id + ')...');
    var updated = false;
    if (!appt.attendees[0].uid) {
        var [err, user] = await to(auth.getUserByEmail(appt.attendees[0].email));
        if (err) {
            console.warn('[WARNING] Could not get user (' + appt.attendees[0]
                .email + ') b/c of ' + err.message);
        } else {
            appt.attendees[0].uid = user.uid;
            if (appt.attendees[0].email === appt.for.toUser.email)
                appt.for.toUser.uid = user.uid;
            if (appt.attendees[0].email === appt.for.fromUser.email)
                appt.for.fromUser.uid = user.uid;
            console.log('[DEBUG] Added uID to ' + appt.attendees[0].name + ' (' +
                user.uid + ').');
            updated = true;
        }
    }
    if (!appt.attendees[1].uid) {
        var [err, user] = await to(auth.getUserByEmail(appt.attendees[1].email));
        if (err) {
            console.warn('[WARNING] Could not get user (' + appt.attendees[1]
                .email + ') b/c of ' + err.message);
        } else {
            appt.attendees[1].uid = user.uid;
            if (appt.attendees[1].email === appt.for.toUser.email)
                appt.for.toUser.uid = user.uid;
            if (appt.attendees[1].email === appt.for.fromUser.email)
                appt.for.fromUser.uid = user.uid;
            console.log('[DEBUG] Added uID to ' + appt.attendees[1].name + ' (' +
                user.uid + ').');
            updated = true;
        }
    }
    if (appt.supervisor && appt.supervisor.indexOf('@') >= 0) {
        var [err, user] = await to(auth.getUserByEmail(appt.supervisor));
        if (err) {
            console.warn('[WARNING] Could not get supervisor (' + appt
                .supervisor + ') b/c of ' + err.message);
        } else {
            appt.supervisor = user.uid;
            console.log('[DEBUG] Changed supervisor field from email (' + user
                .email + ') to uID (' + user.uid + ').');
            updated = true;
        }
    }
    if (updated) return doc.ref.update(appt);
    return;
};

const restoreSubcollectionDocs = async (subcollection) => {
    const docs = await getSubcollectionDocs(subcollection);
    console.log('[INFO] Restoring ' + docs.length + ' ' + subcollection +
        ' documents...');
    var count = 0;
    await Promise.all(docs.map(async (doc) => {
        const appt = doc.data();
        await addUIDs(doc, appt);
        if (!appt.attendees[0].uid && !appt.attendees[1].uid) {
            return console.warn('[WARNING] Could not restore ' + subcollection +
                ' document (' + doc.id + ') w/out valid user IDs.');
        } else if (!appt.attendees[0].uid) {
            var ref = await db.collection('users').doc(appt.attendees[1].uid)
                .collection(subcollection).doc(doc.id).get();
            //if (doc.exists) return console.warn('[WARNING] ' + subcollection +
            //' document existed, skipping...');
            await doc.ref.set(appt);
            count++;
        } else if (!appt.attendees[1].uid) {
            var doc = await db.collection('users').doc(appt.attendees[0].uid)
                .collection(subcollection).doc(doc.id).get();
            //if (doc.exists) return console.warn('[WARNING] ' + subcollection +
            //' document existed, skipping...');
            await doc.ref.set(appt);
            count++;
        } else {
            var refs = [
                db.collection('users').doc(appt.attendees[0].uid)
                .collection(subcollection).doc(doc.id),
                db.collection('users').doc(appt.attendees[1].uid)
                .collection(subcollection).doc(doc.id),
            ];
            var docs = await Promise.all(refs.map(ref => ref.get()));
            /*
             *if (docs[0].exists && docs[1].exists) return console.warn('[WARNING] ' +
             *    'Both ' + subcollection + ' documents existed, skipping...');
             *if (!docs[0].exists) await refs[0].set(appt);
             *if (!docs[1].exists) await refs[1].set(appt);
             */
            await refs[0].set(appt);
            await refs[1].set(appt);
            count++;
        }
    }));
    console.log('[INFO] Restored ' + count + ' ' + subcollection +
        ' documents.');
};

const main = async () => {
    await restoreSubcollectionDocs('appointments');
    await restoreSubcollectionDocs('pastAppointments');
    await restoreSubcollectionDocs('activeAppointments');
};

main();