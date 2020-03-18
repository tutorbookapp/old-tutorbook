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
    MDCDialog
} from '@material/dialog/index';
import {
    MDCRipple
} from '@material/ripple/index';
import {
    MDCTextField
} from '@material/textfield/index';

import $ from 'jquery';
import to from 'await-to-js';

const EditAvailabilityDialog = require('@tutorbook/dialogs').editAvailability;
const Utils = require('@tutorbook/utils');
const Data = require('@tutorbook/data');

/**
 * Class that represents the filter dialog (in the 
 * [primary search view]{@linkplain Search}) that enables users (primarily 
 * pupils looking for tutors) to filter through Tutorbook's users.
 */
class FilterDialog {
    /**
     * A filters object that represents/stores the user's current search filters 
     * (that are applied via [Firestore query parameters]{@link https://firebase.google.com/docs/firestore/query-data/queries}).
     * @typedef {Object} Filters
     * @global
     * @property {string} [grade='Any'] - The desired user grade.
     * @property {string[]} [subject='Any'] - The desired user subject.
     * @property {string} [gender='Any'] - The desired user gender.
     * @property {bool} [showBooked=false] - Whether to show booked users or
     * free users (this only matters if the user has availability selected).
     * @property {Time} [availability={}] - The desired available timeslot.
     * @property {string} [location=window.app.location.name] - The desired
     * primary user location.
     * @property {string} [price=('Any'|'Free')] - The desired user price
     * ('Free' or 'Paid').
     * @property {string} [type='Tutor'] - The desired user type ('Tutor', 
     * 'Pupil', or 'Supervisor').
     * @property {string} [sort='Rating'] - The sorting of the search results 
     * (either by 'Rating' or by the number of 'Reviews').
     */

    /**
     * Creates and (optionally) renders the filter dialog given an optional set 
     * of filters.
     * @param {Filters} [filters] - The optional set of preset filters.
     * @param {bool} [skipRender=false] - Whether to skip rendering the dialog 
     * or not.
     */
    constructor(filters, skipRender = false) {
        this.filters = filters || {
            grade: 'Any',
            subject: 'Any',
            gender: 'Any',
            showBooked: false,
            availability: {},
            price: (window.app.location.name === 'Any') ? 'Any' : 'Free',
            type: 'Tutor',
            sort: 'Rating'
        };
        this.render = window.app.render;
        if (!skipRender) this.renderSelf();
    }

    /**
     * Prepends the dialog element to the document's `body`, manages it (if it 
     * hasn't already been managed), and opens the dialog.
     */
    view() {
        $('body').prepend(this.el);
        if (!this.managed) this.manage();
        this.dialog.open();
    }

    /**
     * Attaches the `MDCDialog` instance and adds `MDCRipple`s to the option
     * list items.
     */
    manage() {
        this.managed = true;
        this.dialog = MDCDialog.attachTo(this.el);
        this.dialog.autoStackButtons = false;
        this.dialog.listen('MDCDialog:closing', (event) => {
            $(this.el).remove();
            if (event.detail.action === 'accept') this.accept();
        });
        $(this.el).find('.mdc-list-item').each(function() {
            MDCRipple.attachTo(this);
        });
    }

    /**
     * Accepts the currently selected filters and views the (updated) search 
     * results.
     */
    accept() {
        window.app.search.viewResults();
    }

