import {
    MDCRipple
} from '@material/ripple/index';
import {
    MDCTopAppBar
} from '@material/top-app-bar/index';
import {
    MDCLinearProgress
} from '@material/linear-progress/index';
import {
    MDCMenu
} from '@material/menu/index';

import $ from 'jquery';
import to from 'await-to-js';

const Card = require('card');
const Data = require('data');
const Utils = require('utils');
const User = require('user');
const EditApptDialog = require('dialogs').editAppt;
const ViewApptDialog = require('dialogs').viewAppt;
const ViewActiveApptDialog = require('dialogs').viewActiveAppt;
const ViewCanceledApptDialog = require('dialogs').viewCanceledAppt;
const ViewPastApptDialog = require('dialogs').viewPastAppt;
const ConfirmationDialog = require('dialogs').confirm;

// Class that provides a schedule view and header and manages all the data flow
// concerning the user's appointments. Also provides an API to insert into the
// schedule.
class Schedule {

    constructor() {
        this.render = window.app.render;
        this.recycler = {
            remove: (doc, type) => {
                $(this.main)
                    .find('[id="' + doc.id + '"]')
                    .find('[type="' + type + '"]')
                    .remove();
                this.refresh();
            },
            display: (doc, type) => {
                switch (type) {
                    case 'appointments':
                        var listItem = Schedule.renderApptListItem(doc);
                        break;
                    case 'pastAppointments':
                        var listItem = Schedule.renderPastApptListItem(doc);
                        break;
                    case 'activeAppointments':
                        var listItem = Schedule.renderActiveApptListItem(doc);
                        break;
                    case 'modifiedAppointments':
                        var listItem = Schedule.renderModifiedApptListItem(doc);
                        break;
                    case 'canceledAppointments':
                        var listItem = Schedule.renderCanceledApptListItem(doc);
                        break;
                };
                this.viewAppt(listItem)
            },
            empty: (type) => {
                $(this.main).find('[type="' + type + '"]').remove();
                this.refresh();
            },
        };
        this.renderSelf();
    }

    refresh() {
        var dates = [];
        // NOTE: We can't use shorthand function definition here or the `this`
        // object gets messed up.
        $(this.main).find('.appt-list-item').each(function(i) {
            var date = new Date($(this).attr('timestamp'));
            dates.push(Utils.getEarliestDateWithDay(date).getTime());
        });
        $(this.main).find('.date-list-divider').each(function(i) {
            var date = new Date($(this).attr('timestamp'));
            if (dates.indexOf(date.getTime()) < 0) {
                // Date is no longer needed
                $(this).remove();
            }
        });
    }

    view() {
        window.app.intercom.view(false);
        window.app.nav.selected = 'Schedule';
        window.app.view(this.header, this.main, '/app/schedule');
        MDCTopAppBar.attachTo(this.header);
        this.viewAppts();
    }

    reView() {
        this.viewAppts(); // TODO: Just re-attach listeners
    }

    reViewAppts() {}

    viewAppts() {
        const db = firebase.firestore().collection('users')
            .doc(window.app.user.id); // TODO: Add proxy results too 
        const queries = {
            appointments: db.collection('appointments').orderBy('timestamp', 'desc'),
            pastAppointments: db.collection('pastAppointments')
                .orderBy('clockOut.sentTimestamp', 'desc').limit(10),
            activeAppointments: db.collection('activeAppointments')
                .orderBy('clockIn.sentTimestamp', 'desc'),
            modifiedAppointments: db.collection('modifiedAppointments')
                .orderBy('modifiedTimestamp', 'desc'),
            canceledAppointments: db.collection('canceledAppointments')
                .orderBy('canceledTimestamp', 'desc'),
        };
        Utils.recycle(queries, this.recycler);
    }

    renderSelf() {
        this.header = this.render.header('header-main', {
            title: 'Schedule',
        });
        this.main = this.render.template('schedule', {
            welcome: !window.app.onMobile,
            summary: (window.app.user.type === 'Supervisor' ? 'View all past, ' +
                'upcoming, and active tutoring appointments at the locations ' +
                'you supervise.' : 'View past tutoring sessions, clock ' +
                'out of active meetings and edit upcoming appointments.'),
        });
    }

