const phone = require('phone');
const admin = require('firebase-admin');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});

const firestore = admin.firestore();

function updateUser(user) {
  return firestore
    .collection('users')
    .doc(user.email)
    .update(user)
    .then(() => {
      console.log('[DEBUG] Updated ' + user.email + "'s user profile doc.");
    })
    .catch((err) => {
      console.error(
        '[ERROR] Error while updating ' + user.email + "'s profile doc:",
        err
      );
    });
}

function main() {
  console.log("[INFO] Updating user's phone...");
  return firestore
    .collection('users')
    .get()
    .then((snapshot) => {
      return snapshot.forEach((doc) => {
        const user = doc.data();
        const parsed = phone(user.phone);
        if (!parsed[0])
          return console.warn(
            '[WARNING] Could not parse ' +
              user.name +
              "'s phone (" +
              user.phone +
              ').'
          );
        user.phone = parsed[0];
        updateUser(user);
      });
    })
    .then(() => {
      console.log("[INFO] Updated all user's phones.");
    });
}

main();
