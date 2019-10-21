const stripe = require('stripe')('');
const admin = require('firebase-admin');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});

async function updateAccount(user, id) {
    const data = await stripe.accounts.retrieve(id);
    return admin.firestore().collection('stripeAccounts').doc(user).set(data);
};