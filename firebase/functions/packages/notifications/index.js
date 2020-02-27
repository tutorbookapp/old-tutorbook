const admin = require('firebase-admin');
const firestore = admin.firestore();
const partitions = {
    default: firestore.collection('partitions').doc('default'),
    test: firestore.collection('partitions').doc('test'),
};
const cors = require('cors')({
    origin: true,
});

const Email = require('email');
const SMS = require('sms');
const Webpush = require('webpush');
const Utils = require('utils');

// helper - returns whether or not request was from test partition
const getTest = (context) => context.params.partition === 'test';

// helper - returns partition based on context.partition
const getDB = (context) => {
    if (context.params.partition === 'test') return partitions.test;
    return partitions.default;
};

// helper - returns the proper gender pronoun
const getPronoun = (gender) => {
    switch (gender) {
        case 'Male':
            return 'his';
        case 'Female':
            return 'her';
        default:
            return 'their';
    };
};

// helper - uppercases first letter of a given string
const upper = (str) => {
    return str.substring(0, 1).toUpperCase() + str.substring(1, str.length);
};

const day = () => {
    return [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
    ][new Date().getDay()];
};

// DEPRECATED scheduled appt - calls the below apptNotification function every 
// week as configured in each location's Firestore document
const dailyApptNotifications = async (context) => {
    const db = getDB(context);
    const today = day();
    const locations = (await db.collection('locations').get()).docs;
    return Promise.all(locations.map(async (doc) => {
        const config = doc.data().config;
        if (!config.dailyApptNotifications ||
            !config.dailyApptNotifications.email &&
            !config.dailyApptNotifications.sms) return;
        return axios({
            method: 'get',
            url: 'https://us-central1-tutorbook-779d8.cloudfunctions.net/appt' +
                'Notification',
            params: {
                token: functions.config().tests.key,
                location: doc.id,
                day: today,
                tutor: true,
                pupil: true,
                email: config.dailyApptNotifications.email || false,
                sms: config.dailyApptNotifications.sms || false,
            },
        });
    }));
};
const weeklyApptNotifications = async (context) => {
    const db = getDB(context);
    const today = day();
    const locations = (await db.collection('locations').get()).docs;
    return Promise.all(locations.map(async (doc) => {
        const config = doc.data().config;
        if (!config.weeklyApptNotifications ||
            !config.weeklyApptNotifications.email &&
            !config.weeklyApptNotifications.sms) return;
        return axios({
            method: 'get',
            url: 'https://us-central1-tutorbook-779d8.cloudfunctions.net/appt' +
                'Notification',
            params: {
                token: functions.config().tests.key,
                location: doc.id,
                day: today,
                tutor: true,
                pupil: true,
                email: config.dailyApptNotifications.email || false,
                sms: config.dailyApptNotifications.sms || false,
            },
        });
    }));
};

