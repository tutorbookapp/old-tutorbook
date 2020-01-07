const admin = require('firebase-admin');
const db = admin.firestore().collection('partitions').doc('default');
const cors = require('cors')({
    origin: true,
});

const Email = require('email');
const SMS = require('sms');
const Webpush = require('webpush');

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

// appt - upcoming appt sms messages manually requested by supervisor
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
            return console.warn('Request did not send any notifications.');
        }
        const users = db.collection('users');
        const token = await admin.auth().verifyIdToken(req.query.token);
        if (!token.supervisor) {
            res.send('[ERROR] Invalid supervisor authentication token.');
            return console.warn('Request did not send a valid supervisor ' +
                'authentication token.');
        }
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
                    appt.time.day + ' at ' + appt.time.from + '.');
            }
            if (req.query.pupil === 'true' &&
                pupils.indexOf(appt.for.fromUser.uid) < 0) {
                pupils.push(appt.for.fromUser.uid);
                const pupil = (await users.doc(appt.for.fromUser.uid).get())
                    .data();
                await new SMS(pupil, supervisor.name + ' wanted to ' +
                    'remind you that you have a tutoring session for ' +
                    appt.subject + ' in the ' + appt.location.name + ' on ' +
                    appt.time.day + ' at ' + appt.time.from + '.');
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
    if (!profile || !profile.name) return console.warn('Cannot send welcome ' +
        'notifications to users without names.');
    console.log('Sending ' + profile.name + ' <' + profile.email +
        '> welcome notifications...');
    await new Email('welcome', profile);
    await new SMS(profile, 'Welcome to Tutorbook! This is how ' +
        'you\'ll receive SMS notifications. To turn them off, go to ' +
        'settings and toggle SMS notifications off.');
    console.log('Sent ' + profile.name + ' <' + profile.email +
        '> welcome notifications.');
};

// messages - sms, webpush for new messages
const messageNotification = async (snap, context) => {
    const chat = await db.collection('chats')
        .doc(context.params.chat).get();
    return chat.data().chatterUIDs.forEach(async (uid) => {
        if (uid !== snap.data().sentBy.uid) {
            await new Webpush(
                uid,
                'Message from ' + snap.data().sentBy.name.split(' ')[0],
                snap.data().message, {
                    id: context.params.chat
                },
            );
            await new SMS((await db.collection('users')
                    .doc(uid).get()).data(),
                'Message from ' + snap.data().sentBy.name.split(' ')[0] +
                ': ' + snap.data().message
            );
        }
    });
};

// chats - sms, webpush for all other recipients to a new chat group
const chatNotification = (snap, context) => {
    const chat = snap.data();
    const body = chat.createdBy.name + ' wants to chat with you. Log ' +
        'into Tutorbook (https://tutorbook.app/app/messages) to respond ' +
        'to ' + getPronoun(chat.createdBy.gender) + ' messages.';
    const title = 'Chat with ' + chat.createdBy.name;
    // Send notification to all the other people on the chat
    return chat.chatters.forEach(async (chatter) => {
        if (chatter.uid !== chat.createdBy.uid) {
            await new Webpush(chatter.uid, title, body);
            await new SMS((await admin
                .firestore()
                .collection('users')
                .doc(chatter.uid)
                .get()
            ).data(), body);
        }
    });
};

// feedback - sms to me for new feedback
const feedbackNotification = async (snap, context) => {
    await new SMS({
            phone: '+16508612723',
            email: 'nc26459@pausd.us',
            id: 'nc26459@pausd.us',
            location: 'Test Location',
        }, 'Feedback from ' + snap.data().from.name + ': ' +
        snap.data().message);
};

// appts - email location rules to new 'tutor matches'
const rulesNotification = async (snap, context) => {
    const appt = snap.data();
    const users = db.collection('users');
    const tutor = (await users
        .doc(appt.for.toUser.uid).get()).data();
    const pupil = (await users
        .doc(appt.for.fromUser.uid).get()).data();
    const supervisorId = (await db.collection('locations')
        .doc(context.params.location).get()).data().supervisors[0];
    const supervisor = (await users.doc(supervisorId).get()).data();
    [tutor, pupil, supervisor].forEach(async (user) => {
        await new Email('rules', user, {
            appt: appt,
            tutor: tutor,
            pupil: pupil,
            supervisor: supervisor,
        });
    });
};

// requestsIn - sms, webpush, email to tutor for new requests
const requestNotification = async (snap, context) => {
    const request = snap.data();
    const user = await db.collection('users')
        .doc(context.params.user).get();
    const summary = request.fromUser.name + ' wants you as a ' +
        request.toUser.type.toLowerCase() + ' for ' + request.subject +
        '. Log into your Tutorbook dashboard (https://tutorbook.app/app)' +
        ' to approve or modify this request.';
    await new SMS(user.data(), summary);
    await new Email('request', user.data(), request);
    console.log('Sent request notification to ' + user.data().name + ' <' +
        user.data().email + '> <' + user.data().phone + '>.');
};

// approvedRequestsOut - sms, webpush, email to pupil for approvedRequests
const approvedRequestNotification = async (snap, context) => {
    const approvedBy = snap.data().approvedBy;
    const request = snap.data().for;
    const user = await db.collection('users')
        .doc(context.params.user).get();
    const summary = approvedBy.name + ' approved your lesson request. You' +
        ' now have tutoring appointments for ' + request.subject +
        ' with ' + request.toUser.name.split(' ')[0] + ' on ' +
        request.time.day + 's at the ' + request.location.name + ' from ' +
        request.time.from + ' until ' + request.time.to + '.';
    await new SMS(user.data(), summary);
    await new Email('appt', user.data(), snap.data());
    console.log('Sent appt notification to ' + user.data().name + ' <' +
        user.data().email + '> <' + user.data().phone + '>.');
};

// pendingClockIns - sms, webpush to the recipient of a clockIn request
const clockIn = async (snap, context) => {
    console.warn('This notification function has not been implemented yet.');
};

// pendingClockOuts - sms, webpush to the recipient of a clockOut request
const clockOut = async (snap, context) => {
    console.warn('This notification function has not been implemented yet.');
};

// modifiedRequestsIn - sms, webpush to tutor when request is modified
const modifiedRequestIn = async (snap, context) => {
    console.warn('This notification function has not been implemented yet.');
};

// modifiedRequestsOut - sms, webpush to pupil when request is modified
const modifiedRequestOut = async (snap, context) => {
    console.warn('This notification function has not been implemented yet.');
};

// canceledRequestsIn - sms, webpush to tutor when request is canceled
const canceledRequestIn = async (snap, context) => {
    console.warn('This notification function has not been implemented yet.');
};

// rejectedRequestsOut - sms, webpush to pupil when request is rejected
const rejectedRequestOut = async (snap, context) => {
    console.warn('This notification function has not been implemented yet.');
};

// modifiedAppointments - sms, webpush, email to other attendee when appt is
// modified
const modifiedAppt = async (snap, context) => {
    console.warn('This notification function has not been implemented yet.');
};

// canceledAppointments - sms, webpush, email to other attendee when appt is
// canceled
const canceledAppt = async (snap, context) => {
    console.warn('This notification function has not been implemented yet.');
};


module.exports = {
    appt: apptNotification,
    rules: rulesNotification,
    user: userNotification,
    message: messageNotification,
    chat: chatNotification,
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