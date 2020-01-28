import {
    MDCTextField
} from '@material/textfield/index';
import {
    MDCRipple
} from '@material/ripple/index';
import {
    MDCDialog
} from '@material/dialog/index';
import {
    MDCTopAppBar
} from '@material/top-app-bar/index';
import {
    MDCFormField
} from '@material/form-field/index';
import {
    MDCCheckbox
} from '@material/checkbox/index';

import $ from 'jquery';
import to from 'await-to-js';

const Data = require('@tutorbook/data');
const Utils = require('@tutorbook/utils');


class ApptNotificationDialog {

    constructor() {
        this.render = window.app.render;
        this.renderSelf();
    }

    view() {
        $('body').prepend(this.main);
        if (!this.managed) this.manage();
        this.dialog.open();
    }

    renderSelf() {
        this.main = this.render.template('dialog-appt');
        const add = (el) => {
            $(this.main).find('.mdc-dialog__content').append(el);
        };
        const addD = (label) => {
            add('<h4 class="mdc-list-group__subheader">' + label + '</h4>');
        };
        const addC = (label, id) => {
            add(this.render.checkBox(label, id));
        };
        addD('Send reminder messages to');
        addC('Tutors (those who received the original request)', 'tutors');
        addC('Pupils (those who sent the original request)', 'pupils');
        addD('Who have appointments on');
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(
            (day) => {
                addC(day, day.toLowerCase());
            });
    }

    manage() {
        this.dialog = new MDCDialog(this.main);
        const checkboxes = {};
        $(this.main).find('.mdc-checkbox').each(function() {
            // TODO: Fix MDCRipple effects
            checkboxes[$(this).parent().attr('id')] = new MDCCheckbox(this);
            MDCFormField.attachTo($(this).parent()[0]).input =
                checkboxes[$(this).attr('id')];
        });
        $(this.main).find('button').each(function() {
            MDCRipple.attachTo(this);
        });
        this.dialog.listen('MDCDialog:closing', async (event) => {
            if (event.detail.action !== 'send') return;
            const tutor = checkboxes['tutors'].checked;
            const pupil = checkboxes['pupils'].checked;
            if (!tutor && !pupil) return console.warn('Did not send any ' +
                'notifications.');
            window.app.snackbar.view('Sending reminder messages...');
            try {
                await Promise.all(Object.entries(checkboxes).map((entry) => {
                    if (['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
                        .indexOf(entry[0]) >= 0 && entry[1].checked
                    ) return Data.notifyAppt(entry[0], tutor, pupil);
                }));
                window.app.snackbar.view('Sent reminder messages.');
            } catch (e) {
                console.error('Error while sending notification messages:', e);
                window.app.snackbar.view('Could not send reminder messages.');
            }
        });
        this.managed = true;
    }
};


class SubjectSelectDialog {

    constructor() {
        this.render = window.app.render;
        this.selected = '';
        this.renderSelf();
    }

    view() {
        $('body').prepend(this.main);
        this.manage();
        this.dialog.open();
    }

    manage() {
        this.dialog = MDCDialog.attachTo(this.main);

        this.main.querySelectorAll('#page-all .mdc-list-item').forEach((el) => {
            $(el).click(() => {
                var id = el.id.split('-').slice(1).join('-');
                this.section(id);
            });
        });

        this.pages.forEach((sel) => {
            var key = sel.id.split('-')[1];
            if (key === 'all') {
                return;
            }

            sel.querySelectorAll('.mdc-list-item').forEach((el) => {
                el.addEventListener('click', () => {
                    this.updateSelected(el.innerText.trim());
                    this.dialog.close();
                    $(this.main).remove();
                });
            });
        });

        this.section('page-all');
    }

    updateSelected(val) {
        this.selected = val;
    }

    section(id) {
        this.pages.forEach((sel) => {
            if (sel.id === id) {
                sel.style.display = 'inherit';
            } else {
                sel.style.display = 'none';
            }
            this.dialog.layout();
        });
    }

    renderSelf() {
        this.main = this.render.template('dialog-subjects', {
            back: () => this.section('page-all'),
        });
        this.pages = this.main.querySelectorAll('.page');
        const that = this;

        function l(q, d) { // Replaces listEl (q) with (d) list
            Utils.replaceElement(
                that.main.querySelector(q),
                that.render.template('dialog-filter-item-list', {
                    items: d
                })
            );
        };

        l('#math-list', Data.mathSubjects);
        l('#science-list', Data.scienceSubjects);
        l('#history-list', Data.historySubjects);
        l('#language-list', Data.languageSubjects);
        l('#english-list', Data.englishSubjects);
        l('#tech-list', Data.techSubjects);
        l('#art-list', Data.artSubjects);
        l('#life-skills-list', Data.lifeSkills);
    }
};


class EditSubjectDialog extends SubjectSelectDialog {

    constructor(textFieldEl, profile) {
        super();
        this.selected = $(textFieldEl).find('input').val();
        this.input = textFieldEl;
        this.profile = profile;
    }

    updateSelected(val) {
        super.updateSelected();
        $(this.input).find('input').val(val).focus(); // Update the text field
        EditSubjectDialog.updateSubjects(this.profile);
    }

    static async updateSubjects(profile) {
        const user = profile || window.app.user;
        user.subjects = [];
        $('#Subject input').each(function(i) {
            if (Data.subjects.indexOf($(this).val()) >= 0) {
                user.subjects.push($(this).val());
            }
        });
        Utils.updateSetupProfileCard(user);
        if (profile) return;
        await window.app.updateUser();
        window.app.snackbar.view('Subjects updated.');
    }
};


class EditAvailabilityDialog {

    constructor(textFieldEl, profile) {
        this.string = $(textFieldEl).find('input').val();
        // parseAvailabilityString throws an Error if the string is empty unless
        // we specify openingDialog=true (last arg given down below).
        this.val = Utils.parseAvailabilityString(this.string, true);
        this.input = textFieldEl;
        this.utils = window.app.utils;
        this.render = window.app.render;
        this.data = window.app.data; // TODO: Update location data?
        this.profile = profile;
        if (!this.val.location && this.data.locationNames.length === 1)
            this.val.location = this.data.locationNames[0];
        this.renderSelf();
    }

    view() {
        $('body').prepend(this.main);
        this.dialog = MDCDialog.attachTo(this.main);
        this.dialog.open();
        this.manage();
    }