// DEPRECATED appt - upcoming appt sms messages manually requested by supervisor
// params - {
//   tutor: Send a notification to the toUser?
//   pupil: Send a notification to the fromUser?
//   token: A valid Firebase Authentication token
//   location: The ID of the location (that the appointments are at)
//   day: The day of the appointments
// }
const apptNotification = (req, res) => {
    return cors(req, res, async () => {
        if (!req.query.tutor && !req.query.pupil) {
            res.send('[ERROR] Please specify who to send notifications to.');
            return console.warn('[WARNING] Request did not send any ' +
                'notifications.');
        }
        const db = req.query.test === 'true' ? partitions.test : partitions
            .default;
        const users = db.collection('users');
        const token = await admin.auth().verifyIdToken(req.query.token);
        if (!token.supervisor) {
            res.send('[ERROR] Invalid supervisor authentication token.');
            return console.warn('[WARNING] Request did not send a valid ' +
                'supervisor authentication token.');
        }
        // TODO: Pass uID as request param when not using actual token.
        const supervisor = (await users.doc(token.uid).get()).data();
        const tutors = [];
        const pupils = [];
        const appts = [];
        (await admin.firestore() // TODO: Split this query by partition
            .collectionGroup('appointments')
            .where('location.id', '==', req.query.location)
            .where('time.day', '==', upper(req.query.day)).get()
        ).forEach((doc) => {
            appts.push(doc.data());
        });
        await Promise.all((appts).map(async (appt) => {
            if (req.query.tutor === 'true' &&
                tutors.indexOf(appt.for.toUser.uid) < 0) {
                tutors.push(appt.for.toUser.uid);
                const tutor = (await users.doc(appt.for.toUser.uid).get())
                    .data();
                await new SMS(tutor, supervisor.name + ' wanted to ' +
                    'remind you that you have a tutoring session for ' +
                    appt.subject + ' in the ' + appt.location.name + ' on ' +
                    appt.time.day + ' at ' + appt.time.from + '. Log into ' +
                    'Tutorbook (https://tutorbook.app/app/) to edit, cancel, ' +
                    'or clock into this appointment.',
                    req.query.test === 'true').send();
            }
            if (req.query.pupil === 'true' &&
                pupils.indexOf(appt.for.fromUser.uid) < 0) {
                pupils.push(appt.for.fromUser.uid);
                const pupil = (await users.doc(appt.for.fromUser.uid).get())
                    .data();
                await new SMS(pupil, supervisor.name + ' wanted to ' +
                    'remind you that you have a tutoring session for ' +
                    appt.subject + ' in the ' + appt.location.name + ' on ' +
                    appt.time.day + ' at ' + appt.time.from + '. Log into ' +
                    'Tutorbook (https://tutorbook.app/app/) to view, edit, or' +
                    ' cancel this appointment.',
                    req.query.test === 'true').send();
            }
        }));
        return res.json({
            tutors: tutors,
            pupils: pupils,
            appts: appts,
        });
    });
};

// user - sms, email for new users (custom by user type)
const userNotification = async (snap, context) => {
    const profile = snap.data();
    if (getTest(context)) return console.log('[DEBUG] Skipping welcome ' +
        'notifications to ' + profile.name + ' (' + profile.uid + ') from ' +
        'test partition.');
    if (!profile || !profile.name) return console.warn('[WARNING] Cannot send' +
        ' welcome notifications to users without names.');
    console.log('[DEBUG] Sending ' + profile.name + ' <' + profile.email +
        '> welcome notifications...');
    await new Email('welcome', profile).send();
    await new SMS({
        recipient: profile,
        body: 'Welcome to Tutorbook! This is how you\'ll receive SMS ' +
            'notifications.',
        isTest: getTest(context),
        botOnSuccess: true,
        botMessage: 'Sent ' + profile.name.split(' ')[0] + ' welcome ' +
            'notifications.',
    }).send();
    console.log('[DEBUG] Sent ' + profile.name + ' <' + profile.email +
        '> welcome notifications.');
};

