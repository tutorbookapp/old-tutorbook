/**
 * @license
 * Copyright (C) 2020 Tutorbook
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS 
 * FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more 
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import $ from 'jquery';
import to from 'await-to-js';

const Utils = require('@tutorbook/utils');
const Data = require('@tutorbook/data');
const User = require('@tutorbook/user');

const ViewApptDialog = require('@tutorbook/dialogs').viewAppt;
const ViewActiveApptDialog = require('@tutorbook/dialogs').viewActiveAppt;
const ViewCanceledApptDialog = require('@tutorbook/dialogs').viewCanceledAppt;
const ViewPastApptDialog = require('@tutorbook/dialogs').viewPastAppt;
const ConfirmationDialog = require('@tutorbook/dialogs').confirm;

/**
 * Class that represents the basic appt list item included in the user's primary
 * schedule list view. Overridden by more specific appointment types (e.g. an
 * active appointment v.s. a past appointment).
 * @alias EventListItem
 * @abstract
 */
class Event {
    /**
     * Creates a new event list item from a given Firestore appt document.
     * @param {DocumentSnapshot} doc - The appt's Firestore document snapshot.
     */
    constructor(doc) {
        Object.entries(doc.data()).forEach((entry) => {
            this[entry[0]] = entry[1];
        });
        this.id = doc.id;
        this.render = window.app.render;
        this.actions = {};
        this.data = {};
    }

    /**
     * Renders the appointment list item given a template string.
     * @param {string} [template='appt-list-item'] - The ID of the template to 
     * render for this appt list item (i.e. supervisor or normal).
     * @see {@link Templates}
     */
    renderSelf(template = 'appt-list-item') {
        /**
         * Ensures that actions are not shown when user is on mobile.
         */
        const combine = (opts) => {
            if (window.app.onMobile) opts.showAction = false;
            return opts;
        };
        this.el = this.render.template(
            template,
            combine(Utils.combineMaps({
                photo: (typeof this.other === 'object') ?
                    this.other.photo : undefined,
                viewUser: (typeof this.other === 'object') ? () => {
                    User.viewUser(this.other.email);
                } : undefined,
                id: this.id,
                title: this.title,
                subtitle: this.subtitle,
                timestamp: this.timestamp,
                go_to_appt: event => {
                    if ($(event.target).closest('button,img').length) return;
                    this.dialog.view();
                },
            }, this.data)));
    }
};

/**
 * Class that represents the upcoming appointment list item in the **primary
 * schedule view** (not to be confused with the [ApptCard]{@link ApptCard} in
 * the [**dashboard schedule**]{@linkplain ScheduleCard}).
 * @alias ApptListItem
 * @extends EventListItem
 */
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
                        window.app.snackbar.view('Canceling appointment...');
                        $(this.el).hide();
                        window.app.schedule.refresh();
                        const [err, res] = await to(
                            Data.cancelAppt(doc.data(), doc.id));
                        if (err) {
                            $(this.el).show();
                            window.app.schedule.refresh();
                            return window.app.snackbar.view('Could not cancel' +
                                ' appointment.');
                        }
                        $(this.el).remove();
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
                        window.app.snackbar.view('Canceling appointment...');
                        $(this.el).hide();
                        window.app.schedule.refresh();
                        const [err, res] = await to(
                            Data.cancelAppt(doc.data(), doc.id));
                        if (err) {
                            $(this.el).show();
                            window.app.schedule.refresh();
                            return window.app.snackbar.view('Could not cancel' +
                                ' appointment.');
                        }
                        $(this.el).remove();
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
        this.other = Utils.getOtherUser(this.for.attendees[0], this.for
            .attendees[1]);
        this.title = "Canceled Appointment with " + this.canceledBy.name;
        this.subtitle = this.canceledBy.name + " canceled this upcoming " +
            "appointment. Please ensure to address these changes.";
        this.timestamp = Utils.getNextDateWithDay(this.for.time.day);
        this.dialog = new ViewCanceledApptDialog(doc.data(), doc.id);
        this.data = {
            type: 'canceledAppointments',
            showAction: true,
            actionLabel: 'Dismiss',
            action: async () => {
                $(this.el).remove();
                window.app.schedule.refresh();
                await window.app.db.collection('users')
                    .doc(window.app.user.uid)
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
        this.dialog = new ViewCanceledApptDialog(doc.data(), doc.id);
        this.data = {
            photoA: this.for.attendees[0].photo,
            photoB: this.for.attendees[1].photo,
            viewUserA: () => {
                User.viewUser(this.attendees[0].email);
            },
            viewUserB: () => {
                User.viewUser(this.attendees[1].email);
            },
            type: 'canceledAppointments',
            showAction: true,
            actionLabel: 'Dismiss',
            action: async () => {
                $(this.el).remove();
                window.app.schedule.refresh();
                await window.app.db.collection('locations')
                    .doc(this.for.location.id)
                    .collection('canceledAppointments')
                    .doc(doc.id).delete();
            },
        };
        this.renderSelf('supervisor-appt-list-item');
    }
};

class ModifiedAppt extends Event {
    constructor(doc) {
        super(doc);
        this.other = Utils.getOtherUser(this.for.attendees[0], this.for
            .attendees[1]);
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
                await window.app.db.collection('users')
                    .doc(window.app.user.uid)
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
                await window.app.db.collection('locations')
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
                    'clock-out request.');
                window.app.snackbar.view('Sent clock-out request to ' +
                    res.recipient.name + '.');
                ViewApptDialog.listen(
                    res.clockOut.approvedRef,
                    res.clockOut.rejectedRef,
                    'Clock-Out',
                );
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
                if (e) return window.app.snackbar.view('Could not clock-out.');
                window.app.snackbar.view('Clocked out at ' + new Date(r.clockOut
                    .sentTimestamp).toLocaleTimeString() + '.');
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
                        $(this.el).hide();
                        window.app.schedule.refresh();
                        window.app.snackbar.view('Deleting past ' +
                            'appointment...');
                        const [err, res] = await to(Data.deletePastAppt(
                            doc.data(),
                            doc.id,
                        ));
                        if (err) {
                            $(this.el).show();
                            return window.app.snackbar.view('Could not delete' +
                                ' past appointment.');
                        }
                        $(this.el).remove();
                        window.app.schedule.refresh();
                        return window.app.snackbar.view('Deleted past ' +
                            'appointment.');
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
                new User((await Data.getUser(this.attendees[0].uid))).view();
            },
            viewUserB: async () => {
                new User(await Data.getUser(this.attendees[1].uid)).view();
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
                        $(this.el).hide();
                        window.app.schedule.refresh();
                        window.app.snackbar.view('Deleting past ' +
                            'appointment...');
                        const [err, res] = await to(Data.deletePastAppt(
                            doc.data(),
                            doc.id,
                        ));
                        if (err) {
                            $(this.el).show();
                            return window.app.snackbar.view('Could not delete' +
                                ' past appointment.');
                        }
                        $(this.el).remove();
                        window.app.schedule.refresh();
                        return window.app.snackbar.view('Deleted past ' +
                            'appointment.');
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