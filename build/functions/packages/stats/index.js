const db = require('firebase-admin')
    .firestore()
    .collection('partitions')
    .doc('default');

// Helper function that gets the user's location's ID by:
// 1) Checking the location named on the user object
// 2) Checking the location named in the user's document
// 3) Checking the user's availability for location names
// 4) Defaulting to the 'Gunn Academic Center'
const getUserLocation = async (user) => {
    const getIdFromName = async (name) => (await db
        .collection('locations')
        .where('name', '==', name)
        .limit(1)
        .get()
    ).docs[0].id;
    if (user.location) return getIdFromName(user.location);
    const userSnap = (await db.collection('users').doc(user.uid).get()).data();
    if (userSnap.location) return getIdFromName(userSnap.location);
    if (Object.keys(user.availability).length > 0)
        return getIdFromName(Object.entries(user.availability)[0][0]);
};

const failedDataAction = {
    newRequest: (user, data, err) => {
        return console.error('[ERROR] The newRequest failedDataAction stat ' +
            'has not been implemented yet.');
    },
};

const dataAction = {
    newRequest: async (user, data, res) => {
        const r = data.request;
        const stat = {
            title: 'New Request',
            subtitle: user.name.split(' ')[0] + ' sent a lesson request',
            summary: r.fromUser.name + ' requested ' + r.toUser.name + ' to ' +
                'be their ' + r.toUser.type.toLowerCase() + ' for ' +
                r.subject + ' on ' + r.time.day + 's at ' + r.time.from + '.',
            timestamp: r.timestamp,
        };
        return db
            .collection('locations')
            .doc((await getUserLocation(user)))
            .collection('recentActions')
            .doc()
            .set(stat);
    },
    cancelRequest: async (user, data, res) => {
        const r = data.request;
        const stat = {
            title: 'Canceled Request',
            subtitle: user.name.split(' ')[0] + ' canceled a lesson request',
            summary: r.fromUser.name + '\'s request to ' + r.toUser.name +
                ' for ' + r.subject + ' on ' + r.time.day + 's at ' +
                r.time.from + ' was canceled.',
            timestamp: new Date(),
        };
        return db
            .collection('locations')
            .doc((await getUserLocation(user)))
            .collection('recentActions')
            .doc()
            .set(stat);
    },
};

const userUpdate = async (change, context) => {
    if (!change.after.exists) {
        var user = change.before.data();
        var stat = {
            title: 'Deleted Account',
            subtitle: user.name.split(' ')[0] + '\'s account was deleted',
            summary: user.name + '\'s profile data was deleted and will be ' +
                'permanently removed when you dismiss this card. To restore ' +
                user.name.split(' ')[0] + '\'s account, contact me directly ' +
                'at (650) 861-2723.',
            timestamp: new Date(),
            data: user,
        };
    } else if (!change.before.exists) {
        var user = change.after.data();
        var stat = {
            title: 'New User',
            subtitle: user.name.split(' ')[0] + ' signed up as a ' +
                user.type.toLowerCase(),
            summary: user.name + ' is a new ' + user.type.toLowerCase() +
                ' on Tutorbook. Search \'' + user.name + '\' from your home ' +
                'screen to view, edit, and match this new user.',
            timestamp: new Date(),
        };
    } else {
        var user = change.after.data();
        var stat = {
            title: 'Updated Profile',
            subtitle: user.name.split(' ')[0] + '\'s profile was modified',
            summary: user.name + '\'s profile was updated. To see the changes' +
                ', search \'' + user.name + '\' from your home screen.',
            timestamp: new Date(),
        };
        return console.warn('[WARNING] Skipping updated profiles for now...');
    }
    return db
        .collection('locations')
        .doc((await getUserLocation(user)))
        .collection('recentActions')
        .doc()
        .set(stat);
};

const removeOldStats = () => {
    // TODO: Clear history to only 50 actions stored per location every week.
};

module.exports = {
    dataAction: dataAction,
    failedDataAction: failedDataAction,
    userUpdate: userUpdate,
    clean: removeOldStats,
};