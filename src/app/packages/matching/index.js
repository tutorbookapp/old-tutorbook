import {
    MDCRipple
} from '@material/ripple/index';
import {
    MDCTextField
} from '@material/textfield/index';
import {
    MDCTopAppBar
} from '@material/top-app-bar/index';

const Search = require('search');
const Card = require('card');
const Utils = require('utils');
const Data = require('data');
const NewProfile = require('profile').new;
const EditProfile = require('profile').edit;
const ConfirmationDialog = require('dialogs').confirm;

import to from 'await-to-js';
import $ from 'jquery';

// Class that enables supervisors to create tutor and pupil accounts and
// manually match them together (i.e. create appointments).
class Matching {

    constructor() {
        this.profiles = {}; // Store EditProfile objects
        this.matches = {}; // Store MatchingDialog objects
        this.users = {}; // Store raw user data maps
        this.queries = {}; // Store request (matching) queries 
        this.render = window.app.render;
        this.renderSelf();
        this.hiddenCards = {
            requestsOut: {},
            approvedRequestsOut: {},
            rejectedRequestsOut: {},
        };
        this.recycler = {
            remove: (doc) => {
                $(this.main)
                    .find('#cards [type="users"][id="' + doc.id + '"]')
                    .remove();
                this.removeUserQuery(doc.id);
            },
            display: (doc) => {
                $(this.main).find('.centered-text').remove();
                this.card(doc);
                this.addUserQuery(doc.id);
            },
            empty: () => {
                const that = this;
                $(this.main).find('#cards [type="users"]').each(function() {
                    $(this).remove();
                    that.removeUserQuery($(this).attr('id'));
                });
                $(this.renderEmpty()).insertAfter(
                    $(this.main).find('.header-welcome')
                );
            },
        };
        this.matchesRecycler = {
            remove: (doc, type, user) => {
                $(this.main)
                    .find('[id="' + doc.id + '"]' + // Doc ID
                        '[type="' + type + '"]' + // Subcollection
                        '[user="' + user + '"]') // User ID
                    .last().remove(); // This should only ever remove one card
                switch (type) {
                    case 'requestsOut':
                        $(this.main)
                            .find('[id="' + doc.data().fromUser.email + '"]')
                            .show();
                        $(this.main)
                            .find('[id="' + doc.data().toUser.email + '"]')
                            .show();
                        break;
                    default:
                        throw new Error('Invalid card type (' + type +
                            ') passed to matchesRecycler.');
                };
            },
            display: async (doc, type, user) => {
                if (this.dismissed[type] &&
                    this.dismissed[type].indexOf(doc.id) >= 0) {
                    return;
                }
                switch (type) {
                    case 'requestsOut':
                        var card = await this.renderPendingMatchCard(doc);
                        this.hiddenCards[type][user] = [
                            $(this.main)
                            .find('[id="' + doc.data().fromUser.email + '"]')
                            .hide(),
                            $(this.main)
                            .find('[id="' + doc.data().toUser.email + '"]')
                            .hide(),
                        ];
                        break;
                    case 'approvedRequestsOut':
                        var card = Card.renderApprovedRequestOutCard(doc);
                        $(card).find('.dashboard-card__title')
                            .text('Completed Match');
                        break;
                    case 'rejectedRequestsOut':
                        var card = Card.renderRejectedRequestOutCard(doc);
                        $(card).find('.dashboard-card__title')
                            .text('Rejected Match');
                        break;
                    default:
                        throw new Error('Invalid card type (' + type +
                            ') passed to matchesRecycler.');
                };
                $(card)
                    .attr('id', doc.id)
                    .attr('type', type)
                    .attr('user', user);
                this.viewCard(card);
            },
            empty: (type, user) => {
                $(this.main)
                    .find('[type="' + type + '"][user="' + user + '"]')
                    .remove();
                if (typeof this.hiddenCards[type][user] === 'object') {
                    this.hiddenCards[type][user].forEach((el) => {
                        el.show();
                    });
                }
            },
        };
    }

    async initDismissedCards() {
        this.dismissed = {};
        const cards = await firebase.firestore().collection('users')
            .doc(window.app.user.id).collection('dismissedCards').get();
        cards.forEach((card) => {
            if (!this.dismissed[card.data().type])
                this.dismissed[card.data().type] = [];
            this.dismissed[card.data().type].push(card.id);
        });
    }

