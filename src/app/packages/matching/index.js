import {
    MDCRipple
} from '@material/ripple/index';
import {
    MDCSwitch
} from '@material/switch/index';
import {
    MDCTextField
} from '@material/textfield/index';
import {
    MDCTopAppBar
} from '@material/top-app-bar/index';

const ScheduleCard = require('@tutorbook/schedule-card');
const SearchHeader = require('@tutorbook/search').header;
const Search = require('@tutorbook/search').default;
const Card = require('@tutorbook/card');
const Utils = require('@tutorbook/utils');
const Data = require('@tutorbook/data');
const NewProfile = require('@tutorbook/profile').new;
const EditProfile = require('@tutorbook/profile').edit;
const ConfirmationDialog = require('@tutorbook/dialogs').confirm;
const EditRequestDialog = require('@tutorbook/dialogs').editRequest;
const ViewRequestDialog = require('@tutorbook/dialogs').viewRequest;

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
                if ($(this.main).find('.mdc-card').length) return;
                $(this.main).prepend(this.renderEmpty());
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
                        if ($(this.main).find('[type="requestsOut"][user="' +
                                doc.data().fromUser.email + '"]').length) return;
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
        const cards = await window.app.db.collection('users')
            .doc(window.app.user.uid).collection('dismissedCards').get();
        cards.forEach((card) => {
            if (!this.dismissed[card.data().type])
                this.dismissed[card.data().type] = [];
            this.dismissed[card.data().type].push(card.id);
        });
    }

    async renderPendingMatchCard(doc) {
        const users = this.users;
        const profiles = this.profiles;
        const request = doc.data();

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

        const tutor = await profile(request.toUser.uid);
        const pupil = await profile(request.fromUser.uid);

        const subtitle = 'From ' + request.fromUser.name +
            ' to ' + request.toUser.name;
        const summary = request.fromUser.name.split(' ')[0] +
            ' requested ' + request.toUser.name.split(' ')[0] +
            ' as a ' + request.toUser.type.toLowerCase() + ' for ' +
            request.subject + ' on ' + request.time.day + 's at the ' +
            request.location.name + '. Tap to learn more and view this request.';
        const dialogs = {
            edit: new EditRequestDialog(request, doc.id),
            view: new ViewRequestDialog(request, doc.id),
            match: new MatchingDialog(pupil.profile),
        };
        const actions = {
            primary: () => {},
            cancel: () => {
                const summary = "Cancel request to " + request.toUser.name +
                    " for " + request.subject + " at " + request.time.from +
                    " on " + request.time.day + "s.";
                new ConfirmationDialog('Cancel Request?', summary, async () => {
                    Card.remove(doc, 'requestsOut');
                    window.app.snackbar.view('Canceling request...');
                    await Data.cancelRequest(request, doc.id);
                    window.app.snackbar.view('Canceled request to ' +
                        request.toUser.email + '.');
                }).view();
            },
            view: () => {
                dialogs.view.view();
            },
            options: {
                'Edit Request': () => {
                    dialogs.edit.view();
                },
                'Edit Pupil': () => {
                    pupil.view();
                },
                'Edit Tutor': () => {
                    tutor.view();
                },
                'Rematch': () => {
                    dialogs.match.view();
                },
                'Approve': async () => {
                    window.app.snackbar.view('Approving request and creating ' +
                        'appointment...');
                    const [err, res] = await to(
                        Data.approveRequest(request, doc.id));
                    if (err) return window.app.snackbar.view('Could not ' +
                        'approve request.');
                    $(this.main).find('[id="' + tutor.email + '"]').remove();
                    $(this.main).find('[id="' + pupil.email + '"]').remove();
                    window.app.snackbar.view('Approved request and created ' +
                        'appointment.');
                },
            },
        };
        const card = Card.renderCard('Pending Match', subtitle, summary, actions);
        window.app.cards.requestsOut[doc.id] = actions; // Store actions & dialogs

        return card;
    }

    renderSelf() {
        this.search = new SearchHeader({
            title: 'Matching',
        });
        this.header = this.search.el;
        this.main = this.render.template('matching');
    }

    view() {
        window.app.intercom.view(false);
        window.app.nav.selected = 'Matching';
        window.app.view(this.header, this.main, '/app/matching');
        if (!this.managed) this.manage();
        if (!this.cardsViewed) this.viewCards();
        this.search.manage();
    }

    reView() {
        window.app.intercom.view(false);
        this.search.manage();
    }

    manage() {
        this.managed = true;
        MDCTopAppBar.attachTo(this.header);
        // Adds listeners to the fabs to create tutor and pupil accounts
        $(this.main).find('.mdc-fab').each(function() {
            MDCRipple.attachTo($(this)[0]);
        });
        $(this.main).find('#tutor-button')[0].addEventListener('click', () => {
            this.createTutor();
        });
        $(this.main).find('#pupil-button')[0].addEventListener('click', () => {
            this.createPupil();
        });
    }

    createPupil() {
        // Show supervisors a dialog to create a new pupil profile
        new NewProfile(Utils.combineMaps(Data.emptyProfile, {
            type: 'Pupil',
            proxy: [window.app.user.uid],
            authenticated: true,
        })).view();
    }

    createTutor() {
        // Show supervisors a dialog to create a new tutor profile
        new NewProfile(Utils.combineMaps(Data.emptyProfile, {
            type: 'Tutor',
            proxy: [window.app.user.uid],
            authenticated: true,
        })).view();
    }

    card(doc) {
        this.viewCard(this.renderCard(doc));
    }

    async viewCards() {
        this.cardsViewed = true;
        // Shows unmatched tutors/pupils and matched tutors/pupils (who haven't 
        // created past appts).
        await this.initDismissedCards();
        window.app.db.collection('users')
            .where('proxy', 'array-contains', window.app.user.uid)
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
            this.queries[id].push(window.app.db.collection('users').doc(id)
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
        const dialog = new EditProfile(profile);
        const match = new MatchingDialog(profile);
        this.users[doc.id] = profile; // Store raw user data
        this.matches[doc.id] = match; // Store matching dialogs in cache
        this.profiles[doc.id] = dialog; // Store profiles in cache
        const title = (profile.type === 'Tutor') ? 'Tutor Account' :
            (profile.type === 'Pupil') ? 'Pupil Account' : 'Proxy Account';
        const subtitle = 'Proxy account for ' + profile.name;
        const summary = 'You created a proxy ' +
            (!!profile.type ? profile.type.toLowerCase() : '') +
            ' account for ' + profile.email + '. Tap to view or edit ' +
            Utils.getPronoun(profile.gender) + ' profile.';
        var card;
        const actions = {
            hide: async () => {
                $(card).hide();
                this.removeUserQuery(doc.id);
                const [err, res] = await to(Data.updateUser(Utils.combineMaps(
                    profile, {
                        proxy: [],
                    })));
                if (err) {
                    window.app.snackbar.view('Could not hide ' + profile.name +
                        '\'s card.');
                    $(card).show();
                    return this.addUserQuery(doc.id);
                }
                $(card).remove();
            },
            delete: () => new ConfirmationDialog('Delete Proxy Account?',
                'You are about to permanently delete ' + profile.name +
                '\'s account data. This action cannot be undone. Please ' +
                'ensure to check with your fellow supervisors before ' +
                'continuing.', async () => {
                    const [err, res] = await to(Data.deleteUser(doc.id));
                    if (err) window.app.snackbar.view('Could not delete ' +
                        'account.');
                    window.app.snackbar.view('Deleted account.');
                }).view(),
            match: () => match.view(),
            primary: () => dialog.view(),
        };

        card = Card.renderCard(title, subtitle, summary, actions);
        card.setAttribute('id', doc.id);
        card.setAttribute('type', 'users');
        return card;
    }

    renderEmpty() {
        if ($(this.main).find('.centered-text').length) return;
        return this.render.template('centered-text', {
            text: 'Click the "Pupil" or "Tutor" button to start matching.',
        });
    }
};


