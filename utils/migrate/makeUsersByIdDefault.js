const to = require('await-to-js').default;
const admin = require('firebase-admin');
const cliProgress = require('cli-progress');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});

const auth = admin.auth();
const db = admin.firestore();

// Iterate over all users included in the new usersByEmail collection and check
// if they have a valid uID (by getting the user via Firebase Auth). If they do
// not, create one for them and then use it to create a new uID document in the
// users collection.
const main = async () => {
    const snapshot = await db.collection('usersByEmail').get();
    const bar = new cliProgress.SingleBar({}, cliProgress.Presets.legacy);
    var count = 0;
    bar.start(snapshot.docs.length, 0);
    return snapshot.forEach(async (doc) => {
        var [err, user] = await to(auth.getUser(doc.data().uid));
        if (err)[err, user] = await to(auth.getUserByEmail(doc.id));
        if (err)[err, user] = await to(auth.createUser({
            displayName: doc.data().name,
            email: doc.data().email,
            phoneNumber: doc.data().phone,
            photoURL: doc.data().photo,
        }));
        if (err) return console.warn('[ERROR] Could not get uID for user (' +
            doc.id + '), skipping...', err);
        await db.collection('users').doc(user.uid).set(doc.data());
        count++;
        bar.update(count);
    });
};

main();