    async renderPendingMatchCard(doc) {
        const card = Card.renderRequestOutCard(doc);
        const users = this.users;
        const profiles = this.profiles;

        async function profile(id, el) {
            if (!!users[id]) {
                var user = users[id];
            } else {
                var user = await Data.getUser(id);
                users[id] = user;
            }
            if (!!profiles[id]) { // Use cached profile
                var profile = profiles[id];
            } else { // Get and create new profile
                var profile = new EditProfile(user);
                profiles[id] = profile;
            }
            return profile;
        };

        const tutor = await profile(doc.data().toUser.email);
        const pupil = await profile(doc.data().fromUser.email);
        window.app.cards.requestsOut[doc.id].tutor = () => {
            tutor.view(); // We have to do this so that `this` is defined
        };
        window.app.cards.requestsOut[doc.id].pupil = () => {
            pupil.view();
        };

        $(card).find('.dashboard-card__title').text('Pending Match');
        $(card).find('.mdc-card__actions').append(Card.button('pupil', () => {
            pupil.view();
        }));
        $(card).find('.mdc-card__actions').append(Card.button('tutor', () => {
            tutor.view();
        }));
        MDCRipple.attachTo($(card).find('#tutor')[0]);
        MDCRipple.attachTo($(card).find('#pupil')[0]);
        return card;
    }

    renderSelf() {
        this.header = this.render.header('header-main', {
            title: 'Matching',
        });
        this.main = this.render.template('matching');
    }

    view() {
        window.app.intercom.view(false);
        window.app.nav.selected = 'Matching';
        window.app.view(this.header, this.main, '/app/matching');
        this.manage();
        this.viewCards();
    }

    reView() {
        window.app.intercom.view(false);
        $(this.main).find('#tutor-button').click(() => {
            this.createTutor();
        });
        $(this.main).find('#pupil-button').click(() => {
            this.createPupil();
        });
        this.reViewCards();
    }

    reViewCards() { // Adds click listeners
        const profiles = this.profiles; // EditProfileDialog map
        const matches = this.matches; // MatchingDialog map
        const users = this.users; // Raw user data map
        const requestsOut = window.app.cards.requestsOut;
        const approvedRequestsOut = window.app.cards.approvedRequestsOut;
        const rejectedRequestsOut = window.app.cards.rejectedRequestsOut;

        function listen(el, actionMap) { // Adds click listeners to card buttons
            const actions = actionMap[$(el).attr('id')];
            Object.entries(actions).forEach((entry) => {
                var label = entry[0];
                var action = entry[1];
                $(el).find('#' + label).click(action);
            });
        };

        $(this.main).find('#cards [type="requestsOut"]').each(async function() {
            listen(this, requestsOut);
        });
        $(this.main).find('#cards [type="approvedRequestsOut"]')
            .each(async function() {
                listen(this, approvedRequestsOut);
            });
        $(this.main).find('#cards [type="rejectedRequestsOut"]')
            .each(async function() {
                listen(this, rejectedRequestsOut);
            });
        $(this.main).find('#cards [type="users"]').each(async function() {
            var id = $(this).attr('id');
            if (!!users[id]) {
                var user = users[id];
            } else {
                var user = await Data.getUser(id);
                users[id] = user;
            }
            if (!!profiles[id]) { // Use cached profile
                var profile = profiles[id];
            } else { // Get and create new profile
                var profile = new EditProfile(user);
                profiles[id] = profile;
            }
            $(this).find('#edit').click(() => {
                profile.view();
            });
            $(this).find('.mdc-card__primary-action').click(() => {
                profile.view();
            });
            $(this).find('#match').click(async () => {
                if (!!matches[id]) {
                    return matches[id].view();
                }
                var match = new MatchingDialog(user);
                matches[id] = match;
                return match.view();
            });
            $(this).find('#delete').click(() => {
                new ConfirmationDialog('Delete Proxy Account?',
                    'You are about to permanently delete ' + user.name +
                    '\'s account data. This action cannot be undone. Please ensure ' +
                    'to check with your fellow supervisors before continuing.', async () => {
                        var err;
                        var res;
                        [err, res] = await to(Data.deleteUser(id));
                        if (err) {
                            window.app.snackbar.view('Could not delete account.');
                            console.error('Error while deleting proxy account:', err);
                        }
                        window.app.snackbar.view('Deleted account.');
                    }).view();
            });
        });
    }

