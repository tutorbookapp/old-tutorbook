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
        if (!this.managed) this.manage();
    }

    manage() {
        this.managed = true;
        const that = this;

        function s(q) { // Attach select based on query
            return Utils.attachSelect($(that.main).find(q)[0]);
        };

        function listen(s, action) { // Add change listener
            s.listen('MDCSelect:change', () => {
                action(s);
            });
            return s;
        };

        function a(q, action) { // Attaches select and adds listener
            return listen(s(q), action);
        };

        $(this.main).find('.mdc-select .mdc-list-item').each(function() {
            MDCRipple.attachTo(this);
        });
        this.locationSelect = a('#Location', (s) => {
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
        this.daySelect = a('#Day', (s) => {
            this.val.day = s.value;
            this.refreshTimes();
        });
        this.timeslotSelect = a('#Time', (s) => {
            if (s.value.split(' to ').length > 1) {
                this.val.fromTime = s.value.split(' to ')[0];
                this.val.toTime = s.value.split(' to ')[1];
            } else {
                this.val.fromTime = s.value;
                this.val.toTime = s.value;
            }
            this.val.time = s.value;
        });

        if (this.val.location) this.refreshDaysAndTimes();
        if (!$(this.main).find('#ok-button').length) return;

        $(this.main).find('#ok-button')[0].addEventListener('click', () => {
            if (this.valid) this.dialog.close('ok');
        });
        this.dialog.listen('MDCDialog:closing', (event) => {
            if (event.detail.action === 'ok') {
                $(this.input).find('input')
                    .val(Utils.getAvailabilityString(this.val)).focus();
                EditAvailabilityDialog.updateAvailability(this.profile);
                $(this.main).remove();
            }
        });
    }

    // TODO: What are the MDC guidelines for styling inputs as invalid? Should
    // we only style when the user tries to submit the form? Or as the user is
    // filling out the form?
    get valid() {

        function invalid(select) {
            select.required = true;
            select.valid = false;
        };

        var valid = true;
        if (this.val.location === '') {
            invalid(this.locationSelect);
            valid = false;
        }
        if (this.val.day === '') {
            invalid(this.daySelect);
            valid = false;
        }
        if (this.val.toTime === '' || this.val.fromTime === '') {
            invalid(this.timeslotSelect);
            valid = false;
        }
        return valid;
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
        } else if (timeStrings.indexOf(this.val.time) < 0) {
            this.val.fromTime = '';
            this.val.toTime = '';
            this.val.time = '';
        }

        function s(q) { // Attach select based on query
            return Utils.attachSelect($(that.main).find(q)[0]);
        };

        function listen(s, action) { // Add change listener
            s.listen('MDCSelect:change', () => {
                action(s);
            });
            return s;
        };

        function a(q, action) { // Attaches select and adds listener
            return listen(s(q), action);
        };

        function r(q, el, action, id = 'timeslotSelect') { // Replaces select, 
            // adds listener, and stores select for validation purposes.
            $(el).find('.mdc-list-item').each(function() {
                MDCRipple.attachTo(this);
            });
            $(that.main).find(q).replaceWith(el);
            that[id] = a(q, action);
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
        } else if (days.indexOf(this.val.day) < 0) {
            this.val.day = '';
        }
        if (times.length === 1) { // Only one available option (pre-select it)
            this.val.fromTime = times[0].open;
            this.val.toTime = times[0].close;
            this.val.time = timeStrings[0];
        } else if (timeStrings.indexOf(this.val.time) < 0) {
            this.val.fromTime = '';
            this.val.toTime = '';
            this.val.time = '';
        }
        if (times.length < 1 || days.length < 1) return window.app.snackbar
            .view(location.name + ' does not have any open hours.');

        function s(q) { // Attach select based on query
            return Utils.attachSelect($(that.main).find(q)[0]);
        };

        function listen(s, action) { // Add change listener
            s.listen('MDCSelect:change', () => {
                action(s);
            });
            return s;
        };

        function a(q, action) { // Attaches select and adds listener
            return listen(s(q), action);
        };

        function r(q, el, action, id) { // Replaces select and adds listener
            $(el).find('.mdc-list-item').each(function() {
                MDCRipple.attachTo(this);
            });
            $(that.main).find(q).replaceWith(el);
            that[id] = a(q, action);
        };

        r(
            '#Day',
            that.render.select('Day', that.val.day, days),
            (s) => {
                that.val.day = s.value;
                that.refreshTimes();
            },
            'daySelect',
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
            },
            'timeslotSelect',
        );
    }

    renderSelf() {
        this.main = this.render.template('dialog-form', {
            title: 'Edit Availability'
        });
        $(this.main).find('[data-mdc-dialog-action="ok"]').removeAttr('data-' +
            'mdc-dialog-action');
        const content = this.render.template('input-wrapper');
        const v = this.val;
        const d = this.data;
        const that = this;

        function addS(l, v, d) {
            content.appendChild(that.render.selectItem(l, v, d));
        };

        addS('Location', v.location || '', Utils.concatArr([v.location || ''],
            (window.location.name === 'Any' ? d.locationNames
                .concat(['Custom']) : d.locationNames)));
        addS('Day', v.day || '', Data.days);
        addS('Time', v.time || '', d.timeStrings);

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
        this.noAction = noAction || function() {};
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
        const otherUser = Utils.getOtherUser(request.fromUser, request.toUser);

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
            addD('To' + (request.toUser.type ? ' ' +
                request.toUser.type.toLowerCase() : ''));
            add(this.render.userHeader(request.toUser));
            addD('From' + (otherUser.type ? ' ' + otherUser.type.toLowerCase() :
                ''));
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

class EditHourDialog {
    constructor(textField) {
        this.render = window.app.render;
        this.data = window.app.data;
        this.textField = textField;
        this.val = Utils.parseHourString(textField.value);
        this.renderSelf();
    }

    renderSelf() {
        this.main = this.render.template('dialog-form', {
            title: 'Edit Hours'
        });
        $(this.main).find('[data-mdc-dialog-action="ok"]').removeAttr('data-' +
            'mdc-dialog-action');

        const content = this.render.template('input-wrapper');
        const add = (el) => $(content).append(el);
        const addS = (l, v, d) => add(this.render.selectItem(l, v, d));
        const addT = (l, p, v = '') => {
            add(this.render.textFieldWithErrItem(l, v));
            $(content).find('#' + l + ' input').attr('placeholder', p);
        }

        addS('Day', this.val.day || '', Data.days);
        addT('Open', '3:45 PM', this.val.open);
        addT('Close', '4:45 PM', this.val.close);

        $(this.main).find('.mdc-dialog__content').append(content);
    }

    view() {
        $('body').prepend(this.main);
        window.editHoursDialog = this;
        this.dialog = MDCDialog.attachTo(this.main);
        this.dialog.open();
        if (!this.managed) this.manage();
    }

    manage() {
        const t = (q, a) => {
            const t = new MDCTextField($(this.main).find(q)[0]);
            t.useNativeValidation = false;
            $(this.main).find(q + ' input')[0].addEventListener('focusout',
                () => a(t));
            return t;
        };
        const s = (q, a = () => {}) => {
            const s = Utils.attachSelect($(this.main).find(q)[0]);
            s.listen('MDCSelect:change', () => a(s));
            return s;
        };

        this.managed = true;
        this.daySelect = s('#Day', s => this.updateDay(s));
        this.openTextField = t('#Open', t => this.updateOpenTime(t));
        this.closeTextField = t('#Close', t => this.updateCloseTime(t));

        $(this.main).find('#ok-button')[0].addEventListener('click', () => {
            if (this.valid) this.dialog.close('ok');
        });
        this.dialog.listen('MDCDialog:closing', (event) => {
            if (event.detail.action === 'ok') this.textField.value =
                Utils.getHourString(this.val);
            $(this.main).remove();
        });
    }

    err(t, msg) { // TODO: Show err msg styling when called from get valid().
        t.valid = false;
        t.helperTextContent = msg;
        $(t.root_).parent()
            .find('.mdc-text-field-helper-line').show().end()
            .parent().addClass('err-input-list-item--errored');
        return false;
    }

    validate(t) {
        t.valid = true;
        $(t.root_).parent()
            .find('.mdc-text-field-helper-line').hide().end()
            .parent().removeClass('err-input-list-item--errored');
        return t.value;
    }

    get valid() { // We can't use && if we want to validate every input.
        var valid = true;
        valid = this.updateOpenTime() && valid;
        valid = this.updateCloseTime() && valid;
        valid = this.updateDay() && valid;
        return valid;
    }

    updateOpenTime(t = this.openTextField, update = true) {
        const periods = this.data.periods[this.val.day] || [];
        const periodsInd = periods.indexOf(t.value);
        const ind = this.data.timeStrings.indexOf(t.value);
        if (ind < 0 && periodsInd > periods.indexOf(this.val.close)) return this
            .err(t, 'Opening period can\'t be after closing period.');
        if (!periods.length || periodsInd < 0) {
            if (ind < 0) return this.err(t, 'Time is formatted incorrectly or' +
                ' isn\'t on ' + this.val.day + '\'s bell schedule.');
            if (ind > this.data.timeStrings.indexOf(this.val.close)) return this
                .err(t, 'Opening time can\'t be after closing time.');
        }
        this.val.open = this.validate(t);
        if (update) this.updateCloseTime(this.closeTextField, false);
        return true;
    }

    updateCloseTime(t = this.closeTextField, update = true) {
        const periods = this.data.periods[this.val.day] || [];
        const periodsInd = periods.indexOf(t.value);
        const ind = this.data.timeStrings.indexOf(t.value);
        if (ind < 0 && periodsInd < periods.indexOf(this.val.open)) return this
            .err(t, 'Closing period can\'t be before opening period.');
        if (!periods.length || periodsInd < 0) {
            if (ind < 0) return this.err(t, 'Time is formatted incorrectly or' +
                ' isn\'t on ' + this.val.day + '\'s bell schedule.');
            if (ind < this.data.timeStrings.indexOf(this.val.open)) return this
                .err(t, 'Closing time can\'t ' + 'be before opening time.');
        }
        this.val.close = this.validate(t);
        if (update) this.updateOpenTime(this.openTextField, false);
        return true;
    }

    updateDay(s = this.daySelect) {
        if (Data.days.indexOf(s.value) < 0) return s.valid = false;
        this.val.day = s.value;
        if (this.openTextField.value)
            this.updateOpenTime(this.openTextField, false);
        if (this.closeTextField.value)
            this.updateCloseTime(this.closeTextField, false);
        return true;
    }
};

class EditLocationDialog {
    constructor(location, id) {
        Utils.sync(Data.emptyLocation, this);
        Utils.sync(Utils.filterLocationData(location), this);
        this.id = id;
        this.location = Utils.filterLocationData(location);
        this.render = window.app.render;
        this.renderSelf();
    }

    renderSelf() {
        this.header = this.render.header('header-action', {
            ok: () => this.save(),
            cancel: () => {
                if (this.changed) return new ConfirmationDialog('Discard ' +
                    'Changes?', 'Are you sure that you want to discard your ' +
                    'changes to the ' + this.name + '? Save your changes by ' +
                    'clicking \'No\' or anywhere outside of this dialog.',
                    () => this.reset(), false, () => this.save()).view();
                window.app.nav.back();
            },
            title: 'Edit Location',
        });
        this.main = this.render.template('dialog-input');

        const add = (e) => this.main.appendChild(e);
        const addD = (label) => add(this.render.listDivider(label));
        const addActionD = (l, a) => add(this.render.actionDivider(l, a));
        const addS = (l, v = '', d = []) => add(this.render.selectItem(l, v,
            Utils.concatArr(d, [v])));
        const addT = (l, v = '') => add(this.render.textFieldItem(l, v));

        addD('Basic info');
        addT('Name', this.name);
        add(this.render.textAreaItem('Description', this.description));
        addD('Service hour rules');
        addS('Round service hours', this.config.hrs.rounding, Data.roundings);
        addS('To the nearest', this.config.hrs.threshold, Data.thresholds);
        addS('Round times to the nearest', this.config.hrs.timeThreshold, Data
            .timeThresholds);
        addActionD('Open hours', {
            add: () => this.addHourInput(),
            remove: () => this.removeHourInput(),
        });
        this.addHourInputs();
        /*TODO: Add supervisor user search inputs.
         *addActionD('Supervisors', {
         *    add: () => this.addSupervisorInput(),
         *    remove: () => this.removeSupervisorInput(),
         *});
         *this.addSupervisorInputs();
         */
        add(this.render.template('delete-user-input', {
            label: 'Delete Location',
            delete: () => new ConfirmationDialog('Delete Location?', 'You are' +
                ' about to permanently delete all ' + this.name + ' data. ' +
                'This action cannot be undone. Please ensure to check with ' +
                'your fellow supervisors before continuing.', async () => {
                    window.app.nav.back();
                    window.app.snackbar.view('Deleting location...');
                    const [err, res] = await to(Data
                        .deleteLocation(this.id));
                    if (err) return window.app.snackbar.view('Could ' +
                        'not delete location.');
                    window.app.snackbar.view('Deleted location.');
                }).view(),
        }));
    }

    view() {
        window.app.intercom.view(true);
        window.app.view(this.header, this.main);
        if (!this.managed) this.manage();
    }

    manage() {
        this.managed = true;
        MDCTopAppBar.attachTo(this.header);
        $(this.header).find('.mdc-icon-button').each(function() {
            MDCRipple.attachTo(this).unbounded = true;
        });
        $(this.main).find('.mdc-button').each(function() {
            MDCRipple.attachTo(this);
        });
        const hourInputs = this.hourInputs = [];
        const t = (q) => new MDCTextField($(this.main).find(q)[0]);
        const s = (q, a = () => {}) => {
            const s = Utils.attachSelect($(this.main).find(q)[0]);
            s.listen('MDCSelect:change', () => a(s));
            return s;
        };
        const ts = (q) => {
            const res = [];
            $(this.main).find(q).each(function() {
                res.push(new MDCTextField(this));
            });
            return res;
        };
        this.nameTextField = t('#Name');
        $(this.main).find('#Name input').attr('disabled', 'disabled');
        this.descriptionTextArea = t('#Description');
        this.roundingSelect = s('[id="Round service hours"]', s => {
            if (Data.roundings.indexOf(s.value) < 0) return s.valid = false;
            this.config.hrs.rounding = s.value;
        });
        this.thresholdSelect = s('[id="To the nearest"]', s => {
            if (Data.thresholds.indexOf(s.value) < 0) return s.valid = false;
            this.config.hrs.threshold = s.value;
        });
        this.timeThresholdSelect = s('[id="Round times to the nearest"]', s => {
            if (Data.timeThresholds.indexOf(s.value) < 0) return s.valid = false;
            this.config.hrs.timeThreshold = s.value;
        });
        this.supervisorTextFields = ts('[id="Supervisor"]');
        $(this.main).find('[id="Open"]').each(function() {
            const textField = new MDCTextField(this);
            hourInputs.push(textField);
            const dialog = new EditHourDialog(textField);
            this.addEventListener('click', () => dialog.view());
        });
    }

    async save() {
        if (!this.valid) return;
        window.app.nav.back();
        window.app.snackbar.view('Updating location...');
        this.location = Utils.filterLocationData(this);
        const [err, res] = await to(Data.updateLocation(Utils
            .filterLocationData(this), this.id));
        if (err) return window.app.snackbar.view('Could not update location.');
        window.app.snackbar.view('Updated location.');
    }

    reset() {
        window.app.nav.back();
        Utils.sync(this.location, this);
        this.renderSelf();
        this.managed = false;
    }

    get changed() {
        this.valid; // Update location hours and description
        for (var [key, val] of Object.entries(this.location)) {
            if (typeof val === 'object' ? !Utils.identicalMaps(this[key], val) :
                this[key] !== val) return true;
        }
        return false;
    }

    get valid() { // Updates location hours and description
        const strings = [];
        const invalid = s => {
            s.required = true;
            return s.valid = false;
        };
        $(this.main).find('[id="Open"] input').each(function() {
            if ($(this).val()) strings.push($(this).val());
        });
        this.hours = Utils.parseHourStrings(strings);
        this.description = this.descriptionTextArea.value;
        if (Data.thresholds.indexOf(this.thresholdSelect.value) < 0)
            return invalid(this.thresholdSelect);
        if (Data.roundings.indexOf(this.roundingSelect.value) < 0)
            return invalid(this.roundingSelect);
        if (Data.timeThresholds.indexOf(this.timeThresholdSelect.value) < 0)
            return invalid(this.timeThresholdSelect);
        this.config.hrs.threshold = this.thresholdSelect.value;
        this.config.hrs.rounding = this.roundingSelect.value;
        this.config.hrs.timeThreshold = this.timeThresholdSelect.value;
        return true;
    }

    addHourInput() {
        const el = this.render.textFieldItem('Open', '');
        const textField = new MDCTextField(el);
        const dialog = new EditHourDialog(textField);
        el.addEventListener('click', () => dialog.view());
        this.hourInputs.push(textField);
        $(el).insertAfter($(this.main).find('[id="Open"]').last().parent());
        dialog.view();
    }

    removeHourInput() {
        this.hourInputs.pop();
        $(this.main).find('[id="Open"]').last().parent().remove();
    }

    addHourInputs() {
        const add = (t = '') => $(this.main).append(this.render.textFieldItem(
            'Open', t));
        Utils.getHourStrings(this.hours).forEach(timeslot => {
            add(timeslot);
        });
        add(); // Add empty input
    }

    addSupervisorInput() {
        const elA = this.render.textField('Supervisor', '');
        const elB = this.render.textField('Supervisor', '');
        const el = this.render.splitListItem(elA, elB);
        this.supervisorTextFields.push(new MDCTextField(elA));
        this.supervisorTextFields.push(new MDCTextField(elB));
        $(el).insertAfter($(this.main).find('[id="Supervisor"]').last()
            .parent());
    }

    removeSupervisorInput() {
        this.supervisorTextFields.pop();
        this.supervisorTextFields.pop();
        $(this.main).find('[id="Supervisor"]').last().parent().remove();
    }

    addSupervisorInputs() {
        const add = (e, el) => $(this.main).append(this.render
            .splitListItem(e, el));
        const t = (v = '') => this.render.textField('Supervisor', v);
        for (var i = 0; i < this.supervisors.length; i += 2) {
            var supA = this.supervisors[i];
            var supB = this.supervisors[i + 1];
            add(t(subA), t(subB));
        }
        add(t(), t()); // Add empty inputs
    }
};

class NewLocationDialog extends EditLocationDialog {
    constructor() {
        const location = {};
        super(location, Utils.genID());
    }

    renderSelf() {
        super.renderSelf();
        this.header = this.render.header('header-action', {
            ok: () => console.log('[TODO] Create new location.'),
            title: 'New Location',
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

    // TODO: What are the MDC guidelines for styling inputs as invalid? Should
    // we only style when the user tries to submit the form? Or as the user is
    // filling out the form?
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
            if (that.updateClockingTimes) that.updateClockingTimes();
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
            if (this.updateClockingTimes) this.updateClockingTimes();
        } else if (timeslots.length === 1) {
            request.time.from = timeslots[0];
            request.time.to = timeslots[0];
            if (this.updateClockingTimes) this.updateClockingTimes();
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
            if (that.updateClockingTimes) that.updateClockingTimes();
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
            if (this.updateClockingTimes) this.updateClockingTimes();
        } else if (timeslots.length === 1) {
            request.time.from = timeslots[0];
            request.time.to = timeslots[0];
            if (this.updateClockingTimes) this.updateClockingTimes();
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
            if (that.updateClockingTimes) that.updateClockingTimes();
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
        const utils = window.app.utils || new Utils();
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
            $(this.main).find('[id="From' + (this.request.fromUser.type ? ' ' +
                this.request.fromUser.type.toLowerCase() : '') + '"]').remove();
            $(this.main).find('[id="To' + (this.request.toUser.type ? ' ' +
                this.request.toUser.type.toLowerCase() : '') + '"] h4').text(
                'Attendees');
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
                return window.app.snackbar.view('Could not clock-in.');
            }
            window.app.snackbar.view('Clocked in at ' + new Date(r.clockIn
                .sentTimestamp).toLocaleTimeString() + '.');
        } else {
            window.app.snackbar.view('Sending request...');
            const [err, res] = await to(Data.clockIn(this.appt, this.id));
            if (err) {
                reset();
                return window.app.snackbar.view('Could not send clock-' +
                    'in request.');
            }
            window.app.snackbar.view('Sent clock-in request to ' +
                res.recipient.name + '.');
            // TODO: Add approval/rejection listener based on response 
            // recipient Firestore reference path.
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
                return window.app.snackbar.view('Could not clock-out.');
            }
            window.app.snackbar.view('Clocked out at ' + new Date(r.clockOut
                .sentTimestamp).toLocaleTimeString() + '.');
        } else {
            window.app.snackbar.view('Sending request...');
            const [err, res] = await to(Data.clockOut(this.appt, this.id));
            if (err) {
                reset();
                return window.app.snackbar.view('Could not send clock-' +
                    'out request.');
            }
            window.app.snackbar.view('Sent clock-out request to ' +
                res.recipient.name + '.');
            // TODO: Add approval/rejection listener based on response 
            // recipient Firestore reference path.
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

class NewPastApptDialog extends EditApptDialog {
    constructor() {
        const utils = window.app.utils || new Utils();
        const appt = {
            attendees: [],
            for: {
                subject: '',
                fromUser: {},
                toUser: {},
                timestamp: new Date(),
                location: {},
                message: '',
                time: {
                    day: '',
                    from: '',
                    to: '',
                },
                payment: {
                    type: 'Free',
                    method: 'PayPal',
                    amount: 0,
                },
            },
            time: {
                day: '',
                from: '',
                to: '',
            },
            clockIn: {
                sentBy: window.app.conciseUser,
                sentTimestamp: new Date(),
                approvedBy: window.app.conciseUser,
                approvedTimestamp: new Date(),
            },
            clockOut: {
                sentBy: window.app.conciseUser,
                sentTimestamp: new Date(),
                approvedBy: window.app.conciseUser,
                approvedTimestamp: new Date(),
            },
            location: {},
            timestamp: new Date(),
        };
        super(appt, Utils.genID());
        window.newPastApptDialog = this;
    }

    renderSelf() {
        this.header = this.render.header('header-action', {
            title: 'New Record',
            ok: async () => {
                if (!this.valid) return;
                this.appt.time = Utils.cloneMap(this.request.time);
                this.appt.location = Utils.cloneMap(this.request.location);
                window.app.nav.back();
                window.app.snackbar.view('Creating past appointment...');
                const [err, res] = await to(Data.newPastAppt(this.appt));
                if (err) return window.app.snackbar.view('Could not create ' +
                    'past appointment.');
                window.app.snackbar.view('Created past appointment.');
            },
        });
        this.main = this.render.template('dialog-input');

        const renderHit = (hit, type) => {
            const user = Utils.filterProfile(hit);
            const el = window.app.renderHit(hit, this.render).cloneNode(true);
            $(el).find('button').remove();
            el.addEventListener('click', () => {
                this.request[type === 'Tutor' ? 'toUser' : 'fromUser'] = user;
                this.appt.attendees = [
                    Utils.cloneMap(this.request.toUser),
                    Utils.cloneMap(this.request.fromUser),
                ];
                $(this.main).find('#' + type).find('input').val(user.name);
                this.refreshData();
                window.setTimeout(() => {
                    const opp = type === 'Tutor' ? 'Pupil' : 'Location';
                    $(this.main).find('#' + opp + ' input').click();
                    if (opp !== 'Location') this[opp.toLowerCase() +
                        'TextField'].focus();
                }, 50);
            });
            return el;
        };
        const index = Data.algoliaIndex('users');
        const searchPupils = async (textFieldItem) => {
            const query = $(textFieldItem).find('.search-box input').val();
            const res = await index.search({
                query: query,
                facetFilters: window.app.location.name !== 'Any' ? [
                    'payments.type:Free', // TODO: Add type facetFilter here.
                    'location:' + window.app.location.name,
                ] : [],
            });
            $(textFieldItem).find('#results').empty();
            res.hits.forEach((hit) => {
                try {
                    $(textFieldItem).find('#results').append(
                        renderHit(hit, 'Pupil'));
                } catch (e) {
                    console.warn('[ERROR] Could not render hit (' +
                        hit.objectID + ') b/c of', e);
                }
            });
        };
        const searchTutors = async (textFieldItem) => {
            const query = $(textFieldItem).find('.search-box input').val();
            const res = await index.search({
                query: query,
                facetFilters: window.app.location.name !==
                    'Any' ? [ // TODO: Add type facetFilter here.
                        'payments.type:Free',
                        'location:' + window.app.location.name,
                        'partition:' + (window.app.test ? 'test' : 'default'),
                    ] : [
                        'partition:' + (window.app.test ? 'test' : 'default'),
                    ],
            });
            $(textFieldItem).find('#results').empty();
            res.hits.forEach((hit) => {
                try {
                    $(textFieldItem).find('#results').append(
                        renderHit(hit, 'Tutor'));
                } catch (e) {
                    console.warn('[ERROR] Could not render hit (' +
                        hit.objectID + ') b/c of', e);
                }
            });
        };
        const add = (e) => {
            this.main.appendChild(e);
        };
        const addD = (label) => {
            add(this.render.listDivider(label));
        };
        const addST = (label, val, search) => {
            add(this.render.searchTextFieldItem(label, val, search));
        };
        const addS = (l, v = '', d = []) => {
            add(this.render.selectItem(l, v, Utils.concatArr([v], d)));
        };
        const t = (label, val = new Date().toLocaleTimeString()) => {
            return this.render.textField(label, val);
        };

        addD('Attendees');
        addST('Tutor', '', searchTutors);
        addST('Pupil', '', searchPupils);
        addD('At');
        addS('Location');
        addS('Day');
        addS('Time');
        add(this.render.splitListItem(
            t('Date', new Date().toLocaleDateString()),
            t('Clock-in'),
            t('Clock-out'),
        ));
        add(this.render.textFieldItem('Time clocked', '00:00:00.00'));
        addD('For');
        addS('Subject');
        add(this.render.textAreaItem('Message', ''));
    }

    // TODO: Refactor this code and get rid of repetitive helper function 
    // definitions (e.g. move them to more detailed names under utils).
    updateClockingTimes() {
        const timestring = (str) => {
            const split = str.split(' ');
            split[0] += ':00';
            return split.join(' ');
        };
        const parse = (val) => {
            const split = val.split(':');
            return {
                hrs: new Number(split[0]),
                mins: new Number(split[1]),
                secs: new Number(split[2].split(' ')[0]),
                ampm: val.split(' ')[1],
            };
        };
        const valid = (val) => {
            try {
                const parsed = parse(val);
                if (['AM', 'PM'].indexOf(parsed.ampm) < 0) return false;
                if (!(0 <= parsed.mins && parsed.mins < 60)) return false;
                if (!(0 <= parsed.secs && parsed.mins < 60)) return false;
                if (!(0 <= parsed.hrs && parsed.hrs <= 12)) return false;
                return true;
            } catch (e) {
                return false;
            }
        };
        const update = (val, date) => {
            const parsed = parse(val);
            const hrs = parsed.ampm === 'PM' ? parsed.hrs + 12 : parsed.hrs;
            date.setHours(hrs);
            date.setMinutes(parsed.mins);
            date.setSeconds(parsed.secs);
        };
        const editTime = async (t) => {
            const request = t.root_.id === 'Clock-in' ? this.appt.clockIn : this
                .appt.clockOut;
            if (!valid(t.value)) return setTimeout(() => t.valid = false, 50);
            update(t.value, request.sentTimestamp);
            update(t.value, request.approvedTimestamp);
            $(this.main).find('[id="Time clocked"] input').val(
                Utils.getDurationStringFromDates(
                    this.appt.clockIn.sentTimestamp,
                    this.appt.clockOut.sentTimestamp,
                ));
        };

        this.clockInTextField.value = timestring(this.request.time.from);
        this.clockOutTextField.value = timestring(this.request.time.to);
        editTime(this.clockInTextField);
        editTime(this.clockOutTextField);
    }

    refreshData() {
        const s = (q) => { // Attach select based on query
            return Utils.attachSelect($(this.main).find(q)[0]);
        };
        const listen = (s, action) => { // Add change listener
            s.listen('MDCSelect:change', () => {
                action(s);
            });
            return s;
        };
        const a = (q, action) => { // Attaches select and adds listener
            return listen(s(q), action);
        };
        const r = (q, el, action, id) => { // Replaces select and adds listener
            $(el).find('.mdc-list-item').each(function() {
                MDCRipple.attachTo(this);
            });
            $(this.main).find(q).replaceWith(el);
            return a(q, action);
        };

        this.availability = Utils.combineAvailability(this.request.fromUser
            .availability, this.request.toUser.availability);
        const names = Object.keys(this.availability);
        if (names.length === 1) this.request.location = {
            name: names[0],
            id: window.app.data.locationsByName[names[0]],
        };
        this.locationSelect = r(
            '#Location',
            this.render.select('Location', this.request.location.name, names),
            s => {
                const locationIDs = window.app.data.locationsByName;
                if (!locationIDs[s.value]) return s.valid = false;
                this.request.location = {
                    name: s.value,
                    id: locationIDs[s.value],
                };
                this.refreshDayAndTimeSelects(this.request, this.availability);
            });
        if (names.length === 1 && !window.app.data.locationsByName[names[0]])
            this.locationSelect.valid = false;

        this.subjects = Utils.concatArr(this.request.fromUser.subjects, this
            .request.toUser.subjects);
        if (this.subjects.length === 1) this.request.subject = this.subjects[0];
        this.subjectSelect = r(
            '#Subject',
            this.render.select('Subject', this.request.subject, this.subjects),
            s => this.request.subject = s.value,
        );

        this.req = this.req.filter(r => ['Location', 'Subject']
            .indexOf(r.id) < 0);
        this.req.push({
            input: this.subjectSelect,
            id: 'Subject',
            valid: () => this.subjectSelect.value !== '',
        });
        this.req.push({
            input: this.locationSelect,
            id: 'Location',
            valid: () => window.app.data.locationsByName[this.locationSelect
                .value],
        });
        this.refreshDayAndTimeSelects(this.request, this.availability);
    }

    manage() {
        const t = (q, action, i = 'input') => {
            const t = new MDCTextField($(this.main).find(q).first()[0]);
            $(this.main).find(q + ' ' + i).first().focusout(() => action(t));
            return t;
        };
        const s = (q) => { // Attach select based on query
            return Utils.attachSelect($(this.main).find(q)[0]);
        };
        const listen = (s, action) => { // Add change listener
            s.listen('MDCSelect:change', () => {
                action(s);
            });
            return s;
        };
        const a = (q, action) => { // Attaches select and adds listener
            return listen(s(q), action);
        };
        const parse = (val) => {
            const split = val.split(':');
            return {
                hrs: new Number(split[0]),
                mins: new Number(split[1]),
                secs: new Number(split[2].split(' ')[0]),
                ampm: val.split(' ')[1],
            };
        };
        const valid = (val) => {
            try {
                const parsed = parse(val);
                if (['AM', 'PM'].indexOf(parsed.ampm) < 0) return false;
                if (!(0 <= parsed.mins && parsed.mins < 60)) return false;
                if (!(0 <= parsed.secs && parsed.mins < 60)) return false;
                if (!(0 <= parsed.hrs && parsed.hrs <= 12)) return false;
                return true;
            } catch (e) {
                return false;
            }
        };
        const update = (val, date) => {
            const parsed = parse(val);
            const hrs = parsed.ampm === 'PM' ? parsed.hrs + 12 : parsed.hrs;
            date.setHours(hrs);
            date.setMinutes(parsed.mins);
            date.setSeconds(parsed.secs);
        };
        const editTime = async (t) => {
            const request = t.root_.id === 'Clock-in' ? this.appt.clockIn : this
                .appt.clockOut;
            if (!valid(t.value)) return setTimeout(() => t.valid = false, 50);
            update(t.value, request.sentTimestamp);
            update(t.value, request.approvedTimestamp);
            $(this.main).find('[id="Time clocked"] input').val(
                Utils.getDurationStringFromDates(
                    this.appt.clockIn.sentTimestamp,
                    this.appt.clockOut.sentTimestamp,
                ));
        };
        const editDate = (t) => {
            const newDate = new Date(t.value);
            if (newDate.toString() === 'Invalid Date')
                return setTimeout(() => t.valid = false, 50);
            [this.appt.clockIn, this.appt.clockOut].forEach(oldDate => {
                ['sentTimestamp', 'approvedTimestamp'].forEach(key => {
                    oldDate[key].setDate(newDate.getDate());
                    oldDate[key].setFullYear(newDate.getFullYear());
                    oldDate[key].setMonth(newDate.getMonth());
                });
            });
        };

        this.managed = true;
        MDCTopAppBar.attachTo(this.header);
        $(this.header).find('.mdc-icon-button').each(function() {
            MDCRipple.attachTo(this).unbounded = true;
        }).end().find('.mdc-select,.search-results li').each(function() {
            MDCRipple.attachTo(this);
        });

        // TODO: Why do we have to set a timeout for all of this invalidation?
        // TODO: Find a better way to workaround the fact that when the user 
        // clicks on a result the text field unfocuses and causes it to be 
        // marked as invalid (as the result clicker hasn't updated our data).
        this.tutorTextField = t('#Tutor', t => setTimeout(() => {
            if (!Object.keys(this.request.toUser).length)
                setTimeout(() => t.valid = false, 50);
        }, 500));
        this.pupilTextField = t('#Pupil', t => setTimeout(() => {
            if (!Object.keys(this.request.fromUser).length)
                setTimeout(() => t.valid = false, 50);
        }, 500));
        this.locationSelect = a('#Location', (s) => {
            const locationIDs = window.app.data.locationsByName;
            if (!locationIDs[s.value]) return s.valid = false;
            this.request.location = {
                name: s.value,
                id: locationIDs[s.value],
            };
            this.refreshDayAndTimeSelects(this.request, this.availability);
        });
        this.daySelect = a('#Day', (s) => {
            this.val.day = s.value;
            this.refreshTimeSelects(this.request, this.availability);
        });
        this.timeslotSelect = a('#Time', (s) => {
            if (s.value.split(' to ').length > 1) {
                this.request.time.from = s.value.split(' to ')[0];
                this.request.time.to = s.value.split(' to ')[1];
            } else {
                this.request.time.from = s.value;
                this.request.time.to = s.value;
            }
            this.updateClockingTimes();
        });
        this.subjectSelect = a('#Subject', s => this.request.subject = s.value);
        this.messageTextField = t('#Message', t => this.request.message = t
            .value, 'textarea');
        this.dateTextField = t('#Date', t => editDate(t));
        this.clockInTextField = t('[id="Clock-in"]', t => editTime(t));
        this.clockOutTextField = t('[id="Clock-out"]', t => editTime(t));
        this.durationTextField = t('[id="Time clocked"]', t => {});
        $(this.main).find('[id="Time clocked"] input').attr('disabled', true);

        [
            this.tutorTextField, this.pupilTextField, this.subjectSelect,
            this.daySelect, this.timeslotSelect,
        ].forEach(input => {
            this.req.push({
                input: input,
                id: input.root_.id,
                valid: () => input.value !== '',
            });
        });
        this.req.push({
            input: this.locationSelect,
            id: 'Location',
            valid: () => window.app.data.locationsByName[this.locationSelect
                .value],
        });
        this.req.push({
            input: this.dateTextField,
            id: 'Date',
            valid: () => new Date(this.dateTextField.value).toString() !==
                'Invalid Date',
        });
        this.req.push({
            input: this.tutorTextField,
            id: 'Tutor',
            valid: () => Object.keys(this.request.toUser).length,
        });
        this.req.push({
            input: this.pupilTextField,
            id: 'Pupil',
            valid: () => Object.keys(this.request.fromUser).length,
        });
        [this.clockInTextField, this.clockOutTextField].forEach(input => {
            this.req.push({
                input: input,
                id: input.root_.id,
                valid: () => valid(input.value),
            });
        });
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
                        window.app.snackbar.view('Deleting past ' +
                            'appointment...');
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
            const split = val.split(':');
            return {
                hrs: new Number(split[0]),
                mins: new Number(split[1]),
                secs: new Number(split[2].split(' ')[0]),
                ampm: val.split(' ')[1],
            };
        };
        const valid = (val) => {
            try {
                const parsed = parse(val);
                if (['AM', 'PM'].indexOf(parsed.ampm) < 0) return false;
                if (!(0 <= parsed.mins && parsed.mins < 60)) return false;
                if (!(0 <= parsed.secs && parsed.mins < 60)) return false;
                if (!(0 <= parsed.hrs && parsed.hrs <= 12)) return false;
                return true;
            } catch (e) {
                return false;
            }
        };
        const update = (val, date) => {
            const parsed = parse(val);
            const hrs = parsed.ampm === 'PM' ? parsed.hrs + 12 : parsed.hrs;
            date.setHours(hrs);
            date.setMinutes(parsed.mins);
            date.setSeconds(parsed.secs);
        };
        // TODO: Right now we only change the sentTimestamp. We want to change
        // the sentTimestamp and the approvedTimestamp relative to each other.
        const editClockingTime = async (id) => {
            if (this.appt.clockIn.sentTimestamp.toDate) this.appt.clockIn
                .sentTimestamp = this.appt.clockIn.sentTimestamp.toDate();
            if (this.appt.clockOut.sentTimestamp.toDate) this.appt.clockOut
                .sentTimestamp = this.appt.clockOut.sentTimestamp.toDate();
            const date = id === 'Clock-in' ? this.appt.clockIn.sentTimestamp :
                this.appt.clockOut.sentTimestamp;
            const t = this.textFields[id];
            const v = t.value;
            if (!valid(v)) return setTimeout(() => t.valid = false, 50);
            update(v, date);
            window.app.snackbar.view('Updating past appointment...');
            $(this.main).find('[id="Time clocked"] input').val(
                Utils.getDurationStringFromDates(
                    this.appt.clockIn.sentTimestamp,
                    this.appt.clockOut.sentTimestamp,
                ));
            const [err, res] = await to(Data.modifyPastAppt(this.appt,
                this.id));
            if (err) return window.app.snackbar.view('Could not update past ' +
                'appointment.');
            window.app.snackbar.view('Updated past appointment.');
        };
        $(this.main).find('[id="Clock-in"] input').removeAttr('disabled')
            .focusout(async () => {
                editClockingTime('Clock-in', this.appt.clockIn.sentTimestamp);
            }).end()
            .find('[id="Clock-out"] input').removeAttr('disabled')
            .focusout(async () => {
                editClockingTime('Clock-out', this.appt.clockOut.sentTimestamp);
            }).end()
            .find('[id="Time clocked"] input') // TODO: Add duration editing.
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
    viewPastAppt: ViewPastApptDialog,
    newPastAppt: NewPastApptDialog,
    viewActiveAppt: ViewActiveApptDialog,
    viewCanceledAppt: ViewCanceledApptDialog,
    notify: NotificationDialog,
    editSubject: EditSubjectDialog,
    selectSubject: SubjectSelectDialog,
    editAvailability: EditAvailabilityDialog,
    confirm: ConfirmationDialog,
    editLocation: EditLocationDialog,
    newLocation: NewLocationDialog,
};