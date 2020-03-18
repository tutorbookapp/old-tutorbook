/**
 * Package that contains the search views and utilities used throughout the app.
 * @module @tutorbook/search
 * @see {@link https://npmjs.com/package/@tutorbook/search}
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

import $ from 'jquery';
import to from 'await-to-js';

const EditProfile = require('@tutorbook/profile').edit;
const User = require('@tutorbook/user');
const FilterDialog = require('@tutorbook/filters').default;
const Utils = require('@tutorbook/utils');
const Data = require('@tutorbook/data');
const NotificationDialog = require('@tutorbook/dialogs').notify;

/**
 * Class that represents the `mdc-top-app-bar` with a Google-like search bar
 * that opens an elevated search results `mdc-list`.
 */
class SearchHeader {

    constructor(options = {}) {
        this.render = window.app.render;
        this.index = options.index ? options.index : Data.algoliaIndex('users');
        if (options.search) this.search = options.search;
        this.renderSelf(options);
    }

    renderSelf(options) {
        this.el = this.render.header('header-search', Utils.combineMaps({
            title: 'Tutorbook',
            wordmark: false,
            logo: false,
            placeholder: window.app.onMobile ? 'Search users' : 'Search users' +
                ' by name, subject, availability, and more',
        }, options));
    }

    /**
     * Searches users via [Algolia]{@link https://algolia.com} (and adds the
     * necessary `facetFilters` in order to only show data relevant to the
     * current user).
     * @see {@link https://www.algolia.com/doc/api-reference/api-parameters/facetFilters/}
     */
    async search(that) {
        const query = $(that.el).find('.search-box input').val();
        query.length > 0 ? that.showClearButton() : that.showInfoButton();
        const [err, res] = await to(that.index.search({
            query: query,
            facetFilters: !window.app.id ? [] : [
                'payments.type:Free',
                window.app.locations.map(l => 'location:' + l.name),
            ],
        }));
        if (err) return console.error('[ERROR] Could not search users b/c of',
            err);
        $(that.el).find('#results').empty();
        res.hits.forEach((hit) => {
            try {
                $(that.el).find('#results').append(that.renderHit(hit));
            } catch (e) {
                console.warn('[ERROR] Could not render hit (' + hit.objectID +
                    ') b/c of', e);
            }
        });
    }

    manage() {
        $(this.el).find('.search-box button').each(function() {
            MDCRipple.attachTo(this).unbounded = true;
        });
        $(this.el).find('#info-button').click(() => new NotificationDialog(
            'About Search',
            'Tutorbook\'s new search bar is an app-wide search feature to' +
            ' make your job easier. From the search bar, you can find, ' +
            'match, and message students, schedule or cancel appointments' +
            ', and start service hour timers for tutors at your ' +
            'location(s).', () => {}).view());
        $(document).click((event) => {
            const $target = $(event.target);
            const clicked =
                $target.closest($(this.el).find('.search-results')).length ||
                $target.closest($(this.el).find('.search-box')).length;
            const open = $(this.el).find('.search-results').is(':visible');
            if (!clicked && open) return this.hideResults();
            if (clicked && !open) return this.showResults();
        });
        $(this.el).find('.search-box input').on('input', () => this.search(this))
            .focusout(() => {
                if (!$(this.el).find('.search-results li:hover').length)
                    this.hideResults();
            })
            .focus(() => this.showResults());
        this.search(this); // TODO: Show filter prompts instead of results
        $(this.el).find('#clear-button').click(() => {
            $(this.el).find('.search-box input').val('');
            this.showInfoButton();
            this.search(this);
        });
    }

    showInfoButton() {
        if (window.app.onMobile) return;
        $(this.el).find('#clear-button').hide();
        $(this.el).find('#info-button').show();
    }

    showClearButton() {
        if (window.app.onMobile) return;
        $(this.el).find('#info-button').hide();
        $(this.el).find('#clear-button').show();
    }

    showResults() {
        $(this.el).find('.search-results').show();
        $(this.el).find('.search-box')
            .addClass('search-box--elevated');
    }

    hideResults() {
        $(this.el).find('.search-results').hide();
        $(this.el).find('.search-box')
            .removeClass('search-box--elevated');
    }

    renderHit(hit) {
        return SearchHeader.renderHit(hit, this.render);
    }

