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

import {
    MDCRipple
} from '@material/ripple/index';
import {
    MDCLinearProgress
} from '@material/linear-progress/index';
import {
    MDCMenu
} from '@material/menu/index';

import $ from 'jquery';
import to from 'await-to-js';

const Data = require('@tutorbook/data');
const Utils = require('@tutorbook/utils');
const EditApptDialog = require('@tutorbook/dialogs').editAppt;
const ViewApptDialog = require('@tutorbook/dialogs').viewAppt;
const ViewActiveApptDialog = require('@tutorbook/dialogs').viewActiveAppt;
const ConfirmationDialog = require('@tutorbook/dialogs').confirm;

/**
 * Class that represents the schedule cards within the supervisor's dashboard
 * schedule (not to be confused with the other `Event` class that represents the
 * schedule **list items** in the **primary schedule** view).
 * @alias EventCard
 * @abstract
 */
class Event {
    /**
     * Creates and renders a new event card.
     * @param {Appointment} appt - The appointment to render the event for.
     * @param {string} id - The appointment's Firestore document ID.
     * @param {Object} colors - A `Map` storing the available (and already
     * used) event card colors.
     * @param {string} type - The type of the appointment (mostly used for
     * recycling purposes).
     * @param {int} index - Another parameter mostly used for recycling
     * purposes. The index of the query from which this event came from.
     */
    constructor(appt, id, colors, type, index = 0) {
        this.render = window.app.render;
        this.color = Utils.color(appt.time, colors);
        Utils.sync(appt, this);
        this.id = id;
        this.type = type;
        this.index = index;
        this.viewDialog = new ViewApptDialog(Utils.filterApptData(this),
            this.id);
        this.editDialog = new EditApptDialog(Utils.filterApptData(this),
            this.id);
        this.actions = {
            'View': () => this.viewDialog.view(),
            'Edit': () => this.editDialog.view(),
            'Cancel': () => {
                return new ConfirmationDialog('Cancel Appointment?',
                    'Cancel tutoring sessions between ' + this.attendees[0].name +
                    ' and ' + this.attendees[1].name + ' for ' +
                    this.for.subject + ' at ' + this.time.from + ' at the ' +
                    this.location.name + '.', async () => {
                        window.app.snackbar.view('Canceling appointment...');
                        $(this.el).hide();
                        const [e, r] = await to(Data.cancelAppt(
                            Utils.filterApptData(this), this.id));
                        if (e) {
                            $(this.el).show();
                            return window.app.snackbar.view('Could not cancel' +
                                ' appointment.');
                        }
                        $(this.el).remove();
                        window.app.snackbar.view('Canceled appointment.');
                    }).view();
            },
            'Raw Data': () => Utils.viewRaw({
                data: () => appt,
                id: id,
            }),
        };
    }

    /**
     * Renders the new event card showing:
     * 1. Who the appointment is with (e.g. 'Bobby and Logic'). Note that the 
     *    tutor's name always comes first followed by the pupil.
     * 2. When the appointment is happening
     * 3. What the appointment is for (e.g. 'Chemistry during G Period').
     * 
     * And adds a menu to that card with options to:
     * - Clock in to or out of the appointment
     * - Cancel the appointment
     * - Edit the appointment
     * - View the appointment
     * - View the 'Raw Data' of the appointment (essentially the JSON that is 
     *   stored in our Firestore database)
     */
    renderSelf() {
        const title = this.for.toUser.name.split(' ')[0] + ' and ' +
            this.for.fromUser.name.split(' ')[0];
        const subtitle = this.for.subject + ((window.app.data.periods[this.time
                .day] || []).indexOf(this.time.from) < 0 ? ' at ' :
            ' during ') + this.time.from;
        this.el = $(this.render.template('card-event', {
            title: title,
            subtitle: subtitle,
            id: this.id,
            type: this.type,
            index: this.index,
        })).css('background', this.color);
        MDCRipple.attachTo($(this.el).find('#menu')[0]).unbounded = true;
        Object.entries(this.actions).forEach(([label, action]) => {
            $(this.el).find('.mdc-menu .mdc-list').append(
                this.render.template('card-action', {
                    label: label,
                    action: action,
                })
            );
        });
        this.menu = Utils.attachMenu($(this.el).find('.mdc-menu')[0]);
        this.manage();
    }

    /**
     * Adds the click listener to the event card's menu button.
     */
    manage() {
        $(this.el).find('#menu')[0].addEventListener('click', () => {
            this.menu.open = true;
        });
    }
};

/**
 * Class that represents an upcoming appointment event card in a supervisor's
 * [**dashboard schedule**]{@linkplain ScheduleCard} (not to be confused with an 
 * upcoming appointment [**list item**]{@linkplain ApptListItem} in the 
 * [**primary schedule** view]{@linkplain Schedule}).
 * @alias ApptCard
 * @extends EventCard
 */
class Appt extends Event {

    constructor(appt, id, colors, index) {
        super(appt, id, colors || {}, 'appts', index);
        this.actions['Clock-in'] = () => this.clockIn();
        this.renderSelf();
    }

    /**
     * Clocks in for the tutor of this appointment (turns this event yellow as
     * it's clocking in; until the card is replaced altogether by a deep red 
     * "active appointment" card).
     */
    async clockIn() {
        $(this.el).css('background', '#FFBB00');
        window.app.snackbar.view('Clocking in for ' + this.for.toUser.name +
            '...');
        const [e, r] = await to(Data.instantClockIn(
            Utils.filterApptData(this), this.id));
        $(this.el).css('background', this.color);
        if (e) return window.app.snackbar.view('Could not clock in.');
        window.app.snackbar.view('Clocked in for ' + this.for.toUser.name
            .split(' ')[0] + ' at ' + new Date(r.clockIn.sentTimestamp)
            .toLocaleTimeString() + '.');
    }
}

