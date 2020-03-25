/**
 * Package that contains the code backing Tutorbook's **primary schedule** 
 * (list-like) view.
 * @module @tutorbook/schedule
 * @see {@link https://npmjs.com/package/@tutorbook/schedule}
 *
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
 * along with this program.  If not, see {@link https://www.gnu.org/licenses/}.
 */

import {
    MDCRipple
} from '@material/ripple/index';
import {
    MDCTopAppBar
} from '@material/top-app-bar/index';

import * as $ from 'jquery';
import to from 'await-to-js';

import {
    SearchHeader,
} from '@tutorbook/search';
import Card from '@tutorbook/card';
import Data from '@tutorbook/data';
import Utils from '@tutorbook/utils';

import {
    NewPastApptDialog,
} from '@tutorbook/dialogs';

import {
    Appt,
    ActiveAppt,
    CanceledAppt,
    ModifiedAppt,
    SupervisorAppt,
    SupervisorPastAppt,
    SupervisorActiveAppt,
    SupervisorCanceledAppt,
    SupervisorModifiedAppt,
} from '@tutorbook/schedule-items';

/**
 * Class that provides a schedule view and header and manages all the data flow
 * concerning the user's appointments. Also provides an API to insert into the
 * schedule.
 */
export class Schedule {
    /**
     * Creates (and renders) a new schedule view.
     */
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

    /**
     * Looks at the schedule and removes any unnecessary date list dividers 
     * (i.e. date dividers that don't have any appointments on those dates).
     */
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

    /**
     * Hides Intercom, shows the schedule view, and updates the app's URL (to 
     * `'app/schedule'`).
     * @example
     * window.app.schedule.view(); // View the already initialized app schedule.
     * @example
     * const Schedule = require('@tutorbook/schedule').default;
     * const scheduleView = new Schedule(); // Create and view a new schedule.
     * scheduleView.view();
     */
    view() {
        window.app.intercom.view(false);
        window.app.nav.selected = 'Schedule';
        window.app.view(this.header, this.main, '/app/schedule');
        if (!this.managed) this.manage();
        this.viewAppts();
    }

    /**
     * Attaches the top app bar, ripples, and the "Load More" button click 
     * listener.
     */
    manage() {
        this.managed = true;
        Utils.attachHeader(this.header);
        MDCRipple.attachTo($(this.main).find('#load-more')[0]);
        $(this.main).find('#load-more')[0].addEventListener('click', () => {
            this.loadMore();
        });
    }

    /**
     * Reviews appointments and re-attaches listeners.
     * @example
     * window.app.schedule.reView(); // Re-view the default app schedule.
     * @todo Just re-attach listeners.
     */
    reView() {
        this.viewAppts(); // TODO: Just re-attach listeners
    }

    /**
     * Re-attaches click listeners to appointment list items.
     * @abstract
     */
    reViewAppts() {}

    /**
     * Views/recycles the user's
     * - upcoming
     * - past
     * - active
     * - modified
     * - canceled
     * appointments.
     * @see {@link Recycler}
     * @see {@link Utils#recycle}
     * @todo Add proxy results too.
     */
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

    /**
     * Loads more past appointments by increasing the query limit.
     * @todo Add proxy results too.
     */
    loadMore() {
        const db = window.app.db.collection('users')
            .doc(window.app.user.uid); // TODO: Add proxy results too 
        this.limit += 10;
        Utils.recycle({
            pastAppointments: db.collection('pastAppointments')
                .orderBy('clockOut.sentTimestamp', 'desc').limit(this.limit),
        }, this.recycler);
    }

    /**
     * Renders the schedule view and header.
     * @see {@link Render}
     * @todo Make it look decent on a mobile device (change the look of date
     * list dividers and remove the welcome message).
     */
    renderSelf() {
        this.header = this.render.header('header-main', {
            title: 'Schedule',
        });
        this.main = this.render.template('schedule', {
            welcome: !window.app.onMobile,
            summary: (window.app.user.type === 'Supervisor' ? 'View all past,' +
                ' upcoming, and active tutoring appointments at the locations' +
                ' you supervise.' : 'View past tutoring sessions, clock ' +
                'out of active meetings, and edit upcoming appointments.'),
        });
        if (window.app.onMobile) $(this.main).addClass('schedule--mobile');
    }

    /**
     * Adds an appointment list item to our schedule list.
     * @param {HTMLElement} listItem - The appointment list item to view.
     */
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

    /**
     * Renders a date list divider.
     * @param {Date} date - The date of the appointment to render a list divider
     * for.
     * @return {HTMLElement} The rendered date list divider.
     */
    static renderDateDivider(date) {
        const dateString = Schedule.getDayAndDateString(date);
        // NOTE: The dateDividers have to have the earliest possible timestamp
        // on a given date so that when we're inserting events in the calendar,
        // they always divide at the correct location.
        const earliestDateOnDate = new Date(date.getFullYear(), date.getMonth(),
            date.getDate(), 0, 0, 0, 0);
        const templateName = window.app.onMobile ? 'mobile-date-list-divider' :
            'date-list-divider';
        const divider = window.app.render.template(templateName, {
            date: dateString,
            timestamp: earliestDateOnDate,
        });
        return divider;
    }