    viewAppt(listItem) {
        const scheduleEl = $(this.main).find('.mdc-list')[0];
        const timestamp = new Date($(listItem).attr('timestamp'));
        const id = $(listItem).attr('id');

        if ($('#' + id).length) { // Just modify an existing event.
            $('#' + id).replaceWith(listItem);
            return MDCRipple.attachTo(listItem);
        }
        // Find the first child that occured later than the child we're
        // trying to insert. Then insert this child right above it.
        for (var i = 0; i < scheduleEl.children.length; i++) {
            var child = scheduleEl.children[i];
            var time = new Date($(child).attr('timestamp'));

            // If we've found a child that occurred later, break and insert.
            if (time && time <= timestamp) {
                if ((child.previousElementSibling && // Is this a list divider?
                        new Date(
                            child.previousElementSibling.getAttribute('timestamp')
                        ).toDateString() === timestamp.toDateString()
                    ) ||
                    new Date(child.getAttribute('timestamp'))
                    .toDateString() === timestamp.toDateString()
                ) {
                    return $(listItem).insertAfter(child); // Insert after listDividers.
                } else { // No list divider, add one.
                    $(listItem).insertBefore(child);
                    var listDivider = Schedule.renderDateDivider(timestamp);
                    return $(listDivider).insertBefore(listItem);
                }
            }
        }
        $(scheduleEl).append(listItem);
        var listDivider = Schedule.renderDateDivider(timestamp);
        return $(listDivider).insertBefore(listItem);
    }

    static renderDateDivider(date) {
        const dateString = Schedule.getDayAndDateString(date);
        // NOTE: The dateDividers have to have the earliest possible timestamp
        // on a given date so that when we're inserting events in the calendar,
        // they always divide at the correct location.
        const earliestDateOnDate = new Date(date.getFullYear(), date.getMonth(),
            date.getDate(), 0, 0, 0, 0);
        const divider = window.app.render.template('date-list-divider', {
            date: dateString,
            timestamp: earliestDateOnDate,
        });
        return divider;
    }

    static getDayAndDateString(date) {
        const abbr = ['Sun', 'Mon', 'Tues', 'Wed', 'Thur', 'Fri', 'Sat'];
        // NOTE: Date().getMonth() returns a 0 based integer (i.e. 0 = Jan)
        return abbr[date.getDay()] + ', ' +
            (date.getMonth() + 1) + '/' + date.getDate();
    }

    static getNextDateWithDay(day) {
        const now = new Date();
        const date = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            0, 0, 0, 0);
        var count = 0;
        // Added counter just in case we get something that goes on forever
        while (Data.days[date.getDay()] !== day && count <= 256) {
            date.setDate(date.getDate() + 1);
            count++;
        }
        return date;
    }
};