    manage() {
        const that = this;

        function s(q) { // Attach select based on query
            return Utils.attachSelect($(that.main).find(q)[0]);
        };

        function listen(s, action) { // Add change listener
            s.listen('MDCSelect:change', () => {
                action(s);
            });
        };

        function a(q, action) { // Attaches select and adds listener
            listen(s(q), action);
        };

        a('#Location', (s) => {
            if (s.value === 'Custom') {
                $(this.main).find('#Location').replaceWith(
                    this.render.locationInput((val) => {
                        this.val.location = val.formatted_address;
                    })
                );
            } else {
                this.val.location = s.value;
                this.refreshDaysAndTimes();
            }
        });
        a('#Day', (s) => {
            this.val.day = s.value;
            this.refreshTimes();
        });
        a('#Time', (s) => {
            if (s.value.split(' to ').length > 1) {
                this.val.fromTime = s.value.split(' to ')[0];
                this.val.toTime = s.value.split(' to ')[1];
            } else {
                this.val.fromTime = s.value;
                this.val.toTime = s.value;
            }
            this.val.time = s.value;
        });

        this.dialog.listen('MDCDialog:closing', (event) => {
            if (event.detail.action === 'ok') {
                $(this.input).find('input')
                    .val(Utils.getAvailabilityString(this.val)).focus();
                EditAvailabilityDialog.updateAvailability(this.profile);
                $(this.main).remove();
            }
        });

        if (this.val.location) this.refreshDaysAndTimes();
    }

    static async updateAvailability(profile) {
        // NOTE: Availability is stored in the Firestore database as:
        // availability: {
        //   Gunn Library: {
        //     Friday: [
        //       { open: '10:00 AM', close: '3:00 PM' },
        //       { open: '10:00 AM', close: '3:00 PM' },
        //     ],
        //   }
        //   ...
        // };
        // First, create an array of all the displayed availability strings
        var strings = [];
        $('[id="Available"]').each(function(i) {
            if ($(this).find('input').val() !== '') {
                strings.push($(this).find('input').val());
            }
        });

        const user = profile || window.app.user;
        user.availability = Utils.parseAvailabilityStrings(strings);
        Utils.updateSetupProfileCard(user);
        if (profile) return;
        await window.app.updateUser();
        window.app.snackbar.view('Availability updated.');
    }

    refreshTimes() { // Update time selects based on newly selected day
        const location = this.data.locationDataByName[this.val.location];
        if (!location) return console.warn('Cannot refresh days and times ' +
            'w/out location data.');
        const times = this.utils.getLocationTimeWindowsByDay(
            this.val.day,
            location.hours,
        );
        const timeStrings = times.map(t => t.open !== t.close ? t.open +
            ' to ' + t.close : t.open);
        const that = this;

        if (times.length === 1) { // Only one available option (pre-select it)
            this.val.fromTime = times[0].open;
            this.val.toTime = times[0].close;
            this.val.time = timeStrings[0];
        } else if (times.length < 1) { // No available options
            return window.app.snackbar.view(location.name + ' does not have ' +
                'any open hours.');
        }

        function s(q) { // Attach select based on query
            return Utils.attachSelect($(that.main).find(q)[0]);
        };

        function listen(s, action) { // Add change listener
            s.listen('MDCSelect:change', () => {
                action(s);
            });
        };

        function a(q, action) { // Attaches select and adds listener
            listen(s(q), action);
        };

        function r(q, el, action) { // Replaces select and adds listener
            $(that.main).find(q).replaceWith(el);
            a(q, action);
        };

        r(
            '#Time',
            that.render.select('Time', that.val.time, timeStrings),
            (s) => {
                if (s.value.split(' to ').length > 1) {
                    that.val.fromTime = s.value.split(' to ')[0];
                    that.val.toTime = s.value.split(' to ')[1];
                } else {
                    that.val.fromTime = s.value;
                    that.val.toTime = s.value;
                }
                that.val.time = s.value;
            }
        );
    }

    refreshDaysAndTimes() { // Update day and time selects based on location
        const location = this.data.locationDataByName[this.val.location];
        if (!location) return console.warn('Cannot refresh days and times ' +
            'w/out location.');
        var times = this.val.day ? this.utils.getLocationTimeWindowsByDay(
            this.val.day,
            location.hours,
        ) : this.utils.getLocationTimeWindows(location.hours);
        var timeStrings = times.map(t => t.open !== t.close ? t.open + ' to ' +
            t.close : t.open);
        const days = Utils.getLocationDays(location.hours);
        const that = this;

        if (days.length === 1) { // Only one available option (pre-select it)
            this.val.day = days[0];
            times = this.utils.getLocationTimeWindowsByDay(
                this.val.day,
                location.hours,
            );
            timeStrings = times.map(t => t.open + ' to ' + t.close);
        }
        if (times.length === 1) { // Only one available option (pre-select it)
            this.val.fromTime = times[0].open;
            this.val.toTime = times[0].close;
            this.val.time = timeStrings[0];
        }
        if (times.length < 1 || days.length < 1) { // No available options
            return window.app.snackbar.view(location.name + ' does not have ' +
                'any open hours.');
        }

        function s(q) { // Attach select based on query
            return Utils.attachSelect($(that.main).find(q)[0]);
        };

        function listen(s, action) { // Add change listener
            s.listen('MDCSelect:change', () => {
                action(s);
            });
        };

        function a(q, action) { // Attaches select and adds listener
            listen(s(q), action);
        };

        function r(q, el, action) { // Replaces select and adds listener
            $(that.main).find(q).replaceWith(el);
            a(q, action);
        };

        r(
            '#Day',
            that.render.select('Day', that.val.day, days),
            (s) => {
                that.val.day = s.value;
                that.refreshTimes();
            }
        );
        r(
            '#Time',
            that.render.select('Time', that.val.time, timeStrings),
            (s) => {
                if (s.value.split(' to ').length > 1) {
                    that.val.fromTime = s.value.split(' to ')[0];
                    that.val.toTime = s.value.split(' to ')[1];
                } else {
                    that.val.fromTime = s.value;
                    that.val.toTime = s.value;
                }
                that.val.time = s.value;
            }
        );
    }

    renderSelf() {
        this.main = this.render.template('dialog-form', {
            title: 'Edit Availability'
        });
        const content = this.render.template('input-wrapper');
        const v = this.val;
        const d = this.data;
        const that = this;

        function addS(l, v, d) {
            content.appendChild(that.render.selectItem(l, v, d));
        };

        addS('Location', v.location, Utils.concatArr([v.location],
            (window.location.name === 'Any' ? d.locationNames
                .concat(['Custom']) : d.locationNames)));
        addS('Day', v.day, Data.days);
        addS('Time', v.time, d.timeStrings);

        $(this.main).find('.mdc-dialog__content').append(content);
    }
};


class NotificationDialog {

