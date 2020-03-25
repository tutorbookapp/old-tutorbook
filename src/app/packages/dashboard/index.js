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

import * as $ from 'jquery';
import to from 'await-to-js';

import Data from '@tutorbook/data';
import Card from '@tutorbook/card';
import Utils from '@tutorbook/utils';
import User from '@tutorbook/user';
import ScheduleCard from '@tutorbook/schedule-card';
import HorzScroller from '@tutorbook/horz-scroller';
import Tracking from '@tutorbook/tracking';
import {
    EditProfile,
} from '@tutorbook/profile';
import {
    Matching,
    MatchingDialog,
} from '@tutorbook/matching';
import {
    SearchHeader,
} from '@tutorbook/search';
import {
    ConfirmationDialog,
    ViewTimeRequestDialog,
} from '@tutorbook/dialogs';
import {
    SupervisorSchedule,
} from '@tutorbook/schedule';

/**
 * Class that manages the dashboard view (provides an API for other classes to
 * use to display cards) and a custom welcome message that chnages each time a 
 * user logs in.
 * @todo Finish documentation for this class.
 */
export class Dashboard {

    /**
     * Creates and renders (using the global [window.app.render]{@link Render}
     * object) a new `Dashboard` object.
     */
    constructor() {
        this.render = window.app.render;
        this.initDismissedCards();
        this.renderSelf();
    }

    initDismissedCards() {
        this.dismissedCards = [];
        if (window.app.user.type === 'Supervisor') {
            var that = window.app;
            return window.app.db.collection('users').doc(window.app.user.uid)
                .collection('dismissedCards').get().then((snapshot) => {
                    snapshot.forEach((doc) => {
                        this.dismissedCards.push(doc.id);
                    });
                }).catch((err) => {
                    console.error('[ERROR] While initializing dismissedCards:',
                        err);
                });
        }
    }

    /**
     * Views the dashboard page (using the global `window.app.view` function).
     * @see {@link module:@tutorbook/app~Tutorbook#view}
     */
    view() {
        window.app.nav.selected = 'Home';
        window.app.intercom.view(true);
        window.app.view(this.header, this.main, '/app/home');
        Utils.attachHeader(this.header);
        this.viewDefaultCards(window.app.user.uid);
    }

    /**
     * Re-views the dashboard page (call this to view the dashboard page when it 
     * has already been viewed):
     * 1. Shows the [Intercom Messenger]{@link Help#view}
     * 2. Views the user's [setup cards]{@link Dashboard#viewSetupCards}
     */
    reView() {
        window.app.intercom.view(true);
        this.viewSetupCards();
    }

    /**
     * Renders the dashboard view/page main template and header.
     */
    renderSelf() {
        this.header = this.render.header('header-main', {
            'title': 'Tutorbook'
        });
        this.main = this.render.template('dashboard', {
            // If the user is viewing on mobile, we don't
            // want to show the welcome message in huge text.
            welcome: !window.app.onMobile,
            name: window.app.user.name.split(' ')[0],
            subtitle: 'We\'re glad you\'re here. Below are some ' +
                'friendly suggestions for what to do next.',
        });
    }

    viewSetupCards() {
        Data.setupCards.forEach(type => {
            if (window.app.user.cards[type]) return this.viewCard(
                new Card(true, Utils.genID(), type, 2).el,
                $(this.main).find('#default'),
            );
            $(this.main).find('#default #' + type + 'Card').remove();
        });
    }

    /**
     * Views the default user cards for given userID.
     * @param {string} [id=window.app.user.uid] - The Firebase Authentication
     * user ID to view the default cards for.
     */
    viewDefaultCards(id = window.app.user.uid) {
        this.emptyCards('default');
        Object.entries({
            timestamp: [
                'requestsIn',
                'requestsOut',
                'appointments',
            ],
            canceledTimestamp: [
                'canceledRequestsIn',
                'canceledAppointments',
            ],
            modifiedTimestamp: [
                'modifiedRequestsIn',
                'modifiedRequestsOut',
                'modifiedAppointments',
            ],
            approvedTimestamp: [
                'approvedRequestsOut',
            ],
            rejectedTimestamp: [
                'rejectedRequestsOut',
            ],
            'clockIn.sentTimestamp': [
                'activeAppointments',
            ],
        }).forEach(([sortField, subcollectionsList]) => subcollectionsList
            .forEach((subcollection) => {
                const query = window.app.db.collection('users')
                    .doc(id)
                    .collection(subcollection)
                    .orderBy(sortField, 'desc');
                this.viewCards(query, subcollection, 'default');
            }));
        this.viewSetupCards();
        if (window.app.user.type === 'Tutor' &&
            window.app.user.payments.type === 'Free') this.viewCard(
            window.app.profile.renderServiceHourCard(),
            $(this.main).find('#default')
        );
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
                this.viewCard(new Card(doc, id, type, 4).el, list);
            },
            remove: (doc, list) => {
                if (actions && typeof actions.remove === "function")
                    actions.remove(doc);
                $(list).find('#cards [id="' + doc.id + '"]').remove();
            },
        };
        window.app.listeners.push(query.onSnapshot({
            error: (err) => {
                window.app.snackbar.view('Could not get dashboard cards.');
                console.error('[ERROR] Could not get dashboard cards b/c of ',
                    err);
            },
            next: (snapshot) => {
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
            },
        }));
    }

    emptyCards(list) {
        return $(list).find('#cards').empty();
    }

    // Adds card based on priority and/or timestamp (highest priority on the top 
    // followed by the most recent).
    viewCard(card, list = $(this.main).find('#default')) {
        var existing = $(list).find('#cards [id="' + $(card).attr('id') + '"]');
        if (existing.length) return $(existing).replaceWith(card);
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
            existing = $(list).find('#cards .mdc-card');
            for (var i = 0; i < existing.length; i++) {
                var child = existing[i];
                var priority = $(child).attr('priority');
                if (priority && priority > $(card).attr('priority'))
                    return $(card).insertBefore(child);
            }
            $(list).find('#cards').append(card);
        }
    }
};

