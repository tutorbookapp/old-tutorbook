import {
    MDCTopAppBar
} from '@material/top-app-bar/index';
import {
    MDCRipple
} from '@material/ripple/index';
import {
    MDCMenu
} from '@material/menu/index';

import $ from 'jquery';
import to from 'await-to-js';

const Data = require('data');
const Card = require('card');
const Utils = require('utils');
const User = require('user');
const EditProfile = require('profile').edit;
const MatchingDialog = require('matching').dialog;
const ViewApptDialog = require('dialogs').viewAppt;
const EditApptDialog = require('dialogs').editAppt;
const NotificationDialog = require('dialogs').notify;
const ConfirmationDialog = require('dialogs').confirm;

// Shortcut cards for SupervisorDashboard
const matchingShortcut = require('matching').default.renderShortcutCard;
const scheduleShortcut = require('schedule').supervisor.renderShortcutCard;
const trackingShortcut = require('tracking').renderShortcutCard;

// Class that manages the dashboard view (provides an API for other classes to
// use to display cards) and a custom welcome message that chnages each time a 
// user logs in.
class Dashboard {

    constructor() {
        this.render = window.app.render;
        this.initDismissedCards();
        this.renderSelf();
    }

    initDismissedCards() {
        this.dismissedCards = [];
        if (window.app.user.type === 'Supervisor') {
            var that = window.app;
            return firebase.firestore().collection('users').doc(window.app.user.email)
                .collection('dismissedCards').get().then((snapshot) => {
                    snapshot.forEach((doc) => {
                        this.dismissedCards.push(doc.id);
                    });
                }).catch((err) => {
                    console.error('Error while initializing dismissedCards:', err);
                });
        }
    }

    view() {
        window.app.nav.selected = 'Home';
        window.app.intercom.view(true);
        window.app.view(this.header, this.main, '/app/home');
        MDCTopAppBar.attachTo(this.header);
        this.viewDefaultCards(window.app.user.id);
    }

    reView() {
        window.app.intercom.view(true);
        this.reViewCards();
    }

    reViewCards() { // It's too hard to re-add all unique event listeners
        this.viewDefaultCards(window.app.user.id);
    }

    renderSelf() {
        this.header = this.render.header('header-main', {
            'title': 'Tutorbook'
        });
        this.main = this.render.template('dashboard', {
            // If the user is viewing on mobile, we don't
            // want to show the welcome message in huge text.
            welcome: !window.app.onMobile,
            title: 'Welcome, ' + window.app.user.name.split(' ')[0],
            subtitle: 'We\'re glad you\'re here. Below are some ' +
                'friendly suggestions for what to do next.',
        });
    }

    // Views the default user cards for given userID
    viewDefaultCards(id) {
        if (!id) {
            id = window.app.user.id;
        }
        this.emptyCards('default');
        [
            'requestsIn',
            'canceledRequestsIn',
            'modifiedRequestsIn',
            'requestsOut',
            'modifiedRequestsOut',
            'rejectedRequestsOut',
            'approvedRequestsOut',
            'appointments',
            'activeAppointments',
            'modifiedAppointments',
            'canceledAppointments',
        ].forEach((subcollection) => {
            const query = firebase.firestore().collection('users')
                .doc(id)
                .collection(subcollection)
                .orderBy('timestamp', 'desc');
            this.viewCards(query, subcollection, 'default');
        });
        Data.setupCards.forEach((type) => {
            if (!!window.app.user.cards[type]) {
                this.viewCard(
                    new Card(true, Utils.genID(), type, 2).el,
                    $(this.main).find('#default')
                );
            }
        });
    }