    // Renders the dialog with the given message and title
    constructor(title, message, action) {
        this.title = title;
        this.message = message;
        this.action = action || window.app.nav.back;
        this.render = window.app.render;
        this.renderSelf();
    }

    renderSelf() {
        this.el = this.render.template('dialog-notification', {
            title: this.title,
            message: this.message,
        });
    }

    view() {
        $('body').prepend(this.el);
        this.dialog = MDCDialog.attachTo(this.el);
        this.dialog.autoStackButtons = false;
        this.dialog.listen('MDCDialog:closed', (event) => {
            $(this.el).remove();
            this.action();
        });
        this.dialog.open();
    }
};


class ConfirmationDialog {

    // Renders the dialog with the given message and title
    constructor(title, message, action, forceAction, noAction) {
        this.forceAction = forceAction;
        this.title = title;
        this.message = message;
        this.action = action || window.app.nav.back;
        this.noAction = noAction || window.app.nav.back;
        this.render = window.app.render;
        this.renderSelf();
    }

    renderSelf() {
        this.el = this.render.template('dialog-confirmation', {
            title: this.title,
            summary: this.message,
        });
    }

    view() {
        $('body').prepend(this.el);
        this.dialog = MDCDialog.attachTo(this.el);
        this.dialog.autoStackButtons = false;
        if (this.forceAction) {
            this.dialog.scrimClickAction = '';
            this.dialog.escapeKeyAction = '';
        }
        this.dialog.listen('MDCDialog:closed', (event) => {
            $(this.el).remove();
            event.detail.action === 'yes' ? this.action() : this.noAction();
        });
        this.dialog.open();
    }
};


class ViewRequestDialog {

    // Renders the dialog for the given request
    constructor(request, id) {
        this.request = request;
        this.id = id;
        this.render = window.app.render;
        this.renderSelf();
    }

    async renderSelf() {
        const that = this;
        const request = this.request;
        const el = this.render.template('dialog-input');
        const otherUser = await Data.getUser(
            Utils.getOtherUser(request.fromUser, request.toUser).uid
        );

        function add(e) {
            el.appendChild(e);
        };

        function addT(l, d) {
            add(that.render.textFieldItem(l, d));
        };

        function addD(label) {
            add(that.render.listDivider(label));
        };

        if (window.app.user.type === 'Supervisor') {
            // NOTE: By default we show the fromUser's availability for 
            // supervisors, and thus this "user" object is the toUser's data.
            const toUser = await Data.getUser(request.toUser.uid);
            addD('To ' + toUser.type.toLowerCase());
            add(this.render.userHeader(toUser));
            addD('From ' + otherUser.type.toLowerCase());
        }
        add(this.render.userHeader(otherUser));
        addD('At');
        addT('Location', request.location.name);
        addT('Day', request.time.day);
        addT('From', request.time.from);
        addT('To', request.time.to);
        addD('For');
        addT('Subject', request.subject);
        add(this.render.textAreaItem('Message', request.message));

        if (request.payment.type === 'Paid') {
            addD('Payment');
            addT('Amount', '$' + request.payment.amount.toFixed(2));
            addT('Payment method', request.payment.method);
        }

        const header = this.render.header('header-action', {
            title: 'View Request',
            edit: () => new EditRequestDialog(this.request, this.id).view(),
            showEdit: true,
            showApprove: window.app.user.email === this.request.toUser.email,
            approve: async () => {
                window.app.nav.back();
                window.app.snackbar.view('Approving request...');
                const [err, res] = await to(Data.approveRequest(this.request,
                    this.id));
                if (err) return window.app.snackbar.view('Could not approve ' +
                    'request.');
                window.app.snackbar.view('Approved request.');
            },
        });

        this.header = header;
        this.main = el;
    }

    // Views the dialog and adds manager(s)
    async view() {
        if (!this.main) await this.renderSelf();
        window.app.intercom.view(false);
        window.app.view(this.header, this.main);
        this.manage();

    }

    manage() {
        MDCTopAppBar.attachTo(this.header);
        const dialog = this.main;
        // NOTE: We have to attach MDC Components after the view is shown or they
        // do not render correctly.
        this.textFields = {};
        dialog.querySelectorAll('.mdc-text-field').forEach((el) => {
            this.textFields[el.id] = new MDCTextField(el);
        });

        // Disable all inputs
        ['textarea', 'input'].forEach((input) => {
            dialog.querySelectorAll(input)
                .forEach((el) => {
                    el.setAttribute('disabled', true);
                });
        });
    }
};

class ViewModifiedRequestDialog extends ViewRequestDialog {
    constructor(request) {
        super(request.for);
        this.modifiedRequest = request;
    }

    async renderSelf() {
        await super.renderSelf();
        $(this.header).find('.mdc-top-app-bar__title').text('Modified Request');
    }
};

class ViewCanceledRequestDialog extends ViewRequestDialog {
    constructor(request) {
        super(request.for);
        this.canceledRequest = request;
    }

    async renderSelf() {
        await super.renderSelf();
        this.header = this.render.header('header-action', {
            title: 'Canceled Request',
        });
    }
};

class ViewRejectedRequestDialog extends ViewRequestDialog {
    constructor(request) {
        super(request.for);
        this.rejectedRequest = request;
    }

    async renderSelf() {
        await super.renderSelf();
        this.header = this.render.header('header-action', {
            title: 'Rejected Request',
        });
    }
};

class EditRequestDialog {

    // Renders the dialog for the given request
    constructor(request, id) {
        this.request = request;
        this.id = id;
        this.render = window.app.render;
        this.utils = window.app.utils;
        this.req = []; // Required fields
        this.rendering = this.renderSelf();
    }

