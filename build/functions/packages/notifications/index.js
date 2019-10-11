const admin = require('firebase-admin');

const Email = require('email');
const SMS = require('sms');
const Webpush = require('webpush');


// user - sms, email for new users (custom by user type)
const userNotification = async (snap, context) => {
    const profile = snap.data();
    console.log('Sending ' + profile.name + ' <' + profile.email +
        '> welcome notifications...');
    await new Email('welcome', profile);
    await new SMS(profile.phone, 'Welcome to Tutorbook! This is how ' +
        'you\'ll receive SMS notifications. To turn them off, go to ' +
        'settings and toggle SMS notifications off.');
    console.log('Sent ' + profile.name + ' <' + profile.email +
        '> welcome notifications.');
};

// messages - webpush for new messages
const messageNotification = async (snap, context) => {
    const chat = await admin.firestore().collection('chats')
        .doc(context.params.chat).get();
    return chat.data().chatterEmails.forEach(async (email) => {
        if (email !== message.sentBy.email) {
            await new Webpush(
                email,
                'Message from ' + snap.data().sentBy.name,
                snap.data().message
            );
        }
    });
};

// chats - sms, webpush for all other recipients to a new chat group
const chatNotification = (snap, context) => {
    const chat = snap.data();
    const body = chat.createdBy.name + ' wants to chat with you. Log ' +
        'into Tutorbook (https://tutorbook.app/app/messages) to respond ' +
        'to ' + Utils.getPronoun(chat.createdBy.gender) + ' messages.';
    const title = 'Chat with ' + chat.createdBy.name;
    // Send notification to all the other people on the chat
    return chat.chatters.forEach(async (chatter) => {
        if (chatter.email !== chat.createdBy.email) {
            await new Webpush(chatter.email, title, body);
            await new SMS(chatter.phone, body);
        }
    });
};

// feedback - sms to me for new feedback
const feedbackNotification = async (snap, context) => {
    await new SMS('+16508612723', 'Feedback from ' + snap.data().from.name +
        ': ' + snap.data().message);
};

// requestsIn - sms, webpush, email to tutor for new requests
const requestNotification = async (snap, context) => {
    const request = snap.data();
    const user = await admin.firestore().collection('users')
        .doc(context.params.user).get();
    const summary = request.fromUser.name + ' wants you as a ' +
        request.toUser.type.toLowerCase() + ' for ' + request.subject +
        '. Log into your Tutorbook dashboard (https://tutorbook.app/app)' +
        ' to approve or modify this request.';
    await new SMS(user.data().phone, summary);
    await new Email('request', user.data(), request);
    console.log('Sent request notification to ' + user.data().name + ' <' +
        user.data().email + '> <' + user.data().phone + '>.');
};

// approvedRequestsOut - sms, webpush, email to pupil for approvedRequests
const approvedRequestNotification = async (snap, context) => {
    const approvedBy = snap.data().approvedBy;
    const request = snap.data().for;
    const user = await admin.firestore().collection('users')
        .doc(context.params.user).get();
    const summary = approvedBy.name + ' approved your lesson request. You' +
        ' now have tutoring appointments for ' + request.subject +
        ' with ' + request.toUser.name.split(' ')[0] + ' on ' +
        request.time.day + 's at the ' + request.location.name + ' from ' +
        request.time.from + ' until ' + request.time.to + '.';
    await new SMS(user.data().phone, summary);
    await new Email('appt', user.data(), snap.data());
    console.log('Sent appt notification to ' + user.data().name + ' <' +
        user.data().email + '> <' + user.data().phone + '>.');
};

// pendingClockIns - sms, webpush to the recipient of a clockIn request
const clockIn = async (snap, context) => {
    throw new Error('This notification function has not been implemented yet.');
};

// pendingClockOuts - sms, webpush to the recipient of a clockOut request
const clockOut = async (snap, context) => {
    throw new Error('This notification function has not been implemented yet.');
};

// modifiedRequestsIn - sms, webpush to tutor when request is modified
const modifiedRequestIn = async (snap, context) => {
    throw new Error('This notification function has not been implemented yet.');
};

// modifiedRequestsOut - sms, webpush to pupil when request is modified
const modifiedRequestOut = async (snap, context) => {
    throw new Error('This notification function has not been implemented yet.');
};

// canceledRequestsIn - sms, webpush to tutor when request is canceled
const canceledRequestIn = async (snap, context) => {
    throw new Error('This notification function has not been implemented yet.');
};

// rejectedRequestsOut - sms, webpush to pupil when request is rejected
const rejectedRequestOut = async (snap, context) => {
    throw new Error('This notification function has not been implemented yet.');
};

// modifiedAppointments - sms, webpush, email to other attendee when appt is
// modified
const modifiedAppt = async (snap, context) => {
    throw new Error('This notification function has not been implemented yet.');
};

// canceledAppointments - sms, webpush, email to other attendee when appt is
// canceled
const canceledAppt = async (snap, context) => {
    throw new Error('This notification function has not been implemented yet.');
};


module.exports = {
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