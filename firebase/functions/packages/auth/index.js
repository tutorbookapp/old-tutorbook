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


const updateAuth = async (change, context) => {
    const profile = change.after.data();
    const uid = context.params.id;
    if (!profile)
        return console.warn('[WARNING] User (' + uid + ') doc was deleted.');
    const db = admin.firestore().collection('partitions').doc('default');

    // Check to see if the supervisor's id is in the codes collection
    const codes = await db.collection('auth').doc('supervisors').get();
    if (!codes.exists) throw new Error('Supervisor codes did not exist.');
    const validIDs = Object.keys(codes.data());

    if (profile.type === 'Supervisor' && profile.authenticated &&
        validIDs.indexOf(uid) >= 0) { // SUPERVISOR
        console.log('[DEBUG] ' + profile.name + ' was a verified supervisor. ' +
            'Adding customAuth claims...');
        const locations = await db.collection('locations')
            .where('supervisors', 'array-contains', uid)
            .get();
        return admin.auth().setCustomUserClaims(uid, {
            supervisor: true,
            parent: false,
            locations: locations.docs.map(doc => doc.id),
            children: [],
        }).then(() => console.log('[DEBUG] Added supervisor customAuth to ' +
            profile.name + '\'s account.')).catch((err) => console.error(
            '[ERROR] Could not add supervisor customAuth to ' + profile.name +
            '\'s account b/c of ' + err.message));
    } else { // NOTHING
        console.log('[DEBUG] ' + profile.name + ' was not a verified ' +
            'supervisor. Ensuring that they don\'t have customAuth claims...');
        return admin.auth().setCustomUserClaims(uid, {
            supervisor: false,
            parent: false,
            locations: [],
            children: [],
        }).then(() => console.log('[DEBUG] Removed any customAuth claims from' +
            ' ' + profile.name + '\'s account.')).catch((e) => console.error(
            '[ERROR] Could not remove customAuth claims from ' + profile.name +
            '\'s account b/c of ' + e.message));
    }
};


module.exports = {
    update: updateAuth,
    custom: customAuth,
};