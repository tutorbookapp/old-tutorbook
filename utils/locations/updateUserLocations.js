// This is a script to change all of the user's payment types to FREE

const admin = require('firebase-admin');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});

const db = admin.firestore().collection('partitions').doc('default');

function updateUser(user) {
  return db
    .collection('users')
    .doc(user.uid)
    .update(user)
    .then(() => {
      console.log('[DEBUG] Updated ' + user.email + "'s user profile doc.");
    })
    .catch((err) => {
      console.error(
        '[ERROR] Error while updating ' + user.email + "'s " + 'profile doc:',
        err
      );
    });
}

function main() {
  console.log("[INFO] Updating user's visibility to visible...");
  return db
    .collection('users')
    .get()
    .then((snapshot) => {
      return snapshot.forEach((doc) => {
        const user = doc.data();
        if (
          user.location === 'Any' &&
          (user.email.indexOf('pausd') > 0 ||
            user.availability['Gunn Academic Center'] !== undefined)
        ) {
          user.location = 'Gunn Academic Center';
        }
        return updateUser(user);
      });
    })
    .then(() => {
      console.log("[INFO] Updated all user's visibility to visible.");
    });
}

main();
