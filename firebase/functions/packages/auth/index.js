const admin = require('firebase-admin');
const functions = require('firebase-functions');
const cors = require('cors')({
    origin: true,
});


const customAuth = (req, res) => {
    return cors(req, res, async () => {
        const user = await admin.auth().getUserByEmail(req.query.user);
        if (req.query.token !== functions.config().tests.key) {
            console.error('[ERROR] Token did not match functions config tests' +
                ' key.');
            return res.status(401).send('[ERROR] Token did not match ' +
                'functions config tests key.');
        }
        return admin.auth().createCustomToken(user.uid).then((token) => {
            console.log('[DEBUG] Created custom auth token for user (' +
                user.uid + ').');
            return res.status(200).json(token);
        }).catch((err) => {
            console.error('[ERROR] While creating custom auth token:', err);
            return res.status(500).send('[ERROR] ' + err.message);
        });
    });
};

/**
 * A change to a Firestore document containing snapshots of before and after the
 * change.
 * @typedef {Object} Change
 * @property {DocumentSnapshot} before - The document's snapshot before the 
 * change was enacted.
 * @property {DocumentSnapshot} after - The document's snapshot after the change
 * was enacted.
 */

/**
 * Updates user Firebase Authentication claims to match their user documents.
 * @param {Change} change - The changed (written) Firestore user document.
 * @param {Context} context - The path (in JSON form) of the Firestore user
 * document that was changed.
 * @return {Promise<undefined>} Promise that resolves once the user's Firebase
 * Authentication claims have been updated.
 */
const updateAuth = async (change, context) => {

    // 0) Fetch data and return if the user was deleted. TODO: Remove Firebase
    // Authentication account if the user document was deleted.
    const profile = change.after.data();
    const uid = context.params.id;
    if (!profile) return console.warn('[WARNING] User (' + uid + ') deleted.');
    const db = admin.firestore().collection('partitions').doc('default');

    // 1) Check to see if the supervisor's id is in the codes collection.
    const codes = await db.collection('auth').doc('supervisors').get();
    if (!codes.exists) return console.error('[ERROR] Codes did not exist.');
    const validIDs = Object.keys(codes.data());

    // 2a) If the user is, add the supervisor custom auth claims.
    if (profile.type === 'Supervisor' && profile.authenticated &&
        validIDs.indexOf(uid) >= 0) {
        console.log('[DEBUG] ' + profile.name + ' was a verified supervisor. ' +
            'Adding custom auth claims...');
        return admin.auth().setCustomUserClaims(uid, {
            supervisor: true,
            locations: (await db.collection('locations')
                .where('supervisors', 'array-contains', uid)
                .get()).docs.map(doc => doc.id),
            access: profile.access || [],
        }).then(() => console.log('[DEBUG] Added supervisor custom auth to ' +
            profile.name + '\'s account.')).catch((err) => console.error(
            '[ERROR] Could not add supervisor custom auth to ' + profile.name +
            '\'s account b/c of ' + err.message));
    }

    // 2b) If the user isn't, remove the supervisor custom auth claims.
    console.log('[DEBUG] ' + profile.name + ' was not a verified ' +
        'supervisor. Ensuring that they don\'t have custom auth claims...');
    return admin.auth().setCustomUserClaims(uid, {
        supervisor: false,
        locations: [],
        access: profile.access || [],
    }).then(() => console.log('[DEBUG] Removed any custom auth claims from' +
        ' ' + profile.name + '\'s account.')).catch((e) => console.error(
        '[ERROR] Could not remove custom auth claims from ' + profile.name +
        '\'s account b/c of ' + e.message));
};


module.exports = {
    update: updateAuth,
    custom: customAuth,
};