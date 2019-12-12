// Script that adds all relevant objects in Firestore to Algolia indexes

const id = '9FGZL7GIJM';
const key = 'fb7894893d554015714ca2246b9f2b04';
//const id = 'TODO: ADD-ALGOLIA-APP-ID-HERE';
//const key = 'TODO: ADD-ALGOLIA-KEY-HERE';
const client = require('algoliasearch')(id, key);
const serviceAccount = require('../admin-cred.json');
const admin = require('firebase-admin');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});
const db = admin.firestore();

function algolia(doc, indexID) {
    const object = doc.data();
    object.objectID = doc.id;
    object.ref = doc.ref.path;
    return client.initIndex(indexID).saveObject(object);
}

async function main() {
    client.initIndex('users').setSettings({
        attributesForFaceting: [
            'filterOnly(payments.type)',
            'filterOnly(location)',
        ],
    });
    (await db.collection('users').get()) // USERS
    .forEach((doc) => algolia(doc, 'users'));
    //(await db.collection('locations').get()).forEach(async (doc) => { // APPTS
    //(await doc.ref.collection('appointments').get()) // UPCOMING
    //.forEach((doc) => algolia(doc, 'appts'));
    //(await doc.ref.collection('activeAppointments').get()) // ACTIVE
    //.forEach((doc) => algolia(doc, 'activeAppts'));
    //(await doc.ref.collection('pastAppointments').get()) // PAST
    //.forEach((doc) => algolia(doc, 'pastAppts'));
    //});
    //(await db.collection('chats').get()) // CHATS
    //.forEach((doc) => algolia(doc, 'chats'));
}

main();