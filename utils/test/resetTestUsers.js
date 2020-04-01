// Script to purge the database of test user data. TODO: Use a Firestore
// emulator instead of messing with the production database.

const admin = require('firebase-admin');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});

const db = admin.firestore();

async function removeTestUsers() {
  const users = [
    'supervisor@tutorbook.app',
    'tutor@tutorbook.app',
    'pupil@tutorbook.app',
  ];
  users.forEach(async (user) => {
    await db.collection('users').doc(user).delete();
  });
}

removeTestUsers();
