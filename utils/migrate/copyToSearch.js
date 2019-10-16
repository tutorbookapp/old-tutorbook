const ProgressBar = require('progress');
const to = require('await-to-js').default;

const admin = require('firebase-admin');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});

const firestore = admin.firestore();


async function getUID(profile) {
    [err, user] = await to(admin.auth().getUserByEmail(profile.email));
    if (err) {
        [err, user] = await to(admin.auth().createUser({
            email: profile.email,
            emailVerified: false,
            displayName: profile.name,
            photoURL: (profile.photo && profile.photo !== '') ? profile.photo : 'https://tutorbook.app/app/img/male.png',
            disabled: false,
        }));
        if (err) return console.error('[ERROR] ' + err.message, profile);
    }
    return user.uid;
};


function getName(name) { // Returns first name with last initial
    const split = name.split(' ');
    return split[0] + ' ' + split[split.length - 1].charAt(0);
};


async function main() {
    var count = 0;
    var snapshot = await firestore.collection('users').get();
    console.log('[INFO] Adding ' + snapshot.size + ' users to `search` ' +
        'collection...');
    const bar = new ProgressBar(':bar', {
        total: snapshot.size
    });
    var profiles = [];
    snapshot.forEach((doc) => {
        profiles.push(doc);
    });
    for (var i = 0; i < profiles.length; i++) {
        var profile = profiles[i].data();
        if (!profile.uid) profile.uid = await getUID(profile);
        var filtered = {
            name: getName(profile.name),
            uid: profile.uid,
            id: profile.email, // TODO: Move data flow that requires this
            email: profile.email, // information server-side
            proxy: profile.proxy || [],
            photo: profile.photo,
            type: profile.type,
            gender: profile.gender,
            grade: profile.grade,
            bio: profile.bio,
            avgRating: 0, // TODO: Right now we don't support ratings
            numRatings: 0,
            subjects: profile.subjects,
            availability: profile.availability,
            payments: {
                hourlyCharge: profile.payments.hourlyCharge,
                type: profile.payments.type,
                policy: profile.payments.policy || 'Hourly rate is $' +
                    profile.payments.hourlyCharge.toFixed(2) +
                    ' per hour. Will accept lesson cancellations if given' +
                    ' notice within 24 hours. No refunds will be issued ' +
                    'unless covered by a Tutorbook guarantee.',
            },
        };
        [err, res] = await to(firestore.collection('search').doc(profile.uid)
            .set(filtered));
        if (err) {
            console.error('[ERROR] ' + err.message);
            continue;
        }
        count++;
        bar.tick();
    }
    console.log('[INFO] Added ' + count + '/' + snapshot.size + ' users to ' +
        '`search` collection.');
};


main();