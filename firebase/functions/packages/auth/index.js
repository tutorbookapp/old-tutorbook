const admin = require('firebase-admin');
const functions = require('firebase-functions');
const cors = require('cors')({
    origin: true,
});

const Utils = require('utils');

/**
 * A change to a Firestore document containing snapshots of before and after the
 * change.
 * @typedef {Object} Change
 * @property {external:DocumentSnapshot} before - The document's snapshot before 
 * the change was enacted.
 * @property {external:DocumentSnapshot} after - The document's snapshot after 
 * the change was enacted.
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
    const db = admin.firestore().collection('partitions')
        .doc(context.params.partition);

    // 1) Fetch `accessIds` and update the user's `access` to match what their
    // email domain fits.
    const originalAccess = profile.access.map(i => i);
    profile.access = [];
    for (const access of (await db.collection('access').get()).docs) {
        for (const emailDomain of access.data().domains)
            if (profile.email.endsWith(emailDomain))
                profile.access.push(access.id);
        for (const email of access.data().exceptions)
            if (profile.email === email) profile.access.push(access.id);
    }
    // If the user access to a school partition and doesn't have the root
    // partition listed in their profile, remove it (so they don't show up in
    // searches on the root partition). Note that users can change their access
    // to add or remove the 'root' part of it (i.e. to set if their profile's
    // are public or not).
    if (profile.access.length > 1 && originalAccess.indexOf('root') < 0)
        profile.access = profile.access.filter(a => a !== 'root');
    await db.collection('users').doc(profile.uid).update({
        access: profile.access,
    });

    // 2) Check to see if the supervisor's id is in the codes collection.
    const codes = await db.collection('auth').doc('supervisors').get();
    if (!codes.exists) return console.error('[ERROR] Codes did not exist.');
    const validIDs = Object.keys(codes.data());

    // 3a) If the user is, add the supervisor custom auth claims.
    if (profile.type === 'Supervisor' && profile.authenticated &&
        validIDs.indexOf(uid) >= 0) {
        console.log('[DEBUG] ' + profile.name + ' was a verified supervisor. ' +
            'Adding custom auth claims...');
        return admin.auth().setCustomUserClaims(uid, {
            supervisor: true,
            locations: (await db.collection('locations')
                .where('supervisors', 'array-contains', uid)
                .get()).docs.map(doc => doc.id),
            access: Utils.concatArr(profile.access, ['root']),
        }).then(() => console.log('[DEBUG] Added supervisor custom auth to ' +
            profile.name + '\'s account.')).catch((err) => console.error(
            '[ERROR] Could not add supervisor custom auth to ' + profile.name +
            '\'s account b/c of ' + err.message));
    }

    // 3b) If the user isn't, remove the supervisor custom auth claims.
    console.log('[DEBUG] ' + profile.name + ' was not a verified ' +
        'supervisor. Ensuring that they don\'t have custom auth claims...');
    return admin.auth().setCustomUserClaims(uid, {
        supervisor: false,
        locations: [],
        access: Utils.concatArr(profile.access, ['root']),
    }).then(() => console.log('[DEBUG] Removed any custom auth claims from' +
        ' ' + profile.name + '\'s account.')).catch((e) => console.error(
        '[ERROR] Could not remove custom auth claims from ' + profile.name +
        '\'s account b/c of ' + e.message));
};

module.exports = updateAuth;