// Render function that returns an MDC List Item for the schedule view populated
// with the given documents appt data.
Schedule.renderApptListItem = function(doc, locationID) {
    const appt = doc.data();
    const render = window.app.render;
    const otherUser = Utils.getOtherUser(appt.attendees[0], appt.attendees[1]);
    if (window.app.user.type === 'Supervisor') {
        var title = "Upcoming Appointment between " + appt.attendees[0].name +
            " and " + appt.attendees[1].name;
    } else {
        var title = "Upcoming Appointment with " + Utils.getOtherUser(
            appt.attendees[0],
            appt.attendees[1]).name;
    }
    const subtitle = "Tutoring session for " + appt.for.subject + " at the " +
        appt.location.name + ".";
    const time = Schedule.getNextDateWithDay(appt.time.day);
    const dialog = new ViewApptDialog(doc.data(), doc.id);

    if (window.app.user.type === 'Supervisor') {
        var listItem = render.template('supervisor-appt-list-item', {
            photoA: appt.attendees[0].photo,
            viewUserA: () => {
                User.viewUser(appt.attendees[0].email);
            },
            photoB: appt.attendees[1].photo,
            viewUserB: () => {
                User.viewUser(appt.attendees[1].email);
            },
            id: 'doc-appointments-' + doc.id,
            title: title,
            subtitle: subtitle,
            timestamp: time,
            go_to_appt: () => {
                dialog.view();
            },
            showAction: true,
            actionLabel: 'Cancel',
            action: () => {
                // Cancel the appointment
                return new ConfirmationDialog('Cancel Appointment?',
                    'Cancel tutoring sessions between ' + appt.attendees[0].name +
                    ' and ' + appt.attendees[1].name + ' for ' + appt.for.subject + ' at ' +
                    appt.time.from + ' at the ' +
                    appt.location.name + '.', async () => {
                        $('#doc-appointments-' + doc.id).remove();
                        window.app.schedule.refresh();
                        var err;
                        var res;
                        [err, res] = await to(Data.cancelAppt(appt, doc.id));
                        if (err) return window.app.snackbar.view('Could not cancel appointment.');
                        window.app.snackbar.view('Canceled appointment.');
                    }).view();
            },
        });
    } else {
        var listItem = render.template('appt-list-item', {
            photo: otherUser.photo,
            viewUser: () => {
                User.viewUser(otherUser.email);
            },
            id: 'doc-appointments-' + doc.id,
            title: title,
            subtitle: subtitle,
            timestamp: time,
            go_to_appt: () => {
                dialog.view();
            },
            showAction: true,
            actionLabel: 'Cancel',
            action: () => {
                // Cancel the appointment
                return new ConfirmationDialog('Cancel Appointment?',
                    'Cancel tutoring sessions with ' + otherUser.name +
                    ' for ' + appt.for.subject + ' at ' +
                    appt.time.from + ' at the ' +
                    appt.location.name + '.', async () => {
                        $('#doc-appointments-' + doc.id).remove();
                        window.app.schedule.refresh();
                        var err;
                        var res;
                        [err, res] = await to(Data.cancelAppt(appt, doc.id));
                        if (err) return window.app.snackbar.view('Could not cancel appointment.');
                        window.app.snackbar.view('Canceled appointment with ' + otherUser.email + '.');
                    }).view();
            },
        });
    }
    // NOTE: Setting class like this enables the scheduleRecycler to remove
    // all of the listItems that could've come from the same query (when the
    // query returns empty).
    if (!!locationID) {
        listItem.setAttribute('class', 'event-appt-' + locationID + ' ' + listItem.getAttribute('class'));
    } else {
        listItem.setAttribute('class', 'event-appt ' + listItem.getAttribute('class'));
    }
    return listItem;
};


