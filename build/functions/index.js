const functions = require('firebase-functions');
const admin = require('firebase-admin').initializeApp();

const updateSheet = require('sheet');
const updateAuth = require('auth');
const Notify = require('notifications');
const Payments = require('payments');
const Search = require('search');


// ============================================================================
// SEARCH
// ============================================================================

exports.updateSearch = functions.firestore
    .document('/users/{id}')
    .onWrite(Search.update);

exports.search = functions.https.onRequest(Search.get);

// ============================================================================
// PAYMENTS (STRIPE)
// ============================================================================

// 0) Tutor links Stripe Connect account (Function creates stripeAccount doc and 
// sets weekly payouts for every Friday).
exports.initStripeAccount = functions.https.onRequest(Payments.initAccount);

exports.accountURL = functions.https.onRequest(Payments.accountURL);

// 1) Pupil creates request & authPayment doc (Function processes authPayment).
exports.updatePaymentMethods = functions.firestore
    .document('/stripeCustomers/{user}/methods/{method}')
    .onCreate(Payments.addMethod);

exports.processAuthPayment = functions.firestore
    .document('/users/{pupil}/sentPayments/{payment}')
    .onCreate(Payments.processSentPayment);

// 2) Tutor clocks out & creates creates pastAppt docs (Function creates 
// pendingPayments => asking pupil for payment approval).
exports.askForPaymentApproval = functions.firestore
    .document('/users/{user}/pastAppointments/{appt}')
    .onCreate(Payments.askForPayment);

// 3) Pupil approves payment by creating approvedPayment docs (Function
// processes payment & creates pastPayment docs).
exports.processPayment = functions.firestore
    .document('/users/{user}/approvedPayments/{payment}')
    .onCreate(Payments.processPayment);

exports.increaseBalance = functions.firestore
    .document('/users/{user}/pastPayments/{payment}')
    .onCreate(Payments.updateBalance);

// 4) Tutor requests payout by creating requestedPayout doc (Function sends
// payout & creates pastPayout doc).
exports.processPayout = functions.firestore
    .document('/users/{tutor}/requestedPayouts/{payout}')
    .onCreate(Payments.processPayout);

exports.decreaseBalance = functions.firestore
    .document('/users/{user}/pastPayouts/{payout}')
    .onCreate(Payments.updateBalance);

// 4) Stripe weekly (on Fridays) webhook sends payout (& triggers Function to
// create pastPayout doc).
exports.processWeeklyPayouts = functions.https
    .onRequest(Payments.processWeeklyPayouts);

// ============================================================================
// OTHER
// ============================================================================

exports.updateSheet = functions.https.onRequest(updateSheet);

// user - When a newUser document is modified, check if they're a verified
// supervisor and if so, ensure that they have customAuth setup
exports.updateCustomAuth = functions.firestore
    .document('users/{id}')
    .onWrite(updateAuth);


// ============================================================================
// NOTIFICATIONS (EMAIL, SMS, & WEBPUSH)
// ============================================================================

exports.newUserNotification = functions.firestore
    .document('users/{id}')
    .onCreate(Notify.user);

exports.messageNotification = functions.firestore
    .document('chats/{chat}/messages/{message}')
    .onCreate(Notify.message);

exports.newChatNotification = functions.firestore
    .document('chats/{chat}')
    .onCreate(Notify.chat);

exports.feedbackNotification = functions.firestore
    .document('feedback/{id}')
    .onCreate(Notify.feedback);

// REQUESTs
exports.newRequest = functions.firestore
    .document('users/{user}/requestsIn/{request}')
    .onCreate(Notify.requestIn);

exports.canceledRequest = functions.firestore
    .document('users/{user}/canceledRequestsIn/{request}')
    .onCreate(Notify.canceledIn);

exports.modifiedRequestIn = functions.firestore
    .document('users/{user}/modifiedRequestsIn/{request}')
    .onCreate(Notify.modifiedIn);

exports.approvedRequest = functions.firestore
    .document('users/{user}/approvedRequestsOut/{request}')
    .onCreate(Notify.approvedOut);

exports.rejectedRequest = functions.firestore
    .document('users/{user}/rejectedRequestsOut/{request}')
    .onCreate(Notify.rejectedOut);

exports.modifiedRequestOut = functions.firestore
    .document('users/{user}/modifiedRequestsOut/{request}')
    .onCreate(Notify.modifiedOut);

// CLOCK-IN/OUTs
exports.clockIn = functions.firestore
    .document('users/{supervisor}/clockIns/{clockIn}')
    .onCreate(Notify.clockIn);

exports.clockOut = functions.firestore
    .document('users/{supervisor}/clockOuts/{clockOut}')
    .onCreate(Notify.clockOut);