// Class that enables supervisors to create matches for pupils
class MatchingDialog {
    constructor(profile, options) {
        this.profile = profile;
        this.subject = options.subject || profile.subjects[0];
        this.selectedUsers = [];
        const update = () => {
            const btn = $(this.main).find('.action-list-divider #match').last();
            if (this.selectedUsers.length > 0) {
                return btn[0].removeAttribute('disabled');
            }
            btn[0].setAttribute('disabled', 'disabled');
        };
        const addUser = (item) => {
            this.selectedUsers.push(item);
            update();
        };
        const removeUser = (item) => {
            this.selectedUsers.splice(
                this.selectedUsers.findIndex(user => user.uid == item.uid),
                1,
            );
            update();
        };
        this.time = Utils.getAvailabilityStrings(profile.availability)[0];
        this.render = window.app.render;
        this.search = new MatchingSearch(
            this.profile,
            this.subject,
            this.time,
            this.selectedUsers,
            addUser,
            removeUser,
        );
        this.renderSelf();
    }

    view() {
        window.app.intercom.view(true);
        window.app.view(this.header, this.main);
        this.manage();
        this.results();
    }

    manage() {
        if (this.managed) return;
        this.managed = true;
        MDCTopAppBar.attachTo(this.header);
        const that = this;

        function s(q) { // Attach select based on query
            return Utils.attachSelect($(that.main).find(q)[0]);
        };

        function listen(s, action) { // Add change listener
            s.listen('MDCSelect:change', () => {
                action(s);
            });
        };

        listen(s('#Subject'), (s) => {
            this.subject = s.value;
            this.results();
        });
        listen(s('#Time'), (s) => {
            this.time = s.value;
            this.results();
        });
        const show = new MDCSwitch(
            $(this.main).find('[id="Show booked users"] .mdc-switch')[0]
        );
        const d = {
            on: 'Showing users with appointments during the selected timeslot.',
            off: 'Showing users without appointments during the selected ' +
                'timeslot.',
        };
        $(this.main)
            .find('[id="Show booked users"] .mdc-switch input')[0]
            .addEventListener('click', () => {
                this.search.filters.showBooked = !this.search.filters
                    .showBooked;
                this.search.viewResults();
                $(this.main)
                    .find('[id="Show booked users"] .mdc-list-item__secondary' +
                        '-text')
                    .text((this.search.filters.showBooked) ? d.on : d.off);
            });
    }