    async renderSelf(profile) {
        const request = this.request;
        const utils = this.utils;
        const that = this;
        const el = this.render.template('dialog-input');
        const user = profile || await Data.getUser(
            Utils.getOtherUser(request.fromUser, request.toUser).uid
        );
        // First, parse the user's availability map into location, day, and 
        // time arrays
        const locations = Utils.getUserAvailableLocations(user.availability);
        const days = (request.location && request.location.name) ?
            Utils.getUserAvailableDaysForLocation(
                user.availability,
                request.location.name
            ) : Utils.getUserAvailableDays(user.availability);
        const timeslots = (request.time.day && request.location.name) ?
            utils.getUserAvailableTimeslotsForDay(
                user.availability,
                request.time.day,
                request.location.name,
            ) : utils.getUserAvailableTimeslots(user.availability);
        const timeslot = request.time.from === request.time.to ? request.time
            .from || '' : request.time.from + ' to ' + request.time.to;

        // If there are only no options, make sure to tell the user so they don't
        // think that it's a bug (that the only select options are the ones that
        // were already selected).
        if (locations.length < 1 && days.length < 1 && timeslots.length < 1) {
            window.app.snackbar
                .view(user.name + ' does not have any other availability.');
        }

        function add(e) {
            el.appendChild(e);
        };

        function addS(l, v, d) {
            add(that.render.selectItem(l, v, Utils.concatArr([v], d)));
        };

        function addD(l) {
            add(that.render.listDivider(l));
        };

        function addH(profile) {
            add(that.render.userHeader(profile));
        };

        if (window.app.user.type === 'Supervisor') {
            // NOTE: By default we show the fromUser's availability for 
            // supervisors, and thus this "user" object is the fromUser's data.
            const toUser = await Data.getUser(request.toUser.uid);
            addD('To ' + toUser.type.toLowerCase());
            addH(toUser);
            addD('From ' + user.type.toLowerCase());
        }
        addH(user);
        addD('At');
        addS('Location', request.location.name, locations.concat(['Custom']));
        addS('Day', request.time.day, days);
        addS('Time', timeslot, timeslots);
        addD('For');
        addS('Subject', request.subject, user.subjects);
        add(this.render.textAreaItem('Message', request.message));

        const header = this.render.header('header-action', {
            title: 'Edit Request',
            ok: () => {},
        });

        this.header = header;
        this.main = el;
        this.user = user;
    }

    get valid() {
        var valid = true;
        this.req.forEach((req) => {
            if (!req.valid()) return valid = req.input.valid = false;
            req.input.valid = true;
        });
        return valid;
    }

    // Views the dialog and adds manager(s)
    async view() {
        if (!this.main) await this.rendering;
        window.requestDialog = this;
        window.app.intercom.view(false);
        window.app.view(this.header, this.main);
        if (!this.managed) this.manage();
    }

    async modifyRequest() {
        window.app.nav.back();
        const [err, res] = await to(Data.modifyRequest(this.request, this.id));
        if (err) return window.app.snackbar.view('Could not modify request.');
        window.app.snackbar.view('Modified request.');
    }

    sendRequest() {} // Added in NewRequestDialog

    updateAmount() {} // Added in PaidRequestDialog

    manage() {
        this.managed = true;
        const availability = this.user.availability;
        const request = this.request;
        const dialog = this.main;
        const that = this;

        // AT
        const locationEl = dialog.querySelector('#Location');
        const locationSelect = Utils.attachSelect(locationEl);
        locationSelect.listen('MDCSelect:change', function() {
            if (locationSelect.value === 'Custom') {
                $(dialog).find('#Location').replaceWith(
                    that.render.locationInput((val) => {
                        request.location.name = val.formatted_address;
                        request.location.id = val.place_id;
                    }));
            } else {
                request.location.name = locationSelect.value;
                request.location.id = window.app.data // Only init data once
                    .locationsByName[locationSelect.value];
                that.refreshDayAndTimeSelects(request, availability);
            }
        });

        const dayEl = dialog.querySelector('#Day');
        const daySelect = Utils.attachSelect(dayEl);
        daySelect.listen('MDCSelect:change', () => {
            request.time.day = daySelect.value;
            that.refreshTimeSelects(request, availability);
        });

        const timeslotEl = dialog.querySelector('#Time');
        const timeslotSelect = Utils.attachSelect(timeslotEl);
        timeslotSelect.listen('MDCSelect:change', () => {
            if (timeslotSelect.value.indexOf(' to ') > 0) {
                request.time.from = timeslotSelect.value.split(' to ')[0];
                request.time.to = timeslotSelect.value.split(' to ')[1];
            } else {
                request.time.from = timeslotSelect.value;
                request.time.to = timeslotSelect.value;
            }
            if (that.valid) that.updateAmount();
        });

        // FOR
        const subjectEl = dialog.querySelector('#Subject');
        const subjectSelect = Utils.attachSelect(subjectEl);
        subjectSelect.listen('MDCSelect:change', function() {
            request.subject = subjectSelect.value;
        });

        const messageEl = dialog.querySelector('#Message');
        const messageTextField = MDCTextField.attachTo(messageEl);

        [locationSelect, daySelect, timeslotSelect, subjectSelect].forEach(
            (input) => this.req.push({
                input: input,
                id: input.root_.id,
                valid: () => input.value !== '',
            }));

        // Only update or send request when the check button is clicked
        MDCTopAppBar.attachTo(this.header);
        $(this.header).find('#ok')[0].addEventListener('click', () => {
            request.message = messageTextField.value;
            if (that.valid) that.modifyRequest();
        });
        $(this.header).find('#send')[0].addEventListener('click', () => {
            request.message = messageTextField.value;
            if (that.valid) that.sendRequest();
        });
    }

