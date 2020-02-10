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

class FilterDialog {

    constructor(filters) {
        this.filters = filters || {
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
        this.render = window.app.render;
        this.renderSelf();
    }

    view() {
        $('body').prepend(this.el);
        if (!this.managed) this.manage();
        this.dialog.open();
    }

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

    accept() {
        window.app.search.viewResults();
    }

    renderSelf() {
        this.el = this.render.template('dialog-filter');
        const pages = this.el.querySelectorAll('.page');

        this.el.querySelector('#reset-button').addEventListener('click', () => {
            Object.entries({
                grade: 'Any',
                subject: 'Any',
                gender: 'Any',
                availability: {},
                location: window.app.location.name,
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

        Utils.replaceElement(
            this.el.querySelector('#grade-list'),
            this.render.template('dialog-filter-item-list', {
                items: ['Any'].concat(Data.grades)
            })
        );

        if (window.app.location.name === 'Any') {
            Utils.replaceElement(
                this.el.querySelector('#price-list'),
                this.render.template('dialog-filter-item-list', {
                    items: ['Any'].concat(Data.prices)
                })
            );
        } else {
            Utils.replaceElement(
                this.el.querySelector('#price-list'),
                'Due to PAUSD guidelines, we can only show free service-hour' +
                ' peer tutors on this website. To filter by price and view ' +
                'more professional tutors, go to the root partition at https:' +
                '//tutorbook.app/app.'
            );
        }

        Utils.replaceElement(
            this.el.querySelector('#gender-list'),
            this.render.template('dialog-filter-item-list', {
                items: ['Any'].concat(Data.genders)
            })
        );

        Utils.replaceElement(
            this.el.querySelector('#type-list'),
            this.render.template('dialog-filter-item-list', {
                items: ['Any'].concat(Data.types)
            })
        );

        Utils.replaceElement(
            this.el.querySelector('#math-list'),
            this.render.template('dialog-filter-item-list', {
                items: Data.mathSubjects
            })
        );

        Utils.replaceElement(
            this.el.querySelector('#tech-list'),
            this.render.template('dialog-filter-item-list', {
                items: Data.techSubjects
            })
        );

        Utils.replaceElement(
            this.el.querySelector('#art-list'),
            this.render.template('dialog-filter-item-list', {
                items: Data.artSubjects
            })
        );

        Utils.replaceElement(
            this.el.querySelector('#science-list'),
            this.render.template('dialog-filter-item-list', {
                items: Data.scienceSubjects
            })
        );

        Utils.replaceElement(
            this.el.querySelector('#history-list'),
            this.render.template('dialog-filter-item-list', {
                items: Data.historySubjects
            })
        );

        Utils.replaceElement(
            this.el.querySelector('#language-list'),
            this.render.template('dialog-filter-item-list', {
                items: Data.languageSubjects
            })
        );

        Utils.replaceElement(
            this.el.querySelector('#english-list'),
            this.render.template('dialog-filter-item-list', {
                items: Data.englishSubjects
            })
        );

        Utils.replaceElement(
            this.el.querySelector('#life-skills-list'),
            this.render.template('dialog-filter-item-list', {
                items: Data.lifeSkills
            })
        );

        this.el.querySelectorAll('#page-subject .mdc-list-item').forEach((el) => {
            el.addEventListener('click', () => {
                var id = el.id.split('-').slice(1).join('-');
                if (id === 'page-all') {
                    this.filters.subject = 'Any';
                }
                this.page(id);
            });
        });

        pages.forEach((sel) => {
            var key = sel.id.split('-')[1];
            if (key === 'all' || key === 'subject') {
                return;
            }

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
                        this.filters['subject'] = el.innerText.trim();
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

    getAvailabilityString(data) {
        const str = Utils.getAvailabilityString(data);
        return Utils.shortenString(str, 20);
    }

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

    clearFilters(filters = this.filters) {
        // Helper function to get rid of the 'Any' selected option for
        // better rendering.
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

class NewGroupDialog extends FilterDialog {

    constructor(options = {}) {
        super();
        this.defaultName = window.app.location.name + ' Group #' + (options
            .groupNum || 1);
        this.name = options.name || this.defaultName;
        this.filters.showBooked = true;
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
        const group = {
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
            name: this.nameTextField.value || this.name || this.defaultName,
            photo: 'https://tutorbook.app/app/img/male.png',
            filters: this.filters,
        };
        return window.app.db.collection('locations').doc(window.app.location.id)
            .collection('announcements').doc().set(group);
    }

    manage() {
        super.manage();
        this.nameTextField = new MDCTextField($(this.el).find('#Name')[0]);
        this.nameTextField.value = this.name;
    }
};

module.exports = {
    default: FilterDialog,
    group: NewGroupDialog,
};