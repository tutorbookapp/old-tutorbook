import {
    MDCRipple
} from '@material/ripple/index';
import {
    MDCTopAppBar
} from '@material/top-app-bar/index';

import $ from 'jquery';
import to from 'await-to-js';

const algolia = require('algoliasearch')
    ('9FGZL7GIJM', '9ebc0ac72bdf6b722d6b7985d3e83550');
const SearchHeader = require('@tutorbook/search').header;
const Card = require('@tutorbook/card');
const Data = require('@tutorbook/data');
const Utils = require('@tutorbook/utils');

const NewPastApptDialog = require('@tutorbook/dialogs').newPastAppt;
const ApptNotificationDialog = require('@tutorbook/dialogs').notifyAppt;

const Appt = require('@tutorbook/schedule-items').appt;
const ActiveAppt = require('@tutorbook/schedule-items').active;
const PastAppt = require('@tutorbook/schedule-items').past;
const CanceledAppt = require('@tutorbook/schedule-items').canceled;
const ModifiedAppt = require('@tutorbook/schedule-items').modified;
const SupervisorAppt = require('@tutorbook/schedule-items').supervisor.appt;
const SupervisorPastAppt = require('@tutorbook/schedule-items').supervisor.past;
const SupervisorActiveAppt = require('@tutorbook/schedule-items').supervisor
    .active;
const SupervisorCanceledAppt = require('@tutorbook/schedule-items').supervisor
    .canceled;
const SupervisorModifiedAppt = require('@tutorbook/schedule-items').supervisor
    .modified;

// Class that provides a schedule view and header and manages all the data flow
// concerning the user's appointments. Also provides an API to insert into the
// schedule.
class Schedule {