    /**
     * Gets the day and date string (e.g. `Wed 2/25`) given a date object.
     * @example
     * const now = new Date(); // Let's say it's Monday 2/1/2020
     * const dayAndDateString = Schedule.getDayAndDateString(now);
     * assert(dayAndDateString === 'Mon, 2/1'); // Should be 'Mon, 2/1'
     * @param {Date} date - The date object to convert to a readable string.
     * @return {string} The date in a 'Day, Mon/Date' format (e.g. `Wed 2/25`).
     */
    static getDayAndDateString(date) {
        const abbr = ['Sun', 'Mon', 'Tues', 'Wed', 'Thur', 'Fri', 'Sat'];
        // NOTE: Date().getMonth() returns a 0 based integer (i.e. 0 = Jan)
        return abbr[date.getDay()] + ', ' +
            (date.getMonth() + 1) + '/' + date.getDate();
    }

    /**
     * Gets the next date with a given weekday (e.g. the date of next Monday).
     * @example
     * const now = new Date(); // Let's say it's Monday 2/1/2020
     * const nextTues = Schedule.getNextDateWithDay('Tuesday');
     * console.log(nextTues); // Should be Tuesday 2/9/2020
     * @example
     * const now = new Date(); // Let's say it's Monday 2/1/2020
     * const nextMon = Schedule.getNextDateWithDay('Monday');
     * console.log(nextMon); // Should be Monday 2/1/2020
     * @param {string} day - The weekday to get the next date of.
     * @return {Date} The next date with the given weekday.
     */
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

/**
 * Class that shows all of the appointments for the current app location.
 * @extends Schedule
 */
export class SupervisorSchedule extends Schedule {
    /**
     * Renders the search result hit for the appointments search header view.
     * @param {Object} hit - The Algolia search result data.
     * @return {HTMLElement} The rendered appointment search result list item 
     * (that is appended to the search results list in the user's header view).
     */
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

    /**
     * Renders the supervisor schedule view by changing the default header to 
     * that of a search bar and by adding a "New Record" FAB that opens a
     * [NewPastApptDialog]{@link module:@tutorbook/dialogs~NewPastApptDialog} 
     * when clicked.
     * @see {@link module:@tutorbook/search~SearchHeader}
     */
    renderSelf() {
        super.renderSelf();
        this.search = new SearchHeader({
            title: 'Schedule',
            placeholder: window.app.onMobile ? 'Search appointments' : 'Searc' +
                'h appointments by subject, location, time, and more',
            index: Data.algoliaIndex('appts'),
            search: async (that) => {
                const qry = $(that.el).find('.search-box input').val();
                qry.length > 0 ? that.showClearButton() : that.showInfoButton();
                const res = await that.index.search({
                    query: qry,
                    facetFilters: !window.app.id ? [] : [
                        window.app.locations.map(l => 'location.id:' + l.id),
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

    /**
     * Manages the supervisor schedule view by adding a click listener to the
     * "New Record" FAB (i.e. when it's clicked, open a 
     * [NewPastApptDialog]{@link module:@tutorbook/dialogs~NewPastApptDialog}).
     * @see {@link module:@tutorbook/dialogs~NewPastApptDialog}
     */
    manage() {
        super.manage();
        const btn = $(this.main).find('#new-past-appt-btn')[0];
        btn.addEventListener('click', () => new NewPastApptDialog().view());
        MDCRipple.attachTo(btn);
    }

    /**
     * Views the schedule and manages the search header.
     * @see {@link module:@tutorbook/search~SearchHeader}
     */
    view() {
        super.view();
        this.search.manage();
    }

    /**
     * Re-views the schedule and manages the search header.
     * @see {@link module:@tutorbook/search~SearchHeader}
     */
    reView() {
        super.reView();
        this.search.manage();
    }

    /**
     * Views all of the appointments at the current app partition's primary
     * location.
     * @todo Show all of the appointments for all of the locations that the 
     * current user supervises.
     */
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

    /**
     * Loads more past appointments by increasing the query limit.
     */
    loadMore() {
        const db = window.app.db.collection('locations')
            .doc(window.app.location.id); // TODO: Add >1 location
        this.limit += 10;
        Utils.recycle({
            pastAppointments: db.collection('pastAppointments')
                .orderBy('clockOut.sentTimestamp', 'desc').limit(this.limit),
        }, this.recycler);
    }

    /**
     * Renders, manages, and returns an "Upcoming Appointments" shortcut card
     * that enables supervisors to jump to their schedule (from their dashboard
     * view) with one click.
     * @example
     * const SupervisorSchedule = require('@tutorbook/schedule').supervisor;
     * const card = SupervisorSchedule.renderShortcutCard();
     * $('.mdc-layout-grid__inner').append(card); // Add card to MDCLayoutGrid.
     * @return {HTMLElement} The rendered (and managed) shortcut card.
     */
    static renderShortcutCard() {
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