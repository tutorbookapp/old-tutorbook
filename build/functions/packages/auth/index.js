const admin = require('firebase-admin');


const updateAuth = async (change, context) => {
    const profile = change.after.data();
    const id = context.params.id;
    if (!profile) {
        return console.warn('User (' + id + ') doc was deleted.');
    }
    const db = admin.firestore();

    // Check to see if the supervisor's id is in the codes collection
    const supervisorCodes = await admin.firestore().collection('auth')
        .doc('supervisors')
        .get();
    var validIDs = [];
    Object.entries(supervisorCodes.data()).forEach((entry) => {
        validIDs.push(entry[1]);
    });
    if (profile.type === 'Supervisor' && profile.authenticated &&
        validIDs.indexOf(id) >= 0) { // SUPERVISOR
        console.log(profile.name + ' was a verified supervisor. ' +
            'Adding customAuth claims...');
        const locations = await db.collection('locations')
            .where('supervisors', 'array-contains', profile.email)
            .get();
        var locationIDs = [];
        locations.forEach((doc) => {
            locationIDs.push(doc.id);
        });
        return admin.auth()
            .setCustomUserClaims(profile.uid, {
                supervisor: true,
                parent: false,
                locations: locationIDs,
                children: [],
            }).then(() => {
                console.log('Added supervisor customAuth to ' +
                    profile.email + '\'s account.');
            }).catch((err) => {
                console.error('Error while adding ' +
                    'supervisor customAuth to ' + profile.email +
                    '\'s account:', err);
            });
    } else { // NOTHING
        console.log(profile.name + ' was not a verified supervisor. ' +
            'Ensuring that they don\'t have customAuth claims...');
        return admin.auth()
            .setCustomUserClaims(profile.uid, {
                supervisor: false,
                parent: false,
                locations: [],
                children: [],
            })
            .then(() => {
                console.log('Removed any customAuth claims from ' +
                    profile.email + '\'s account.');
            }).catch((err) => {
                console.error('Error while removing customAuth claims' +
                    ' from ' + profile.email + '\'s account:', err);
            });
    }
};


module.exports = updateAuth;