    // Views cards (onSnapshot) from a given query (most recent on top) using a
    // given card type function.
    viewCards(query, type, listID, actions) {
        const list = $(this.main).find('#' + listID);
        const id = Utils.genID(); // Unique ID for every query in dashboard
        const recycler = {
            empty: (list) => {
                if (actions && typeof actions.empty === "function")
                    actions.empty();
                $(list).find('#cards [query="' + id + '"]').remove();
            },
            display: (doc, list) => {
                if (actions && typeof actions.display === "function")
                    actions.display(doc);
                this.viewCard(new Card(doc, id, type).el, list);
            },
            remove: (doc, list) => {
                if (actions && typeof actions.remove === "function")
                    actions.remove(doc);
                $(list).find('#cards [id="' + doc.id + '"]').remove();
            },
        };
        query.onSnapshot((snapshot) => {
            if (!snapshot.size) {
                return recycler.empty(list);
            }
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'removed') {
                    recycler.remove(change.doc, list);
                } else {
                    recycler.display(change.doc, list);
                }
            });
        });
    }

    emptyCards(list) {
        return $(list).find('#cards').empty();
    }

    // Adds card based on priority and/or timestamp (highest priority on the top 
    // followed by the most recent).
    viewCard(card, list) {
        list = list || $(this.main).find('#default');
        var existing = $(list)
            .find('#cards [id="' + $(card).attr('id') + '"]');
        if (existing.length) {
            return $(existing).replaceWith(card);
        }
        // First, find the cards with the same priority as this card
        existing = $(list)
            .find('#cards [priority="' + $(card).attr('priority') + '"]');
        if (existing.length) {
            // Add by timestamp
            for (var i = 0; i < existing.length; i++) {
                var child = existing[i];
                var time = $(child).attr('timestamp');
                if (time && time < $(card).attr('timestamp')) {
                    break;
                }
            }
            if (!child) {
                $(card).insertAfter(existing);
            } else {
                $(card).insertBefore(child);
            }
        } else {
            // Add by priority
            existing = $(list)
                .find('#cards .mdc-card');
            for (var i = 0; i < existing.length; i++) {
                var child = existing[i];
                var priority = $(child).attr('priority');
                if (priority && priority > $(card).attr('priority')) {
                    return $(card).insertAfter(child);
                }
            }
            $(list).find('#cards').prepend(card);
        }
    }
};


// Splits dashboard view into three sections (and adds "Create Profile" fabs):
// 1) Actionable items (e.g. enable notifications, track service hours, edit
// your location)
// 2) Pending matches (e.g. pupil accounts that have not been matched yet or job
// offers that have no responses)
// 3) Everything else (e.g. cards w/ #s => "125 Tutors" or "56 Pupils")
class SupervisorDashboard extends Dashboard {

    constructor() {
        super();
    }

    renderSelf() {
        super.renderSelf();
        const that = this;

        function add(label, id) {
            $(that.main).append(
                that.render.divider(label)
            );
            $(that.main).append(
                $(that.render.template('cards')).attr('id', id)
            );
        };

        add('Schedule', 'schedule');
        add('Everything else', 'everything');
    }

    viewDefaultCards() {
        super.viewDefaultCards();
        this.viewScheduleCards();
        this.viewShortcutCards();
        this.viewEverythingElse();
    }

