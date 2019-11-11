import {
    MDCMenu
} from '@material/menu/index';

import $ from 'jquery';
import to from 'await-to-js';

const Utils = require('utils');
const Data = require('data');
const User = require('user');

const EditApptDialog = require('dialogs').editAppt;
const ViewApptDialog = require('dialogs').viewAppt;
const ViewActiveApptDialog = require('dialogs').viewActiveAppt;
const ViewCanceledApptDialog = require('dialogs').viewCanceledAppt;
const ViewPastApptDialog = require('dialogs').viewPastAppt;
const ConfirmationDialog = require('dialogs').confirm;

class Event {
    constructor(doc) {
        Object.entries(doc.data()).forEach((entry) => {
            this[entry[0]] = entry[1];
        });
        this.id = doc.id;
        this.render = window.app.render;
        this.actions = {};
        this.data = {};
    }

    renderSelf(template) {
        this.el = this.render.template(
            template || 'appt-list-item',
            Utils.combineMaps({
                photo: (typeof this.other === 'object') ?
                    this.other.photo : undefined,
                viewUser: (typeof this.other === 'object') ? () => {
                    User.viewUser(this.other.email);
                } : undefined,
                id: this.id,
                title: this.title,
                subtitle: this.subtitle,
                timestamp: this.timestamp,
                go_to_appt: () => {
                    this.dialog.view();
                },
            }, this.data));
    }
};

class Appt extends Event {
    constructor(doc) {
        super(doc);
        this.other = Utils.getOtherUser(this.attendees[0], this.attendees[1]);
        this.title = "Upcoming Appointment with " + this.other.name;
        this.subtitle = "Tutoring session for " + this.for.subject + " at the " +
            this.location.name + ".";
        this.timestamp = Utils.getNextDateWithDay(this.time.day);
        this.dialog = new ViewApptDialog(doc.data(), doc.id);
        this.data = {
            type: 'appointments',
            showAction: true,
            actionLabel: 'Cancel',
            action: () => {
                return new ConfirmationDialog('Cancel Appointment?', 'Cancel ' +
                    'tutoring sessions with ' + this.other.name + ' for ' +
                    this.for.subject + ' at ' + this.time.from + ' at the ' +
                    this.location.name + '.', async () => {
                        $(this.el).remove();
                        window.app.schedule.refresh();
                        const [err, res] = await to(
                            Data.cancelAppt(doc.data(), doc.id));
                        if (err) return window.app.snackbar.view('Could not ' +
                            'cancel appointment.');
                        window.app.snackbar.view('Canceled appointment with ' +
                            this.other.email + '.');
                    }).view();
            },
        };
        this.renderSelf();
    }
};

class SupervisorAppt extends Event {
    constructor(doc) {
        super(doc);
        this.title = "Upcoming Appointment between " + this.attendees[0].name +
            " and " + this.attendees[1].name;
        this.subtitle = "Tutoring session for " + this.for.subject + " at the " +
            this.location.name + ".";
        this.timestamp = Utils.getNextDateWithDay(this.time.day);
        this.dialog = new ViewApptDialog(doc.data(), doc.id);
        this.data = {
            photoA: this.attendees[0].photo,
            photoB: this.attendees[1].photo,
            viewUserA: () => {
                User.viewUser(this.attendees[0].email);
            },
            viewUserB: () => {
                User.viewUser(this.attendees[1].email);
            },
            type: 'appointments',
            showAction: true,
            actionLabel: 'Cancel',
            action: () => {
                return new ConfirmationDialog('Cancel Appointment?', 'Cancel ' +
                    'tutoring sessions between ' + this.attendees[0].name +
                    ' and ' + this.attendees[1].name + ' for ' +
                    this.for.subject + ' at ' + this.time.from + ' at the ' +
                    this.location.name + '?', async () => {
                        $(this.el).remove();
                        window.app.schedule.refresh();
                        const [err, res] = await to(
                            Data.cancelAppt(doc.data(), doc.id));
                        if (err) return window.app.snackbar.view('Could not ' +
                            'cancel appointment.');
                        window.app.snackbar.view('Canceled appointment.');
                    }).view();
            },
        };
        this.renderSelf('supervisor-appt-list-item');
    }
};

class CanceledAppt extends Event {
    constructor(doc) {
        super(doc);
        this.title = "Canceled Appointment with " + this.canceledBy.name;
        this.subtitle = this.canceledBy.name + " canceled this upcoming " +
            "appointment. Please ensure to address these changes.";
        this.timestamp = Utils.getNextDateWithDay(this.for.time.day);
        this.dialog = new ViewCanceledApptDialog(doc.data().for, doc.id);
        this.data = {
            type: 'canceledAppointments',
            showAction: true,
            actionLabel: 'Dismiss',
            action: async () => {
                $(this.el).remove();
                window.app.schedule.refresh();
                await firebase.firestore().collection('users')
                    .doc(window.app.user.email)
                    .collection('canceledAppointments')
                    .doc(doc.id).delete();
            },
        };
        this.renderSelf();
    }
};