// Render function that returns an MDC List Item for the schedule view populated
// with the given documents canceledAppt.for data.
Schedule.renderCanceledApptListItem = function(doc, locationID) {
    const canceledAppt = doc.data();
    const otherUser = Utils.getOtherUser(canceledAppt.for.attendees[0], canceledAppt.for.attendees[1]);
    if (window.app.user.type === 'Supervisor') {
        var title = "Canceled Appointment between " + canceledAppt.for.attendees[0].name +
            " and " + canceledAppt.for.attendees[1].name;
    } else {
        var title = "Canceled Appointment with " + Utils.getOtherUser(
            canceledAppt.for.attendees[0],
            canceledAppt.for.attendees[1]).name;
    }
    const subtitle = canceledAppt.canceledBy.name + " canceled this upcoming " +
        "appointment. Please ensure to address these changes.";
    const time = Schedule.getNextDateWithDay(canceledAppt.for.time.day);
    const dialog = new ViewCanceledApptDialog(canceledAppt.for, doc.id);

    if (window.app.user.type === 'Supervisor') {
        var listItem = window.app.render.template('supervisor-appt-list-item', {
            photoA: canceledAppt.for.attendees[0].photo,
            photoB: canceledAppt.for.attendees[1].photo,
            viewUserA: () => {
                User.viewUser(canceledAppt.attendees[0].email);
            },
            viewUserB: () => {
                User.viewUser(canceledAppt.attendees[1].email);
            },
            id: 'doc-canceledAppointments-' + doc.id,
            title: title,
            subtitle: subtitle,
            timestamp: time,
            go_to_appt: () => {
                dialog.view();
            },
            showAction: true,
            actionLabel: 'Dismiss',
            action: async () => {
                $('#doc-canceledAppointments-' + doc.id).remove();
                window.app.schedule.refresh();
                await firebase.firestore().collection('locations')
                    .doc(canceledAppt.for.location.id)
                    .collection('canceledAppointments')
                    .doc(doc.id).delete();
            },
        });
    } else {
        var listItem = window.app.render.template('appt-list-item', {
            photo: otherUser.photo,
            viewUser: () => {
                User.viewUser(otherUser.email);
            },
            id: 'doc-canceledAppointments-' + doc.id,
            title: title,
            subtitle: subtitle,
            timestamp: time,
            go_to_appt: () => {
                dialog.view();
            },
            showAction: true,
            actionLabel: 'Dismiss',
            action: async () => {
                $('#doc-canceledAppointments-' + doc.id).remove();
                window.app.schedule.refresh();
                await firebase.firestore().collection('users')
                    .doc(window.app.user.email)
                    .collection('canceledAppointments')
                    .doc(doc.id).delete();
            },
        });
    }
    // NOTE: Setting class like this enables the scheduleRecycler to remove
    // all of the listItems that could've come from the same query (when the
    // query returns empty).
    if (!!locationID) {
        listItem.setAttribute('class', 'event-canceledAppt.for-' + locationID + ' ' + listItem.getAttribute('class'));
    } else {
        listItem.setAttribute('class', 'event-canceledAppt.for ' + listItem.getAttribute('class'));
    }
    return listItem;
};


// Render function that returns an MDC List Item for the schedule view populated
// with the given documents modifiedAppt.for data.
Schedule.renderModifiedApptListItem = function(doc, locationID) {
    const modifiedAppt = doc.data();
    const otherUser = Utils.getOtherUser(modifiedAppt.for.attendees[0], modifiedAppt.for.attendees[1]);
    if (window.app.user.type === 'Supervisor') {
        var title = "Modified Appointment between " + modifiedAppt.for.attendees[0].name +
            " and " + modifiedAppt.for.attendees[1].name;
    } else {
        var title = "Modified Appointment with " + Utils.getOtherUser(
            modifiedAppt.for.attendees[0],
            modifiedAppt.for.attendees[1]).name;
    }
    const subtitle = modifiedAppt.modifiedBy.name + " modified this upcoming " +
        "appointment. Please ensure to address these changes.";
    const time = Schedule.getNextDateWithDay(modifiedAppt.for.time.day);
    const dialog = new ViewApptDialog(doc.data(), doc.id);

    if (window.app.user.type === 'Supervisor') {
        var listItem = window.app.render.template('supervisor-appt-list-item', {
            photoA: modifiedAppt.for.attendees[0].photo,
            photoB: modifiedAppt.for.attendees[1].photo,
            viewUserA: () => {
                User.viewUser(modifiedAppt.attendees[0].email);
            },
            viewUserB: () => {
                User.viewUser(modifiedAppt.attendees[1].email);
            },
            id: 'doc-modifiedAppointments-' + doc.id,
            title: title,
            subtitle: subtitle,
            timestamp: time,
            go_to_appt: () => {
                dialog.view();
            },
            showAction: true,
            actionLabel: 'Dismiss',
            action: async () => {
                $('#doc-modifiedAppointments-' + doc.id).remove();
                window.app.schedule.refresh();
                await firebase.firestore().collection('locations')
                    .doc(modifiedAppt.for.location.id)
                    .collection('modifiedAppointments')
                    .doc(doc.id).delete();
            },
        });
    } else {
        var listItem = window.app.render.template('appt-list-item', {
            photo: otherUser.photo,
            viewUser: () => {
                User.viewUser(otherUser.email);
            },
            id: 'doc-modifiedAppointments-' + doc.id,
            title: title,
            subtitle: subtitle,
            timestamp: time,
            go_to_appt: () => {
                dialog.view();
            },
            showAction: true,
            actionLabel: 'Dismiss',
            action: async () => {
                $('#doc-modifiedAppointments-' + doc.id).remove();
                window.app.schedule.refresh();
                await firebase.firestore().collection('users')
                    .doc(window.app.user.email)
                    .collection('modifiedAppointments')
                    .doc(doc.id).delete();
            },
        });
    }
    // NOTE: Setting class like this enables the scheduleRecycler to remove
    // all of the listItems that could've come from the same query (when the
    // query returns empty).
    if (!!locationID) {
        listItem.setAttribute('class', 'event-modifiedAppt.for-' + locationID + ' ' + listItem.getAttribute('class'));
    } else {
        listItem.setAttribute('class', 'event-modifiedAppt.for ' + listItem.getAttribute('class'));
    }
    return listItem;
};