    refreshDayAndTimeSelects(request, a) {
        if (!a[request.location.name]) return; // Custom location
        const that = this;
        const days = Utils.getUserAvailableDaysForLocation(a, request.location
            .name);
        if (days.length === 1) request.time.day = days[0];
        const timeslots = (request.time.day && request.location.name) ?
            this.utils.getUserAvailableTimeslotsForDay(
                a,
                request.time.day,
                request.location.name,
            ) : this.utils.getUserAvailableTimeslots(a);
        if (timeslots.length === 1 && timeslots[0].indexOf(' to ') > 0) {
            request.time.from = timeslots[0].split(' to ')[0];
            request.time.to = timeslots[0].split(' to ')[1];
        } else if (timeslots.length === 1) {
            request.time.from = timeslots[0];
            request.time.to = timeslots[0];
        }

        // If there are only no options, make sure to tell the user so they don't
        // think this it's a bug (this the only select options are the ones this
        // were already selected).
        if (days.length < 1 && timeslots.length < 1) return window.app.snackbar
            .view(request.toUser.name + ' does not have any availability at ' +
                'the ' + request.location.name + '.');

        const timeslot = request.time.from === request.time.to ? request.time
            .from || '' : request.time.from + ' to ' + request.time.to;
        const timeslotEl = this.render.select('Time', timeslot, timeslots)
        const oldTimeslotEl = document.querySelector('main .dialog-input')
            .querySelector('#Time');
        oldTimeslotEl.parentNode.insertBefore(timeslotEl, oldTimeslotEl);
        oldTimeslotEl.parentNode.removeChild(oldTimeslotEl);
        const timeslotSelect = Utils.attachSelect(timeslotEl);
        timeslotSelect.listen('MDCSelect:change', function() {
            if (timeslotSelect.value.indexOf(' to ') > 0) {
                request.time.from = timeslotSelect.value.split(' to ')[0];
                request.time.to = timeslotSelect.value.split(' to ')[1];
            } else {
                request.time.from = timeslotSelect.value;
                request.time.to = timeslotSelect.value;
            }
            if (that.valid) that.updateAmount();
        });

        const dayEl = this.render.select('Day', request.time.day || '', days);
        const oldDayEl = document.querySelector('main .dialog-input')
            .querySelector('#Day');
        oldDayEl.parentNode.insertBefore(dayEl, oldDayEl);
        oldDayEl.parentNode.removeChild(oldDayEl);
        const daySelect = Utils.attachSelect(dayEl);
        daySelect.listen('MDCSelect:change', function() {
            request.time.day = daySelect.value;
            that.refreshTimeSelects(request, a);
        });

        this.req = this.req.filter(r => ['Day', 'Time'].indexOf(r.id) < 0);
        [daySelect, timeslotSelect].forEach((input) => {
            this.req.push({
                input: input,
                id: input.root_.id,
                valid: () => input.value !== '',
            });
        });
        if (this.valid) this.updateAmount(); // Update valid input styling 
    }

    refreshTimeSelects(request, a) {
        if (!a[request.location.name]) return; // Custom location
        const that = this;
        const timeslots = this.utils.getUserAvailableTimeslotsForDay(
            a,
            request.time.day,
            request.location.name
        );

        if (timeslots.length === 1 && timeslots[0].indexOf(' to ') > 0) {
            request.time.from = timeslots[0].split(' to ')[0];
            request.time.to = timeslots[0].split(' to ')[1];
        } else if (timeslots.length === 1) {
            request.time.from = timeslots[0];
            request.time.to = timeslots[0];
        }

        // If there are only no options, make sure to tell the user so they don't
        // think this it's a bug (this the only select options are the ones this
        // were already selected).
        if (timeslots.length < 1) return window.app.snackbar.view(request.toUser
            .name + ' does not have any availability on ' + request.day + 's.');

        const timeslot = request.time.from === request.time.to ? request.time
            .from || '' : request.time.from + ' to ' + request.time.to;
        const timeslotEl = this.render.select('Time', timeslot, timeslots)
        const oldTimeslotEl = document.querySelector('main .dialog-input')
            .querySelector('#Time');
        oldTimeslotEl.parentNode.insertBefore(timeslotEl, oldTimeslotEl);
        oldTimeslotEl.parentNode.removeChild(oldTimeslotEl);
        const timeslotSelect = Utils.attachSelect(timeslotEl);
        timeslotSelect.listen('MDCSelect:change', function() {
            if (timeslotSelect.value.indexOf(' to ') > 0) {
                request.time.from = timeslotSelect.value.split(' to ')[0];
                request.time.to = timeslotSelect.value.split(' to ')[1];
            } else {
                request.time.from = timeslotSelect.value;
                request.time.to = timeslotSelect.value;
            }
            if (that.valid) that.updateAmount();
        });
        this.req = this.req.filter(r => r.id !== 'Time');
        this.req.push({
            input: timeslotSelect,
            id: 'Time',
            valid: () => timeslotSelect.value !== '',
        });
        if (this.valid) this.updateAmount(); // Update valid input styling 
    }
};


class NewRequestDialog extends EditRequestDialog {

    // Creates editRequestDialog based on the given subject and toUser
    constructor(subject, user) {
        const utils = new Utils();
        const request = {
            'subject': subject,
            'fromUser': window.app.conciseUser,
            'toUser': Utils.filterRequestUserData(user),
            'timestamp': new Date(),
            'location': {
                name: '',
                id: '',
            },
            'message': '',
            'time': {
                day: '',
                from: '',
                to: '',
            },
            'payment': {
                type: user.payments.type || 'Free',
                method: 'PayPal',
                amount: 0,
            },
        };
        // Check to see if we can pre-select for the user
        const locations = Utils.getUserAvailableLocations(user.availability);
        const days = Utils.getUserAvailableDays(user.availability);
        const timeslots = utils.getUserAvailableTimeslots(user.availability);
        if (locations.length === 1) {
            request.location.name = locations[0];
            request.location.id =
                window.app.data.locationsByName[request.location.name];
        }
        if (timeslots.length === 1 && timeslots[0].indexOf(' to ') > 0) {
            request.time.from = timeslots[0].split(' to ')[0];
            request.time.to = timeslots[0].split(' to ')[1];
        } else if (timeslots.length === 1) {
            request.time.from = timeslots[0];
            request.time.to = timeslots[0];
        }
        if (days.length === 1) {
            request.time.day = days[0];
        }

        // No options for the user to select
        if (locations.length < 1 && days.length < 1 && timeslots.length < 1)
            return window.app.snackbar.view(user.name + ' does not have any ' +
                'availability.');

        super(request, Utils.genID());
        this.user = user; // Cannot reference `this` until after super();
    }

    async renderSelf() {
        await super.renderSelf(this.user);
        this.header = this.render.header('header-action', { // Override header
            title: 'New Request',
            send: () => {},
        });
    }

    async sendRequest() { // Override modify to create a new request
        window.app.nav.back();
        window.app.snackbar.view('Sending request...');
        const [err, res] = await to(Data.newRequest(this.request, this.payment));
        if (err) return window.app.snackbar.view('Could not send request.');
        window.app.snackbar.view(
            'Request sent to ' + this.request.toUser.email + '.',
            'Undo',
            async () => {
                window.app.snackbar.view('Canceling request...');
                const [err, response] = await to(
                    Data.cancelRequest(this.request, res.id));
                if (err) return window.app.snackbar.view('Could not cancel ' +
                    'request. Go to your dashboard to try again.');
                window.app.snackbar.view('Canceled request to ' +
                    this.request.toUser.email + '.');
            },
        );
    }
};


class PaidRequestDialog extends NewRequestDialog {