class SupervisorCanceledAppt extends Event {
    constructor(doc) {
        super(doc);
        this.title = "Canceled Appointment between " + this.for.attendees[0].name +
            " and " + this.for.attendees[1].name;
        this.subtitle = this.canceledBy.name + " canceled this upcoming " +
            "appointment. Please ensure to address these changes.";
        this.timestamp = Utils.getNextDateWithDay(this.for.time.day);
        this.dialog = new ViewCanceledApptDialog(doc.data().for, doc.id);
        this.data = {
            photoA: canceledAppt.for.attendees[0].photo,
            photoB: canceledAppt.for.attendees[1].photo,
            viewUserA: () => {
                User.viewUser(canceledAppt.attendees[0].email);
            },
            viewUserB: () => {
                User.viewUser(canceledAppt.attendees[1].email);
            },
            type: 'canceledAppointments',
            showAction: true,
            actionLabel: 'Dismiss',
            action: async () => {
                $(this.el).remove();
                window.app.schedule.refresh();
                await firebase.firestore().collection('locations')
                    .doc(canceledAppt.for.location.id)
                    .collection('canceledAppointments')
                    .doc(doc.id).delete();
            },
        };
        this.renderSelf();
    }
};

class ModifiedAppt extends Event {
    constructor(doc) {
        super(doc);
        this.title = "Modified Appointment with " + this.modifiedBy.name;
        this.subtitle = this.modifiedBy.name + " modified this upcoming " +
            "appointment. Please ensure to address these changes.";
        this.timestamp = Utils.getNextDateWithDay(this.for.time.day);
        this.dialog = new ViewApptDialog(doc.data().for, doc.id);
        this.data = {
            type: 'modifiedAppointments',
            showAction: true,
            actionLabel: 'Dismiss',
            action: async () => {
                $(this.el).remove();
                window.app.schedule.refresh();
                await firebase.firestore().collection('users')
                    .doc(window.app.user.email)
                    .collection('modifiedAppointments')
                    .doc(doc.id).delete();
            },
        };
        this.renderSelf();
    }
};

class SupervisorModifiedAppt extends Event {
    constructor(doc) {
        super(doc);
        this.title = "Modified Appointment between " + this.for.attendees[0].name +
            " and " + this.for.attendees[1].name;
        this.subtitle = this.modifiedBy.name + " modified this upcoming " +
            "appointment. Please ensure to address these changes.";
        this.timestamp = Utils.getNextDateWithDay(this.for.time.day);
        this.dialog = new ViewModifiedApptDialog(doc.data().for, doc.id);
        this.data = {
            photoA: modifiedAppt.for.attendees[0].photo,
            photoB: modifiedAppt.for.attendees[1].photo,
            viewUserA: () => {
                User.viewUser(modifiedAppt.attendees[0].email);
            },
            viewUserB: () => {
                User.viewUser(modifiedAppt.attendees[1].email);
            },
            type: 'modifiedAppointments',
            showAction: true,
            actionLabel: 'Dismiss',
            action: async () => {
                $(this.el).remove();
                window.app.schedule.refresh();
                await firebase.firestore().collection('locations')
                    .doc(modifiedAppt.for.location.id)
                    .collection('modifiedAppointments')
                    .doc(doc.id).delete();
            },
        };
        this.renderSelf();
    }
};

class ActiveAppt extends Event {
    constructor(doc) {
        super(doc);
        this.other = Utils.getOtherUser(this.attendees[0], this.attendees[1]);
        this.title = "Active Appointment with " + this.other.name;
        this.subtitle = "Tutoring session right now for " + this.for.subject +
            " at the " + this.location.name + ".";
        this.timestamp = (typeof this.clockIn.sentTimestamp === 'string') ?
            new Date(this.clockIn.sentTimestamp) :
            this.clockIn.sentTimestamp.toDate();
        this.dialog = new ViewActiveApptDialog(doc.data(), doc.id);
        this.data = {
            type: 'activeAppointments',
            showAction: window.app.user.type === 'Tutor',
            actionLabel: 'ClockOut',
            action: async () => {
                window.app.snackbar.view('Sending request...');
                const [err, res] = await to(Data.clockOut(doc.data(), doc.id));
                if (err) return window.app.snackbar.view('Could not send ' +
                    'clock out request.');
                window.app.snackbar.view('Sent clock out request.');
            },
        };
        this.renderSelf();
    }
};

