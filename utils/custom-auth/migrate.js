const admin = require('firebase-admin');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});

const db = admin.firestore().collection('partitions').doc('default');
const auth = admin.auth();

const main = async () => {
    const codes = await db.collection('auth').doc('supervisors').get();
    const emailsAsKeys = {};
    Object.entries(codes.data()).forEach(entry =>
        emailsAsKeys[entry[1]] = entry[0]);
    const uIDsAsKeys = {};
    await Promise.all(Object.entries(emailsAsKeys).map(async entry => {
        console.log('[DEBUG] Getting user (' + entry[0] + ')...');
        try {
            const user = await auth.getUserByEmail(entry[0]);
            uIDsAsKeys[user.uid] = entry[1];
        } catch (e) {
            console.error('[ERROR] Could not get user (' + entry[0] +
                ') b/c of ' + e.message);
        }
    }));
    console.log('[DEBUG] Created final uIDsAsKeys map:', uIDsAsKeys);
    return db.collection('auth').doc('supervisors').set(uIDsAsKeys);
};

main();