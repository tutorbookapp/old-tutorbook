const admin = require('firebase-admin');
const cliProgress = require('cli-progress');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});

const db = admin.firestore();

const main = async () => {
    const snapshot = await db.collection('users').get();
    const bar = new cliProgress.SingleBar({}, cliProgress.Presets.legacy);
    var count = 0;
    bar.start(snapshot.docs.length, 0);
    return snapshot.forEach(async (doc) => {
        await db.collection('usersByEmail').doc(doc.id).set(doc.data());
        count++;
        bar.update(count);
    });
};

main();