    viewScheduleCards() {
        const schedule = this.render.template('card-schedule');
        const existing = $(this.main).find('.card-schedule');
        if (existing.length) {
            $(existing).replaceWith(schedule);
        } else {
            $(this.main).find('#schedule .mdc-layout-grid__inner')
                .append(schedule);
        }
        const day = (day, el) => {
            const cols = [
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday',
                'Saturday'
            ];
            $(el).addClass('mdc-layout-grid__cell--order-' +
                (cols.indexOf(day) + 1));
            return el;
        };
        const colors = {};
        const color = (time) => {
            if (colors[time.day] && colors[time.day][time.from])
                return colors[time.day][time.from];
            const palette = {
                'purples': ['#7e57c2', '#5e35b1', '#4527a0', '#311b92'],
                'pinks': ['#ec407a', '#d81b60', '#ad1457', '#880e4f'],
                'blues': ['#5c6bc0', '#3949ab', '#283593', '#1a237e'],
                'oranges': ['#ffa726', '#fb8c00', '#ef6c00', '#e65100'],
                'greens': ['#26a69a', '#00897b', '#00695c', '#004d40'],
                'greys': ['#78909c', '#546e7a', '#37474f', '#263238'],
            };
            if (colors[time.day]) {
                var type = 'oranges';
                var used = [];
                Object.entries(palette).forEach((entry) => {
                    Object.values(colors[time.day]).forEach((color) => {
                        if (entry[1].indexOf(color) >= 0) type = entry[0];
                        used.push(color);
                    });
                });
                for (var i = 0; i < palette[type].length; i++) {
                    if (used.indexOf(palette[type][i]) < 0) {
                        colors[time.day][time.from] = palette[type][i];
                        break;
                    }
                }
                if (!colors[time.day][time.from])
                    colors[time.day][time.from] = used[0];
            } else {
                colors[time.day] = {};
                var type = 'oranges';
                var used = [];
                Object.entries(palette).forEach((entry) => {
                    Object.values(colors).forEach((times) => {
                        Object.values(times).forEach((c) => {
                            if (entry[1].indexOf(c) >= 0) used.push(entry[0]);
                        });
                    });
                });
                for (var i = 0; i < Object.keys(palette).length; i++) {
                    var key = Object.keys(palette)[i];
                    if (used.indexOf(key) < 0) type = key;
                }
                colors[time.day][time.from] = palette[type][0];
            }
            return colors[time.day][time.from];
        };
        const add = (doc) => {
            const appt = doc.data();
            const title = appt.attendees[0].name.split(' ')[0] + ' and ' +
                appt.attendees[1].name.split(' ')[0];
            const subtitle = ((Data.periods.indexOf(appt.time.from) < 0) ?
                'At ' : 'During ') + appt.time.from;
            const card = $(this.render.template('card-event', {
                title: title,
                subtitle: subtitle,
                id: doc.id,
            })).css('background', color(appt.time));
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
                'Clock-In': () => {
                    window.app.snackbar.view('Clocking in for ' +
                        appt.for.toUser.name.split(' ')[0] + '...');
                    const r = await Data.instantClockIn(this.appt, this.id);
                    window.app.snackbar.view('Clocked in at ' + r.data.clockIn
                        .sentTimestamp.toDate().toLocaleTimeString() + '.');
                    new NotificationDialog('Instant Clock-Ins', 'Soon, you\'' +
                        'll be able to clock in and out for your tutors. But ' +
                        'in the meantime, while we\'re still working out some' +
                        ' cinks, head over to the schedule view to manage ' +
                        'tutor clock ins.', () => {}).view();
                },
                'Clock-Out': () => {
                    window.app.snackbar.view('Clocking out for ' +
                        appt.for.toUser.name.split(' ')[0] + '...');
                    const r = await Data.instantClockOut(this.appt, this.id);
                    window.app.snackbar.view('Clocked out at ' + r.data.clockOut
                        .sentTimestamp.toDate().toLocaleTimeString() + '.');
                    new NotificationDialog('Instant Clock-Outs', 'Soon, you\'' +
                        'll be able to clock in and out for your tutors. But ' +
                        'in the meantime, while we\'re still working out some' +
                        ' cinks, head over to the schedule view to manage ' +
                        'tutor clock outs.', () => {}).view();
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
            $(schedule).find('#' + appt.time.day.toLowerCase() + ' .schedule-list')
                .append(card);
        };
        firebase.firestore().collection('locations').doc(window.app.location.id)
            .collection('appointments').orderBy('time.from').get()
            .then((snapshot) => {
                $(schedule).find('#loader').remove();
                snapshot.forEach((doc) => {
                    add(doc);
                });
            });
    }

    viewShortcutCards() {
        const def = $(this.main).find('#default');
        this.viewCard(scheduleShortcut(), def);
        this.viewCard(matchingShortcut(), def);
        this.viewCard(trackingShortcut(), def);
    }

    viewEverythingElse() {
        const queries = {
            tutors: firebase.firestore().collection('users')
                .where('location', '==', window.app.location.name)
                .where('type', '==', 'Tutor')
                .where('payments.type', '==', 'Free')
                .orderBy('name'),
            pupils: firebase.firestore().collection('users')
                .where('location', '==', window.app.location.name)
                .where('type', '==', 'Pupil')
                .where('payments.type', '==', 'Free')
                .orderBy('name'),
            /*
             *appts: firebase.firestore().collection('locations')
             *    .doc(window.app.data.locationsByName[window.app.location.name])
             *    .collection('appointments'),
             */
        };
        Object.entries(queries).forEach((entry) => {
            var dashboard = new ProxyDashboard(
                window.app.location.name.split(' ')[0] + ' ' + Utils.caps(entry[0]),
                'Manually edit user profiles to set availability, update ' +
                'subjects, add contact information, and much more.', 'users',
                entry[0]);
            this[entry[0]] = {
                num: 0,
                view: () => {
                    dashboard.view();
                },
                reView: () => {
                    dashboard.reView();
                },
            };
            this.viewCards(entry[1], entry[0], 'everything', {
                empty: () => {
                    this[entry[0]].num = 0;
                    dashboard.empty();
                },
                remove: (doc) => {
                    this[entry[0]].num--;
                    dashboard.remove(doc);
                },
                display: (doc) => {
                    this[entry[0]].num++;
                    dashboard.display(doc);
                },
            });
        });
    }

    viewCard(card, list) {
        const existing = $(list).find('[card-id="' + $(card)
            .attr('card-id') + '"]');
        if (!$(card).attr('card-id') || !existing.length) return super
            .viewCard(card, list);
        existing.replaceWith(card);
    }
};


class ProxyDashboard extends Dashboard {