    manage() {
        MDCTopAppBar.attachTo(this.header);
        // Adds listeners to the fabs to create tutor and pupil accounts
        $(this.main).find('.mdc-fab').each(function() {
            MDCRipple.attachTo($(this)[0]);
        });
        $(this.main).find('#tutor-button').click(() => {
            this.createTutor();
        });
        $(this.main).find('#pupil-button').click(() => {
            this.createPupil();
        });
    }

    createPupil() {
        // Show supervisors a dialog to create a new pupil profile
        new NewProfile(Utils.combineMaps(Data.emptyProfile, {
            type: 'Pupil',
            proxy: [window.app.user.email],
            authenticated: true,
        })).view();
    }

    createTutor() {
        // Show supervisors a dialog to create a new tutor profile
        new NewProfile(Utils.combineMaps(Data.emptyProfile, {
            type: 'Tutor',
            proxy: [window.app.user.email],
            authenticated: true,
        })).view();
    }

    card(doc) {
        this.viewCard(this.renderCard(doc));
    }

    async viewCards() {
        // Shows unmatched tutors/pupils and matched tutors/pupils (who haven't 
        // created past appts).
        await this.initDismissedCards();
        firebase.firestore().collection('users')
            .where('proxy', 'array-contains', window.app.user.email)
            .where('clockedIn', '==', false) // They've never clockedIn
            .onSnapshot((snapshot) => {
                if (!snapshot.size) {
                    return this.recycler.empty();
                }

                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'removed') {
                        this.recycler.remove(change.doc);
                    } else {
                        this.recycler.display(change.doc);
                    }
                });
            });
        // Shows pending matches (and approved/rejected matches).
        // NOTE: We would also be able to do this without collectionGroup
        // queries (by using the recycler to update a set of queries for
        // each of the supervisor's proxy accounts).
    }

    addUserQuery(id) { // Starts listening for matches for the given user
        this.queries[id] = [];
        [
            'requestsOut',
            'approvedRequestsOut',
            'rejectedRequestsOut',
        ].forEach((subcollection) => {
            this.queries[id].push(firebase.firestore().collection('users').doc(id)
                .collection(subcollection).onSnapshot((snapshot) => {
                    if (!snapshot.size) {
                        return this.matchesRecycler.empty(subcollection, id);
                    }

                    snapshot.docChanges().forEach((change) => {
                        if (change.type === 'removed') {
                            this.matchesRecycler.remove(
                                change.doc,
                                subcollection,
                                id,
                            );
                        } else {
                            this.matchesRecycler.display(
                                change.doc,
                                subcollection,
                                id,
                            );
                        }
                    });
                }));
        });
    }

    removeUserQuery(id) { // Removes a listener for a given user
        // See: https://stackoverflow.com/questions/46642652/how-to-remove-
        // listener-for-documentsnapshot-events-google-cloud-firestore#46644561
        this.queries[id].forEach((unsubscribe) => {
            unsubscribe();
        });
        $(this.main).find('[user="' + id + '"]').remove();
    }

    viewCard(card) { // TODO: View pupils on one side and tutors on the other
        var existing = $(this.main)
            .find('#cards [id="' + $(card).attr('id') + '"]');
        if (existing.length) {
            return $(existing).replaceWith(card);
        }
        $(this.main).find('#cards').append(card);
    }

    static renderShortcutCard() {
        const title = 'Manual Matching';
        const subtitle = 'Create accounts and send proxy requests';
        const summary = 'With manual matching, you\'re able to create proxy ' +
            'accounts for students that submit physical forms that you can ' +
            'then use to send requests to the appropriate tutors.';
        var card;
        const actions = {
            snooze: () => {
                $(card).remove();
            },
            view: () => {
                window.app.matching.view();
            },
            primary: () => {
                window.app.matching.view();
            },
        };
        card = Card.renderCard(title, subtitle, summary, actions);
        $(card)
            .attr('id', 'shortcut-to-manual-matching')
            .attr('type', 'shortcut')
            .attr('priority', 10);
        return card;
    }

    renderCard(doc) {
        const profile = doc.data();
        this.users[doc.id] = profile; // Store raw user data
        const dialog = new EditProfile(profile);
        this.profiles[doc.id] = dialog; // Store profiles in cache
        const title = (profile.type === 'Tutor') ? 'Tutor Account' :
            (profile.type === 'Pupil') ? 'Pupil Account' : 'Proxy Account';
        const subtitle = 'Proxy account for ' + profile.name;
        const summary = 'You created a proxy ' +
            (!!profile.type ? profile.type.toLowerCase() : '') +
            ' account for ' + profile.email + '. Tap to view or edit ' +
            Utils.getPronoun(profile.gender) + ' profile.';
        const actions = {
            delete: () => {
                new ConfirmationDialog('Delete Proxy Account?',
                    'You are about to permanently delete ' + profile.name +
                    '\'s account data. This action cannot be undone. Please ensure ' +
                    'to check with your fellow supervisors before continuing.', async () => {
                        var err;
                        var res;
                        [err, res] = await to(Data.deleteUser(doc.id));
                        if (err) {
                            window.app.snackbar.view('Could not delete account.');
                            console.error('Error while deleting proxy account:', err);
                        }
                        window.app.snackbar.view('Deleted account.');
                    }).view();
            },
            edit: () => {
                dialog.view();
            },
            primary: () => {
                dialog.view();
            },
        };
        if (profile.type === 'Pupil') {
            const match = new MatchingDialog(profile);
            this.matches[doc.id] = match;
            actions.match = () => {
                match.view();
            };
        }

        const card = Card.renderCard(title, subtitle, summary, actions);
        MDCRipple.attachTo($(card).find('.mdc-card__primary-action')[0]);
        MDCRipple.attachTo($(card).find('#edit')[0]);
        MDCRipple.attachTo($(card).find('#delete')[0]);
        card.setAttribute('id', doc.id);
        card.setAttribute('type', 'users');
        return card;
    }

    renderEmpty() {
        if ($(this.main).find('.centered-text').length) {
            return;
        }
        const text = this.render.template('centered-text', {
            text: 'No matches or proxy accounts so far.'
        });
        // TODO: Center this within the remaining space (i.e. Right now it's
        // centered relative to the whole screen. We want it to be centered
        // relative to the unfilled part of the screen).
        $(text).css('margin-top', '120px');
        return text;
    }
};


