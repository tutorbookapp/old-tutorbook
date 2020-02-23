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

class Event {
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

    manage() {
        $(this.el).find('#menu')[0].addEventListener('click', () => {
            this.menu.open = true;
        });
    }
};


class Appt extends Event {

    constructor(appt, id, colors, index) {
        super(appt, id, colors || {}, 'appts', index);
        this.actions['Clock-in'] = () => this.clockIn();
        this.renderSelf();
    }

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
        $(this.el).prepend(this.render.template('event-progress'));
        $(this.el).find('.mdc-linear-progress__bar-inner')
            .css('background-color', this.color);
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


class ScheduleCard {

    constructor(queries) {
        this.render = window.app.render;
        this.colors = {};
        this.appts = [];
        this.activeAppts = [];
        this.queries = queries;
        this.renderSelf();
    }

    renderSelf() {
        this.main = this.render.template('card-schedule');
    }

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
        (await Data.getLocations()).forEach(location => {
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