// Render function that returns an MDC List Item for the schedule view populated
// with the given documents activeAppt data.
Schedule.renderActiveApptListItem = function(doc, locationID) {
    const activeAppt = doc.data();
    const otherUser = Utils.getOtherUser(activeAppt.attendees[0], activeAppt.attendees[1]);
    if (window.app.user.type === 'Supervisor') {
        var title = "Active Appointment between " + activeAppt.attendees[0].name +
            " and " + activeAppt.attendees[1].name;
    } else {
        var title = "Active Appointment with " + Utils.getOtherUser(
            activeAppt.attendees[0],
            activeAppt.attendees[1]).name;
    }
    const subtitle = "Tutoring session right now for " + activeAppt.for.subject +
        " at the " + activeAppt.location.name + ".";
    const dialog = new ViewActiveApptDialog(activeAppt, doc.id);

    if (window.app.user.type === 'Supervisor') {
        var listItem = window.app.render.template('supervisor-appt-list-item', {
            photoA: activeAppt.attendees[0].photo,
            photoB: activeAppt.attendees[1].photo,
            viewUserA: () => {
                User.viewUser(activeAppt.attendees[0].email);
            },
            viewUserB: () => {
                User.viewUser(activeAppt.attendees[1].email);
            },
            id: 'doc-activeAppointments-' + doc.id,
            title: title,
            subtitle: subtitle,
            timestamp: activeAppt.clockIn.sentTimestamp.toDate(),
            go_to_appt: () => {
                dialog.view();
            },
            showAction: true,
            actionLabel: 'ClockOut',
            action: async () => {
                await Data.clockOut(doc.data(), doc.id);
                window.app.schedule.refresh();
            },
        });
    } else if (window.app.user.type === 'Tutor') {
        var listItem = window.app.render.template('appt-list-item', {
            photo: otherUser.photo,
            viewUser: () => {
                User.viewUser(otherUser.email);
            },
            id: 'doc-activeAppointments-' + doc.id,
            title: title,
            subtitle: subtitle,
            timestamp: activeAppt.clockIn.sentTimestamp.toDate(),
            go_to_appt: () => {
                dialog.view();
            },
            showAction: true,
            actionLabel: 'ClockOut',
            action: async () => {
                await Data.clockOut();
                window.app.schedule.refresh();
            },
        });
    } else {
        var listItem = window.app.render.template('appt-list-item', {
            photo: otherUser.photo,
            viewUser: () => {
                User.viewUser(otherUser.email);
            },
            id: 'doc-activeAppointments-' + doc.id,
            title: title,
            subtitle: subtitle,
            timestamp: activeAppt.clockIn.sentTimestamp.toDate(),
            go_to_appt: () => {
                dialog.view();
            },
            showAction: false,
        });
    }
    // NOTE: Setting class like this enables the scheduleRecycler to remove
    // all of the listItems that could've come from the same query (when the
    // query returns empty).
    if (!!locationID) {
        listItem.setAttribute('class', 'event-activeAppt-' + locationID + ' ' + listItem.getAttribute('class'));
    } else {
        listItem.setAttribute('class', 'event-activeAppt ' + listItem.getAttribute('class'));
    }
    return listItem;
};