class SupervisorActiveAppt extends Event {
    constructor(doc) {
        super(doc);
        this.title = "Active Appointment between " + this.attendees[0].name +
            " and " + this.attendees[1].name;
        this.subtitle = "Tutoring session right now for " + this.for.subject +
            " at the " + this.location.name + ".";
        this.timestamp = (typeof this.clockIn.sentTimestamp === 'string') ?
            new Date(this.clockIn.sentTimestamp) :
            this.clockIn.sentTimestamp.toDate();
        this.dialog = new ViewActiveApptDialog(doc.data(), doc.id);
        this.data = {
            photoA: this.attendees[0].photo,
            photoB: this.attendees[1].photo,
            viewUserA: () => {
                User.viewUser(this.attendees[0].email);
            },
            viewUserB: () => {
                User.viewUser(this.attendees[1].email);
            },
            type: 'activeAppointments',
            showAction: true,
            actionLabel: 'ClockOut',
            action: async () => {
                window.app.snackbar.view('Clocking out for ' +
                    this.for.toUser.name.split(' ')[0] + '...');
                const [e, r] = await to(
                    Data.instantClockOut(doc.data(), doc.id));
                if (e) return window.app.snackbar.view('Could not clock out.');
                window.app.snackbar.view('Clocked out at ' + new Date(r.data
                    .clockOut.sentTimestamp).toLocaleTimeString() + '.');
                window.app.schedule.refresh();
            },
        };
        this.renderSelf('supervisor-appt-list-item');
    }
};

class PastAppt extends Event {
    constructor(doc) {
        super(doc);
        this.other = Utils.getOtherUser(this.attendees[0], this.attendees[1]);
        this.title = "Past Appointment with " + this.other.name;
        this.subtitle = "Tutoring session for " + this.for.subject +
            " at the " + this.location.name + ".";
        this.timestamp = (typeof this.clockOut.sentTimestamp === 'string') ?
            new Date(this.clockOut.sentTimestamp) :
            this.clockOut.sentTimestamp.toDate();
        this.dialog = new ViewPastApptDialog(doc.data(), doc.id);
        this.data = {
            type: 'pastAppointments',
            showAction: window.app.user.type === 'Tutor',
            actionLabel: 'Delete',
            action: async () => {
                return new ConfirmationDialog('Delete Past Appointment?',
                    'Are you sure you want to permanently delete this ' +
                    'past appointment with ' + this.other.name +
                    '? This action cannot be undone.', async () => {
                        $(this.el).remove();
                        window.app.schedule.refresh();
                        await Data.deletePastAppt(doc.data(), doc.id);
                    }).view();
            },
        };
        this.renderSelf();
    }
};

class SupervisorPastAppt extends Event {
    constructor(doc) {
        super(doc);
        this.title = "Past Appointment between " + this.attendees[0].name +
            " and " + this.attendees[1].name;
        this.subtitle = "Tutoring session for " + this.for.subject +
            " at the " + this.location.name + ".";
        this.timestamp = (typeof this.clockOut.sentTimestamp === 'string') ?
            new Date(this.clockOut.sentTimestamp) :
            this.clockOut.sentTimestamp.toDate();
        this.dialog = new ViewPastApptDialog(doc.data(), doc.id);
        this.data = {
            photoA: this.attendees[0].photo,
            photoB: this.attendees[1].photo,
            viewUserA: async () => {
                new User((await Data.getUser(this.attendees[0].email))).view();
            },
            viewUserB: async () => {
                new User(await Data.getUser(this.attendees[1].email)).view();
            },
            type: 'pastAppointments',
            showAction: true,
            actionLabel: 'Delete',
            action: async () => {
                return new ConfirmationDialog('Delete Past Appointment?',
                    'Are you sure you want to permanently delete this ' +
                    'past appointment between ' + this.attendees[0].name +
                    ' and ' + this.attendees[1].name + '? This action ' +
                    'cannot be undone.', async () => {
                        $(this.el).remove();
                        window.app.schedule.refresh();
                        await Data.deletePastAppt(doc.data(), doc.id);
                        window.app.snackbar.view('Deleted past appointment.');
                    }).view();
            },
        };
        this.renderSelf('supervisor-appt-list-item');
    }
};

module.exports = {
    appt: Appt,
    active: ActiveAppt,
    past: PastAppt,
    canceled: CanceledAppt,
    modified: ModifiedAppt,
    supervisor: {
        appt: SupervisorAppt,
        active: SupervisorActiveAppt,
        past: SupervisorPastAppt,
        canceled: SupervisorCanceledAppt,
        modified: SupervisorModifiedAppt,
    },
};