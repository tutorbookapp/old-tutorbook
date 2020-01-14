const admin = require('firebase-admin');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});

const firestore = admin.firestore();
const partitions = {
    test: firestore.collection('partitions').doc('test'),
    default: firestore.collection('partitions').doc('default'),
};
const db = partitions.default;

const getSupervisor = async (params) => {
    if (params.email) return (await db.collection('users')
        .where('email', '==', params.email).limit(1).get()).docs[0].data();
    if (params.name) return (await db.collection('users')
        .where('name', '==', params.name).limit(1).get()).docs[0].data();
};

const dup = async () => {
    const doc = await partitions.test.collection('locations')
        .doc('NJp0Y6wyMh2fDdxSuRSx').get();
    return partitions.default.collection('locations')
        .doc('NJp0Y6wyMh2fDdxSuRSx').update(doc.data());
};

const log = async () => {
    console.log((await getSupervisor({
        email: 'psteward@pausd.org',
    })).uid);
};

log();