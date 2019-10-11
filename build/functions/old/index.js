const functions = require('firebase-functions');
const admin = require('firebase-admin').initializeApp();

const Email = require('./src/email'); // Notification classes
const SMS = require('./src/sms');
const Webpush = require('./src/webpush');


// ============================================================================
// SEARCH (TODO: Hide sensitive profile data)
// ============================================================================


// ============================================================================
// PAYMENTS (STRIPE)
// ============================================================================


// ============================================================================
// CUSTOM AUTH
// ============================================================================


// user - When a newUser document is modified, check if they're a verified
// supervisor and if so, ensure that they have customAuth setup
exports.updateCustomAuth = functions.firestore
    .document('users/{id}')
    .onWrite(async (change, context) => {
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
    });


// ============================================================================
// NOTIFICATIONS (EMAIL, SMS, & WEBPUSH)
// ============================================================================


// user - Send the user a welcome email notification when they first create an
// account
exports.newUserNotification = functions.firestore
    .document('users/{id}')
    .onCreate(async (snap, context) => {
        const profile = snap.data();
        console.log('Sending ' + profile.name + ' <' + profile.email +
            '> welcome notifications...');
        await new Email('welcome', profile);
        await new SMS(profile.phone, 'Welcome to Tutorbook! This is how ' +
            'you\'ll receive SMS notifications. To turn them off, go to ' +
            'settings and toggle SMS notifications off.');
        console.log('Sent ' + profile.name + ' <' + profile.email +
            '> welcome notifications.');
    });


// messages - send an webpush notification for all new messages
exports.messageNotification = functions.firestore
    .document('chats/{chat}/messages/{message}')
    .onCreate(async (snap, context) => {
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
    });


// chats - send an sms and webpush notification for new chats
exports.newChatNotification = functions.firestore
    .document('chats/{chat}')
    .onCreate((snap, context) => {
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
    });


// feedback - send me an email and sms notification whenever anybody creates a
// new feedback document
exports.feedbackNotification = functions.firestore
    .document('feedback/{id}')
    .onCreate(async (snap, context) => {
        await new SMS('+16508612723', 'Feedback from ' + snap.data().from.name +
            ': ' + snap.data().message);
    });


// requestsIn - tutor gets notified (sms, email, and webpush) about new requests
exports.newRequest = functions.firestore
    .document('users/{user}/requestsIn/{request}')
    .onCreate(async (snap, context) => {
        const request = snap.data();
        const user = await admin.firestore().collection('users')
            .doc(context.params.user).get();
        const summary = request.fromUser.name + ' wants you as a ' +
            request.toUser.type.toLowerCase() + ' for ' + request.subject +
            '. Log into your Tutorbook dashboard (https://tutorbook.app/app)' +
            ' to approve or modify this request.';
        await new SMS(user.data().phone, summary);
        await new Email('request', user, request);
        console.log('Sent request email to ' + user.name + ' <' + user.email +
            '>.');
    });


// apr