// announcements - sms, webpush for new announcement messages
const announcementNotification = async (snap, context) => {
    const db = getDB(context);
    const isTest = getTest(context);
    // 1) Get all users that match announcement group filters
    console.log('[DEBUG] Getting users that match announcement group ' +
        'filters...');
    const locRef = db.collection('locations').doc(context.params.location);
    const a = (await locRef
        .collection('announcements')
        .doc(context.params.announcement)
        .get()
    ).data();
    const users = await Utils.getFilteredUsers(a.filters, isTest);
    // 2) Add messages to supervisor's chats with those users
    console.log('[DEBUG] Sending messages to ' + users.length + ' users that ' +
        'matched announcement group filters...');
    const msg = Utils.combineMaps(snap.data(), {
        skipSMS: true, // Tell the `messageNotification` function to skip SMS,
        skipEmail: true, // email, and webpush notifications for this message.
        skipWebpush: true,
    });
    if (msg.sentBy.name === 'Operator') console.warn('[WARNING] Skipping ' +
        'notifications for message (' + msg.message + ') sent by Operator.');
    const loc = (await locRef.get()).data();
    const supervisorDMs = {};
    (await db
        .collection('chats')
        .where('chatterUIDs', 'array-contains', msg.sentBy.uid)
        .get()
    ).forEach(chat => {
        const c = chat.data();
        if (c.chatters.length !== 2) return console.warn('[WARNING] Skipping ' +
            'non-DM chat (' + chat.id + ') w/out exactly two chatters.');
        const other = c.chatters[0].uid !== msg.sentBy.uid ? c.chatters[0] : c
            .chatters[1];
        supervisorDMs[other.uid] = chat.ref;
    });
    console.log('[DEBUG] Got ' + Object.keys(supervisorDMs).length +
        ' existing DM chats with these users:', Object.keys(supervisorDMs));
    return Promise.all(users.map(async (user) => {
        if (!supervisorDMs[user.uid]) {
            const chat = {
                lastMessage: {
                    message: msg.message,
                    sentBy: msg.sentBy,
                    timestamp: msg.timestamp,
                },
                chatters: [
                    msg.sentBy,
                    Utils.filterRequestUserData(user),
                ],
                chatterUIDs: [
                    msg.sentBy.uid,
                    user.uid,
                ],
                chatterEmails: [
                    msg.sentBy.email,
                    user.email,
                ],
                location: {
                    id: locRef.id,
                    name: loc.name,
                },
                createdBy: msg.sentBy,
                name: '', // We just use the chatter name as the chat name
                photo: '', // We just use the chatter photo as the chat photo
            };
            supervisorDMs[user.uid] = db.collection('chats').doc();
            await supervisorDMs[user.uid].set(chat);
        } else {
            await supervisorDMs[user.uid].update({
                lastMessage: {
                    message: msg.message,
                    sentBy: msg.sentBy,
                    timestamp: msg.timestamp,
                },
            });
        }
        await supervisorDMs[user.uid].collection('messages').doc().set(msg);
        if (msg.sentBy.name !== 'Operator') return notifyAboutMessage(
            snap.data(), user, isTest, snap.ref.parent.parent);
    }));
};

// helper - sends sms, webpush, and (soon) email notifications about a given 
// message to a given recipient
const notifyAboutMessage = async (msg, recipient, isTest, botChat = {}) => {
    console.log('[DEBUG] Sending message (from chat ' + botChat.path + ') ' +
        'notifications...');
    const notifications = [
        msg.skipSMS ? '' : 'sms',
        msg.skipWebpush ? '' : 'webpush',
        msg.skipEmail ? '' : 'email',
    ].filter(v => v !== '');
    if (!msg.skipSMS) await new SMS({
        recipient: recipient,
        sender: msg.sentBy,
        body: msg.sentBy.name.split(' ')[0] + ' says: ' + msg.message,
        botOnSuccess: false,
        botMessage: 'Sent ' + msg.sentBy.name.split(' ')[0] + '\'s ' +
            'message to ' + recipient.name.split(' ')[0] + ' via SMS.',
        botChat: botChat,
        isTest: isTest,
    }).send();
    if (!msg.skipWebpush) await new Webpush({
        recipient: recipient,
        sender: msg.sentBy,
        title: 'Message from ' + msg.sentBy.name.split(' ')[0],
        body: msg.message,
        botOnSuccess: false,
        botMessage: 'Sent ' + recipient.name.split(' ')[0] + ' a webpush ' +
            'notification about ' + msg.sentBy.name.split(' ')[0] + '\'s ' +
            'message.',
        botChat: botChat,
        isTest: isTest,
    }).send();
    if (!msg.skipEmail) console.warn('[WARNING] Email notifications for ' +
        'messages are not yet implemented.');
    console.log('[DEBUG] Sent ' +
        (notifications.length ? notifications.join(', ') : 'no') + ' message ' +
        'notifications to ' + recipient.name + ' (' + recipient.uid + ').');
};