/**
 * Class that splits dashboard view into three sections (and adds "Create 
 * Profile" fabs):
 * 1. Actionable items (e.g. enable notifications, track service hours, edit
 * your location)
 * 2. Pending matches (e.g. pupil accounts that have not been matched yet or job
 * offers that have no responses)
 * 3. Everything else (e.g. cards w/ #s => "125 Tutors" or "56 Pupils")
 */
export class SupervisorDashboard extends Dashboard {

    renderSelf() {
        super.renderSelf();
        const that = this;
        this.search = new SearchHeader();
        this.horz = new HorzScroller('activity');
        this.header = this.search.el;

        function add(label, id) {
            $(that.main)
                .append(that.render.divider(label))
                .append($(that.render.template('cards')).attr('id', id));
        };

        function addHorz(label) {
            $(that.main)
                .append(that.render.divider(label))
                .append(that.horz.el);
        };

        addHorz('Recent activity');
        add('Schedule', 'schedule');
        //add('Everything else', 'everything');
    }

    view() {
        super.view();
        this.horz.managed ? this.horz.reManage() : this.horz.manage();
        this.search.manage();
    }

    reView() {
        super.reView();
        this.search.manage();
    }

    viewDefaultCards() {
        super.viewDefaultCards();
        this.viewShortcutCards();
        if (!this.viewedScheduleCards) this.viewScheduleCards();
        if (!this.viewedRecentActivityCards) this.viewRecentActivityCards();
        //this.viewEverythingElse();
    }

    viewScheduleCards() {
        this.viewedScheduleCards = true;
        const schedule = new ScheduleCard();
        const existing = $(this.main).find('.card-schedule');
        if (existing.length) {
            $(existing).replaceWith(schedule.main);
        } else {
            $(this.main).find('#schedule .mdc-layout-grid__inner')
                .append(schedule.main);
        }
        schedule.viewAppts();
    }

    viewShortcutCards() {
        const def = $(this.main).find('#default');
        this.viewCard(SupervisorSchedule.renderShortcutCard(), def);
        this.viewCard(Matching.renderShortcutCard(), def);
        this.viewCard(Tracking.renderShortcutCard(), def);
    }