    constructor() {
        this.render = window.app.render;
        this.limit = 10; // How many pastAppointments to load
        this.recycler = {
            remove: (doc, type) => {
                $(this.main)
                    .find('[id="' + doc.id + '"][type="' + type + '"]')
                    .remove();
                this.refresh();
            },
            display: (doc, type) => {
                try {
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
                    this.viewAppt(listItem);
                } catch (e) {
                    console.warn('[ERROR] Could not render ' + type + ' (' +
                        doc.id + ') b/c of', e);
                }
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
        $(this.main).find('.appt-list-item:visible').each(function(i) {
            var date = new Date($(this).attr('timestamp'));
            dates.push(Utils.getEarliestDateWithDay(date).getTime());
        });
        $(this.main).find('.date-list-divider:visible').each(function(i) {
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
        if (!this.managed) this.manage();
        this.viewAppts();
    }

    manage() {
        this.managed = true;
        MDCTopAppBar.attachTo(this.header);
        MDCRipple.attachTo($(this.main).find('#load-more')[0]);
        $(this.main).find('#load-more')[0].addEventListener('click', () => {
            this.loadMore();
        });
    }

    reView() {
        this.viewAppts(); // TODO: Just re-attach listeners
    }

    reViewAppts() {}

    viewAppts() {
        const db = window.app.db.collection('users')
            .doc(window.app.user.uid); // TODO: Add proxy results too 
        const queries = {
            appointments: db.collection('appointments')
                .orderBy('timestamp', 'desc'),
            pastAppointments: db.collection('pastAppointments')
                .orderBy('clockOut.sentTimestamp', 'desc').limit(this.limit),
            activeAppointments: db.collection('activeAppointments')
                .orderBy('clockIn.sentTimestamp', 'desc'),
            modifiedAppointments: db.collection('modifiedAppointments')
                .orderBy('modifiedTimestamp', 'desc'),
            canceledAppointments: db.collection('canceledAppointments')
                .orderBy('canceledTimestamp', 'desc'),
        };
        Utils.recycle(queries, this.recycler);
    }

    loadMore() {
        const db = window.app.db.collection('users')
            .doc(window.app.user.uid); // TODO: Add proxy results too 
        this.limit += 10;
        Utils.recycle({
            pastAppointments: db.collection('pastAppointments')
                .orderBy('clockOut.sentTimestamp', 'desc').limit(this.limit),
        }, this.recycler);
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
        MDCRipple.attachTo(listItem);
        const scheduleEl = $(this.main).find('.mdc-list')[0];
        const timestamp = new Date($(listItem).attr('timestamp'));
        const id = $(listItem).attr('id');
        const type = $(listItem).attr('type');

        const e = $(scheduleEl).find('[id="' + id + '"][type="' + type + '"]');
        if (e.length) return e.replaceWith(listItem); // Modify

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
                    return $(listItem).insertAfter(child);
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

Schedule.renderCanceledApptListItem = (doc) => {
    if (window.app.user.type === 'Supervisor')
        return new SupervisorCanceledAppt(doc).el;
    return new CanceledAppt(doc).el;
};

Schedule.renderModifiedApptListItem = (doc) => {
    if (window.app.user.type === 'Supervisor')
        return new SupervisorModifiedAppt(doc).el;
    return new ModifiedAppt(doc).el;
};

Schedule.renderPastApptListItem = (doc) => {
    if (window.app.user.type === 'Supervisor')
        return new SupervisorPastAppt(doc).el;
    return new PastAppt(doc).el;
};

Schedule.renderActiveApptListItem = (doc) => {
    if (window.app.user.type === 'Supervisor')
        return new SupervisorActiveAppt(doc).el;
    return new ActiveAppt(doc).el;
};

Schedule.renderApptListItem = (doc) => {
    if (window.app.user.type === 'Supervisor') return new SupervisorAppt(doc).el;
    return new Appt(doc).el;
};

class SupervisorSchedule extends Schedule {

    renderHit(hit) {
        const doc = {
            data: () => Utils.filterApptData(hit),
            id: hit.objectID,
        };
        const el = window.app.user.type === 'Supervisor' ?
            new SupervisorAppt(doc).el : new Appt(doc).el;
        MDCRipple.attachTo(el);
        return $(el).find('button').remove().end()[0];
    }

    renderSelf() {
        super.renderSelf();
        this.search = new SearchHeader({
            title: 'Schedule',
            placeholder: window.app.onMobile ? 'Search appointments' : 'Searc' +
                'h appointments by subject, location, time, and more',
            index: algolia.initIndex('appts'),
            search: async (that) => {
                const qry = $(that.el).find('.search-box input').val();
                qry.length > 0 ? that.showClearButton() : that.showInfoButton();
                const res = await that.index.search({
                    query: qry,
                    facetFilters: window.app.location.name === 'Any' ? [
                        'partition:' + (window.app.test ? 'test' : 'default'),
                    ] : [
                        'location.id:' + window.app.location.id,
                        'partition:' + (window.app.test ? 'test' : 'default'),
                    ],
                });
                $(that.el).find('#results').empty();
                res.hits.forEach((hit) => {
                    try {
                        $(that.el).find('#results').append(this.renderHit(hit));
                    } catch (e) {
                        console.warn('[ERROR] Could not render hit (' +
                            hit.objectID + ') b/c of', e);
                    }
                });
            },
        });
        this.header = this.search.el;
        $(this.main).append(this.render.template('fab-labeled', {
            id: 'new-past-appt-btn',
            icon: 'add',
            label: 'Record',
        }));
    }

    manage() {
        super.manage();
        const btn = $(this.main).find('#new-past-appt-btn')[0];
        btn.addEventListener('click', () => new NewPastApptDialog().view());
        MDCRipple.attachTo(btn);
    }

    view() {
        super.view();
        this.search.manage();
    }

    reView() {
        super.reView();
        this.search.manage();
    }

    viewAppts() {
        const db = window.app.db.collection('locations')
            .doc(window.app.location.id); // TODO: Add >1 location
        const queries = {
            appointments: db.collection('appointments')
                .orderBy('timestamp', 'desc'),
            pastAppointments: db.collection('pastAppointments')
                .orderBy('clockOut.sentTimestamp', 'desc').limit(this.limit),
            activeAppointments: db.collection('activeAppointments')
                .orderBy('clockIn.sentTimestamp', 'desc'),
            modifiedAppointments: db.collection('modifiedAppointments')
                .orderBy('modifiedTimestamp', 'desc'),
            canceledAppointments: db.collection('canceledAppointments')
                .orderBy('canceledTimestamp', 'desc'),
        };
        Utils.recycle(queries, this.recycler);
    }

    loadMore() {
        const db = window.app.db.collection('locations')
            .doc(window.app.location.id); // TODO: Add >1 location
        this.limit += 10;
        Utils.recycle({
            pastAppointments: db.collection('pastAppointments')
                .orderBy('clockOut.sentTimestamp', 'desc').limit(this.limit),
        }, this.recycler);
    }

    static renderShortcutCard() {
        const dialog = new ApptNotificationDialog();
        const title = 'Upcoming Appointments';
        const subtitle = 'Manage upcoming, active, and past appointments';
        const summary = 'From your schedule, you\'re able to view, edit, and ' +
            'cancel all active, past, and upcoming tutoring appointments at ' +
            'your location(s).';
        var card;
        const actions = {
            snooze: () => {
                $(card).remove();
            },
            notify: () => {
                dialog.view();
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

module.exports = {
    default: Schedule,
    supervisor: SupervisorSchedule,
};