// messages - sms, webpush for new messages
const messageNotification = async (snap, context) => {
    const msg = snap.data();
    const msgString = 'message (' + msg.message + ') from ' + msg.sentBy.name +
        ' (' + msg.sentBy.uid + ')';
    if (msg.sentBy.name === 'Operator') return console.log('[DEBUG] Skipping ' +
        'message (' + msg.message + ') sent by Operator.');
    if (getTest(context)) return console.log('[DEBUG] Skipping ' + msgString +
        ' sent while testing.');
    if (msg.skipSMS) console.log('[DEBUG] Skipping SMS notifications for ' +
        msgString + '.');
    if (msg.skipWebpush) console.log('[DEBUG] Skipping webpush notifications ' +
        msgString + '.');
    if (msg.skipEmail) console.log('[DEBUG] Skipping email notifications for ' +
        msgString + '.');
    const db = getDB(context);
    const chatRef = db.collection('chats').doc(context.params.chat);
    const chat = (await chatRef.get()).data();
    return Promise.all(chat.chatterUIDs.map(async (uid) => {
        if (uid === msg.sentBy.uid) return console.log('[DEBUG] Skipping ' +
            'notifications for sender.');
        const recipient = (await db.collection('users').doc(uid).get()).data();
        return notifyAboutMessage(msg, recipient, getTest(context));
    }));
};

// feedback - sms to me for new feedback
const feedbackNotification = (snap, context) => {
    const d = snap.data();
    return new SMS({
        recipient: {
            phone: '+16508612723',
            email: 'nc26459@pausd.us',
            id: 'nc26459@pausd.us',
            location: 'Test Location',
        },
        body: 'Feedback from ' + d.from.name + ':\n' + d.message,
        isTest: getTest(context),
    }).send();
};

// appts - email location rules to new 'tutor matches'
const rulesNotification = async (snap, context) => {
    const db = getDB(context);
    const appt = snap.data();
    const users = db.collection('users');
    const tutor = (await users
        .doc(appt.for.toUser.uid).get()).data();
    const pupil = (await users
        .doc(appt.for.fromUser.uid).get()).data();
    const supervisorId = (await db.collection('locations')
        .doc(context.params.location).get()).data().supervisors[0];
    const supervisor = (await users.doc(supervisorId).get()).data();
    if (getTest(context)) return console.log('[DEBUG] Skipping rules email ' +
        'notifications to tutor (' + tutor.name + ' <' + tutor.uid + '>), ' +
        'pupil (' + pupil.name + ' <' + pupil.uid + '>), and supervisor (' +
        supervisor.name + ' <' + supervisor.uid + '>) from test partition.');
    return Promise.all([tutor, pupil, supervisor].map(user => {
        return new Email('rules', user, {
            appt: appt,
            tutor: tutor,
            pupil: pupil,
            supervisor: supervisor,
        }).send();
    }));
};

// requestsIn - sms, webpush, email to tutor for new requests
const requestNotification = async (snap, context) => {
    const db = getDB(context);
    const request = snap.data();
    const u = (await db.collection('users').doc(context.params.user).get())
        .data();
    const summary = request.fromUser.name + ' wants you as a ' +
        request.toUser.type.toLowerCase() + ' for ' + request.subject + '. ' +
        'Login to Tutorbook (https://tutorbook.app) to approve or modify this' +
        ' request.';
    if (getTest(context)) return console.log('[DEBUG] Skipping request ' +
        'notification (' + summary + ') to ' + u.name + ' (' + u.uid + ') ' +
        'from test partition.');
    await new SMS({
        recipient: u,
        body: summary,
        isTest: getTest(context),
        botOnSuccess: true,
        botMessage: 'Sent ' + u.name.split(' ')[0] + ' an SMS notification ' +
            'about ' + request.fromUser.name.split(' ')[0] + '\'s lesson ' +
            'request for ' + request.subject + '.',
    }).send();
    await new Email('request', u, request).send();
    console.log('[DEBUG] Sent new lesson request notification to ' + u.name +
        ' <' + u.email + '> <' + u.phone + '>.');
};

