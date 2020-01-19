const admin = require('firebase-admin');
const db = admin.firestore().collection('partitions').doc('default');
const to = require('await-to-js').default;
const cors = require('cors')({
    origin: true,
});


async function getUID(profile) {
    [err, user] = await to(admin.auth().getUserByEmail(profile.email));
    if (err) {
        [err, user] = await to(admin.auth().createUser({
            email: profile.email,
            emailVerified: false,
            displayName: profile.name,
            photoURL: (profile.photo && profile.photo !== '') ?
                profile.photo : 'https://tutorbook.app/app/img/' +
                ((profile.gender === 'Female') ? 'female.png' : 'male.png'),
            disabled: false,
        }));
        if (err) return console.error('[ERROR] Could not get uID b/c of ' + err
            .message);
    }
    return user.uid;
};


function getName(name) { // Returns first name with last initial
    const split = name.split(' ');
    return split[0] + ' ' + split[split.length - 1].charAt(0);
};

// webhook - enables integration across Twilio and Intercom via Automate.io
const getEmailFromPhone = (req, res) => {
    return cors(req, res, async () => {
        const emails = [];
        (await db.collection('users')
            .where('phone', '==', req.query.phone).limit(1).get()
        ).forEach((doc) => {
            emails.push(doc.id);
        });
        return res.send(emails[0]);
    });
};

// Manages the copying of data from the `users` collection (that noone can read)
// to the `search` collection (that anyone can read).
const updateSearch = async (change, context) => {
    const profile = change.after.data();
    const search = db.collection('search');
    if (!profile) {
        const before = change.before.data();
        console.log('[DEBUG] User doc (' + before.email + ') was deleted.');
        if (before.uid &&
            before.uid !== '' &&
            (await search.doc(before.uid).get()).exists
        ) {
            console.log('[DEBUG] Deleting (' + before.email + ') search doc...');
            return search.doc(before.uid).delete();
        }
        return;
    }
    if (!profile.config || !profile.config.showProfile) {
        console.log('[DEBUG] Hiding (' + profile.email + ') search doc...');
        if (profile.uid &&
            profile.uid !== '' &&
            (await search.doc(profile.uid).get()).exists
        ) {
            console.log('[DEBUG] Deleting (' + profile.email + ') search doc...');
            return search.doc(profile.uid).delete();
        }
        return;
    }
    if (!profile.uid || profile.uid === '') {
        console.log('[DEBUG] Updating (' + profile.email + ') auth user...');
        profile.uid = await getUID(profile);
        if (!profile.uid) return console.warn('[WARNING] Could not get uID. ' +
            'You\'re probably running tests with a local functions emulator.');
        await search.collection('users').doc(context.params.id)
            .update({
                uid: profile.uid
            });
    }
    const missing = (profile, attr) => {
        return !profile[attr] || (
            (typeof profile[attr] === 'string') ? profile[attr] === '' :
            (typeof profile[attr] === 'object') ?
            Object.values(profile[attr]).length === 0 :
            true
        );
    };
    const needed = ['name', 'email', 'id', 'type', 'subjects', 'availability'];
    for (var i = 0; i < needed.length; i++) {
        if (missing(profile, needed[i]))
            return console.warn('[WARNING] Profile did not have a valid ' +
                needed[i] + ', skipping...');
    }
    ['photo', 'grade', 'gender', 'payments', 'proxy', 'bio'].forEach((attr) => {
        if (missing(profile, attr))
            console.warn('[WARNING] Profile did not have a valid ' + attr +
                ', falling back to default...');
    });
    const filtered = {
        name: getName(profile.name),
        uid: profile.uid,
        photo: profile.photo || 'https://tutorbook.app/app/img/' +
            ((profile.gender === 'Female') ? 'female.png' : 'male.png'),
        email: profile.email, // TODO: Move the data flow that requires this
        id: profile.id, // information from the client to this server.
        proxy: profile.proxy || [],
        type: profile.type,
        gender: profile.gender || 'Male',
        grade: profile.grade || 'Sophomore',
        bio: profile.bio || '',
        avgRating: 0, // TODO: Right now we don't support ratings.
        numRatings: 0,
        subjects: profile.subjects,
        availability: profile.availability,
        payments: {
            hourlyCharge: profile.payments.hourlyCharge,
            type: profile.payments.type,
            policy: profile.payments.policy,
        } || {
            houryCharge: 25,
            type: 'Free',
            policy: 'Hourly rate is $25.00 per hour. Will accept ' +
                'lesson cancellations if given notice within 24 hours.' +
                ' No refunds will be issued unless covered by a Tutorbook ' +
                'guarantee.',
        },
    };
    console.log('[DEBUG] Updating (' + profile.email + ') search doc...');
    return search.doc(profile.uid).set(filtered);
};


// TODO: REST API that allows other tutoring platforms to show our results.
const getResults = (req, res) => {
    return cors(req, res, async () => {

    });
};


module.exports = {
    update: updateSearch,
    get: getResults,
    getEmailFromPhone: getEmailFromPhone,
};