// Class that enables supervisors to create matches for pupils
class MatchingDialog {
    constructor(profile) {
        this.profile = profile;
        this.subject = profile.subjects[0];
        this.time = Utils.getAvailabilityStrings(profile.availability)[0];
        this.render = window.app.render;
        this.search = new MatchingSearch(this.profile, this.subject, this.time);
        this.renderSelf();
    }

    view() {
        window.app.intercom.view(true);
        window.app.view(this.header, this.main);
        this.manage();
        this.results();
    }

    manage() {
        if (this.managed) {
            return;
        }
        this.managed = true;
        MDCTopAppBar.attachTo(this.header);
        const that = this;

        function t(q) {
            var t = MDCTextField.attachTo($(that.main).find(q)[0]);
            $(that.main).find(q + ' input').attr('disabled', 'disabled');
            return t;
        };

        function s(q) { // Attach select based on query
            return Utils.attachSelect($(that.main).find(q)[0]);
        };

        function listen(s, action) { // Add change listener
            s.listen('MDCSelect:change', () => {
                action(s);
            });
        };

        t('#Bio');
        t('#Type');
        t('#Grade');
        t('#Phone');
        listen(s('#Subject'), (s) => {
            this.subject = s.value;
            this.results();
        });
        listen(s('#Time'), (s) => {
            this.time = s.value;
            this.results();
        });
    }