    /**
     * Renders the filter dialog by replacing all of the empty placeholder pages
     * with the relevant subjects in `mdc-list` form.
     */
    renderSelf() {
        this.el = this.render.template('dialog-filter');

        const pages = this.el.querySelectorAll('.page');
        const r = (query, options, addAny = true) => Utils.replaceElement(
            $(this.el).find('#' + query + '-list')[0],
            this.render.template('dialog-filter-item-list', {
                items: addAny ? ['Any'].concat(options) : options,
            }),
        );

        this.el.querySelector('#reset-button').addEventListener('click', () => {
            Object.entries({
                grade: 'Any',
                subject: 'Any',
                gender: 'Any',
                availability: {},
                price: (window.app.location.name === 'Any') ? 'Any' : 'Free',
                type: 'Any',
                sort: 'Rating'
            }).forEach((filter) => this.filters[filter[0]] = filter[1]);
            this.page('page-all');
        });

        Utils.replaceElement(
            this.el.querySelector('#availability-list'),
            this.renderInputAvailability()
        );

        if (!window.app.id) {
            r('price', Data.prices);
        } else {
            Utils.replaceElement(
                this.el.querySelector('#price-list'),
                'Due to school guidelines, we can only show free service-hour' +
                ' peer tutors on this website. To filter by price and view ' +
                'more professional tutors, go to the root partition at https:' +
                '//tutorbook.app/app.'
            );
        }

        r('grade', window.app.data.grades);
        r('gender', Data.genders);
        r('type', Data.types);

        r('math', Data.mathSubjects, false);
        r('tech', Data.techSubjects, false);
        r('art', Data.artSubjects, false);
        r('science', Data.scienceSubjects, false);
        r('history', Data.historySubjects, false);
        r('language', Data.languageSubjects, false);
        r('english', Data.englishSubjects, false);
        r('life-skills', Data.lifeSkills, false);

        this.el.querySelectorAll('#page-subject .mdc-list-item').forEach((el) => {
            el.addEventListener('click', () => {
                var id = el.id.split('-').slice(1).join('-');
                if (id === 'page-all') this.filters.subject = 'Any';
                this.page(id);
            });
        });

        pages.forEach((sel) => {
            var key = sel.id.split('-')[1];
            if (key === 'all' || key === 'subject') return;

            sel.querySelectorAll('.mdc-list-item').forEach((el) => {
                el.addEventListener('click', () => {
                    if ([
                            'math',
                            'science',
                            'history',
                            'language',
                            'english',
                            'lifeSkills',
                            'tech',
                            'art'
                        ].indexOf(key) >= 0) {
                        this.filters.subject = el.innerText.trim();
                        this.page('page-all');
                    } else if ('availability' === key) {
                        return;
                    } else {
                        this.filters[key] = el.innerText.trim();
                        this.page('page-all');
                    }
                });
            });
        });

        this.el.querySelectorAll('.back').forEach((el) => {
            el.addEventListener('click', () => {
                this.page('page-all');
            });
        });
        this.el.querySelectorAll('.back-subjects').forEach((el) => {
            el.addEventListener('click', () => {
                this.page('page-subject');
            });
        });

        this.page('page-all');
    }

    /**
     * Returns the filter availability string (for the `filters-all` summary
     * list that shows all of the currently selected filters).
     * @param {Time} data - The currently selected availability.
     * @return {string} The availability in string form cut off at 20 characters
     * (for the `filters-all` summary list that shows all of the currently 
     * selected filters).
     */
    getAvailabilityString(data) {
        const str = Utils.getAvailabilityString(data);
        return Utils.shortenString(str, 20);
    }

    /**
     * Updates the currently selected filters list by replacing it with a 
     * re-rendered `all-filters-list`.
     */
    renderAllList() {
        Utils.replaceElement(
            this.el.querySelector('#all-filters-list'),
            this.render.template('dialog-filter-list', this.clearFilters()),
        );
        const that = this;
        $(this.el).find('#page-all .mdc-list-item').each(function() {
            MDCRipple.attachTo(this);
            this.addEventListener('click', function() {
                that.page(this.id.split('-').slice(1).join('-'));
            });
        });
    }

    /**
     * Helper function to get rid of the 'Any' selected option (by replacing it
     * with an empty string: '') for better rendering.
     * @see {@link FilterDialog#renderAllList}
     * @param {Filters} [filters=this.filters] - The filters to replace 'Any' 
     * with empty strings.
     * @return {Filters} The filters with 'Any' options replaced with ''.
     */
    clearFilters(filters = this.filters) {
        var result = {};
        for (var filter in filters) {
            if (filters[filter] !== 'Any' && Object.keys(filters[filter])
                .length !== 0) {
                result[filter] = filter === 'availability' ? this
                    .getAvailabilityString(filters[filter]) : filters[filter];
            } else {
                result[filter] = '';
            }
        }
        return result;
    }

