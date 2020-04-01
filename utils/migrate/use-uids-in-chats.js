const admin = require('firebase-admin');
const to = require('await-to-js').default;
const cliProgress = require('cli-progress');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});

const db = admin.firestore().collection('partitions').doc('default');
const auth = admin.auth();

const useUIDsInChats = async () => {
  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.legacy);
  const snapshot = await db.collection('chats').get();
  var count = 0;
  console.log('[INFO] Updating ' + snapshot.docs.length + ' chats...');
  bar.start(snapshot.docs.length, 0);
  await Promise.all(
    snapshot.docs.map(async (doc) => {
      const chat = doc.data();
      const chatterUIDs = [];
      await Promise.all(
        chat.chatterEmails.map(async (email) => {
          const [err, user] = await to(auth.getUserByEmail(email));
          if (err)
            return console.warn(
              '[ERROR] While getting user (' + email + ")'s uID:",
              err
            );
          chatterUIDs.push(user.uid);
        })
      );
      await doc.ref.update({
        chatterUIDs: chatterUIDs,
      });
      count++;
      bar.update(count);
    })
  );
  bar.stop();
  console.log('[INFO] Updated ' + count + ' chats.');
};

useUIDsInChats();
