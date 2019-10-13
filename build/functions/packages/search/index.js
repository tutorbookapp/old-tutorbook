const admin = require('firebase-admin');
const cors = require('cors')({
    origin: true,
});


function getName(name) { // Returns first name with last initial
    const split = name.split(' ');
    return split[0] + ' ' + split[split.length - 1].charAt(0);
};


// Manages the copying of data from the `users` collection (that noone can read)
// to the `search` collection (that anyone can read).
const updateSearch = async (change, context) => {
    const profile = change.after.data();
    const id = context.params.id;
    const db = admin.firestore().collection('search');
    if (!profile || !profile.config.showProfile) return db.doc(id).delete();
    const filtered = {
        name: getName(profile.name),
        email: profile.email, // TODO: Use uIDs to protect email addresses
        id: profile.email,
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
    return db.doc(id).set(filtered);
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