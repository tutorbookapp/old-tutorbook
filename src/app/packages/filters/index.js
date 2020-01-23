import {
    MDCDialog
} from '@material/dialog/index';
import {
    MDCRipple
} from '@material/ripple/index';

import $ from 'jquery';

const Utils = require('@tutorbook/utils');
const Data = require('@tutorbook/data');

class FilterDialog {
    constructor(filters) {
        this.filters = filters || {
            grade: 'Any',
            subject: 'Any',
            gender: 'Any',
            availability: {},
            location: window.app.location.name,
            price: (window.app.location.name === 'Any') ? 'Any' : 'Free',
            type: 'Any',
            sort: 'Rating'
        };
        this.render = window.app.render;
        this.renderSelf();
    }

    // Opens filter dialog
    view() {
        $('body').prepend(this.el);
        this.dialog = MDCDialog.attachTo(this.el);
        this.dialog.autoStackButtons = false;
        this.dialog.listen('MDCDialog:closing', (event) => {
            $(this.el).remove();
            if (event.detail.action === 'accept') {
                window.app.search.viewResults();
            }
        });
        this.el.querySelectorAll('.mdc-list-item').forEach((el) => {
            MDCRipple.attachTo(el);
        });

        this.dialog.open();
    }

    renderSelf() {
        const dialog = this.render.template('dialog-filter');
        const pages = dialog.querySelectorAll('.page');

        dialog.querySelector('#reset-button').addEventListener('click', () => {
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
            dialog.querySelector('#availability-list'),
            this.renderInputAvailability()
        );

        Utils.replaceElement(
            dialog.querySelector('#grade-list'),
            this.render.template('dialog-filter-item-list', {
                items: ['Any'].concat(Data.grades)
            })
        );

        if (window.app.location.name === 'Any') {
            Utils.replaceElement(
                dialog.querySelector('#price-list'),
                this.render.template('dialog-filter-item-list', {
                    items: ['Any'].concat(Data.prices)
                })
            );
        } else {
            Utils.replaceElement(
                dialog.querySelector('#price-list'),
                'Due to PAUSD guidelines, we can only show free service-hour' +
                ' peer tutors on this website. To filter by price and view ' +
                'more professional tutors, go to the root partition at https:' +
                '//tutorbook.app/app.'
            );
        }

        Utils.replaceElement(
            dialog.querySelector('#gender-list'),
            this.render.template('dialog-filter-item-list', {
                items: ['Any'].concat(Data.genders)
            })
        );

        Utils.replaceElement(
            dialog.querySelector('#type-list'),
            this.render.template('dialog-filter-item-list', {
                items: ['Any'].concat(Data.types)
            })
        );

        Utils.replaceElement(
            dialog.querySelector('#math-list'),
            this.render.template('dialog-filter-item-list', {
                items: Data.mathSubjects
            })
        );

        Utils.replaceElement(
            dialog.querySelector('#tech-list'),
            this.render.template('dialog-filter-item-list', {
                items: Data.techSubjects
            })
        );

        Utils.replaceElement(
            dialog.querySelector('#art-list'),
            this.render.template('dialog-filter-item-list', {
                items: Data.artSubjects
            })
        );

        Utils.replaceElement(
            dialog.querySelector('#science-list'),
            this.render.template('dialog-filter-item-list', {
                items: Data.scienceSubjects
            })
        );

        Utils.replaceElement(
            dialog.querySelector('#history-list'),
            this.render.template('dialog-filter-item-list', {
                items: Data.historySubjects
            })
        );

        Utils.replaceElement(
            dialog.querySelector('#language-list'),
            this.render.template('dialog-filter-item-list', {
                items: Data.languageSubjects
            })
        );

        Utils.replaceElement(
            dialog.querySelector('#english-list'),
            this.render.template('dialog-filter-item-list', {
                items: Data.englishSubjects
            })
        );

        Utils.replaceElement(
            dialog.querySelector('#life-skills-list'),
            this.render.template('dialog-filter-item-list', {
                items: Data.lifeSkills
            })
        );

        dialog.querySelectorAll('#page-subject .mdc-list-item').forEach((el) => {
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

        dialog.querySelectorAll('.back').forEach((el) => {
            el.addEventListener('click', () => {
                this.page('page-all');
            });
        });
        dialog.querySelectorAll('.back-subjects').forEach((el) => {
            el.addEventListener('click', () => {
                this.page('page-subject');
            });
        });

        this.el = dialog;
        this.page('page-all');
    }

    static getFilterAvailabilityString(data) {
        const str = Utils.getAvailabilityString(data);
        return Utils.shortenString(str, 20);
    }

    page(id) {
        var that = this;
        const dialog = this.el;
        const pages = dialog.querySelectorAll('.page');

        function clearFilters(filters) {
            // Helper function to get rid of the 'Any' selected option for
            // better rendering.
            var result = {};
            for (var filter in filters) {
                if (filters[filter] !== 'Any' && Object.keys(filters[filter]).length !== 0) {
                    if (filter === 'availability') {
                        result[filter] = that.getFilterAvailabilityString(filters[filter]);
                    } else {
                        result[filter] = filters[filter];
                    }
                } else {
                    result[filter] = '';
                }
            }
            return result;
        };

        function renderAllList() {
            Utils.replaceElement(
                dialog.querySelector('#all-filters-list'),
                that.render.template('dialog-filter-list', clearFilters(that.filters))
            );

            dialog.querySelectorAll('#page-all .mdc-list-item').forEach(function(el) {
                el.addEventListener('click', function() {
                    var id = el.id.split('-').slice(1).join('-');
                    that.page(id);
                });
            });
        };

        pages.forEach(function(sel) {
            if (sel.id === id) {
                sel.style.display = 'inherit';
            } else {
                sel.style.display = 'none';
            }
        });

        if (id === 'page-all') {
            renderAllList();
        } else if (id === 'page-availability') {
            Utils.replaceElement(
                dialog.querySelector('#availability-list'),
                this.renderInputAvailability()
            );
            this.addInputAvailabilityManager(dialog);
        }
    }

    renderInputAvailability() {
        const data = Utils.cloneMap(this.filters.availability);
        const dayEl = this.render.select('Day', data.day || '', Data.days);
        const locationEl = this.render.select(
            'Location',
            data.location || Data.locations[1] || '',
            Data.locations
        );

        // NOTE: All of this changes once you add the data manager (as we want
        // to only show those times that are specified by the location supervisor)
        const times = window.app.data.periods.concat(Data.timeStrings);
        const fromTimeEl = this.render.select(
            'From',
            data.fromTime || '',
            [data.fromTime].concat(times)
        );
        const toTimeEl = this.render.select(
            'To',
            data.toTime || '',
            [data.toTime].concat(times)
        );

        const content = this.render.template('input-wrapper');
        content.appendChild(this.render.inputItem(locationEl));
        content.appendChild(this.render.inputItem(dayEl));
        content.appendChild(this.render.inputItem(fromTimeEl));
        content.appendChild(this.render.inputItem(toTimeEl));

        return content;
    }

    addInputAvailabilityManager() {
        const view = this.el.querySelector('.dialog-form__content');
        var that = this;
        var availableTime = Utils.cloneMap(this.filters.availability);

        // Show the default values and only rerender once the user chooses
        // a location. NOTE: We also have to rerender the timeSelects when
        // a day is chosen and we have to rerender the fromTimeSelect when
        // the toTimeSelect is chosen (as we don't want to be able to input
        // negative time) and vice versa.

        var daySelect = this.attachSelect(view.querySelector('#Day'));
        daySelect.listen('MDCSelect:change', function() {
            availableTime.day = daySelect.value;
            that.refreshTimeSelects(availableTime);
        });

        var toTimeSelect = this.attachSelect(view.querySelector('#To'));
        toTimeSelect.listen('MDCSelect:change', function() {
            availableTime.toTime = toTimeSelect.value;
        });

        var fromTimeSelect = this.attachSelect(
            view.querySelector('#From')
        );
        fromTimeSelect.listen('MDCSelect:change', function() {
            availableTime.fromTime = fromTimeSelect.value;
        });

        const locationSelect = this.attachSelect(
            view.querySelector('#Location')
        );
        locationSelect.listen('MDCSelect:change', function() {
            availableTime.location = locationSelect.value;
            // Now, contrain the other select menus to values that this location
            // has for available times.
            that.refreshDayAndTimeSelects(availableTime);
        });

        // Check to see if a location was selected. If there is a location
        // selected, make sure to only render those options that it's supervisor has
        // specified in their location management view.
        if (!!availableTime.location && availableTime.location !== '') {
            // Re-render all of the selects to match the selected location
            this.refreshDayAndTimeSelects(availableTime);

            if (!!availableTime.day && availableTime.day !== '') {
                // Re-render all fo the time selects to match the selected day
                this.refreshTimeSelects(availableTime);
            }
        }

        function invalid(select) {
            // TODO: Make the select styling actually work within this dialog
            window.app.snackbar.view('Please select a valid availability.');
            select.required = true;
            select.valid = false;
        };

        function validTime(time) {
            var valid = true;
            if (time.location === '') {
                invalid(locationSelect);
                valid = false;
            }
            if (time.day === '') {
                invalid(daySelect);
                valid = false;
            }
            if (time.toTime === '') {
                invalid(toTimeSelect);
                valid = false;
            }
            if (time.fromTime === '') {
                invalid(fromTimeSelect);
                valid = false;
            }
            return valid;
        };

        this.el.querySelector('#ok-button').addEventListener('click', () => {
            if (validTime(availableTime)) {
                // Update the textField value to match the new value
                that.filters.availability = availableTime;
                that.page('page-all');
            }
        });
    }

    async initLocationData() {
        this.locationData = {};
        const snapshot = await window.app.db.collection('locations').get();
        snapshot.forEach((ref) => {
            const location = ref.data();
            this.locationData[location.name] = location;
        });
    }

    refreshTimeSelects() {
        var location = this.locationData[availableTime.location];
        // Set the available days based on the location's
        // availability.

        var times = Utils.getLocationTimesByDay(
            availableTime.day,
            location.hours
        );

        if (times.length === 1) {
            availableTime.fromTime = times[0];
            availableTime.toTime = times[0];
        }

        // If there are only no options, make sure to tell the user so they don't
        // think that it's a bug (that the only select options are the ones that
        // were already selected).
        if (times.length < 1) {
            window.app.snackbar.view(location.name + ' does not have any open ' +
                'hours.');
            return;
        }

        var toTimeEl = that
            .render.select('To', availableTime.toTime || '', times)
        var oldToTimeEl = document.querySelector('.mdc-dialog--open #To');
        oldToTimeEl.parentNode.insertBefore(toTimeEl, oldToTimeEl);
        oldToTimeEl.parentNode.removeChild(oldToTimeEl);
        var toTimeSelect = Utils.attachSelect(toTimeEl);
        toTimeSelect.listen('MDCSelect:change', function() {
            availableTime.toTime = toTimeSelect.value;
        });

        var fromTimeEl = that
            .render.select('From', availableTime.fromTime || '', times);
        var oldFromTimeEl = document.querySelector('.mdc-dialog--open #From');
        oldFromTimeEl.parentNode.insertBefore(fromTimeEl, oldFromTimeEl);
        oldFromTimeEl.parentNode.removeChild(oldFromTimeEl);
        var fromTimeSelect = Utils.attachSelect(fromTimeEl);
        fromTimeSelect.listen('MDCSelect:change', function() {
            availableTime.fromTime = fromTimeSelect.value;
        });
    }

    refreshDayAndTimeSelects() {
        var location = this.locationData[availableTime.location];
        // Set the available days based on the location's
        // availability.

        var times = Utils.getLocationTimes(location.hours);
        var days = Utils.getLocationDays(location.hours);

        if (times.length === 1) {
            availableTime.fromTime = times[0];
            availableTime.toTime = times[0];
        }
        if (days.length === 1) {
            availableTime.day = days[0];
        }

        // If there are only no options, make sure to tell the user so they don't
        // think that it's a bug (that the only select options are the ones that
        // were already selected).
        if (days.length < 1 && times.length < 1) {
            that.viewSnackbar(location.name + ' does not have any open ' +
                'hours.');
            return;
        }

        var toTimeEl = that
            .render.select('To', availableTime.toTime || '', times)
        var oldToTimeEl = document.querySelector('.mdc-dialog--open #To')
        oldToTimeEl.parentNode.insertBefore(toTimeEl, oldToTimeEl);
        oldToTimeEl.parentNode.removeChild(oldToTimeEl);
        var toTimeSelect = Utils.attachSelect(toTimeEl);
        toTimeSelect.listen('MDCSelect:change', function() {
            availableTime.toTime = toTimeSelect.value;
        });

        var fromTimeEl = that
            .render.select('From', availableTime.fromTime || '', times);
        var oldFromTimeEl = document.querySelector('.mdc-dialog--open #From');
        oldFromTimeEl.parentNode.insertBefore(fromTimeEl, oldFromTimeEl);
        oldFromTimeEl.parentNode.removeChild(oldFromTimeEl);
        var fromTimeSelect = Utils.attachSelect(fromTimeEl);
        fromTimeSelect.listen('MDCSelect:change', function() {
            availableTime.fromTime = fromTimeSelect.value;
        });

        var dayEl = that
            .render.select('Day', availableTime.day || '', days);
        var oldDayEl = document.querySelector('.mdc-dialog--open #Day');
        oldDayEl.parentNode.insertBefore(dayEl, oldDayEl);
        oldDayEl.parentNode.removeChild(oldDayEl);
        var daySelect = Utils.attachSelect(dayEl);
        daySelect.listen('MDCSelect:change', function() {
            availableTime.day = daySelect.value;
            that.refreshTimeSelects(availableTime);
        });
    }

    manage() {
        // stub
    }
};

module.exports = FilterDialog;