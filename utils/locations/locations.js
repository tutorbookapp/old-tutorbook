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

const updateHours = (hrs, id) => {
    return db.collection('locations').doc(id).update({
        hours: hrs,
    });
};

updateHours({
    Monday: [{
            open: 'A Period',
            close: 'A Period',
        },
        {
            open: 'B Period',
            close: 'B Period',
        },
        {
            open: 'C Period',
            close: 'C Period',
        },
        {
            open: 'F Period',
            close: 'F Period',
        },
        {
            open: '2:45 PM',
            close: '3:45 PM',
        },
        {
            open: '3:45 PM',
            close: '4:45 PM',
        },
    ],
    Tuesday: [{
            open: 'D Period',
            close: 'D Period',
        },
        {
            open: 'Flex',
            close: 'Flex',
        },
        {
            open: 'E Period',
            close: 'E Period',
        },
        {
            open: 'A Period',
            close: 'A Period',
        },
        {
            open: 'G Period',
            close: 'G Period',
        },
        {
            open: '3:45 PM',
            close: '4:45 PM',
        },
    ],
    Wednesday: [{
            open: 'B Period',
            close: 'B Period',
        },
        {
            open: 'C Period',
            close: 'C Period',
        },
        {
            open: 'D Period',
            close: 'D Period',
        },
        {
            open: 'F Period',
            close: 'F Period',
        },
        {
            open: '3:05 PM',
            close: '4:05 PM',
        },
        {
            open: '3:35 PM',
            close: '4:35 PM',
        },
    ],
    Thursday: [{
            open: 'E Period',
            close: 'E Period',
        },
        {
            open: 'Flex',
            close: 'Flex',
        },
        {
            open: 'B Period',
            close: 'B Period',
        },
        {
            open: 'A Period',
            close: 'A Period',
        },
        {
            open: 'G Period',
            close: 'G Period',
        },
        {
            open: '3:45 PM',
            close: '4:45 PM',
        },
    ],
    Friday: [{
            open: 'C Period',
            close: 'C Period',
        },
        {
            open: 'D Period',
            close: 'D Period',
        },
        {
            open: 'E Period',
            close: 'E Period',
        },
        {
            open: 'F Period',
            close: 'F Period',
        },
        {
            open: 'G Period',
            close: 'G Period',
        },
        {
            open: '3:45 PM',
            close: '4:45 PM',
        },
    ],
}, 'NJp0Y6wyMh2fDdxSuRSx');