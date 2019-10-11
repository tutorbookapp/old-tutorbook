import {
    MDCRipple
} from '@material/ripple/index';
import {
    MDCTopAppBar
} from '@material/top-app-bar/index';

import $ from 'jquery';
import to from 'await-to-js';

const Data = require('data');
const Utils = require('utils');
const ViewApptDialog = require('dialogs').viewAppt;
const ViewActiveApptDialog = require('dialogs').viewActiveAppt;
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
                this.viewEvent(listItem)
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
        this.viewEvents();
    }

    reView() {
        this.viewEvents(); // TODO: Just re-attach listeners
    }

    reViewEvents() {}

    viewEvents() {
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

    viewEvent(listItem) {
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

    if (window.app.user.type === 'Supervisor') {
        var listItem = render.template('supervisor-appt-list-item', {
            photoA: appt.attendees[0].photo,
            viewUserA: () => {
                Utils.viewUser(appt.attendees[0].email);
            },
            photoB: appt.attendees[1].photo,
            viewUserB: () => {
                Utils.viewUser(appt.attendees[1].email);
            },
            id: 'doc-appointments-' + doc.id,
            title: title,
            subtitle: subtitle,
            timestamp: time,
            go_to_appt: () => {
                new ViewApptDialog(doc.data(), doc.id).view();
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
                Utils.viewUser(otherUser.email);
            },
            id: 'doc-appointments-' + doc.id,
            title: title,
            subtitle: subtitle,
            timestamp: time,
            go_to_appt: () => {
                new ViewApptDialog(doc.data(), doc.id).view();
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

    if (window.app.user.type === 'Supervisor') {
        var listItem = window.app.render.template('supervisor-appt-list-item', {
            photoA: canceledAppt.for.attendees[0].photo,
            photoB: canceledAppt.for.attendees[1].photo,
            viewUserA: () => {
                Utils.viewUser(canceledAppt.attendees[0].email);
            },
            viewUserB: () => {
                Utils.viewUser(canceledAppt.attendees[1].email);
            },
            id: 'doc-canceledAppointments-' + doc.id,
            title: title,
            subtitle: subtitle,
            timestamp: time,
            go_to_appt: () => {
                new CanceledApptDialog(canceledAppt.for, doc.id).view();
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
                Utils.viewUser(otherUser.email);
            },
            id: 'doc-canceledAppointments-' + doc.id,
            title: title,
            subtitle: subtitle,
            timestamp: time,
            go_to_appt: () => {
                new CanceledApptDialog(canceledAppt.for, doc.id).view();
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

    if (window.app.user.type === 'Supervisor') {
        var listItem = window.app.render.template('supervisor-appt-list-item', {
            photoA: modifiedAppt.for.attendees[0].photo,
            photoB: modifiedAppt.for.attendees[1].photo,
            viewUserA: () => {
                Utils.viewUser(modifiedAppt.attendees[0].email);
            },
            viewUserB: () => {
                Utils.viewUser(modifiedAppt.attendees[1].email);
            },
            id: 'doc-modifiedAppointments-' + doc.id,
            title: title,
            subtitle: subtitle,
            timestamp: time,
            go_to_appt: () => {
                new ViewApptDialog(doc.data(), doc.id).view();
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
                Utils.viewUser(otherUser.email);
            },
            id: 'doc-modifiedAppointments-' + doc.id,
            title: title,
            subtitle: subtitle,
            timestamp: time,
            go_to_appt: () => {
                new ViewApptDialog(doc.data(), doc.id).view();
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

    if (window.app.user.type === 'Supervisor') {
        var listItem = window.app.render.template('supervisor-appt-list-item', {
            photoA: activeAppt.attendees[0].photo,
            photoB: activeAppt.attendees[1].photo,
            viewUserA: () => {
                Utils.viewUser(activeAppt.attendees[0].email);
            },
            viewUserB: () => {
                Utils.viewUser(activeAppt.attendees[1].email);
            },
            id: 'doc-activeAppointments-' + doc.id,
            title: title,
            subtitle: subtitle,
            timestamp: activeAppt.clockIn.sentTimestamp.toDate(),
            go_to_appt: () => {
                new ViewActiveApptDialog(activeAppt, doc.id).view();
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
                Utils.viewUser(otherUser.email);
            },
            id: 'doc-activeAppointments-' + doc.id,
            title: title,
            subtitle: subtitle,
            timestamp: activeAppt.clockIn.sentTimestamp.toDate(),
            go_to_appt: () => {
                new ViewActiveApptDialog(activeAppt, doc.id).view();
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
                Utils.viewUser(otherUser.email);
            },
            id: 'doc-activeAppointments-' + doc.id,
            title: title,
            subtitle: subtitle,
            timestamp: activeAppt.clockIn.sentTimestamp.toDate(),
            go_to_appt: () => {
                new ViewActiveApptDialog(activeAppt, doc.id).view();
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
                new ViewPastApptDialog(pastAppt, doc.id).view();
            },
            showAction: true,
            actionLabel: 'Delete',
            action: () => {
                return new ConfirmationDialog('Delete Past Appointment?',
                    'Are you sure you want to permanently delete this ' +
                    'past appointment between ' + pastAppt.attendees[0].name +
                    ' and ' + pastAppt.attendees[1].name + '? This action cannot be undone.', async () => {
                        $('#doc-pastAppointments-' + doc.id).remove();
                        window.app.schedule.refresh();
                        await Data.deletePastAppt(pastAppt, doc.id);
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
                new ViewPastApptDialog(pastAppt, doc.id).view();
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

    viewEvents() {
        const db = firebase.firestore().collection('locations')
            .doc(window.app.user.locations[0]); // TODO: Add >1 location
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
};


module.exports = {
    default: Schedule,
    supervisor: SupervisorSchedule,
};