    /**
     * Views a filter dialog page given the page ID (if it's a page all list, it
     * updates the currently selected page view before showing it).
     * @param {string} id - The ID of the page to view.
     */
    page(id) {
        const pages = this.el.querySelectorAll('.page');

        pages.forEach(function(sel) {
            if (sel.id === id) {
                sel.style.display = 'inherit';
            } else {
                sel.style.display = 'none';
            }
        });

        if (id === 'page-all') {
            this.renderAllList();
        } else if (id === 'page-availability' &&
            !this.availabilityDialog.managed) {
            this.availabilityDialog.manage();
        }
    }

    renderInputAvailability() {
        const textField = this.render.textField('Stub', '');
        this.availabilityDialog = new EditAvailabilityDialog(textField, {});
        this.availabilityDialog.val = Utils.cloneMap(this.filters.availability);
        this.availabilityDialog.renderSelf();
        $(this.el).find('#page-availability #ok-button')[0]
            .addEventListener('click', () => {
                if (!this.availabilityDialog.valid) return;
                this.filters.availability = this.availabilityDialog.val;
                this.page('page-all');
            });
        return this.availabilityDialog.main = $(this.availabilityDialog.main)
            .find('.mdc-dialog__content')[0];
    }
};

/**
 * Class that represents the dialog that enables supervisors to create new
 * announcement groups by filtering students to create student segments (e.g.
 * all of the users who are booked for Mondays at 2:45 PM).
 * @extends FilterDialog
 */
class NewGroupDialog extends FilterDialog {

    constructor(options = {}) {
        super(undefined, true);
        this.ref = options.ref || window.app.db.collection('locations')
            .doc(window.app.location.id).collection('announcements').doc();
        this.name = options.name || window.app.location.name + ' Group #' +
            (options.groupNum || 1);
        this.filters = Utils.combineMaps(this.filters, options.filters || {});
        this.filters.showBooked = true;
        this.group = Utils.combineMaps({
            lastMessage: {
                message: 'No messages so far. Click to send the first one.',
                sentBy: window.app.conciseUser,
                timestamp: new Date(),
            },
            chatters: [
                window.app.conciseUser,
            ],
            chatterUIDs: [
                window.app.user.uid,
            ],
            chatterEmails: [
                window.app.user.email,
            ],
            location: window.app.location,
            createdBy: window.app.conciseUser,
            name: this.name,
            photo: 'https://tutorbook.app/app/img/male.png',
            filters: this.filters,
        }, options.group || {});
        this.renderSelf();
    }

    getAvailabilityString(data) {
        const str = Utils.getAvailabilityString(data);
        return Utils.shortenString(str, 50);
    }

    renderSelf() {
        super.renderSelf();
        const description = 'Filter users to create a new announcement group.' +
            ' Messages sent to this group will then be sent to all users who ' +
            'fit within the specified filters.';
        const nameEl = this.render.textField('Name', this.name);
        $(this.el)
            .find('#show-page-availability span').text('Any Appointments').end()
            .find('#page-availability h2').text('Appointments').end()
            .find('#page-all .mdc-dialog__title').text('New Group').end()
            .find('[data-mdc-dialog-action="accept"]').text('Create').end()
            .find('#page-all .mdc-dialog__content').prepend(nameEl)
            .prepend(description).end()
            .attr('id', 'dialog-group');
    }

    renderAllList() {
        super.renderAllList();
        $(this.el).find('#show-page-availability span').text('Any Appointments');
    }

    accept() {
        this.group.name = this.nameTextField.value || this.name;
        return this.ref.set(this.group);
    }

    manage() {
        super.manage();
        this.nameTextField = new MDCTextField($(this.el).find('#Name')[0]);
        this.nameTextField.value = this.name;
    }
};

class EditGroupDialog extends NewGroupDialog {

    renderSelf() {
        super.renderSelf();
        $(this.el)
            .find('#page-all .mdc-dialog__title').text('Edit Group').end()
            .find('[data-mdc-dialog-action="accept"]').text('Update');
    }

    accept() {
        this.group.name = this.nameTextField.value || this.name;
        return this.ref.update(this.group);
    }
};

module.exports = {
    default: FilterDialog,
    group: NewGroupDialog,
    editGroup: EditGroupDialog,
};