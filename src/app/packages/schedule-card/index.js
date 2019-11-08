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

const Data = require('data');
const Utils = require('utils');
const EditApptDialog = require('dialogs').editAppt;
const ViewApptDialog = require('dialogs').viewAppt;
const ViewActiveApptDialog = require('dialogs').viewActiveAppt;
const ViewCanceledApptDialog = require('dialogs').viewCanceledAppt;
const ViewPastApptDialog = require('dialogs').viewPastAppt;
const ConfirmationDialog = require('dialogs').confirm;

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
                        $(this.el).remove();
                        const [e, r] = await to(Data.cancelAppt(
                            Utils.filterApptData(this), this.id));
                        if (e) return window.app.snackbar.view('Could ' +
                            'not cancel appointment.');
                        window.app.snackbar.view('Canceled appointment.');
                    }).view();
            },
        };
    }

    renderSelf() {
        const title = this.attendees[0].name.split(' ')[0] + ' and ' +
            this.attendees[1].name.split(' ')[0];
        const subtitle = ((Data.periods.indexOf(this.time.from) < 0) ?
            'At ' : 'During ') + this.time.from;
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
        $(this.el).find('#menu').click(() => {
            this.menu.open = true;
        });
        Object.entries(this.actions).forEach((entry) => {
            $(this.el).find('[id="' + entry[0] + '"]').click(entry[1]);
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
        window.app.snackbar.view('Clocking in for ' +
            this.for.toUser.name.split(' ')[0] + '...');
        const [e, r] = await to(Data.instantClockIn(
            Utils.filterApptData(this), this.id));
        if (e) return window.app.snackbar.view('Could not clock in.');
        window.app.snackbar.view('Clocked in at ' + new Date(r.data
            .clockIn.sentTimestamp).toLocaleTimeString() + '.');
    }
}


class ActiveAppt extends Event {

    constructor(appt, id, colors) {
        super(appt, id, colors || {}, 'activeAppts');
        this.actions['Clock out'] = async () => {
            this.clockOut();
        };
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
        window.app.snackbar.view('Clocking out for ' +
            this.for.toUser.name.split(' ')[0] + '...');
        const [e, r] = await to(Data.instantClockOut(
            Utils.filterApptData(this), this.id));
        if (e) return window.app.snackbar.view('Could not clock out.');
        window.app.snackbar.view('Clocked out at ' + new Date(r.data
            .clockOut.sentTimestamp).toLocaleTimeString() + '.');
    }
}


class ScheduleCard {

    constructor() {
        this.render = window.app.render;
        this.colors = {};
        this.events = {};
        this.appts = {};
        this.activeAppts = {};
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
            },
        };
        Utils.recycle({
            appts: firebase.firestore().collection('locations')
                .doc(window.app.location.id).collection('appointments')
                .orderBy('time.from'),
            activeAppts: firebase.firestore().collection('locations')
                .doc(window.app.location.id).collection('activeAppointments')
                .orderBy('time.from'),
        }, recycler);
    }
};

module.exports = ScheduleCard;