// Render function that returns an MDC List Item for the schedule view populated
// with the given documents pastAppt data.
Schedule.renderPastApptListItem = function(doc, locationID) {
    const pastAppt = doc.data();
    const otherUser = Utils.getOtherUser(pastAppt.attendees[0], pastAppt.attendees[1]);
    if (window.app.user.type === 'Supervisor') {
        var title = "Past Appointment between " + pastAppt.attendees[0].name +
            " and " + pastAppt.attendees[1].name;
    } else {
        var title = "Past Appointment with " + Utils.getOtherUser(
            pastAppt.attendees[0],
            pastAppt.attendees[1]).name;
    }
    const subtitle = "Tutoring session for " + pastAppt.for.subject + " at the " +
        pastAppt.location.name + ".";
    const dialog = new ViewPastApptDialog(pastAppt, doc.id);

    if (window.app.user.type === 'Supervisor') {
        var listItem = window.app.render.template('supervisor-appt-list-item', {
            photoA: pastAppt.attendees[0].photo,
            photoB: pastAppt.attendees[1].photo,
            viewUserA: async () => {
                const profile = await Data.getUser(appt.attendees[0].email);
                new User(profile).view();
            },
            viewUserB: async () => {
                const profile = await Data.getUser(appt.attendees[1].email);
                new User(profile).view();
            },
            id: 'doc-pastAppointments-' + doc.id,
            title: title,
            subtitle: subtitle,
            timestamp: pastAppt.clockIn.sentTimestamp.toDate(),
            go_to_appt: () => {
                dialog.view();
            },
            showAction: true,
            actionLabel: 'Delete',
            action: () => {
                return new ConfirmationDialog('Delete Past Appointment?',
                    'Are you sure you want to permanently delete this ' +
                    'past appointment between ' + pastAppt.attendees[0].name +
                    ' and ' + pastAppt.attendees[1].name + '? This action ' +
                    'cannot be undone.', async () => {
                        $('#doc-pastAppointments-' + doc.id).remove();
                        window.app.schedule.refresh();
                        await Data.deletePastAppt(pastAppt, doc.id);
                        window.app.snackbar.view('Deleted past appointment.');
                    }).view();
            },
        });
    } else {
        var listItem = window.app.render.template('appt-list-item', {
            photo: otherUser.photo,
            viewUser: async () => {
                const profile = await Data.getUser(otherUser.email);
                new User(profile).view();
            },
            id: 'doc-pastAppointments-' + doc.id,
            title: title,
            subtitle: subtitle,
            timestamp: pastAppt.clockIn.sentTimestamp.toDate(),
            go_to_appt: () => {
                dialog.view();
            },
            showAction: true,
            actionLabel: 'Delete',
            action: () => {
                return new ConfirmationDialog('Delete Past Appointment?',
                    'Are you sure you want to permanently delete this ' +
                    'past appointment with ' + otherUser.name +
                    '? This action cannot be undone.', async () => {
                        $('#doc-pastAppointments-' + doc.id).remove();
                        window.app.schedule.refresh();
                        await Data.deletePastAppt(pastAppt, doc.id);
                    }).view();
            },
        });
    }
    // NOTE: Setting class like this enables the scheduleRecycler to remove
    // all of the listItems that could've come from the same query (when the
    // query returns empty).
    if (!!locationID) {
        listItem.setAttribute('class', 'event-pastAppt-' + locationID + ' ' + listItem.getAttribute('class'));
    } else {
        listItem.setAttribute('class', 'event-pastAppt ' + listItem.getAttribute('class'));
    }
    return listItem;
};


class SupervisorSchedule extends Schedule {

    constructor() {
        super();
    }