// approvedRequestsOut - sms, webpush, email to pupil for approvedRequests
const approvedRequestNotification = async (snap, context) => {
    const db = getDB(context);
    const approvedBy = snap.data().approvedBy;
    const request = snap.data().for;
    const u = (await db.collection('users').doc(context.params.user).get())
        .data();
    const summary = approvedBy.name + ' approved your lesson request. You' +
        ' now have tutoring appointments for ' + request.subject + ' with ' +
        request.toUser.name.split(' ')[0] + ' on ' + request.time.day + 's at' +
        ' the ' + request.location.name + ' from ' + request.time.from +
        ' until ' + request.time.to + '.';
    if (getTest(context)) return console.log('[DEBUG] Skipping approved ' +
        'request notification (' + summary + ') to ' + u.name + ' (' + u.uid +
        ') from test partition.');
    await new SMS({
        recipient: u,
        body: summary,
        isTest: getTest(context),
        botOnSuccess: true,
        botMessage: 'Sent ' + u.name.split(' ')[0] + ' an SMS notification ' +
            'about ' + getPronoun(u.gender) + ' new appointment with ' +
            request.toUser.name.split(' ')[0] + ' for ' + request.subject + '.',
    }).send();
    await new Email('appt', u, snap.data()).send();
    console.log('[DEBUG] Sent appt notification to ' + u.name + ' <' + u.email +
        '> <' + u.phone + '>.');
};

// pendingClockIns - sms, webpush to the recipient of a clockIn request
const clockIn = async (snap, context) => {
    console.warn('[WARNING] This notification function has not been ' +
        'implemented yet.');
};

// pendingClockOuts - sms, webpush to the recipient of a clockOut request
const clockOut = async (snap, context) => {
    console.warn('[WARNING] This notification function has not been ' +
        'implemented yet.');
};

// modifiedRequestsIn - sms, webpush to tutor when request is modified
const modifiedRequestIn = async (snap, context) => {
    const db = getDB(context);
    const modifiedBy = snap.data().modifiedBy;
    const r = snap.data().for;
    const u = (await db.collection('users').doc(context.params.user).get())
        .data();
    const summary = modifiedBy.name + ' modified ' + (modifiedBy.uid === r
            .fromUser.uid ? getPronoun(modifiedBy.gender) : r.fromUser.name
            .split(' ')[0] + '\'s') + ' lesson request to you for ' +
        r.subject + ' on ' + r.time.day + 's at ' + r.time.from + '.';
    if (getTest(context)) return console.log('[DEBUG] Skipping modified ' +
        'request in notification (' + summary + ') to ' + u.name + ' (' +
        u.uid + ') from test partition.');
    await new SMS({
        recipient: u,
        body: summary,
        isTest: getTest(context),
        botOnSuccess: true,
        botMessage: 'Sent ' + u.name.split(' ')[0] + ' a modified request ' +
            'notification via SMS.',
    }).send();
    await new Webpush({
        recipient: u,
        body: summary,
        isTest: getTest(context),
        botOnSuccess: false,
        botMessage: 'Sent ' + u.name.split(' ')[0] + ' a modified request ' +
            'webpush notification.',
    }).send();
    console.log('[DEBUG] Sent modified request notification to ' + u.name +
        ' <' + u.email + '> <' + u.phone + '>.');
};

