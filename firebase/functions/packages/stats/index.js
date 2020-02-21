const SMS = require('sms');
const firestore = require('firebase-admin').firestore();
const partitions = {
    default: firestore.collection('partitions').doc('default'),
    test: firestore.collection('partitions').doc('test'),
};

// Helper function that sends me an SMS notification for important events.
const notifyMe = (message, isTest = false) => {
    return console.warn('[WARNING] Stat notifications are disabled for now.');
    return new SMS({
        recipient: {
            phone: '+16508612723',
            name: 'Nicholas Chiang',
        },
    }, message, isTest);
};

// Helper function that gets the user's location's ID by:
// 1) Checking the location named on the user object
// 2) Checking the location named in the user's document
// 3) Checking the user's availability for location names
// 4) Defaulting to the 'Gunn Academic Center'
const getUserLocation = async (user, isTest) => {
    const db = isTest ? partitions.test : partitions.default;
    const getIdFromName = async (name) => {
        const doc = (await db
            .collection('locations')
            .where('name', '==', name.trim())
            .limit(1)
            .get()
        ).docs[0];
        if (!doc) return console.error('[ERROR] No locations named ' +
            name.trim() + '.');
        console.log('[DEBUG] Got ' + name.trim() + ' (' + doc.id + ') data.');
        return doc.id;
    };
    if (user.location) return getIdFromName(user.location);
    const userSnap = (await db.collection('users').doc(user.uid).get()).data();
    if (userSnap.location) return getIdFromName(userSnap.location);
    if (Object.keys(user.availability).length > 0)
        return getIdFromName(Object.keys(user.availability)[0]);
    return 'NJp0Y6wyMh2fDdxSuRSx'; // Default to Gunn Academic Center
};

// Helper function that creates the recentAction document with the given stat 
// data.
const createStat = async (user, stat, isTest) => {
    console.log('[DEBUG] Creating ' + (isTest ? 'test' : 'live') + ' \'' + stat
        .title + '\' stat triggered by ' + user.name + ' (' + user.uid +
        ')...');
    const db = isTest ? partitions.test : partitions.default;
    if (!isTest) notifyMe('[SUBTITLE] ' + stat.subtitle + ' \n[SUMMARY] ' +
        stat.summary, isTest);
    const locationID = await getUserLocation(user, isTest);
    return locationID ? db
        .collection('locations')
        .doc(locationID)
        .collection('recentActions')
        .doc()
        .set(stat) : console.warn('[WARNING] Could not create stat in ' +
            'undefined location.');
};

// Stats triggered when a user attempts and fails to complete a data action.
const failedDataAction = {
    newRequest: (user, data, err, isTest) => {
        return console.error('[ERROR] The newRequest failedDataAction stat ' +
            'has not been implemented yet.');
    },
};