    renderSelf() { // TODO: Add hover-for-more-info on tutor search results
        this.header = this.render.header('header-back', {
            title: 'New Match',
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

        function addD(l) { // Add list divider
            that.main.appendChild(that.render.listDivider(l));
        };

        function addActionD(l, actions) { // Add action list divider
            that.main.appendChild(that.render.actionDivider(l, actions));
        };

        add(this.render.matchingUserHeader(profile));
        addD('Matching for');
        add(s('Subject', this.subject, profile.subjects));
        add(s('Time', this.time, Utils.getAvailabilityStrings(
            profile.availability)));
        add(this.renderSchedule());
        add(this.render.switch('Show booked users', {
            on: 'Showing users with appointments during the selected timeslot.',
            off: 'Showing users without appointments during the selected ' +
                'timeslot.',
        }));
        addActionD((profile.type === 'Tutor' ? 'Pupils' : 'Tutors') + ' for ' +
            this.subject, {
                match: () => {
                    new ConfirmMatchDialog(
                        this.profile,
                        this.selectedUsers,
                        this.subject,
                        this.time
                    ).view();
                },
            });
        $(this.main).find('.action-list-divider button').last()
            .attr('disabled', 'disabled');
        add(this.search.main);
    }

    renderSchedule() {
        const schedule = new ScheduleCard({
            appts: window.app.db.collection('users').doc(this.profile.uid)
                .collection('appointments').orderBy('time.from'),
        });
        schedule.displayHook = (doc, type) => {
            $(this.main).find(schedule.main).show();
            const a = doc.data();
            const other = Utils.getOther(this.profile, a.attendees);
            $(schedule.main).find('#' + doc.id)
                .find('h2 [id="Clock in"]').remove().end()
                .find('h2 [data-fir-content="title"]').text(a.for.subject).end()
                .find('h3').text(a.time.from + ' with ' + other.name).end()
                .find('#menu').hide(); // TODO: Fix menu mdc-list-item styling.
        };
        schedule.emptyHook = (type) => {
            $(this.main).find(schedule.main).hide();
        };
        schedule.viewAppts();
        return $(schedule.main).hide()[0];
    }

    results() { // Render search results for given subject
        $(this.main).find('.action-list-divider').last().find('h4 span')
            .text((this.profile.type === 'Tutor' ? 'Pupils' : 'Tutors') +
                ' for ' + this.subject);
        this.search.update(this.profile, this.subject, this.time);
    }
};


class MatchingSearch extends Search {

    constructor(pupil, subject, time, selectedUsers, addUser, removeUser) {
        super();
        this.pupil = pupil;
        this.time = time;
        this.subject = subject;
        this.filters.subject = subject;
        this.selectedUsers = selectedUsers;
        this.filters.availability = (!!time && time !== '') ?
            Utils.parseAvailabilityString(time) : {};
        this.filters.type = pupil.type === 'Tutor' ? 'Pupil' : 'Tutor';
        this.addUser = addUser;
        this.removeUser = removeUser;
    }

    update(pupil, subject, time) {
        this.pupil = pupil;
        this.time = time;
        this.subject = subject;
        this.filters.subject = subject;
        this.filters.availability = (!!time && time !== '') ?
            Utils.parseAvailabilityString(time) : {};
        this.filters.type = pupil.type === 'Tutor' ? 'Pupil' : 'Tutor';
        this.viewResults();
    }

    renderResult(doc) {
        const el = super.renderResult(doc).cloneNode(true);
        if (this.selectedUsers.findIndex(user => user.uid === doc.id) >= 0) {
            $(el).find('#photo').css('display', 'none');
            $(el).find('#checkmark').css('display', 'inherit');
        }
        el.addEventListener('click', () => {
            if ($(el).find('#checkmark').css('display') === 'none') {
                $(el).find('#photo').css('display', 'none');
                $(el).find('#checkmark').css('display', 'inherit');
                this.addUser(doc.data());
            } else {
                $(el).find('#photo').css('display', 'inherit');
                $(el).find('#checkmark').css('display', 'none');
                this.removeUser(doc.data());
            }
        });
        return el;
    }
};


class ConfirmMatchDialog extends ConfirmationDialog {

    constructor(pupil, tutors, subject, timeString) {
        const title = 'Confirm Match?';
        var message = 'You are about to match ' + pupil.name + ' with and ' +
            'send request(s) to: \n ';
        tutors.forEach((tutor) => {
            message += '\n \v \v \v - ' + tutor.name + ' (' + tutor.grade +
                ' ' + tutor.type.toLowerCase() + ')';
        });
        message += '\n \n Doing so will send ' + tutors.length + ' lesson ' +
            'request(s) for ' + subject + ' on ' + timeString + ' Are you ' +
            'sure you want to complete this match?';

        async function match(tutor) {
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
            if (!pupil.proxy) {
                pupil.proxy = [window.app.user.uid];
                await Data.updateUser(pupil);
            } else if (pupil.proxy.indexOf(window.app.user.uid) < 0) {
                pupil.proxy.push(window.app.user.uid);
                await Data.updateUser(pupil);
            }
            return Data.newRequest(request);
        };

        async function createMatches() {
            window.app.nav.back();
            window.app.snackbar.view('Creating match(es) and sending request' +
                '(s)...');
            var errored = 0;
            await Promise.all(tutors.map(async (tutor) => {
                const [err, res] = await to(match(tutor));
                if (err) {
                    window.app.snackbar.view('Could not create match or send ' +
                        'request to ' + tutor.email + '.');
                    errored++;
                }
            }));
            if (errored) return setTimeout(() => window.app.snackbar.view(
                errored + ' out of the ' + tutors.length + ' match(es) ' +
                'errored and should be tried again.'), 2000);
            window.app.snackbar.view('Created match(es) and sent request(s) ' +
                'to ' + tutors.length + ' users.');
        };

        super(title, message, createMatches);
    }
};

module.exports = {
    default: Matching,
    dialog: MatchingDialog,
};