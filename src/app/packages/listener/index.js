import to from 'await-to-js';

const Utils = require('@tutorbook/utils'); // TODO: Only import these static classes once
const Data = require('@tutorbook/data');
const ConfirmationDialog = require('@tutorbook/dialogs').confirm;

// Class that enables the client to listen to remote events (e.g. Firestore
// database triggers or HTTP request responses).
class Listener {

    constructor() {
        switch (window.app.user.type) {
            case 'Supervisor':
                return this.supervisor();
            case 'Tutor':
                return this.tutor();
            case 'Pupil':
                return this.pupil();
        };
    }

    supervisor() {
        const clockIns = {
            remove: (doc) => {},
            display: (doc) => {
                const data = doc.data();
                const title = 'Approve Clock In?';
                const summary = data.sentBy.name + ' clocked in at ' +
                    Utils.getTimeString(data.sentTimestamp) + ' for ' +
                    Utils.getPronoun(data.sentBy.gender) + ' appointment with ' +
                    Utils.getOther(data.sentBy, data.for.attendees).name + ' at ' +
                    data.for.time.from + '. Approve this clock in?';
                new ConfirmationDialog(title, summary, async () => {
                    const [err, res] = await to(
                        Data.approveClockIn(doc.data(), doc.id));
                    if (err) return window.app.snackbar.view('Could not ' +
                        'approve clock in request.');
                    window.app.snackbar.view('Approved clock in request.');
                }, true).view();
            },
        };
        const db = window.app.db.collection('users').doc(window.app.user.uid);
        db.collection('clockIns').onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'removed') {
                    clockIns.remove(change.doc);
                } else {
                    clockIns.display(change.doc);
                }
            });
        });
        const clockOuts = {
            remove: (doc) => {},
            display: (doc) => {
                const data = doc.data();
                const title = 'Approve Clock Out?';
                const summary = data.sentBy.name + ' clocked out at ' +
                    Utils.getTimeString(data.sentTimestamp) + ' for ' +
                    Utils.getPronoun(data.sentBy.gender) + ' appointment with ' +
                    Utils.getOther(data.sentBy, data.for.attendees).name +
                    ' ending at ' + data.for.time.to + '. Approve this clock out?';
                new ConfirmationDialog(title, summary, async () => {
                    const [err, res] = await to(
                        Data.approveClockOut(doc.data(), doc.id));
                    if (err) return window.app.snackbar.view('Could not ' +
                        'approve clock out request.');
                    window.app.snackbar.view('Approved clock out request.');
                }, true).view();
            },
        };
        db.collection('clockOuts').onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'removed') {
                    clockOuts.remove(change.doc);
                } else {
                    clockOuts.display(change.doc);
                }
            });
        });
    }

    tutor() {}

    pupil() {
        const payments = {
            remove: (doc) => {},
            display: (doc) => {
                const data = doc.data();
                const title = 'Approve Payment?';
                const summary = data.to.name + ' is requesting payment ($' +
                    data.amount.toFixed(2) + ') for your tutoring lesson on ' +
                    data.for.for.subject + ' on ' + data.for.time.day + ' at ' +
                    data.for.time.from + '. Approve payment and send ' +
                    data.to.name.split(' ')[0] + ' $' + data.amount.toFixed(2) +
                    '?';
                new ConfirmationDialog(title, summary, async () => {
                    const [err, res] = await to(
                        Data.approvePayment(doc.data(), doc.id));
                    if (err) return window.app.snackbar.view('Could not ' +
                        'approved payment.');
                    window.app.snackbar.view('Approved and sent $' +
                        data.amount.toFixed(2) + ' to ' + data.to.email + '.');
                }, true).view();
            }
        };
        window.app.db.collection('users').doc(window.app.user.uid)
            .collection('requestedPayments').onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'removed') {
                        payments.remove(change.doc);
                    } else {
                        payments.display(change.doc);
                    }
                });
            });
    }

};


module.exports = Listener;