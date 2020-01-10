const SMS = require('sms');
const firestore = require('firebase-admin').firestore();
const partitions = {
    default: firestore.collection('partitions').doc('defualt'),
    test: firestore.collection('partitions').doc('test'),
};

const notifyMe = (message) => {
    return new SMS({
        phone: '+16508612723',
        name: 'Nicholas Chiang',
    }, message);
};

// Helper function that gets the user's location's ID by:
// 1) Checking the location named on the user object
// 2) Checking the location named in the user's document
// 3) Checking the user's availability for location names
// 4) Defaulting to the 'Gunn Academic Center'
const getUserLocation = async (user, isTest) => {
    const db = isTest ? partitions.test : partitions.default;
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
    newRequest: (user, data, err, isTest) => {
        const db = isTest ? partitions.test : partitions.default;
        return console.error('[ERROR] The newRequest failedDataAction stat ' +
            'has not been implemented yet.');
    },
};

const dataAction = {
    newRequest: async (user, data, res, isTest) => {
        const db = isTest ? partitions.test : partitions.default;
        const r = data.request;
        const stat = {
            title: 'New Request',
            subtitle: user.name.split(' ')[0] + ' sent a lesson request',
            summary: r.fromUser.name + ' requested ' + r.toUser.name + ' to ' +
                'be their ' + r.toUser.type.toLowerCase() + ' for ' +
                r.subject + ' on ' + r.time.day + 's at ' + r.time.from + '.',
            timestamp: r.timestamp,
        };
        if (!isTest) notifyMe(user.name + ' sent a lesson request on behalf ' +
            'of ' + r.fromUser.name + ' to ' + r.toUser.name + ' for ' +
            r.subject + ' on ' + r.time.day + 's at ' + r.time.from + ' at ' +
            'the ' + r.location.name + '.');
        return db
            .collection('locations')
            .doc((await getUserLocation(user, isTest)))
            .collection('recentActions')
            .doc()
            .set(stat);
    },
    cancelRequest: async (user, data, res, isTest) => {
        const db = isTest ? partitions.test : partitions.default;
        const r = data.request;
        const stat = {
            title: 'Canceled Request',
            subtitle: user.name.split(' ')[0] + ' canceled a lesson request',
            summary: r.fromUser.name + '\'s request to ' + r.toUser.name +
                ' for ' + r.subject + ' on ' + r.time.day + 's at ' +
                r.time.from + ' was canceled.',
            timestamp: new Date(),
        };
        if (!isTest) notifyMe(user.name + ' canceled a lesson request from ' +
            r.fromUser.name + ' to ' + r.toUser.name + ' for ' + r.subject +
            ' on  ' + r.time.day + 's at ' + r.time.from + ' at the ' +
            r.location.name + '.');
        return db
            .collection('locations')
            .doc((await getUserLocation(user, isTest)))
            .collection('recentActions')
            .doc()
            .set(stat);
    },
};

const userUpdate = async (change, context) => {
    const isTest = context.params.partition === 'test';
    const db = isTest ? partitions.test : partitions.default;
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
        if (!isTest) notifyMe(user.name + '\'s profile data was just deleted.');
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
        if (!isTest) notifyMe(user.name + ' just signed up as a ' +
            user.type.toLowerCase() + '.');
    } else {
        var user = change.after.data();
        var stat = {
            title: 'Updated Profile',
            subtitle: user.name.split(' ')[0] + '\'s profile was modified',
            summary: user.name + '\'s profile was updated. To see the changes' +
                ', search \'' + user.name + '\' from your home screen.',
            timestamp: new Date(),
        };
        if (!isTest) notifyMe(user.name + ' updated their profile (and thus ' +
            'most likely just logged in).');
        return console.warn('[WARNING] Skipping updated profiles for now...');
    }
    return db
        .collection('locations')
        .doc((await getUserLocation(user, isTest)))
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