    // Steps to match a pupil with the right tutor (should take < 30 sec):
    // 1) Select which subject they want a match for.
    // 2) Out of the tutors for that subject (who are filtered by availability),
    // select one to send a request or create an appointment with.
    // 3) Confirm match? You're done!
    // Views required for the above app flow:
    // [x] Profile header
    // [x] Meta data on the given pupil
    // [x] Subject select
    // [x] Search results div
    // [ ] TODO: Hover information dialog (shows more detailed info on tutors)
    // [x] Make match dialog (shows tutor and pupil, asks to confirm the match)
    renderSelf() {
        this.header = this.render.header('header-back', {
            title: 'New Match',
            back: () => {
                new ConfirmationDialog('Discard Match?', 'You are about to ' +
                    'permanently delete this match. Navigating back will ' +
                    'delete any changes that you\'ve made. Are you sure?').view();
            },
        });
        this.main = this.render.template('dialog-input');
        const profile = this.profile;
        const that = this;

        function add(e) { // Append to main el
            $(that.main).append(e);
        };

        function addSplit(e, el) { // Add split input item to profile
            that.main.appendChild(that.render.splitListItem(e, el));
        };

        function s(l, v, d) { // Render select
            return that.render.selectItem(l, v, d);
        };

        function t(l, v) { // Render text field
            return that.render.textField(l, v);
        };

        function addD(l) { // Add list divider
            that.main.appendChild(that.render.listDivider(l));
        };

        add(this.render.profileHeader(profile));
        addD('Basic info');
        addSplit(t('Bio', profile.bio), t('Type', profile.type));
        addSplit(t('Grade', profile.grade), t('Phone', profile.phone));
        addD('Matching for');
        add(s('Subject', this.subject, profile.subjects));
        add(s('Time', this.time, Utils.getAvailabilityStrings(profile.availability)));
        addD('Tutors for ' + this.subject);
        add(this.search.main);
    }

    results() { // Render search results for given subject
        $(this.main).find('.input-list-divider').last().find('h4')
            .text('Tutors for ' + this.subject);
        this.search.update(this.profile, this.subject, this.time);
    }
};


class MatchingSearch extends Search {

    constructor(pupil, subject, time) {
        super();
        this.pupil = pupil;
        this.time = time;
        this.subject = subject;
        this.filters.subject = subject;
        this.filters.availability = (!!time && time !== '') ?
            Utils.parseAvailabilityString(time) : {};
        this.filters.type = 'Tutor';
    }

    update(pupil, subject, time) {
        this.pupil = pupil;
        this.time = time;
        this.subject = subject;
        this.filters.subject = subject;
        this.filters.availability = (!!time && time !== '') ?
            Utils.parseAvailabilityString(time) : {};
        this.viewResults();
    }

    renderResult(doc) {
        const el = super.renderResult(doc);
        $(el).off('click').click(() => {
            new ConfirmMatchDialog(
                this.pupil,
                doc.data(),
                this.subject,
                this.time
            ).view();
        });
        return el;
    }
};


class ConfirmMatchDialog extends ConfirmationDialog {

    constructor(pupil, tutor, subject, timeString) {
        const title = 'Confirm Match?';
        const message = 'You are about to create a match between ' +
            pupil.name + ' (the pupil) and ' + tutor.name + ' (the tutor) for ' + subject + '.' +
            ' Doing so will send ' + tutor.name.split(' ')[0] + ' a lesson request for ' +
            timeString + ' Are you sure you want to complete this match?';

        async function match() {
            window.app.nav.back();
            const time = Utils.parseAvailabilityString(timeString);
            const request = {
                subject: subject,
                time: {
                    day: time.day,
                    from: time.fromTime,
                    to: time.toTime,
                },
                message: 'This request was created by ' + window.app.user.name +
                    ' via manual matching. ' + pupil.name +
                    ' most likely turned in a paper tutor request that you ' +
                    'are now receiving digitally.',
                location: {
                    name: time.location,
                    id: window.app.data.locationsByName[time.location],
                },
                fromUser: Utils.filterRequestUserData(pupil),
                toUser: Utils.filterRequestUserData(tutor),
                timestamp: new Date(),
                payment: {
                    amount: 0,
                    type: 'Free',
                    method: 'PayPal',
                },
            };
            var err;
            var res;
            [err, res] = await to(Data.newRequest(request));
            if (err) {
                console.error('Error while sending proxy request:', err);
                return window.app.snackbar.view('Could not create match or ' +
                    'send request to ' + tutor.email + '.');
            }
            window.app.snackbar.view('Created match and sent request to ' +
                tutor.email + '.');
        };

        super(title, message, match);
    }
};

module.exports = Matching;