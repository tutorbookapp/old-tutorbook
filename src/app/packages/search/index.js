import {
    MDCRipple
} from '@material/ripple/index';
import {
    MDCTopAppBar
} from '@material/top-app-bar/index';

import $ from 'jquery';
import to from 'await-to-js';

const algolia = require('algoliasearch')
    ('9FGZL7GIJM', '9ebc0ac72bdf6b722d6b7985d3e83550');
const EditProfile = require('@tutorbook/profile').edit;
const User = require('@tutorbook/user');
const FilterDialog = require('@tutorbook/filters').default;
const Utils = require('@tutorbook/utils');
const Data = require('@tutorbook/data');
const NotificationDialog = require('@tutorbook/dialogs').notify;

class SearchHeader {

    constructor(options) {
        this.render = window.app.render;
        if (!options) options = {};
        this.index = options.index ? options.index : algolia.initIndex('users');
        if (options.search) this.search = options.search;
        this.renderSelf(options);
    }

    renderSelf(options) {
        this.el = this.render.header('header-search', Utils.combineMaps({
            title: 'Tutorbook',
            placeholder: window.app.onMobile ? 'Search users' : 'Search users' +
                ' by name, subject, availability, and more',
        }, options));
    }

    async search(that) {
        const query = $(that.el).find('.search-box input').val();
        query.length > 0 ? that.showClearButton() : that.showInfoButton();
        const res = await that.index.search({
            query: query,
            facetFilters: window.app.location.name === 'Any' ? [
                'partition:' + (window.app.test ? 'test' : 'default'),
            ] : [
                'payments.type:Free',
                'location:' + window.app.location.name,
                'partition:' + (window.app.test ? 'test' : 'default'),
            ],
        });
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
                () => window.open(res), false);
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


// Class that manages the Tutorbook search screen and results. See: 
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes
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
            location: window.app.location.name,
            price: (window.app.location.name === 'Any') ? 'Any' : 'Free',
            type: 'Tutor',
            sort: 'Rating'
        };
        this.validGrades = Data.grades; // Allow for manipulation of validGrades
        this.initDescription();
        // This has to be defined within a function to have access to `this`
        this.recycler = {
            remove: (doc) => {
                return $(this.main).find('#results [id="' + doc.id +
                    '"]').remove();
            },
            display: (doc) => {
                // We don't want to display user's app do not have a valid profile
                if (this.validResult(doc.data())) {
                    return this.viewResult(this.renderResult(doc));
                }
            },
            empty: () => {
                return $(this.main).find('#results').empty()
                    .append(this.emptySearch);
            },
        };
        this.renderSelf();
    }

    // Checks if the profile should show up in search results
    validResult(profile) {
        if (this.validGrades.indexOf(profile.grade) < 0) {
            return false;
        } else if (profile.subjects.length === 0) {
            return false;
        } else if (profile.type === '' || profile.type === undefined) {
            return false;
        } else if (Object.keys(this.filters.availability).length !== 0 &&
            this.filters.subject !== 'Any' &&
            profile.subjects.indexOf(this.filters.subject) < 0) {
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
                location: window.app.location.name,
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
            // We want to add paid tutors to the top of the search results
            if (listItem.getAttribute('type') === 'paid') {
                return $(results).prepend(listItem);
            }
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
                location: window.app.location.name,
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
                console.error('Could not show search results b/c of ', err);
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

    // Gets filtered users based on our filters
    getUsers() {
        if (firebase.auth().currentUser) {
            var query = window.app.db.collection('users')
                .where('config.showProfile', '==', true);
        } else {
            var query = window.app.db.collection('search');
        }

        if (this.filters.location !== 'Any') {
            query = query.where('location', '==', this.filters.location);
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

        if (Object.keys(this.filters.availability).length !== 0) {
            // NOTE: User availability is stored in the Firestore database as:
            // availability: {
            // 	Gunn Academic Center: {
            //     Friday: [
            //       { open: '10:00 AM', close: '3:00 PM' },
            //       { open: '10:00 AM', close: '3:00 PM' },
            //     ],
            //   },
            //   Paly Tutoring Center: {
            //   ...
            //   },
            // };
            // And it is referenced here in the filters as:
            // availability: {
            //  	location: 'Gunn Academic Center',
            //  	day: 'Monday',
            //  	fromTime: 'A Period',
            //  	toTime: 'B Period',
            // };
            var location = this.filters.availability.location;
            var day = this.filters.availability.day;
            var from = this.filters.availability.fromTime;
            var to = this.filters.availability.toTime;
            // TODO: Make this query accept values that are a larger range than
            // the given value (e.g. user wants a timeslot from 4:00 PM to 4:30 PM
            // but this filters out users with availability from 8:00 AM to 5:00 PM).
            query = query.where(
                'availability.' + location + '.' + day,
                'array-contains', {
                    open: from,
                    close: to,
                    booked: this.filters.showBooked,
                }
            );
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

        if (this.filters.subject !== 'Any' &&
            Object.keys(this.filters.availability).length === 0) {
            // NOTE: We can only include one array-contains statement in any given
            // Firestore query. So, to do this, we check if the users in the 
            // resulting query have this subject (in the searchRecycler).
            query = query
                .where('subjects', 'array-contains', this.filters.subject);
        }

        if (this.filters.sort === 'Rating') {
            query = query.orderBy('avgRating', 'desc');
        } else if (this.filters.sort === 'Reviews') {
            query = query.orderBy('numRatings', 'desc');
        }

        return query.limit(500);
    }

    // Helper function to cut off strings with a ...
    shortenString(str, length) {
        if (str.length <= length) {
            return str;
        }
        var result = '';
        str.split('').forEach((chr) => {
            if (result.length < length - 3) {
                result += chr;
            }
        });
        result += '...';
        return result;
    }
};


module.exports = {
    default: Search,
    header: SearchHeader,
};