    /**
     * Views the recent activity cards from all of the current user's locations.
     * @see {@link Stats#viewRecentActivityCards}
     */
    async viewRecentActivityCards() {
        this.viewedRecentActivityCards = true;
        const renderCard = (doc, index) => {
            const action = doc.data();
            var actions = {
                dismiss: () => {
                    $(card).remove();
                    this.horz.update();
                    return doc.ref.delete();
                },
            };
            switch (action.type) {
                case 'newTimeRequest':
                    const r = action.data;
                    const dialog = new ViewTimeRequestDialog(r, action.data.id);
                    const other = Utils.getOther(r.sentBy, r.appt.attendees);
                    const senderPronoun = Utils.getPronoun(r.sentBy.gender);
                    const clockIn = r.appt.clockIn.sentTimestamp.toDate();
                    const clockOut = r.appt.clockOut.sentTimestamp.toDate();
                    const confirmTitle = 'Reject Time Request?';
                    const confirmSummary = 'Reject service hours request ' +
                        'from ' + r.sentBy.name + ' for ' + senderPronoun +
                        ' tutoring session with ' + other.name + ' for ' +
                        r.appt.for.subject + ' on ' +
                        clockIn.toLocaleDateString() + ' from ' +
                        Utils.dateToTimestring(clockIn) + ' to ' +
                        Utils.dateToTimestring(clockOut) + '? This action ' +
                        'cannot be undone.';
                    const confirmAction = async () => {
                        window.app.snackbar.view('Rejecting time request...');
                        const [err, res] = await to(
                            Data.rejectTimeRequest(r, action.data.id));
                        if (err) return window.app.snackbar.view('Could not ' +
                            'reject time request.');
                        window.app.snackbar.view('Rejected time request.');
                    };
                    const confirmDialog = new ConfirmationDialog(
                        confirmTitle,
                        confirmSummary,
                        confirmAction,
                    );
                    actions = {
                        reject: () => confirmDialog.view(),
                        view: () => dialog.view(),
                    };
                    break;
                case 'newRequest':
                    break;
                case 'cancelRequest':
                    break;
                case 'rejectRequest':
                    break;
                case 'modifyRequest':
                    break;
                case 'approveRequest':
                    break;
                case 'cancelAppt':
                    break;
                case 'modifyAppt':
                    break;
                case 'modifyPastAppt':
                    break;
                case 'deletePastAppt':
                    break;
                case 'createLocation':
                    break;
                case 'updateLocation':
                    break;
                case 'deleteLocation':
                    break;
            };
            const card = Card.renderCard(
                action.title,
                action.subtitle,
                action.summary,
                actions,
            );
            return $(card).attr('id', doc.id).attr('index', index)
                .attr('timestamp', action.timestamp)[0];
        };
        const recycler = {
            display: (doc, type, index) => {
                $(this.main).find('[id="Recent activity"]').show().end()
                    .find('#activity').show()
                    .find('#cards')
                    .find('#empty-card').remove().end()
                    .prepend(renderCard(doc, index));
                this.horz.update();
            },
            remove: (doc, type, index) => {
                $(this.main).find('[id="Recent activity"]').show().end()
                    .find('#activity').show()
                    .find('#cards')
                    .find('#empty-card').remove().end()
                    .find('#' + doc.id).remove().end();
                this.horz.update();
            },
            empty: (type, index) => {
                $(this.main).find('#activity #cards [index="' + index + '"]')
                    .remove();
                if (!$(this.main).find('#activity #cards .mdc-card').length)
                    $(this.main).find('[id="Recent activity"]').hide().end()
                    .find('#activity').hide();
                this.horz.update();
            },
        };
        const queries = {
            activity: [],
        };
        window.app.data.locations.forEach(location => queries.activity
            .push(window.app.db.collection('locations').doc(location.id)
                .collection('recentActions').orderBy('timestamp').limit(10)));
        Utils.recycle(queries, recycler);
    }

    viewEverythingElse() {
        const queries = {
            tutors: window.app.db.collection('users')
                .where('access', 'array-contains-any', window.app.user.access)
                .where('location', '==', window.app.location.name)
                .where('type', '==', 'Tutor')
                .where('payments.type', '==', 'Free')
                .orderBy('name'),
            pupils: window.app.db.collection('users')
                .where('access', 'array-contains-any', window.app.user.access)
                .where('location', '==', window.app.location.name)
                .where('type', '==', 'Pupil')
                .where('payments.type', '==', 'Free')
                .orderBy('name'),
        };
        Object.entries(queries).forEach((entry) => {
            const dashboard = new ProxyDashboard(
                window.app.location.name.split(' ')[0] + ' ' +
                Utils.caps(entry[0]),
                'Manually edit user profiles to set availability, update ' +
                'subjects, add contact information, and much more.', 'users',
                entry[0]);
            this[entry[0]] = {
                num: 0,
                view: () => dashboard.view(),
                reView: () => dashboard.reView(),
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
                    if (!$(dashboard.main).find('#' + doc.id).length)
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

    reView() {}

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

/**
 * Class that works (and is very scalable) but we don't need it right now.
 * @deprecated
 */
class SupervisorQueryDashboard extends QueryDashboard {

    constructor() {
        const title = 'Welcome, ' + window.app.user.name.split(' ')[0];
        const subtitle = 'We\'re glad you\'re here. Below are some friendly ' +
            'suggestions for what to do next.'
        const db = window.app.db;
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
                        .where('proxy', 'array-contains', window.app.user.uid),
                },
            },
            everything: {
                name: 'Everything else',
                queries: {
                    tutors: db.collection('users').where('type', '==', 'Tutor')
                        .where('access', 'array-contains-any', window.app.user
                            .access)
                        .where('location', '==', window.app.location.name),
                    pupils: db.collection('users').where('type', '==', 'Pupil')
                        .where('access', 'array-contains-any', window.app.user
                            .access)
                        .where('location', '==', window.app.location.name),
                },
            },
        };
        super(title, subtitle, queries);
    }

};