    constructor(subject, user) {
        super(subject, user);
        if (user.payments.type !== 'Paid') {
            console.warn('PaidRequestDialog was passed a user that isn\'t ' +
                'supposed to be paid.');
        }
        this.request.payment.type = 'Paid';
        this.payment = {
            to: this.request.toUser,
            from: this.request.fromUser,
            amount: this.getAmount(),
            timestamp: new Date(),
            for: this.request,
            id: this.id || '',
            method: 'PayPal',
        };
    }

    sendRequest() {
        if (!this.payment.transaction) return window.app.snackbar.view(
            'Please add a valid payment method.');
        return super.sendRequest();
    }

    async renderSelf() {
        await super.renderSelf();
        this.renderPayments();
        this.updateAmount();
    }

    renderPayments() {
        $(this.main).append(this.render.listDivider('Payment'));
        $(this.main).append(this.render.textFieldItem('Amount', '$0.00'));
        $(this.main).append(this.render.paypalButtonsItem());
    }

    getAmount() {
        // Get the duration between the the from and to times
        const hours = window.app.utils.getHoursFromStrings(
            this.request.time.from,
            this.request.time.to
        );
        // And multiply it by the hourly charge
        return this.request.toUser.hourlyCharge * hours;
    }

    updateAmount() {
        this.payment.amount = this.getAmount();
        this.request.payment.amount = this.getAmount();
        $(this.main).find('#Amount input')
            .attr('value', '$' + this.payment.amount.toFixed(2));
    }

    manage() {
        super.manage();
        this.managePayments();
    }

    managePayments() {
        const that = this;
        const amountEl = $(this.main).find('#Amount')[0];
        const amountTextField = MDCTextField.attachTo(amountEl);
        $(amountEl).find('input').attr('disabled', 'disabled');

        if (!window.app.onMobile) {
            const descriptionEl = $(this.main)
                .find('[id="Authorize payment"]')[0];
            const descriptionTextArea = MDCTextField.attachTo(descriptionEl);
            $(descriptionEl).find('textarea').attr('disabled', 'disabled');
        }

        paypal.Buttons({
            createOrder: (data, actions) => {
                // Set up the transaction
                return actions.order.create({
                    purchase_units: [{
                        amount: {
                            // TODO: Right now, we're only going to authorize for
                            // one, one hour lesson and then show another prompt once
                            // the tutor clocksOut asking if they want another.
                            value: that.payment.amount
                        }
                    }]
                }).catch((err) => {
                    console.error('Error while creating PayPal order:', err);
                    window.app.snackbar.view('Could not add payment. Please ' +
                        'ensure that you\'ve selected a valid time range.');
                });
            },
            onApprove: (data, actions) => {
                return actions.order.authorize().then((auth) => {
                    // NOTE: All we need to be able to capture this auth later
                    // is this id. Also note that this auth period is only 29
                    // days.
                    var authID = auth.purchase_units[0].payments.authorizations[0].id;
                    that.payment.transaction = auth;
                    that.payment.authID = authID;
                    window.app.snackbar.view('Added payment method.')
                    // Call your server to save the transaction
                    // We'll use Firestore here to process the transaction
                    // by adding a payment document in this user's
                    // subcollections.
                });
            },
        }).render('#paypal-buttons');
    }
};


class StripeRequestDialog extends PaidRequestDialog {

    constructor(subject, user) {
        super(subject, user);
        this.request.payment.method = 'Stripe';
        this.payment = {
            to: this.request.toUser,
            from: this.request.fromUser,
            amount: this.getAmount(),
            for: this.request,
            timestamp: new Date(),
            method: 'Stripe',
        };
        this.stripe = Stripe(window.app.test ?
            'pk_test_EhDaWOgtLwDUCGauIkrELrOu00J8OIBNuf' :
            'pk_live_rospM71ihUDYWBArO9JKmanT00L5dZ36vA');
    }

    async sendRequest() {
        const res = await this.stripe.createToken(this.card);
        if (res.error) return $(this.main).find('#Method')[0].scrollIntoView({
            behavior: 'smooth'
        });
        this.payment.transaction = res.token;
        return super.sendRequest();
    }

    renderPayments() {
        $(this.main).append(this.render.listDivider('Payment'));
        $(this.main).append(this.render.textFieldItem('Amount', '$0.00'));
        $(this.main).append(this.render.template('stripe-card-input'));
        // TODO: Show the tutor's payment policy here?
    }

    managePayments() {
        const amountEl = $(this.main).find('#Amount')[0];
        const amountTextField = MDCTextField.attachTo(amountEl);
        $(amountEl).find('input').attr('disabled', 'disabled');

        const methodEl = $(this.main).find('#Method')[0];
        const err = $(methodEl).find('#err').hide();
        const msg = $(methodEl).find('#msg');

        function showErr(error) {
            msg.hide();
            err.text(error.message).show();
            $(methodEl).find('.mdc-text-field')
                .addClass('mdc-text-field--invalid');
            $(methodEl).find('.mdc-floating-label')
                .addClass('mdc-floating-label--shake');
        };

        function hideErr() {
            err.hide();
            msg.show();
            $(methodEl).find('.mdc-text-field')
                .removeClass('mdc-text-field--invalid');
            $(methodEl).find('.mdc-floating-label')
                .removeClass('mdc-floating-label--shake');
        };

        const elements = this.stripe.elements();
        const style = {
            base: { // Comes from MDCTextField styling
                fontSize: '16px',
                fontFamily: '"Roboto", sans-serif',
                fontSmoothing: 'antialiased',
                '::placeholder': {
                    color: '#676767',
                },
                letterSpacing: '0.00937em',
            },
            invalid: {
                color: '#B00020',
                iconColor: '#B00020',
            },
        };
        this.card = elements.create('card', {
            style
        });
        this.card.mount($(this.main).find('#card-input')[0]);
        this.card.addEventListener('change', (event) => {
            if (event.error) {
                showErr(event.error);
            } else {
                hideErr();
            }
        });
    }
};


class ViewApptDialog extends ViewRequestDialog {
    constructor(appt, id) {
        super(appt.for, id);
        this.appt = appt;
    }