// modifiedRequestsOut - sms, webpush to pupil when request is modified
const modifiedRequestOut = async (snap, context) => {
    const db = getDB(context);
    const modifiedBy = snap.data().modifiedBy;
    const r = snap.data().for;
    const u = (await db.collection('users').doc(context.params.user).get())
        .data();
    const summary = modifiedBy.name + ' modified your lesson request for ' +
        r.subject + ' on ' + r.time.day + 's at ' + r.time.from + '.';
    if (getTest(context)) return console.log('[DEBUG] Skipping modified ' +
        'request out notification (' + summary + ') to ' + u.name + ' (' +
        u.uid + ') from test partition.');
    await new SMS({
        recipient: u,
        body: summary,
        isTest: getTest(context),
        botOnSuccess: true,
        botMessage: 'Sent ' + u.name.split(' ')[0] + ' a modified request ' +
            'notification via SMS.',
    }).send();
    await new Webpush({
        recipient: u,
        body: summary,
        isTest: getTest(context),
        botOnSuccess: false,
        botMessage: 'Sent ' + u.name.split(' ')[0] + ' a modified request ' +
            'webpush notification.',
    }).send();
    console.log('[DEBUG] Sent modified request notification to ' + u.name +
        ' <' + u.email + '> <' + u.phone + '>.');
};

// canceledRequestsIn - sms, webpush to tutor when request is canceled
const canceledRequestIn = async (snap, context) => {
    const db = getDB(context);
    const canceledBy = snap.data().canceledBy;
    const r = snap.data().for;
    const u = (await db.collection('users').doc(context.params.user).get())
        .data();
    const summary = canceledBy.name + ' canceled ' + (canceledBy.uid === r
            .fromUser.uid ? getPronoun(canceledBy.gender) : r.fromUser.name
            .split(' ')[0] + '\'s') + ' lesson request to you for ' +
        r.subject + ' on ' + r.time.day + 's at ' + r.time.from + '.';
    if (getTest(context)) return console.log('[DEBUG] Skipping canceled ' +
        'request in notification (' + summary + ') to ' + u.name + ' (' +
        u.uid + ') from test partition.');
    await new SMS({
        recipient: u,
        body: summary,
        isTest: getTest(context),
        botOnSuccess: true,
        botMessage: 'Sent ' + u.name.split(' ')[0] + ' a canceled request ' +
            'notification via SMS.',
    }).send();
    await new Webpush({
        recipient: u,
        body: summary,
        isTest: getTest(context),
        botOnSuccess: false,
        botMessage: 'Sent ' + u.name.split(' ')[0] + ' a canceled request ' +
            'webpush notification.',
    }).send();
    console.log('[DEBUG] Sent canceled request notification to ' + u.name +
        ' <' + u.email + '> <' + u.phone + '>.');
};

// rejectedRequestsOut - sms, webpush to pupil when request is rejected
const rejectedRequestOut = async (snap, context) => {
    const db = getDB(context);
    const rejectedBy = snap.data().rejectedBy;
    const r = snap.data().for;
    const u = (await db.collection('users').doc(context.params.user).get())
        .data();
    const summary = rejectedBy.name + ' rejected your lesson request ' +
        (rejectedBy.uid !== r.toUser.uid ? 'to ' + r.toUser.name + ' ' : '') +
        'for ' + r.subject + ' on ' + r.time.day + 's at ' + r.time.from + '.';
    if (getTest(context)) return console.log('[DEBUG] Skipping rejected ' +
        'request out notification (' + summary + ') to ' + u.name + ' (' +
        u.uid + ') from test partition.');
    await new SMS({
        recipient: u,
        body: summary,
        isTest: getTest(context),
        botOnSuccess: true,
        botMessage: 'Sent ' + u.name.split(' ')[0] + ' a rejected request ' +
            'notification via SMS.',
    }).send();
    await new Webpush({
        recipient: u,
        body: summary,
        isTest: getTest(context),
        botOnSuccess: false,
        botMessage: 'Sent ' + u.name.split(' ')[0] + ' a rejected request ' +
            'webpush notification.',
    }).send();
    console.log('[DEBUG] Sent rejected request notification to ' + u.name +
        ' <' + u.email + '> <' + u.phone + '>.');
};

