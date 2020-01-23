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
    constructor(appt, id, colors, type) {
        this.render = window.app.render;
        this.color = Utils.color(appt.time, colors);
        Object.entries(appt).forEach((entry) => {
            this[entry[0]] = entry[1];
        });
        this.id = id;
        this.type = type;
        this.actions = {
            'View': () => {
                new ViewApptDialog(Utils.filterApptData(this)).view();
            },
            'Edit': () => {
                new EditApptDialog(Utils.filterApptData(this)).view();
            },
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
        const subtitle = this.for.subject + ((window.app.data.periods.indexOf(
            this.time.from) < 0) ? ' at ' : ' during ') + this.time.from;
        this.el = $(this.render.template('card-event', {
            title: title,
            subtitle: subtitle,
            id: this.id,
            type: this.type,
        })).css('background', this.color);
        this.menu = new MDCMenu($(this.el).find('.mdc-menu')[0]);
        MDCRipple.attachTo($(this.el).find('#menu')[0]).unbounded = true;
        $(this.el).find('.mdc-menu .mdc-list-item').each(function() {
            MDCRipple.attachTo(this);
        });
        Object.entries(this.actions).forEach((entry) => {
            $(this.el).find('.mdc-menu .mdc-list').append(
                this.render.template('card-action', {
                    label: entry[0],
                    action: () => {},
                })
            );
        });
        this.manage();
    }

    manage() {
        $(this.el).find('#menu')[0].addEventListener('click', () => {
            this.menu.open = true;
        });
        Object.entries(this.actions).forEach((entry) => {
            $(this.el).find('[id="' + entry[0] + '"]')[0]
                .addEventListener('click', entry[1]);
        });
    }
};


class Appt extends Event {

    constructor(appt, id, colors) {
        super(appt, id, colors || {}, 'appts');
        this.actions['Clock in'] = async () => {
            this.clockIn();
        };
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

    constructor(appt, id, colors) {
        super(appt, id, colors || {}, 'activeAppts');
        this.actions['Clock out'] = async () => {
            this.clockOut();
        };
        this.actions['View'] = () => {
            new ViewActiveApptDialog(Utils.filterActiveApptData(this)).view();
        };
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
        this.events = {};
        this.appts = {};
        this.activeAppts = {};
        this.queries = queries || (window.app.location.id ? {
            appts: window.app.db.collection('locations')
                .doc(window.app.location.id).collection('appointments')
                .orderBy('time.from'),
            activeAppts: window.app.db.collection('locations')
                .doc(window.app.location.id).collection('activeAppointments')
                .orderBy('time.from'),
        } : {});
        this.renderSelf();
    }

    renderSelf() {
        this.main = this.render.template('card-schedule');
    }

    async viewAppts() {
        const recycler = {
            display: (doc, type) => {
                $(this.main).find('#loader').remove();
                if (type === 'activeAppts') {
                    this[type][doc.id] = new ActiveAppt(
                        doc.data(),
                        doc.id,
                        this.colors
                    );
                    if ($(this.main).find('#' + doc.id).length)
                        return $(this.main)
                            .find('#' + doc.id)
                            .replaceWith(this[type][doc.id].el);
                } else {
                    this[type][doc.id] = new Appt(
                        doc.data(),
                        doc.id,
                        this.colors
                    );
                }
                $(this.main)
                    .find('#' + this[type][doc.id].time.day + ' .schedule-list')
                    .append(this[type][doc.id].el);
                if (this.displayHook) this.displayHook(doc, type);
            },
            remove: (doc, type) => {
                this[type][doc.id] = undefined;
                if (type === 'activeAppts') {
                    $(this.main).find('#' + doc.id)
                        .replaceWith(this.appts[doc.id].el);
                    this.appts[doc.id].manage();
                } else {
                    $(this.main).find('#' + doc.id).remove();
                }
            },
            empty: (type) => {
                this[type] = {};
                if (type === 'activeAppts') {
                    const appts = this.appts;
                    $(this.main)
                        .find('[type="' + type + '"]').each(function() {
                            $(this).replaceWith(appts[$(this).attr('id')].el);
                            appts[$(this).attr('id')].manage();
                        });
                } else {
                    $(this.main).find('[type="' + type + '"]').remove();
                }
                if (this.emptyHook) this.emptyHook(type);
            },
        };
        Utils.recycle(this.queries, recycler);
    }
};

module.exports = ScheduleCard;