    static renderHit(hit, render) { // TODO: Remove code duplication from Search()
        var el;
        const profile = Utils.filterProfile(hit);
        const match = new window.app.MatchingDialog(profile);
        const edit = new EditProfile(profile);
        const user = new User(profile);
        const listItemData = Utils.cloneMap(profile);
        listItemData.id = hit.objectID;
        listItemData.go_to_user = (event) => {
            if ($(event.target).closest('button').length) return;
            user.view();
        };
        listItemData.match = () => {
            match.view();
        };
        listItemData.edit = () => {
            edit.view();
        };
        listItemData.chat = async () => {
            (await window.app.chats.newWith(profile)).view();
        };
        listItemData.hrs = async () => {
            window.app.snackbar.view('Generating service hour log...');
            const [err, res] = await to(Data.getServiceHoursLog({
                uid: profile.uid,
            }));
            if (err) return window.app.snackbar.view('Could not generate ' +
                'service hour log.');
            window.app.snackbar.view('Generated service hour log.', 'view',
                () => window.open(res), true, -1);
        };
        listItemData.grade = profile.grade || 'No Grade';
        listItemData.type = profile.type || 'No Type';

        if (profile.payments.type === 'Paid') {
            listItemData.type = 'Tutor';
            listItemData.paid = true;
            listItemData.free = false;
            listItemData.rate = '$' + profile.payments.hourlyCharge.toFixed(0);
            listItemData.paymentType = 'paid';
            listItemData.showHrs = false;
        } else {
            listItemData.free = true;
            listItemData.paid = false;
            listItemData.paymentType = 'free';
            if (profile.type === 'Tutor') listItemData.showHrs = true;
        }

        el = render.template('search-hit-user', listItemData);
        MDCRipple.attachTo(el);
        $(el).find('button').each(function() {
            MDCRipple.attachTo(this).unbounded = true;
        });
        return el;
    }
}

/**
 * Class that manages the Tutorbook search screen and results. 
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes}
 * @todo Finish documentation.
 */
class Search {

    constructor() {
        this.users = {}; // Store user objects in cache for responsiveness
        this.profiles = {}; // Store raw user data
        this.render = window.app.render;
        this.filters = {
            grade: 'Any',
            subject: 'Any',
            gender: 'Any',
            showBooked: false,
            availability: {},
            price: (window.app.location.name === 'Any') ? 'Any' : 'Free',
            type: 'Tutor',
            sort: 'Rating'
        };
        this.validGrades = window.app.data.grades;
        this.initDescription();
        // This has to be defined within a function to have access to `this`
        this.recycler = {
            remove: (doc) => {
                return $(this.main).find('#results [id="' + doc.id +
                    '"]').remove();
            },
            display: (doc) => {
                if (this.validResult(doc.data()))
                    return this.viewResult(this.renderResult(doc));
            },
            empty: () => {
                return $(this.main).find('#results').empty()
                    .append(this.emptySearch);
            },
        };
        this.renderSelf();
    }

    /**
     * Checks if the given profile's subjects fit within our current filters.
     * @param {Profile} profile - The profile to check.
     * @return {bool} Whether the profile's subjects fit within our current 
     * filters (`true` if it does, `false` if not).
     */
    matchesSubject(profile) {
        if (this.filters.subject === 'Any') return true;
        return profile.subjects.indexOf(this.filters.subject) >= 0;
    }

    /**
     * Checks if the given profile's availability fits within our current 
     * filters.
     * @param {Profile} profile - The profile to check.
     * @return {bool} Whether the profile's availability fits within our current 
     * filters (`true` if it does, `false` if not).
     */
    matchesAvailability(profile) {
        const len = (ob) => Object.keys(ob).length;
        if (!len(this.filters.availability)) return true;
        const a = profile.availability;
        const f = this.filters.availability;
        if (!a[f.location] || !len(a[f.location])) return false;
        if (!a[f.location][f.day] || !a[f.location][f.day].length) return false;
        if (a[f.location][f.day].findIndex(timeslot =>
                timeslot.open === f.fromTime &&
                timeslot.close === f.toTime &&
                timeslot.booked === this.filters.showBooked
            ) < 0) return false;
        return true;
    }

    /**
     * Checks if the given profile should show up in search results.
     * @param {Profile} profile - The profile to check if it fits our filters.
     * @return {bool} Whether the profile fits within our current filters 
     * (`true` if it does, `false` if not).
     */
    validResult(profile) {
        if (this.validGrades.indexOf(profile.grade) < 0) {
            return false;
        } else if (profile.subjects.length === 0) {
            return false;
        } else if (profile.type === '' || profile.type === undefined) {
            return false;
        } else if (!this.matchesSubject(profile)) {
            return false;
        } else if (!this.matchesAvailability(profile)) {
            return false;
        }
        return true;
    }