// modifiedAppointments - sms, webpush, email to other attendee when appt is
// modified
const modifiedAppt = async (snap, context) => {
    const db = getDB(context);
    const modifiedBy = snap.data().modifiedBy;
    const a = snap.data().for;
    const u = (await db.collection('users').doc(context.params.user).get())
        .data();
    const other = a.attendees[0].uid !== u.uid ? a.attendees[0] : a.attendees[1];
    const summary = modifiedBy.name + ' modified your appointment' +
        (modifiedBy.uid !== other.uid ? ' with ' + other.name : '') +
        ' for ' + a.for.subject + ' on ' + a.time.day + 's at ' + a.time.from +
        '.';
    if (getTest(context)) return console.log('[DEBUG] Skipping modified appt ' +
        'notification (' + summary + ') to ' + u.name + ' (' + u.uid + ') ' +
        'from test partition.');
    await new SMS({
        recipient: u,
        body: summary,
        isTest: getTest(context),
        botOnSuccess: true,
        botMessage: 'Sent ' + u.name.split(' ')[0] + ' a modified appointment' +
            ' notification via SMS.',
    }).send();
    await new Webpush({
        recipient: u,
        body: summary,
        isTest: getTest(context),
        botOnSuccess: false,
        botMessage: 'Sent ' + u.name.split(' ')[0] + ' a modified appointment' +
            ' webpush notification.',
    }).send();
    console.log('[DEBUG] Sent modified appt notification to ' + u.name + ' <' +
        u.email + '> <' + u.phone + '>.');
};

// canceledAppointments - sms, webpush, email to other attendee when appt is
// canceled
const canceledAppt = async (snap, context) => {
    const db = getDB(context);
    const canceledBy = snap.data().canceledBy;
    const a = snap.data().for;
    const u = (await db.collection('users').doc(context.params.user).get())
        .data();
    const other = a.attendees[0].uid !== u.uid ? a.attendees[0] : a.attendees[1];
    const summary = canceledBy.name + ' canceled your appointment' +
        (canceledBy.uid !== other.uid ? ' with ' + other.name : '') +
        ' for ' + a.for.subject + ' on ' + a.time.day + 's at ' + a.time.from +
        '.';
    if (getTest(context)) return console.log('[DEBUG] Skipping canceled appt ' +
        'notification (' + summary + ') to ' + u.name + ' (' + u.uid + ') ' +
        'from test partition.');
    await new SMS({
        recipient: u,
        body: summary,
        isTest: getTest(context),
        botOnSuccess: true,
        botMessage: 'Sent ' + u.name.split(' ')[0] + ' a canceled appointment' +
            ' notification via SMS.',
    }).send();
    await new Webpush({
        recipient: u,
        body: summary,
        isTest: getTest(context),
        botOnSuccess: false,
        botMessage: 'Sent ' + u.name.split(' ')[0] + ' a canceled appointment' +
            ' webpush notification.',
    }).send();
    console.log('[DEBUG] Sent canceled appt notification to ' + u.name + ' <' +
        u.email + '> <' + u.phone + '>.');
};


module.exports = {
    rules: rulesNotification,
    user: userNotification,
    announcement: announcementNotification,
    message: messageNotification,
    feedback: feedbackNotification,
    clockIn: clockIn,
    clockOut: clockOut,
    requestIn: requestNotification,
    modifiedIn: modifiedRequestIn,
    canceledIn: canceledRequestIn,
    approvedOut: approvedRequestNotification,
    rejectedOut: rejectedRequestOut,
    modifiedOut: modifiedRequestOut,
    modifiedAppt: modifiedAppt,
    canceledAppt: canceledAppt,
};