    async renderSelf() {
        await super.renderSelf();
        if (['Tutor', 'Supervisor'].indexOf(window.app.user.type) >= 0) {
            if (this.request.payment.type === 'Paid') {
                $(this.main).append(this.render.fab('requestPayment'));
            } else {
                $(this.render.listDivider('Hours clocked')).insertAfter(
                    $(this.main).find('.user-header').last()
                );
                $(this.render.splitListItem(
                    this.render.textField('Current', '0:0:0.00'),
                    this.render.textField('Total', '0:0:0.00')
                )).insertAfter($(this.main).find('[id="Hours clocked"]'));
                $(this.main).append(this.render.fab('clockIn'));
            }
        }
        if (window.app.user.type === 'Supervisor') {
            $(this.main).find('[id="From ' +
                this.request.fromUser.type.toLowerCase() + '"]').remove();
            $(this.main).find('[id="To ' +
                this.request.toUser.type.toLowerCase() + '"] h4'
            ).text('Attendees');
        }
        this.header = this.render.header('header-action', {
            showEdit: true,
            edit: () => new EditApptDialog(this.appt, this.id).view(),
            title: 'Upcoming Appointment',
        });
    }

    manage() {
        super.manage();
        $(this.main).find('.mdc-fab').each(function() {
            MDCRipple.attachTo(this);
        });
        if (['Tutor', 'Supervisor'].indexOf(window.app.user.type) >= 0) {
            if (this.request.payment.type === 'Paid') {
                $(this.main).find('.mdc-fab').click(async () => {
                    window.app.snackbar.view('Sending payment request...');
                    const [err, res] = await to(
                        Data.requestPaymentFor(this.appt, this.id)
                    );
                    if (err) return window.app.snackbar.view('Could not send ' +
                        'payment request. Please ensure this isn\'t a ' +
                        'duplicate request.');
                    window.app.snackbar.view('Sent payment request to ' +
                        Utils.getOther(this.appt.attendees).email + '.');
                });
            } else {
                $(this.main).find('.mdc-fab').click(() => {
                    if (!this.timer) {
                        this.clockIn();
                        $(this.main).find('.mdc-fab__label').text('ClockOut');
                    } else {
                        this.clockOut();
                        $(this.main).find('.mdc-fab__label').text('ClockIn');
                    }
                });
            }
        }
    }

    async clockIn() {
        const reset = () => {
            clearInterval(this.timer);
            this.timer = null;
            $(this.main).find('.mdc-fab__label').text('ClockIn');
        };
        this.timer = setInterval(() => {
            this.update();
        }, 10);
        if (window.app.user.type === 'Supervisor') {
            window.app.snackbar.view('Clocking in for ' +
                this.appt.for.toUser.name.split(' ')[0] + '...');
            const [e, r] = await to(Data.instantClockIn(this.appt, this.id));
            if (e) {
                reset();
                return window.app.snackbar.view('Could not clock in.');
            }
            window.app.snackbar.view('Clocked in at ' + new Date(r.data
                .clockIn.sentTimestamp).toLocaleTimeString() + '.');
        } else {
            window.app.snackbar.view('Sending request...');
            const [err, res] = await to(Data.clockIn(this.appt, this.id));
            if (err) {
                reset();
                return window.app.snackbar.view('Could not send clock ' +
                    'in request.');
            }
            window.app.snackbar.view('Sent clock in request to ' +
                res.supervisor.name + '.');
        }
    }

    async clockOut() {
        const reset = () => {
            this.timer = setInterval(() => {
                this.update();
            }, 10);
            $(this.main).find('.mdc-fab__label').text('ClockOut');
        };
        clearInterval(this.timer);
        this.timer = null;
        if (window.app.user.type === 'Supervisor') {
            window.app.snackbar.view('Clocking out for ' +
                this.appt.for.toUser.name.split(' ')[0] + '...');
            const [e, r] = await to(Data.instantClockOut(this.appt, this.id));
            if (e) {
                reset();
                return window.app.snackbar.view('Could not clock out.');
            }
            window.app.snackbar.view('Clocked out at ' + new Date(r.data
                .clockOut.sentTimestamp).toLocaleTimeString() + '.');
        } else {
            window.app.snackbar.view('Sending request...');
            const [err, res] = await to(Data.clockOut(this.appt, this.id));
            if (err) {
                reset();
                return window.app.snackbar.view('Could not send clock ' +
                    'out request.');
            }
            window.app.snackbar.view('Sent clock out request to ' +
                res.supervisor.name + '.');
        }
    }

    update() {
        // Formatted as: Hr:Min:Sec.Millisec
        var currentTimeDisplay = $(this.main).find('#Current input')[0];
        var current = currentTimeDisplay.value.toString();
        var currentHours = new Number(current.split(':')[0]);
        var currentMinutes = new Number(current.split(':')[1]);
        var currentSeconds = new Number(current.split(':')[2].split('.')[0]);
        var currentMilli = new Number(current.split('.')[1]) || 0;

        // Add to currentMilli
        currentMilli++;

        // Parse the current values to ensure they are formatted correctly
        if (currentMilli === 100) {
            currentMilli = 0;
            currentSeconds++;
        }
        if (currentSeconds === 60) {
            currentSeconds = 0;
            currentMinutes++;
        }
        if (currentMinutes === 60) {
            currentMinutes = 0;
            currentHours++;
        }

        currentTimeDisplay.value = currentHours + ':' + currentMinutes +
            ':' + currentSeconds + '.' + currentMilli;

        // Next, update the total time
        // Formatted as: Hr:Min:Sec.Millisec
        var totalTimeDisplay = $(this.main).find('#Total input')[0];
        var total = totalTimeDisplay.value.toString();
        var totalHours = new Number(total.split(':')[0]);
        var totalMinutes = new Number(total.split(':')[1]);
        var totalSeconds = new Number(total.split(':')[2].split('.')[0]);
        var totalMilli = new Number(total.split('.')[1]);

        // Add to totalMilli
        totalMilli++;

        // Parse the total values to ensure they are formatted correctly
        if (totalMilli === 100) {
            totalMilli = 0;
            totalSeconds++;
        }
        if (totalSeconds === 60) {
            totalSeconds = 0;
            totalMinutes++;
        }
        if (totalMinutes === 60) {
            totalMinutes = 0;
            totalHours++;
        }

        totalTimeDisplay.value = totalHours + ':' + totalMinutes +
            ':' + totalSeconds + '.' + totalMilli;
    }
};

class EditApptDialog extends EditRequestDialog {
    constructor(appt, id) {
        super(appt.for, id);
        this.appt = appt;
    }

    async renderSelf() {
        await super.renderSelf();
        if (window.app.user.type === 'Supervisor') {
            $(this.main).find('[id="From ' +
                this.request.fromUser.type.toLowerCase() + '"]').remove();
            $(this.main).find('[id="To ' +
                this.request.toUser.type.toLowerCase() + '"] h4'
            ).text('Attendees');
        }
        this.header = this.render.header('header-action', {
            title: 'Edit Appointment',
            ok: () => {},
        });
    }