    constructor(title, subtitle, type, url) {
        super(6);
        this.url = '/app/home/' + (url || type);
        this.type = type;
        this.id = Utils.genID();
        this.title = title;
        this.subtitle = subtitle;
        this.updateRender();
    }

    remove(doc) {
        $(this.main).find('#cards [id="' + doc.id + '"]').remove();
    }

    display(doc) {
        this.viewCard(new Card(doc, this.id, this.type).el);
    }

    empty() {
        $(this.main).find('#cards').empty();
    }

    view() {
        super.view();
        Utils.url(this.url);
    }

    reView() {
        window.app.intercom.view(true);
        $(this.main).find('.mdc-card').each(function() {
            const id = $(this).attr('id');
            $(this).find('#view').click(() => {
                User.viewUser(id);
            }).end().find('#primary').click(() => {
                User.viewUser(id);
            }).end().find('#edit').click(async () => {
                const p = await Data.getUser(id);
                new EditProfile(p).view();
            }).end().find('#match').click(async () => {
                const p = await Data.getUser(id);
                Data.updateUser(Utils.combineMaps(p, {
                    proxy: [window.app.user.email],
                }));
                new MatchingDialog(p).view();
            });
        });
    }

    viewDefaultCards() {}

    updateRender() {
        this.header = this.render.header('header-back', {
            title: this.title,
        });
        $(this.main).find('.header-welcome h1').text(this.title);
        $(this.main).find('.header-welcome h5').text(this.subtitle);
        $(this.main).find('.mdc-layout-grid').addClass('compact');
    }
};


// Shows a dynamic dashboard where queries =
// { 
//   default: {
//     name: '', 
//     queries: {
//       default: db.collection('default'),
//       requests: db.collection('requests'),
//     },
//   },
//   matches: {
//     name: 'Pending matches', 
//     queries: {
//       matches: db.collection('matches'),
//     },
//   },
//   everything: {
//     name: 'Everything else', 
//     queries: {
//       appts: db.collectionGroup(),
//     },
//   }
// }
class QueryDashboard extends Dashboard {

    constructor(title, subtitle, queries, url) {
        super();
        this.title = title;
        this.subtitle = subtitle;
        this.queries = queries;
        this.url = url || 'home';
        this.renderSections();
    }

    renderSections() { // We can't access `this` until after super.renderSelf()
        this.header = this.render.header('header-back', {
            title: this.title,
        });
        $(this.main).find('.header-welcome h1').text(this.title);
        $(this.main).find('.header-welcome h5').text(this.subtitle);
        Object.entries(this.queries).forEach((section) => {
            if (section[0] === 'default') return;
            $(this.main).append(
                this.render.divider(section[1].name)
            );
            $(this.main).append(
                $(this.render.template('cards')).attr('id', section[0])
            );
        });
    }

    view() {
        super.view();
        Utils.url('/app/' + this.url);
    }

    viewDefaultCards() {
        Object.entries(this.queries).forEach((section) => {
            Object.entries(section[1].queries).forEach((query) => {
                this.viewCards(query[1], query[0], section[0], {
                    remove: () => {}, // We can add action functions to recycler
                    display: () => {},
                    empty: () => {},
                });
            });
        });
    }
};


// This works (and is very scalable) but we don't need it right now
class SupervisorQueryDashboard extends QueryDashboard {

    constructor() {
        const title = 'Welcome, ' + window.app.user.name.split(' ')[0];
        const subtitle = 'We\'re glad you\'re here. Below are some friendly ' +
            'suggestions for what to do next.'
        const db = firebase.firestore();
        const queries = {
            default: {
                name: 'Suggestions for you',
                queries: {
                    requestsOut: db.collection('users')
                        .doc(window.app.user.email).collection('requestsOut')
                        .orderBy('timestamp'),
                },
            },
            matches: {
                name: 'Pending matches',
                queries: {
                    users: db.collection('users')
                        .where('proxy', 'array-contains', window.app.user.email),
                },
            },
            everything: {
                name: 'Everything else',
                queries: {
                    tutors: db.collection('users').where('type', '==', 'Tutor')
                        .where('location', '==', window.app.location.name),
                    pupils: db.collection('users').where('type', '==', 'Pupil')
                        .where('location', '==', window.app.location.name),
                },
            },
        };
        super(title, subtitle, queries);
    }

};


module.exports = {
    default: Dashboard,
    supervisor: SupervisorDashboard,
    query: QueryDashboard,
};