// Stats triggered when a user completes a data action.
const dataAction = {
    newRequest: async (user, data, res, isTest) => {
        const r = data.request;
        const stat = {
            title: 'New Request',
            subtitle: user.name.split(' ')[0] + ' sent a lesson request',
            summary: r.fromUser.name + ' requested ' + r.toUser.name + ' to ' +
                'be their ' + r.toUser.type.toLowerCase() + ' for ' +
                r.subject + ' on ' + r.time.day + 's at ' + r.time.from + '.',
            timestamp: new Date(r.timestamp),
        };
        return createStat(user, stat, isTest);
    },
    cancelRequest: async (user, data, res, isTest) => {
        const r = data.request;
        const stat = {
            title: 'Canceled Request',
            subtitle: user.name.split(' ')[0] + ' canceled a lesson request',
            summary: r.fromUser.name + '\'s request to ' + r.toUser.name +
                ' for ' + r.subject + ' on ' + r.time.day + 's at ' +
                r.time.from + ' was canceled by ' + user.name + '.',
            timestamp: new Date(),
        };
        return createStat(user, stat, isTest);
    },
    rejectRequest: async (user, data, res, isTest) => {
        const r = data.request;
        const stat = {
            title: 'Rejected Request',
            subtitle: user.name.split(' ')[0] + ' rejected a lesson request',
            summary: r.fromUser.name + '\'s lesson request to ' +
                r.toUser.name + ' for ' + r.subject + ' on ' + r.time.day +
                's at ' + r.time.from + ' was rejected by ' + user.name + '.',
            timestamp: new Date(),
        };
        return createStat(user, stat, isTest);
    },
    modifyRequest: async (user, data, res, isTest) => {
        const r = data.request;
        const stat = {
            title: 'Modified Request',
            subtitle: user.name.split(' ')[0] + ' modified a lesson request',
            summary: r.fromUser.name + '\'s lesson request to ' +
                r.toUser.name + ' for ' + r.subject + ' on ' + r.time.day +
                's at ' + r.time.from + ' was modified by ' + user.name + '.',
            timestamp: new Date(),
        };
        return createStat(user, stat, isTest);
    },
    approveRequest: async (user, data, res, isTest) => {
        const r = data.request;
        const stat = {
            title: 'New Appointment',
            subtitle: user.name.split(' ')[0] + ' approved a lesson request',
            summary: r.fromUser.name + '\'s lesson request to ' +
                r.toUser.name + ' was approved by ' + user.name + '. They now' +
                ' have appointments on ' + r.time.day + 's at the ' +
                r.location.name + ' from ' + r.time.from + ' until ' +
                r.time.to + '.',
            timestamp: new Date(),
        };
        return createStat(user, stat, isTest);
    },
    cancelAppt: async (user, data, res, isTest) => {
        const a = data.appt;
        const r = a.for;
        const stat = {
            title: 'Canceled Appointment',
            subtitle: user.name.split(' ')[0] + ' canceled an appointment',
            summary: r.fromUser.name + '\'s appointment for ' + a.for.subject +
                ' with ' + r.toUser.name + ' on ' + a.time.day + 's at ' +
                a.time.from + ' was canceled by ' + user.name + '.',
            timestamp: new Date(),
        };
        return createStat(user, stat, isTest);
    },
    modifyAppt: async (user, data, res, isTest) => {
        const a = data.appt;
        const r = a.for;
        const stat = {
            title: 'Modified Appointment',
            subtitle: user.name.split(' ')[0] + ' modified an appointment',
            summary: r.fromUser.name + '\'s appointment for ' + a.for.subject +
                ' with ' + r.toUser.name + ' on ' + a.time.day + 's at ' +
                a.time.from + ' was modified by ' + user.name + '.',
            timestamp: new Date(),
        };
        return createStat(user, stat, isTest);
    },
    modifyPastAppt: async (user, data, res, isTest) => {
        const a = data.appt;
        const r = a.for;
        const dateString = new Date(a.clockIn.sentTimestamp).toDateString();
        const stat = {
            title: 'Modified Past Appointment',
            subtitle: user.name.split(' ')[0] + ' modified a past appointment',
            summary: r.fromUser.name + '\'s past appointment for ' +
                a.for.subject + ' with ' + r.toUser.name + ' on ' + dateString +
                ' was modified by ' + user.name + '.',
            timestamp: new Date(),
        };
        return createStat(user, stat, isTest);
    },
    deletePastAppt: async (user, data, res, isTest) => {
        const a = data.appt;
        const r = a.for;
        const clockIn = a.clockIn.sentTimestamp.getTime ? a.clockIn
            .sentTimestamp : a.clockIn.sentTimestamp.toDate ? a.clockIn
            .sentTimestamp.toDate() : new Date(a.clockIn.sentTimestamp);
        const stat = {
            title: 'Deleted Past Appointment',
            subtitle: user.name.split(' ')[0] + ' deleted a past appointment',
            summary: r.fromUser.name + '\'s past appointment for ' +
                a.for.subject + ' with ' + r.toUser.name + ' on ' +
                clockIn.toDateString() + ' was deleted by ' + user.name + '.',
            timestamp: new Date(),
        };
        return createStat(user, stat, isTest);
    },
    createLocation: async (user, data, res, isTest) => {
        const l = res.location;
        const created = l.timestamp.getTime ? l.timestamp : l.timestamp.toDate ?
            l.timestamp.toDate() : new Date(l.timestamp);
        const stat = {
            title: 'New Location',
            subtitle: user.name.split(' ')[0] + ' created the ' + l.name,
            summary: user.name + ' created the ' + l.name + ' on ' + created
                .toDateString() + '. Contact +1 (650) 861-2723 for more ' +
                'information.',
            timestamp: created,
        };
        return createStat(user, stat, isTest);
    },
    updateLocation: async (user, data, res, isTest) => {
        const l = res.location;
        const stat = {
            title: 'Updated Location',
            subtitle: user.name.split(' ')[0] + ' updated the ' + l.name,
            summary: user.name + ' updated the ' + l.name + '\'s ' +
                'configuration data. Contact +1 (650) 861-2723 for more ' +
                'information.',
            timestamp: new Date(),
        };
        return createStat(user, stat, isTest);
    },
    deleteLocation: async (user, data, res, isTest) => {
        const l = res.location;
        const stat = {
            title: 'Deleted Location',
            subtitle: user.name.split(' ')[0] + ' deleted the ' + l.name,
            summary: user.name + ' deleted the ' + l.name + '\'s ' +
                'configuration data. Contact +1 (650) 861-2723 for more ' +
                'information.',
            timestamp: new Date(),
        };
        return createStat(user, stat, isTest);
    },
};

// Stat triggered whenever a user modifies their profile document.
const userUpdate = async (change, context) => {
    const isTest = context.params.partition === 'test';
    if (!change.after.exists) {
        var user = change.before.data();
        if (!user.name) return console.warn('[WARNING] Could not create stat ' +
            'for user without name.');
        var stat = {
            title: 'Deleted Account',
            subtitle: user.name.split(' ')[0] + '\'s account was deleted',
            summary: user.name + '\'s profile data was deleted and will be ' +
                'permanently removed when you dismiss this card. To restore ' +
                user.name.split(' ')[0] + '\'s account, email help@tutorbook' +
                '.app or contact me directly at (650) 861-2723.',
            timestamp: new Date(),
            data: user,
        };
    } else if (!change.before.exists) {
        var user = change.after.data();
        if (!user.name) return console.warn('[WARNING] Could not create stat ' +
            'for user without name.');
        var stat = {
            title: 'New User',
            subtitle: user.name.split(' ')[0] + ' signed up' + (user.type ?
                ' as a ' + user.type.toLowerCase() : ''),
            summary: user.name + ' is a new ' +
                (user.type.toLowerCase() || 'user') + ' on Tutorbook. Search ' +
                '\'' + user.name + '\' from your home screen to view, edit, ' +
                'and match this new user.',
            timestamp: new Date(),
        };
    } else {
        var user = change.after.data();
        if (!user.name) return console.warn('[WARNING] Could not create stat ' +
            'for user without name.');
        var stat = {
            title: 'Updated Profile',
            subtitle: user.name.split(' ')[0] + '\'s profile was modified',
            summary: user.name + '\'s profile was updated. To see the changes' +
                ', search \'' + user.name + '\' from your home screen.',
            timestamp: new Date(),
        };
        return console.warn('[WARNING] Skipping updated profiles for now...');
    }
    return createStat(user, stat, isTest);
};

module.exports = {
    dataAction: dataAction,
    failedDataAction: failedDataAction,
    userUpdate: userUpdate,
};