/**
 * Class that represents the active appointment event card in a supervisor's
 * dashboard schedule (not to be confused with the active appointment **list
 * item** in the **primary schedule** view).
 * @alias ActiveApptCard
 * @extends EventCard
 */
class ActiveAppt extends Event {

    constructor(appt, id, colors, index) {
        super(appt, id, colors || {}, 'activeAppts', index);
        this.actions['Clock-out'] = () => this.clockOut();
        this.viewDialog = new ViewActiveApptDialog(Utils
            .filterActiveApptData(this), this.id);
        this.color = '#B00020';
        this.renderSelf();
    }

    renderSelf() {
        super.renderSelf();
        $(this.el)
            .prepend(this.render.template('event-progress'))
            .find('.mdc-linear-progress__bar-inner')
            .css('background-color', this.color).end()
            .find('.mdc-menu #Cancel').remove();
        var time = (new Date().getTime() / 1000) -
            this.clockIn.sentTimestamp.seconds;
        var total = (new Date('1/1/2019 ' + this.time.to).getTime() -
            new Date('1/1/2019 ' + this.time.from).getTime()) / 1000;
        const bar = new MDCLinearProgress(
            $(this.el).find('.mdc-linear-progress')[0]);
        this.timer = window.setInterval(() => {
            time++;
            bar.progress = time / total;
            if (time === total) window.clearInterval(this.timer);
        }, 1000);
    }

    /**
     * Clocks the tutor of this appointment out (turns yellow while clocking
     * out; before the active appointment is replaced altogether by a regular 
     * "upcoming appointment" event card).
     */
    async clockOut() {
        window.app.snackbar.view('Clocking out for ' + this.for.toUser.name +
            '...');
        const [e, r] = await to(Data.instantClockOut(
            Utils.filterApptData(this), this.id));
        if (e) return window.app.snackbar.view('Could not clock out.');
        window.app.snackbar.view('Clocked out for ' + this.for.toUser.name
            .split(' ')[0] + ' at ' + new Date(r.clockOut.sentTimestamp)
            .toLocaleTimeString() + '.');
    }
}

/**
 * Class that represents the **dashboard schedule** (not to be confused with the
 * [**primary schedule**]{@linkplain Schedule} view) card that shows the
 * supervisor all of their weekly appointments. Is also used in our 
 * [MatchingDialog]{@link module:@tutorbook/matching~MatchingDialog} to show a 
 * user's existing appointments (i.e. so supervisors don't match them for the 
 * same thing twice or double-book them).
 */
class ScheduleCard {
    /**
     * Creates and renders a new dashboard schedule card.
     * @param {Object} [queries] - The queries to recycle appt data from (to 
     * show on the dashboard card).
     */
    constructor(queries) {
        this.render = window.app.render;
        this.colors = {};
        this.appts = [];
        this.activeAppts = [];
        this.queries = queries;
        this.renderSelf();
    }

    /**
     * Renders the schedule card template.
     */
    renderSelf() {
        this.main = this.render.template('card-schedule');
    }

    /**
     * Views the appointments at the given location.
     */
    async viewAppts() {
        const recycler = {
            display: (doc, type, index) => {
                if (!this[type][index]) this[type][index] = {};
                $(this.main).find('#loader').remove();
                if (type === 'activeAppts') {
                    this[type][index][doc.id] = new ActiveAppt(
                        doc.data(),
                        doc.id,
                        this.colors,
                        index,
                    );
                    if ($(this.main).find('#' + doc.id).length)
                        return $(this.main)
                            .find('#' + doc.id)
                            .replaceWith(this[type][index][doc.id].el);
                } else {
                    this[type][index][doc.id] = new Appt(
                        doc.data(),
                        doc.id,
                        this.colors,
                        index,
                    );
                }
                $(this.main).find('#' + this[type][index][doc.id].time.day +
                    ' .schedule-list').append(this[type][index][doc.id].el);
                if (this.displayHook) this.displayHook(doc, type, index);
            },
            remove: (doc, type, index) => {
                this[type][index][doc.id] = undefined;
                if (type === 'activeAppts') {
                    $(this.main).find('#' + doc.id)
                        .replaceWith(this.appts[index][doc.id].el);
                } else {
                    $(this.main).find('#' + doc.id).remove();
                }
            },
            empty: (type, index) => {
                this[type][index] = {};
                if (type === 'activeAppts') {
                    const appts = this.appts[index];
                    $(this.main).find('[type="' + type + '"][index="' + index +
                        '"]').each(function() {
                        $(this).replaceWith(appts[$(this).attr('id')].el);
                    });
                } else {
                    $(this.main).find('[type="' + type + '"][index="' + index +
                        '"]').remove();
                }
                if (this.emptyHook) this.emptyHook(type, index);
            },
        };
        if (this.queries) return Utils.recycle(this.queries, recycler);
        this.queries = {
            appts: [],
            activeAppts: [],
        };
        window.app.data.locations.forEach(location => {
            this.queries.appts.push(window.app.db.collection('locations')
                .doc(location.id).collection('appointments')
                .orderBy('time.from'));
            this.queries.activeAppts.push(window.app.db.collection('locations')
                .doc(location.id).collection('activeAppointments')
                .orderBy('time.from'));
        });
        Utils.recycle(this.queries, recycler);
    }
};

module.exports = ScheduleCard;