    viewAppts() {
        const db = firebase.firestore().collection('locations')
            .doc(window.app.location.id); // TODO: Add >1 location
        const queries = {
            appointments: db.collection('appointments').orderBy('timestamp', 'desc'),
            pastAppointments: db.collection('pastAppointments')
                .orderBy('clockOut.sentTimestamp', 'desc').limit(10),
            activeAppointments: db.collection('activeAppointments')
                .orderBy('clockIn.sentTimestamp', 'desc'),
            modifiedAppointments: db.collection('modifiedAppointments')
                .orderBy('modifiedTimestamp', 'desc'),
            canceledAppointments: db.collection('canceledAppointments')
                .orderBy('canceledTimestamp', 'desc'),
        };
        Utils.recycle(queries, this.recycler);
    }

    static renderShortcutCard() {
        const title = 'Upcoming Appointments';
        const subtitle = 'Manage upcoming, active, and past appointments';
        const summary = 'From your schedule, you\'re able to view, edit, and ' +
            'cancel all active, past, and upcoming tutoring appointments at ' +
            'your location(s). Soon, you\'ll be able to clock-in and out for ' +
            'the tutors at your location without leaving the schedule view.';
        var card;
        const actions = {
            snooze: () => {
                $(card).remove();
            },
            view: () => {
                window.app.schedule.view();
            },
            primary: () => {
                window.app.schedule.view();
            },
        };
        card = Card.renderCard(title, subtitle, summary, actions);
        $(card)
            .attr('id', 'shortcut-to-schedule')
            .attr('type', 'shortcut')
            .attr('priority', 10);
        return card;
    }

};


class ScheduleCard {

    constructor() {
        this.render = window.app.render;
        this.colors = {};
        this.renderSelf();
    }

    renderSelf() {
        this.main = this.render.template('card-schedule');
    }

    viewAppts() {
        firebase.firestore().collection('locations').doc(window.app.location.id)
            .collection('appointments').orderBy('time.from').get()
            .then((snapshot) => {
                $(this.main).find('#loader').remove();
                snapshot.forEach((doc) => {
                    this.viewAppt(doc);
                });
            });
    }

    viewAppt(doc) {
        $(this.main)
            .find('#' + doc.data().time.day.toLowerCase() + ' .schedule-list')
            .append(this.renderAppt(doc));
    }

