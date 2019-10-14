const admin = require('firebase-admin');
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
            photoURL: (profile.photo && profile.photo !== '') ? profile.photo : 'https://tutorbook.app/app/img/male.png',
            disabled: false,
        }));
        if (err) return console.error(err.message);
    }
    return user.uid;
};


function getName(name) { // Returns first name with last initial
    const split = name.split(' ');
    return split[0] + ' ' + split[split.length - 1].charAt(0);
};


// Manages the copying of data from the `users` collection (that noone can read)
// to the `search` collection (that anyone can read).
const updateSearch = async (change, context) => {
    const profile = change.after.data();
    const db = admin.firestore().collection('search');
    if (!profile || !profile.config.showProfile) return db.doc(profile.uid)
        .delete();
    if (!profile.uid || profile.uid === '') {
        profile.uid = await getUID(profile);
        await admin.firestore().collection('users').doc(context.params.id)
            .update(profile);
    }
    const filtered = {
        name: getName(profile.name),
        uid: profile.uid,
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
            policy: profile.payments.policy,
        },
    };
    return db.doc(profile.uid).set(filtered);
};


// TODO: REST API that allows other tutoring platforms to show our results.
const getResults = (req, res) => {
    return cors(req, res, async () => {

    });
};


module.exports = {
    update: updateSearch,
    get: getResults,
};