    // Returns an MDC List Item for a given profile doc
    renderResult(doc) {
        const profile = doc.data();
        const user = new User(profile);
        this.profiles[profile.uid] = profile;
        this.users[profile.uid] = user;
        var listItemData = Utils.cloneMap(profile);
        listItemData['id'] = doc.id;
        listItemData['go_to_user'] = () => {
            user.view();
        };

        if (profile.payments.type === 'Paid') {
            listItemData.type = 'Tutor';
            listItemData.paid = true;
            listItemData.free = false;
            listItemData.rate = '$' + profile.payments.hourlyCharge.toFixed(0);
            listItemData.paymentType = 'paid';
        } else {
            listItemData.free = true;
            listItemData.paid = false;
            listItemData.paymentType = 'free';
        }

        const el = this.render.template('search-result-user', listItemData);
        Utils.replaceElement(
            el.querySelector('.rating__meta'),
            this.render.rating(profile.avgRating)
        );
        MDCRipple.attachTo(el);
        return el;
    }

    // Function that refreshes the filter description
    initDescription() {
        this.filterDescription = '';

        switch (this.filters.price) {
            case 'Any':
                break;
            case 'Free':
                this.filterDescription += ' free ';
                break;
            default:
                this.filterDescription += ' paid ';
                break;
        };

        if (this.filters.gender !== 'Any') {
            this.filterDescription += this.filters.gender.toLowerCase() + ' ';
        }

        if (this.filters.grade !== 'Any') {
            this.filterDescription += this.filters.grade.toLowerCase();
        }

        if (this.filters.type !== 'Any') {
            if (this.filters.grade !== 'Any') {
                this.filterDescription += ' ' + this.filters.type.toLowerCase() + 's';
            } else {
                this.filterDescription += this.filters.type.toLowerCase() + 's';
            }
        } else {
            if (this.filters.grade === 'Any') {
                this.filterDescription += (this.filters.price === 'Any') ? 'all users' : 'users';
            } else if (this.filters.grade !== 'Freshman') {
                // "Freshman" is weird as it is the plural and singular
                this.filterDescription += 's';
            }
        }

        if (this.filters.subject !== 'Any') {
            this.filterDescription += ' for ' + this.filters.subject;
        }

        if (Object.keys(this.filters.availability).length !== 0) {
            this.filterDescription += ' available on ' +
                Utils.getAvailabilityString(this.filters.availability);
        }

        if (this.filters.sort === 'Rating') {
            this.filterDescription += ' sorted by rating';
        } else if (this.filters.sort === 'Reviews') {
            this.filterDescription += ' sorted by # of reviews';
        }

        // Make sure to cut off the filter description at a max of 20 characters
        // and less if we're on mobile.
        // TODO: Make these numbers based on the size of the window
        if ((!!window.app) ? window.app.onMobile : false) {
            this.filterDescription = this.shortenString(this.filterDescription, 50);
        } else {
            this.filterDescription = this.shortenString(this.filterDescription, 150);
        }
    }

    // Proxies to the app's view function
    view(filters) {
        $(this.header).find('#filter').click(() => {
            new FilterDialog(this.filters).view();
        });
        $(this.header).find('#clear').click(() => {
            this.filters = {
                grade: 'Any',
                subject: 'Any',
                gender: 'Any',
                showBooked: false,
                availability: {},
                price: (window.app.location.name === 'Any') ? 'Any' : 'Free',
                type: 'Any',
                sort: 'Rating'
            };
            this.viewResults();
        });
        if (!!filters) {
            Object.entries(filters).forEach((entry) => {
                var filter = entry[0];
                var val = entry[1];
                this.filters[filter] = val;
            });
            this.initDescription();
        }
        app.view(this.header, this.main, '/app/search');
        app.intercom.view(true);
        if (this.filters.type !== 'Any') {
            app.nav.selected = this.filters.type + 's';
        } else {
            app.nav.selected = 'Search';
        }
        MDCTopAppBar.attachTo(this.header);
        this.viewResults();
    }

    // Returns a map with a header and main view
    renderSelf() {
        this.header = this.render.header('header-filter', {
            'title': 'Search',
            'filter_description': this.filterDescription,
        });
        this.main = this.render.template('search');
    }

