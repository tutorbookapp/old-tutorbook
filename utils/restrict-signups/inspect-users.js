// 1) Find out who isn't using their @pausd.us or @pausd.org email addresses
// 2) Migrate those users's data to their PAUSD accounts

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

const getUsers = async (db = partitions.default) => {
    return (await db.collection('users').get()).docs;
};

const getDups = async (users, db = partitions.default) => {
    const dups = [];
    await Promise.all(users.map(async user => {
        const matching = (await db.collection('users')
            .where('name', '==', user.data().name).get()).docs;
        const copies = matching.filter(u => u.id !== user.id);
        if (!copies.length) return;
        copies.map(u => dups.push(u));
    }));
    return dups;
};

const main = async () => {
    const students = [],
        teachers = [],
        gunnOthers = [],
        palyOthers = [],
        locationOthers = [];
    const users = await getUsers();
    users.forEach(user => {
        if (!user.data().email) return console.warn('[WARNING] User (' +
            user.id + ') did not have an email.');
        if (user.data().email.endsWith('@pausd.us')) students.push(user);
        if (user.data().email.endsWith('@pausd.org')) teachers.push(user);
    });
    console.log('[INFO] Found ' + students.length + ' student accounts.');
    console.log('[INFO] Found ' + teachers.length + ' teacher accounts.');
    const studentDups = await getDups(students);
    const teacherDups = await getDups(teachers);
    const dups = studentDups.concat(teacherDups);
    console.log('[DEBUG] Found ' + studentDups.length + ' duplicate student ' +
        'accounts.');
    console.log('[DEBUG] Found ' + teacherDups.length + ' duplicate teacher ' +
        'accounts.');
    console.log('[INFO] Found ' + dups.length + ' duplicate accounts.');
    const expected = students.concat(teachers).concat(dups);
    const others = users.filter(u => expected.map(u => u.id).indexOf(u.id) < 0);
    console.log('[INFO] Found ' + others.length + ' other accounts.');
    await Promise.all(others.map(async u => {
        const user = u.data();
        if (!user.location) return console.warn('[WARNING] User (' + u.id +
            ') did not have a location.');
        if (user.location === 'Gunn Academic Center') gunnOthers.push(u);
        if (user.location === 'Paly Peer Tutoring Center') palyOthers.push(u);
        if (user.location !== 'Any') locationOthers.push(u);
    }));
    console.log('[DEBUG] Found ' + gunnOthers.length + ' other accounts from ' +
        'Gunn.');
    console.log('[DEBUG] Found ' + palyOthers.length + ' other accounts from ' +
        'Paly.');
    console.log('[INFO] Found ' + locationOthers.length + ' other accounts ' +
        'with locations.');
    const outliers = others.filter(u => locationOthers.map(u => u.id)
        .indexOf(u.id) < 0);
    console.log('[INFO] Found ' + outliers.length + ' accounts without ' +
        'locations or PAUSD emails.');
    const paid = outliers.filter(u => u.data().payments && u.data().payments
        .type === 'Paid');
    console.log('[INFO] Found ' + paid.length + ' paid outlier accounts.');
    debugger;
};

main();