    async modifyRequest() {
        window.app.nav.back();
        const [err, res] = await to(Data.modifyAppt(this.appt, this.id));
        if (err) return window.app.snackbar.view('Could not modify ' +
            'appointment.');
        window.app.snackbar.view('Modified appointment.');
    }
};

class ViewPastApptDialog extends ViewApptDialog {
    async renderSelf() {
        await super.renderSelf();
        this.header = this.render.header('header-action', {
            title: 'Past Appointment',
            showDelete: true,
            delete: () => {
                return new ConfirmationDialog('Delete Past Appointment?',
                    'Are you sure you want to permanently delete this ' +
                    'past appointment between ' + this.appt.attendees[0].name +
                    ' and ' + this.appt.attendees[1].name + '? This action ' +
                    'cannot be undone.', async () => {
                        window.app.nav.back();
                        await Data.deletePastAppt(this.appt, this.id);
                        window.app.snackbar.view('Deleted past appointment.');
                    }).view();
            },
        });
        $(this.render.textFieldItem(
            'Time clocked',
            Utils.getDurationStringFromDates(
                this.appt.clockIn.sentTimestamp.toDate(),
                this.appt.clockOut.sentTimestamp.toDate()
            ))).insertAfter($(this.main).find('#Current').parent());
        $(this.main).find('#Current').replaceWith($(this.render.textField(
                'Clock-in',
                this.appt.clockIn.sentTimestamp.toDate().toLocaleTimeString()
            )).attr('style', 'margin-right:20px;')).end()
            .find('#Total').replaceWith(this.render.textField(
                'Clock-out',
                this.appt.clockOut.sentTimestamp.toDate().toLocaleTimeString()
            )).end().find('.mdc-fab').remove();
    }

    manage() {
        super.manage();
        const parse = (val) => {
            console.log('[DEBUG] Parsing (' + val + ')...');
            const split = val.split(':');
            console.log('[DEBUG] Split (' + val + '):', split);
            return {
                hrs: new Number(split[0]),
                mins: new Number(split[1]),
                secs: new Number(split[2].split(' ')[0]),
                ampm: val.split(' ')[1],
            };
        };
        const valid = (val) => {
            console.log('[DEBUG] Validating (' + val + ')...');
            const parsed = parse(val);
            if (['AM', 'PM'].indexOf(parsed.ampm) < 0) return false;
            if (!(0 < parsed.mins < 60)) return false;
            if (!(0 < parsed.secs < 60)) return false;
            if (!(0 < parsed.hrs <= 12)) return false;
            console.log('[DEBUG] Parsed value was valid:', parsed);
            return true;
        };
        const update = (val, date) => {
            const parsed = parse(val);
            const hrs = parsed.ampm === 'PM' ? parsed.hrs + 12 : parsed.hrs;
            date.setHours(hrs);
            date.setMinutes(parsed.mins);
            date.setSeconds(parsed.secs);
        };
        const edit = async (id, date) => {
            const t = this.textFields['Clock-in'];
            const v = t.value;
            if (!valid(v)) return t.valid = false;
            update(v, date);
            window.app.snackbar.view('Updating past appointment...');
            const [err, res] = await to(Data.modifyPastAppt({
                appt: this.appt,
                id: this.id,
            }));
            if (err) return window.app.snackbar.view('Could not update past ' +
                'appointment.');
            window.app.snackbar.view('Updated past appointment.');
        };
        $(this.main).find('[id="Clock-in"] input').removeAttr('disabled')
            .focusout(async () => {
                if (this.appt.clockIn.sentTimestamp.toDate) this.appt.clockIn
                    .sentTimestamp = this.appt.clockIn.sentTimestamp.toDate();
                edit('Clock-in', this.appt.clockIn.sentTimestamp);
            }).end()
            .find('[id="Clock-out"] input').removeAttr('disabled')
            .focusout(async () => {
                if (this.appt.clockOut.sentTimestamp.toDate) this.appt.clockOut
                    .sentTimestamp = this.appt.clockOut.sentTimestamp.toDate();
                edit('Clock-out', this.appt.clockOut.sentTimestamp);
            }).end()
            .find('[id="Time clocked"] input').removeAttr('disabled')
            .focusout(async () => {
                console.log('[TODO] Add duration editing data handling.');
            });
    }
};

class ViewActiveApptDialog extends ViewApptDialog {
    async renderSelf() {
        await super.renderSelf();
        this.header = this.render.header('header-action', {
            title: 'Active Appointment',
        });
        $(this.main).find('.mdc-fab__label').text('ClockOut');
        $(this.main).find('#Total input').val(
            Utils.getDurationStringFromDates(
                this.appt.clockIn.sentTimestamp.toDate(), new Date()
            ));
        $(this.main).find('#Current input').val(
            Utils.getDurationStringFromDates(
                this.appt.clockIn.sentTimestamp.toDate(), new Date()
            ));
        this.timer = setInterval(() => {
            this.update();
        }, 10);
    }
};

class ViewCanceledApptDialog extends ViewApptDialog {
    constructor(appt) {
        super(appt.for);
        this.canceledAppt = appt;
    }

    async renderSelf() {
        await super.renderSelf();
        this.header = this.render.header('header-action', {
            title: 'Canceled Appointment',
        });
        $(this.main).find('[id="Hours clocked"]').remove();
        $(this.main).find('#Current').parent().remove();
        $(this.main).find('.mdc-fab').remove();
    }
};

module.exports = {
    viewRequest: ViewRequestDialog,
    viewModifiedRequest: ViewModifiedRequestDialog,
    viewCanceledRequest: ViewCanceledRequestDialog,
    viewRejectedRequest: ViewRejectedRequestDialog,
    editRequest: EditRequestDialog,
    newRequest: NewRequestDialog,
    paidRequest: PaidRequestDialog,
    stripeRequest: StripeRequestDialog,
    viewAppt: ViewApptDialog,
    editAppt: EditApptDialog,
    notifyAppt: ApptNotificationDialog,
    viewPastAppt: ViewPastApptDialog,
    viewActiveAppt: ViewActiveApptDialog,
    viewCanceledAppt: ViewCanceledApptDialog,
    notify: NotificationDialog,
    editSubject: EditSubjectDialog,
    selectSubject: SubjectSelectDialog,
    editAvailability: EditAvailabilityDialog,
    confirm: ConfirmationDialog,
};