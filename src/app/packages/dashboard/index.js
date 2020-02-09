import {
    MDCTopAppBar
} from '@material/top-app-bar/index';
import {
    MDCRipple
} from '@material/ripple/index';

import $ from 'jquery';
import to from 'await-to-js';

const Data = require('@tutorbook/data');
const Card = require('@tutorbook/card');
const Utils = require('@tutorbook/utils');
const User = require('@tutorbook/user');
const EditProfile = require('@tutorbook/profile').edit;
const MatchingDialog = require('@tutorbook/matching').dialog;
const ScheduleCard = require('@tutorbook/schedule-card');
const SearchHeader = require('@tutorbook/search').header;
const HorzScroller = require('@tutorbook/horz-scroller');

// Shortcut cards for SupervisorDashboard
const matchingShortcut = require('@tutorbook/matching').default
    .renderShortcutCard;
const scheduleShortcut = require('@tutorbook/schedule').supervisor
    .renderShortcutCard;
const trackingShortcut = require('@tutorbook/tracking').renderShortcutCard;

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
            return window.app.db.collection('users').doc(window.app.user.uid)
                .collection('dismissedCards').get().then((snapshot) => {
                    snapshot.forEach((doc) => {
                        this.dismissedCards.push(doc.id);
                    });
                }).catch((err) => {
                    console.error('Error while initializing dismissedCards:',
                        err);
                });
        }
    }

    view() {
        window.app.nav.selected = 'Home';
        window.app.intercom.view(true);
        window.app.view(this.header, this.main, '/app/home');
        MDCTopAppBar.attachTo(this.header);
        this.viewDefaultCards(window.app.user.uid);
    }

    reView() {
        window.app.intercom.view(true);
        this.viewSetupCards();
    }

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

    // Views the default user cards for given userID
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
                console.error('Could not get dashboard cards b/c of ', err);
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


// Splits dashboard view into three sections (and adds "Create Profile" fabs):
// 1) Actionable items (e.g. enable notifications, track service hours, edit
// your location)
// 2) Pending matches (e.g. pupil accounts that have not been matched yet or job
// offers that have no responses)
// 3) Everything else (e.g. cards w/ #s => "125 Tutors" or "56 Pupils")
class SupervisorDashboard extends Dashboard {

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
        add('Everything else', 'everything');
    }

    view() {
        super.view();
        this.horz.managed ? this.horz.reManage() : this.horz.manage();
        this.search.manage();
    }

    reView() {
        super.reView();
        this.viewScheduleCards();
        this.search.manage();
    }

    viewDefaultCards() {
        super.viewDefaultCards();
        this.viewScheduleCards();
        this.viewShortcutCards();
        if (!this.viewedRecentActivityCards) this.viewRecentActivityCards();
        this.viewEverythingElse();
    }

    viewScheduleCards() {
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
        this.viewCard(scheduleShortcut(), def);
        this.viewCard(matchingShortcut(), def);
        this.viewCard(trackingShortcut(), def);
    }

    async viewRecentActivityCards() {
        this.viewedRecentActivityCards = true;
        const renderCard = (doc) => {
            const action = doc.data();
            const card = Card.renderCard(
                action.title,
                action.subtitle,
                action.summary, {
                    dismiss: () => {
                        $(card).remove();
                        this.horz.update();
                        return doc.ref.delete();
                    },
                },
            );
            $(card).attr('id', doc.id).attr('timestamp', action.timestamp);
            return card;
        };
        const recycler = {
            display: (doc) => {
                $(this.main).find('[id="Recent activity"]').show().end()
                    .find('#activity').show()
                    .find('#cards')
                    .find('#empty-card').remove().end()
                    .prepend(renderCard(doc));
                this.horz.update();
            },
            remove: (doc) => {
                $(this.main).find('[id="Recent activity"]').show().end()
                    .find('#activity').show()
                    .find('#cards')
                    .find('#empty-card').remove().end()
                    .find('#' + doc.id).remove().end();
                this.horz.update();
            },
            empty: () => {
                $(this.main).find('#activity #cards').empty().end()
                    .find('[id="Recent activity"]').hide().end()
                    .find('#activity').hide();
                this.horz.update();
            },
        };
        if (window.app.location.id) {
            Utils.recycle({
                activity: window.app.db
                    .collection('locations')
                    .doc(window.app.location.id)
                    .collection('recentActions')
                    .orderBy('timestamp')
                    .limit(10),
            }, recycler);
        } else {
            (await window.app.db
                .collection('locations')
                .get()
            ).forEach((doc) => {
                Utils.recycle({
                    activity: window.app.db
                        .collection('locations')
                        .doc(doc.id)
                        .collection('recentActions')
                        .orderBy('timestamp')
                        .limit(10),
                }, recycler);
            });
        }
    }

    viewEverythingElse() {
        const queries = {
            tutors: window.app.db.collection('users')
                .where('location', '==', window.app.location.name)
                .where('type', '==', 'Tutor')
                .where('payments.type', '==', 'Free')
                .orderBy('name'),
            pupils: window.app.db.collection('users')
                .where('location', '==', window.app.location.name)
                .where('type', '==', 'Pupil')
                .where('payments.type', '==', 'Free')
                .orderBy('name'),
        };
        Object.entries(queries).forEach((entry) => {
            var dashboard = new ProxyDashboard(
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


// This works (and is very scalable) but we don't need it right now
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