    renderAppt(doc) {
        const appt = doc.data();
        const title = appt.attendees[0].name.split(' ')[0] + ' and ' +
            appt.attendees[1].name.split(' ')[0];
        const subtitle = ((Data.periods.indexOf(appt.time.from) < 0) ?
            'At ' : 'During ') + appt.time.from;
        const background = this.color(appt.time);
        const card = $(this.render.template('card-event', {
            title: title,
            subtitle: subtitle,
            id: doc.id,
        })).css('background', background);
        var timer;
        const clockIn = () => {
            $(card).find('.mdc-linear-progress').remove();
            $(card).prepend($(this.render.template('event-progress')));
            $(card)
                .find('.mdc-linear-progress__bar-inner')
                .css('background-color', background);
            var time = 0; // Seconds since button clicked
            var total = (new Date('1/1/2019 ' + appt.time.to).getTime() -
                new Date('1/1/2019 ' + appt.time.from).getTime()) / 1000;
            const bar = new MDCLinearProgress(
                $(card).find('.mdc-linear-progress')[0]
            );
            timer = window.setInterval(() => {
                time++;
                bar.progress = time / total;
                if (time === total) window.clearInterval(timer);
            }, 1000);
        };
        const clockOut = () => {
            if (timer) {
                window.clearInterval(timer);
                timer = undefined;
            }
            $(card).find('.mdc-linear-progress').remove();
        };
        Object.entries({
            'View': () => {
                new ViewApptDialog(appt).view();
            },
            'Edit': () => {
                new EditApptDialog(appt).view();
            },
            'Cancel': () => {
                return new ConfirmationDialog('Cancel Appointment?',
                    'Cancel tutoring sessions between ' + appt.attendees[0].name +
                    ' and ' + appt.attendees[1].name + ' for ' + appt.for.subject + ' at ' +
                    appt.time.from + ' at the ' +
                    appt.location.name + '.', async () => {
                        $(schedule).find('#' + doc.id).remove();
                        var err;
                        var res;
                        [err, res] = await to(Data.cancelAppt(appt, doc.id));
                        if (err) return window.app.snackbar.view('Could ' +
                            'not cancel appointment.');
                        window.app.snackbar.view('Canceled appointment.');
                    }).view();
            },
            'Clock-In': async () => {
                clockIn();
                window.app.snackbar.view('Clocking in for ' +
                    appt.for.toUser.name.split(' ')[0] + '...');
                const r = await Data.instantClockIn(doc.data(), doc.id);
                window.app.snackbar.view('Clocked in at ' + new Date(r.data
                    .clockIn.sentTimestamp).toLocaleTimeString() + '.');
            },
            'Clock-Out': async () => {
                clockOut();
                window.app.snackbar.view('Clocking out for ' +
                    appt.for.toUser.name.split(' ')[0] + '...');
                const r = await Data.instantClockOut(doc.data(), doc.id);
                window.app.snackbar.view('Clocked out at ' + new Date(r.data
                    .clockOut.sentTimestamp).toLocaleTimeString() + '.');
            },
        }).forEach((entry) => {
            $(card).find('.mdc-menu .mdc-list').append(
                this.render.template('card-action', {
                    label: entry[0],
                    action: entry[1],
                })
            );
        });
        const menu = new MDCMenu($(card).find('.mdc-menu')[0]);
        const button = $(card).find('#menu');
        MDCRipple.attachTo(button[0]).unbounded = true;
        $(card).find('.mdc-menu .mdc-list-item').each(function() {
            MDCRipple.attachTo(this);
        });
        button.click(() => {
            menu.open = true;
        });
        return card;
    }

    color(time) {
        if (this.colors[time.day] && this.colors[time.day][time.from])
            return this.colors[time.day][time.from];
        const palette = {
            'purples': ['#7e57c2', '#5e35b1', '#4527a0', '#311b92'],
            'pinks': ['#ec407a', '#d81b60', '#ad1457', '#880e4f'],
            'blues': ['#5c6bc0', '#3949ab', '#283593', '#1a237e'],
            'oranges': ['#ffa726', '#fb8c00', '#ef6c00', '#e65100'],
            'greens': ['#26a69a', '#00897b', '#00695c', '#004d40'],
            'greys': ['#78909c', '#546e7a', '#37474f', '#263238'],
        };
        if (this.colors[time.day]) {
            var type = 'oranges';
            var used = [];
            Object.entries(palette).forEach((entry) => {
                Object.values(this.colors[time.day]).forEach((color) => {
                    if (entry[1].indexOf(color) >= 0) type = entry[0];
                    used.push(color);
                });
            });
            for (var i = 0; i < palette[type].length; i++) {
                if (used.indexOf(palette[type][i]) < 0) {
                    this.colors[time.day][time.from] = palette[type][i];
                    break;
                }
            }
            if (!this.colors[time.day][time.from])
                this.colors[time.day][time.from] = used[0];
        } else {
            this.colors[time.day] = {};
            var type = 'oranges';
            var used = [];
            Object.entries(palette).forEach((entry) => {
                Object.values(this.colors).forEach((times) => {
                    Object.values(times).forEach((c) => {
                        if (entry[1].indexOf(c) >= 0) used.push(entry[0]);
                    });
                });
            });
            for (var i = 0; i < Object.keys(palette).length; i++) {
                var key = Object.keys(palette)[i];
                if (used.indexOf(key) < 0) type = key;
            }
            this.colors[time.day][time.from] = palette[type][0];
        }
        return this.colors[time.day][time.from];
    }
};


module.exports = {
    default: Schedule,
    supervisor: SupervisorSchedule,
    card: ScheduleCard,
};