// Script that adds all relevant objects in Firestore to Algolia indexes

const id = 'TODO: ADD-ALGOLIA-APP-ID-HERE';
const key = 'TODO: ADD-ALGOLIA-KEY-HERE';
const client = require('algoliasearch')(id, key);
const to = require('await-to-js').default;
const serviceAccount = require('../admin-cred.json');
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});
const partition = 'default';
const db = admin.firestore().collection('partitions').doc(partition);

async function algolia(doc, indexID, settings) {
  const index = client.initIndex(partition + '-' + indexID);
  const object = doc.data();
  object.objectID = doc.id; // TODO: Do we want to the path?
  object.ref = doc.ref.path;
  if (settings) index.setSettings(settings);
  const [err, res] = await to(index.saveObject(object));
  if (err) {
    console.error(
      '[ERROR] Could not save doc (' + doc.id + ') b/c of ' + err.message
    );
    debugger;
  }
}

async function main() {
  // Users
  (await db.collection('users').get()).forEach((doc) =>
    algolia(doc, 'users', {
      attributesForFaceting: [
        'filterOnly(payments.type)',
        'filterOnly(location)',
      ],
    })
  );
  (await db.collection('locations').get()).forEach(async (doc) => {
    // Upcoming appointments
    (await doc.ref.collection('appointments').get()).forEach((doc) =>
      algolia(doc, 'appts', {
        attributesForFaceting: ['filterOnly(location.id)'],
      })
    );
    // Active appointments
    (await doc.ref.collection('activeAppointments').get()).forEach((doc) =>
      algolia(doc, 'activeAppts')
    );
    // Past appointments
    (await doc.ref.collection('pastAppointments').get()).forEach((doc) =>
      algolia(doc, 'pastAppts')
    );
  });
  // Chats
  (await db.collection('chats').get()).forEach((doc) =>
    algolia(doc, 'chats', {
      attributesForFaceting: [
        'filterOnly(location.id)',
        'filterOnly(chatterUIDs)',
      ],
    })
  );
}

main();