    // Views a certain result (adds it to our search results)
    viewResult(listItem) {
        const results = $(this.main).find('#results')[0];
        const existingLocationCard = results.querySelector(
            "[id='" + listItem.getAttribute('id') + "']"
        );
        if (existingLocationCard) {
            // modify
            results.insertBefore(listItem, existingLocationCard);
            results.removeChild(existingLocationCard);
        } else {
            // add
            results.append(listItem);
        }
    };

    // Adds listeners to existing view
    reView() {
        MDCTopAppBar.attachTo(this.header);
        $(this.header).find('#filter').click(() => {
            new FilterDialog(this.filters).view();
        });
        $(this.header).find('#clear').click(() => {
            this.filters = {
                grade: 'Any',
                subject: 'Any',
                gender: 'Any',
                showBooked: false,
                availability: {},
                price: (window.app.location.name === 'Any') ? 'Any' : 'Free',
                type: 'Any',
                sort: 'Rating'
            };
            this.viewResults();
        });
        this.reViewResults();
    }

    async reViewUser(id) {
        if (!this.users[id]) this.users[id] =
            new User((await Data.getUser(id)));
        return this.users[id].reView();
    }

    // Adds click listeners to existing search results
    reViewResults() {
        const users = this.users;
        $(this.main).find('.mdc-list-item').each(async function() {
            const id = $(this).attr('id');
            if (!!users[id]) { // Use cached user object
                return $(this).click(() => {
                    users[id].view();
                });
            }
            if (!id) {
                throw new Error('User search result\'s ID was undefined.');
            }
            const profile = await Data.getUser(id); // Create and cache user
            const user = new User(profile);
            users[id] = user;
            $(this).click(() => {
                user.view();
            });
        });
    }

    // Views search results for our filters
    viewResults() {
        var that = this;
        this.initDescription();
        $(this.header).find('[data-fir-content="filter_description"]')
            .text(this.filterDescription);
        this.emptyResults();
        window.app.listeners.push(this.getUsers().onSnapshot({
            error: (err) => {
                new NotificationDialog('Search Error', 'Sorry, but we can\'t ' +
                    'seem to search with those filters. Tutorbook seems to ' +
                    'have encountered this database error:\n\n' +
                    Utils.wrap(err.message, 50) + '\n\n Try changing your ' +
                    'filters or contact me with the above error message at ' +
                    'nicholaschiang@tutorbook.app or (650) 861-2723.',
                    () => {}).view();
                console.error('[ERROR] Could not show search results b/c of ',
                    err);
            },
            next: (snapshot) => {
                if (!snapshot.size) {
                    return that.recycler.empty();
                }

                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'removed') {
                        that.recycler.remove(change.doc);
                    } else {
                        that.recycler.display(change.doc);
                    }
                });
            },
        }));
    }

    // Empties search results
    emptyResults() {
        return $(this.main).find('#results').empty();
    }

    /**
     * Gets the filtered users Firestore query based on our filters.
     * @return {external:Query} The query that gets the users that match our 
     * currently selected filters (`this.filters`).
     */
    getUsers() {
        var query = window.app.db.collection('users')
            .where('access', 'array-contains-any', window.app.user.access)
            .where('config.showProfile', '==', true);

        if (this.filters.sort === 'Rating') {
            query = query.orderBy('avgRating', 'desc');
        } else if (this.filters.sort === 'Reviews') {
            query = query.orderBy('numRatings', 'desc');
        }

        if (this.filters.grade !== 'Any') {
            query = query.where('grade', '==', this.filters.grade);
        }

        if (this.filters.gender !== 'Any') {
            query = query.where('gender', '==', this.filters.gender);
        }

        if (this.filters.type !== 'Any') {
            query = query.where('type', '==', this.filters.type);
        }

        switch (this.filters.price) {
            case 'Any':
                break;
            case 'Free':
                query = query.where('payments.type', '==', 'Free');
                break;
            default:
                query = query.where('payments.type', '==', 'Paid');
                break;
        };

        return query.limit(500);
    }

    /**
     * Helper function to cut off strings with a `...`
     * @param {string} str - The string to cut off with a `...`
     * @param {int} length - The desired length of the string (including the
     * `...`).
     * @return {string} The `str` with length `length` cut off with a `...` (if
     * it's bigger than `length`).
     */
    shortenString(str, length) {
        if (str.length <= length) return str;
        var result = '';
        str.split('').forEach((chr) => {
            if (result.length < length - 3) result += chr;
        });
        result += '...';
        return result;
    }
};


module.exports = {
    default: Search,
    header: SearchHeader,
};