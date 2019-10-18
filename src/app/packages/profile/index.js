import {
    MDCTextField
} from '@material/textfield/index';
import {
    MDCSwitch
} from '@material/switch/index';
import {
    MDCRipple
} from '@material/ripple/index';
import {
    MDCTopAppBar
} from '@material/top-app-bar/index';

import $ from 'jquery';
import to from 'await-to-js';

// TODO: Make these dialog classes
const EditAvailabilityDialog = require('dialogs').editAvailability;
const EditSubjectDialog = require('dialogs').editSubject;
const ConfirmationDialog = require('dialogs').confirm;
const Data = require('data');
const Utils = require('utils');
const User = require('user');

// Profile class that provides a profile view and header and manages all data
// flow concering the user's profile.
class Profile {

    constructor(profile) {
        this.render = window.app.render;
        this.profile = profile;
        this.renderSelf();
    }

    view() {
        window.app.intercom.view(false);
        window.app.nav.selected = 'Profile';
        window.app.view(this.header, this.main, '/app/profile');
        (!this.managed) ? this.manage(): this.reManage(); // Don't attach MDC twice
    }

    reView() {
        (!this.managed) ? this.manage(): this.reManage(); // Don't attach MDC twice
    }

    reManage() { // MDC are already attached, just add textField listeners
        const that = this;
        const p = this.profile;
        this.manageHeader();

        function t(q, action) {
            $(that.main.querySelector(q + ' input')).focusout(async () => {
                action($(that.main).find(q + ' input'));
                await window.app.updateUser(that.profile);
                window.app.snackbar.view('Profile updated.');
            });
        };
        if (this.profile.payments.type !== 'Paid') {
            const bio = t('#Bio', (input) => {
                p.bio = input.val();
            });
        }
        const phone = t('#Phone', (input) => {
            p.phone = input.val();
        });
        const email = t('#Email', (input) => {
            p.email = input.val();
        });
        $('[id="Subject"]').each(function(i) { // So $ doesn't getElementById
            $(this).click(() => {
                new EditSubjectDialog($(this)[0]).view();
            });
        });
        $('[id="Available"]').each(function(i) {
            $(this).click(() => {
                new EditAvailabilityDialog($(this)[0]).view();
            });
        });
    }

    async saveImage(file) {
        // 1 - We change the profile image to a loading icon that will get updated 
        // with the shared image.
        const db = firebase.firestore();
        window.app.snackbar.view('Uploading profile image...');
        this.profile.photo = 'https://tutorbook.app/app/img/loading.gif';
        await window.app.updateUser(this.profile);

        // 2 - Upload the image to Cloud Storage.
        var filePath = 'users/' + this.profile.email + '/profileImages/' + file.name;
        var err;
        var fileSnapshot;
        [err, fileSnapshot] = await to(firebase.storage().ref(filePath).put(file));
        if (err) {
            console.log('Error while uploading profile image:', err);
            throw err;
        }

        // 3 - Generate a public URL for the file.
        err = undefined;
        var url;
        [err, url] = await to(fileSnapshot.ref.getDownloadURL());
        if (err) {
            console.log('Error while getting profile image url:', err);
            throw err;
        }

        // 4 - Update the chat message placeholder with the image’s URL.
        this.profile.photo = url;
        await window.app.updateUser(this.profile);
        window.app.snackbar.view('Uploaded profile image.');

        // Rerender the user header to match
        $(this.main).find('.profile-header').replaceWith(
            this.render.profileHeader(this.profile)
        );
        this.manageHeader();
    }

    manageHeader() { // Enables users to update their profile pic
        $(this.main).find('[data-fir-click="go_to_user"]').click(() => {
            new User(this.profile).view();
        });
        $(this.main).find('.profile-header .pic').mouseenter(() => {
            // Show the modify pic overlay
            $(this.main).find('.profile-header .pic').hide();
            $(this.main).find('.profile-header .modify-pic').show();
        });

        $(this.main).find('.profile-header .modify-pic').mouseleave(() => {
            // Hide the modify pic overlay
            $(this.main).find('.profile-header .modify-pic').hide();
            $(this.main).find('.profile-header .pic').show();
        });

        $(this.main).find('.profile-header .modify-pic').click(() => {
            $(this.main).find('.profile-header #media-capture').click();
        });

        const that = this;
        $(this.main).find('.profile-header #media-capture').change((event) => {
            event.preventDefault();
            const file = event.target.files[0];

            // Check if the file is an image.
            if (!file.type.match('image.*')) {
                window.app.snackbar.view('You can only upload images.');
                return;
            }

            // Upload file to Firebase Cloud Storage
            return that.saveImage(file);
        });
    }

    manage(dontUpdate) {
        this.managed = true;
        MDCTopAppBar.attachTo($('.mdc-top-app-bar')[0]);
        $('.mdc-top-app-bar .material-icons').each(function() {
            MDCRipple.attachTo($(this)[0]);
        });
        this.manageHeader();

        const that = this;
        const p = this.profile;

        function s(q) { // Attach and return MDCSelect
            return Utils.attachSelect(that.main.querySelector(q));
        };

        function t(q, action) { // Attach and return MDCTextField
            $(that.main).find(q + ' input').focusout(async () => {
                action();
                if (dontUpdate) {
                    return;
                }
                await window.app.updateUser(p);
                window.app.snackbar.view('Profile updated.');
            });
            return MDCTextField.attachTo(that.main.querySelector(q));
        };

        function listen(s, action) { // Adds select listeners
            s.listen('MDCSelect:change', async () => {
                action();
                if (dontUpdate) {
                    return;
                }
                await window.app.updateUser(p);
                window.app.snackbar.view('Profile updated.');

            });
        };

        if (this.profile.payments.type !== 'Paid') {
            const bio = t('#Bio', () => {
                p.bio = bio.value;
            });
        }
        const type = (Data.types.indexOf(p.type) < 0) ? s('#Type') : t('#Type');
        if (Data.types.indexOf(p.type) < 0) { // Users can only change type once
            listen(type, () => {
                p.type = type.value;
            });
        } else {
            $(this.main).find('#Type input').attr('disabled', 'disabled');
        }
        const grade = s('#Grade');
        listen(grade, () => {
            p.grade = grade.value;
        });
        const gender = s('#Gender');
        listen(gender, () => {
            p.gender = gender.value;
        });
        const phone = t('#Phone', () => {
            p.phone = phone.value;
        });
        const email = t('#Email', () => {
            p.email = email.value;
        });
        $(this.main).find('#Email input').attr('disabled', 'disabled');
        $('[id="Subject"]').each(function(i) { // So $ doesn't getElementById
            const textField = MDCTextField.attachTo($(this)[0]);
            $(this).click(() => {
                new EditSubjectDialog(
                    $(this)[0],
                    (dontUpdate) ? p : undefined
                ).view();
            });
        });
        $('[id="Available"]').each(function(i) {
            const textField = MDCTextField.attachTo($(this)[0]);
            $(this).click(() => {
                new EditAvailabilityDialog(
                    $(this)[0],
                    (dontUpdate) ? p : undefined
                ).view();
            });
        });
    }

    renderSelf() {
        const profile = this.profile;
        this.header = this.render.header('header-main', {
            'title': 'Profile'
        });
        this.main = this.render.template('profile');
        const that = this;

        function add(e, el) { // Add split input item to profile
            that.main.appendChild(that.render.splitListItem(e, el));
        };

        function s(l, v, d) { // Render select
            return that.render.select(l, v, d);
        };

        function t(l, v) { // Render text field
            return that.render.textField(l, v);
        };

        function addD(l) { // Add list divider
            that.main.appendChild(that.render.listDivider(l));
        };

        function addActionD(l, actions) { // Add action list divider
            that.main.appendChild(that.render.actionDivider(l, actions));
        };

        this.main.appendChild(this.render.profileHeader(profile));
        addD('About you');
        if (Data.types.indexOf(profile.type) < 0) { // Can only choose type once
            add(t('Bio', profile.bio), s('Type', profile.type, Data.types));
        } else {
            add(t('Bio', profile.bio), t('Type', profile.type));
        }
        add(
            s('Grade', profile.grade, Data.grades),
            s('Gender', profile.gender, Data.genders)
        );
        addD('Contact info'); // Contact info
        add(t('Phone', profile.phone), t('Email', profile.email));
        addActionD((profile.type || 'User') + ' for', { // Subjects
            add: () => {
                this.addSubjectInput();
            },
            remove: () => {
                this.removeSubjectInput();
            },
        });
        this.addSubjectInputs();
        addActionD('Availability', {
            add: () => {
                this.addAvailabilityInput();
            },
            remove: () => {
                this.removeAvailabilityInput();
            },
        });
        this.addAvailabilityInputs();
    }

    addSubjectInput() {
        const that = this;
        const profile = this.profile;

        function add(e, el) { // Add split input item to profile
            const sel = that.render.splitListItem(e, el);
            if ($('[id="Subject"]').length) {
                $(sel).insertAfter($('[id="Subject"]').last().parent());
            } else if (profile.type === '') {
                $(sel).insertAfter($('[id="User for"]'));
            } else {
                $(sel).insertAfter($('[id="' + profile.type + ' for"]'));
            }
            sel.scrollIntoView();
            $(e).click();
        };

        function t(l, v) { // Render and attach subject text field
            const el = that.render.textField(l, v);
            MDCTextField.attachTo(el);
            $(el).click(() => {
                new EditSubjectDialog(el).view();
            });
            return el;
        };

        add(t('Subject', ''), t('Subject', '')); // Add empty inputs
    }

    async removeSubjectInput() {
        $(this.main).find('[id="Subject"]').last().parent().remove();
        EditSubjectDialog.updateSubjects();
    }

    addAvailabilityInput() {
        const el = this.render.textFieldItem('Available', '');
        MDCTextField.attachTo(el);
        $(el).click(() => {
            new EditAvailabilityDialog(el).view();
        });
        $(this.main).append(el); // Availability is the last section of inputs
        el.scrollIntoView();
        $(el).click();
    }

    removeAvailabilityInput() {
        $(this.main).find('[id="Available"]').last().parent().remove();
        EditAvailabilityDialog.updateAvailability();
    }

    addAvailabilityInputs() {
        const that = this;
        const availability = this.profile.availability;
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

        // We want to display it as an Outlined MDC TextField like this:
        // Available:
        // On Mondays at the Gunn Academic Center from B Period to C Period.
        Object.entries(availability).forEach((entry) => {
            var location = entry[0];
            var times = entry[1];
            Object.entries(times).forEach((entry) => {
                var day = entry[0];
                var hours = entry[1];
                hours.forEach((hour) => {
                    var textFieldVal = Utils.getAvailabilityString({
                        day: day,
                        location: location,
                        fromTime: hour.open,
                        toTime: hour.close,
                    });
                    that.main.appendChild(
                        that.render.textFieldItem('Available', textFieldVal)
                    );
                });
            });
        });
        that.main.appendChild(
            that.render.textFieldItem('Available', '')
        ); // Always render at least one empty textField
    }

    addSubjectInputs() {
        const that = this;
        const profile = this.profile;

        function add(e, el) { // Add split input item to profile
            that.main.appendChild(that.render.splitListItem(e, el));
        };

        function t(l, v) { // Render text field
            return that.render.textField(l, v);
        };

        for (var i = 0; i < profile.subjects.length; i += 2) {
            var subA = profile.subjects[i];
            var subB = profile.subjects[i + 1] || '';
            add(t('Subject', subA), t('Subject', subB));
        }
        add(t('Subject', ''), t('Subject', '')); // Add empty inputs
    }
};


class NewProfile extends Profile {
    constructor(profile) {
        super(profile);
    }

    renderSelf() {
        super.renderSelf();
        this.header = this.render.header('header-action', {
            title: 'New Profile',
            cancel: () => {
                window.app.nav.back();
            },
            ok: () => {
                this.createProfile();
            },
        });
        $(this.main).find('.profile-header').replaceWith(
            this.render.listDivider('Basic info')
        );
        $(this.render.textFieldItem('Name', this.profile.name))
            .insertAfter($(this.main).find('[id="Basic info"]'));
        $(this.render.textFieldItem('Email', this.profile.email))
            .insertAfter($(this.main).find('#Name').parent());
        $(this.render.listDivider('Visibility'))
            .insertAfter($(this.main).find('#Email').first().parent());
        $(this.render.switch('Show profile', {
            on: 'Others are able to see and request this user.',
            off: 'Others cannot see or request this user.',
        }, this.profile.config.showProfile)).insertAfter(
            $(this.main).find('#Visibility')
        );
    }

    view() {
        window.app.intercom.view(false);
        window.app.view(this.header, this.main);
        (!this.managed) ? this.manage(): this.reManage(); // Don't attach MDC twice
    }

    manage() {
        super.manage(true);
        const main = this.main;
        const that = this;
        const p = this.profile;

        const show = new MDCSwitch(
            $(this.main).find('[id="Show profile"] .mdc-switch')[0]
        );
        const d = {
            on: 'Others are able to see and request this user.',
            off: 'Others cannot see or request this user.',
        };
        $(this.main).find('[id="Show profile"] .mdc-switch input').click(() => {
            p.config.showProfile = !p.config.showProfile;
            $(this.main)
                .find('[id="Show profile"] .mdc-list-item__secondary-text')
                .text((p.config.showProfile) ? d.on : d.off);
        });

        function t(q, action) {
            $($(main).find(q + ' input').first()).focusout(async () => {
                action();
            });
            return MDCTextField.attachTo($(main).find(q).first()[0]);
        };

        const name = t('#Name', () => {
            p.name = name.value;
        });
        name.required = true;
        const email = t('#Email', () => {
            p.email = email.value;
            $(main).find('#Email input').last().val(email.value);
            that.styleEmailInput();
        });
        email.required = true;
        email.disabled = false;
        $('[id="Subject"]').each(function(i) {
            $(this).off('click').click(() => {
                new EditSubjectDialog($(this)[0], p).view();
            });
        });
        $('[id="Available"]').each(function(i) {
            $(this).off('click').click(() => {
                new EditAvailabilityDialog($(this)[0], p).view();
            });
        });
    }

    styleEmailInput() {
        $(this.main).find('#Email .mdc-floating-label').last()
            .addClass('mdc-floating-label--float-above');
        $(this.main).find('#Email .mdc-notched-outline').last()
            .addClass('mdc-notched-outline--notched');
    }

    addSubjectInput() {
        const that = this;
        const profile = this.profile;

        function add(e, el) { // Add split input item to profile
            const sel = that.render.splitListItem(e, el);
            if ($('[id="Subject"]').length) {
                $(sel).insertAfter($('[id="Subject"]').last().parent());
            } else if (profile.type === '') {
                $(sel).insertAfter($('[id="User for"]'));
            } else {
                $(sel).insertAfter($('[id="' + profile.type + ' for"]'));
            }
            sel.scrollIntoView();
            $(e).click();
        };

        function t(l, v) { // Render and attach subject text field
            const el = that.render.textField(l, v);
            MDCTextField.attachTo(el);
            $(el).click(() => {
                new EditSubjectDialog(el, profile).view();
            });
            return el;
        };

        add(t('Subject', ''), t('Subject', '')); // Add empty inputs
    }

    async removeSubjectInput() {
        $(this.main).find('[id="Subject"]').last().parent().remove();
        EditSubjectDialog.updateSubjects(this.profile);
    }

    addAvailabilityInput() {
        const el = this.render.textFieldItem('Available', '');
        MDCTextField.attachTo(el);
        $(el).click(() => {
            new EditAvailabilityDialog(el, this.profile).view();
        });
        $(this.main).append(el); // Availability is the last section of inputs
        el.scrollIntoView();
        $(el).click();
    }

    removeAvailabilityInput() {
        $(this.main).find('[id="Available"]').last().parent().remove();
        EditAvailabilityDialog.updateAvailability(this.profile);
    }

    createProfile() {
        this.profile.id = this.profile.email;
        switch (this.profile.gender) {
            case 'Male':
                this.profile.photo = 'https://tutorbook.app/app/img/male.png';
                break;
            case 'Female':
                this.profile.photo = 'https://tutorbook.app/app/img/female.png';
                break;
            default: // Create some multi-gender profile image
                this.profile.photo = 'https://tutorbook.app/app/img/male.png';
                break;
        };
        window.app.nav.back();
        Data.createUser(this.profile).then(() => {
            window.app.snackbar.view('Created ' +
                this.profile.type.toLowerCase() + ' profile for ' +
                this.profile.name + '.');
        }).catch((err) => {
            console.error('Error while creating profile for ' +
                this.profile.email + ':', err);
            window.app.snackbar.view('Could not create profile. ' +
                this.profile.name.split(' ')[0] + ' probably already has one.');
        });
    }
};


class EditProfile extends NewProfile {

    constructor(profile) {
        super(profile);
    }

    manage() {
        super.manage();
        MDCRipple.attachTo($(this.main).find('.delete-user-input button')[0]);
    }

    renderSelf() {
        super.renderSelf();
        this.header = this.render.header('header-action', {
            title: 'Edit Profile',
            cancel: () => {
                window.app.nav.back();
            },
            ok: () => {
                this.updateProfile();
            },
        });
        this.styleEmailInput();
        $(this.main).append(this.render.template('delete-user-input', {
            delete: () => {
                new ConfirmationDialog('Delete Account?',
                    'You are about to permanently delete ' + this.profile.name +
                    '\'s account data. This action cannot be undone. Please ensure ' +
                    'to check with your fellow supervisors before continuing.', async () => {
                        window.app.nav.back();
                        var err;
                        var res;
                        [err, res] = await to(Data.deleteUser(this.profile.id));
                        if (err) {
                            window.app.snackbar.view('Could not delete account.');
                            console.error('Error while deleting proxy account:', err);
                        }
                        window.app.snackbar.view('Deleted account.');
                    }).view();
            },
        }));
    }

    updateProfile() {
        this.profile.id = this.profile.email;
        window.app.nav.back();
        Data.updateUser(this.profile).then(() => {
            window.app.snackbar.view('Updated ' + this.profile.name + '\'s profile.');
        }).catch((err) => {
            console.error('Error while updating profile for ' +
                this.profile.email + ':', err);
            window.app.snackbar.view('Could not update profile.');
        });
    }
};


class PaidTutorProfile extends Profile {

    constructor(profile) {
        super(profile);
    }

    renderSelf() {
        super.renderSelf();
        $(this.main).find('#Bio').replaceWith($(this.render.select(
            'Hourly rate',
            '$' + this.profile.payments.hourlyCharge.toFixed(2),
            window.app.data.payments.hourlyChargeStrings
        )).attr('style', 'width:50%!important;margin-right:20px;'));
        $(this.render.textAreaItem(
            'Background & Qualifications',
            this.profile.bio
        )).insertAfter($(this.main).find('#Gender').parent());
    }

    manage(dontUpdate) {
        super.manage(dontUpdate);
        const main = this.main;
        const p = this.profile;

        function t(q, action) {
            $($(main).find(q + ' textarea').first()).focusout(async () => {
                action();
                if (dontUpdate) {
                    return;
                }
                await window.app.updateUser(p);
                window.app.snackbar.view('Profile updated.');
            });
            return MDCTextField.attachTo($(main).find(q).first()[0]);
        };

        const bio = t('[id="Background & Qualifications"]', () => {
            p.bio = bio.value;
        });
        const rate = Utils.attachSelect($(main).find('[id="Hourly rate"]')[0]);
        rate.listen('MDCSelect:change', async () => {
            p.payments.hourlyChargeString = rate.value;
            p.payments.hourlyCharge =
                new Number(rate.value.split('$')[1]).valueOf();
            await window.app.updateUser(p);
            window.app.snackbar.view('Hourly charge updated.');
        });
    }

    reManage() {
        super.reManage();
        const that = this;

        function t(q, action) {
            $(that.main.querySelector(q + ' textarea')).focusout(async () => {
                action($(that.main).find(q + ' textarea'));
                await window.app.updateUser(that.profile);
                window.app.snackbar.view('Profile updated.');
            });
        };

        const bio = t('[id="Background & Qualifications"]', (input) => {
            this.profile.bio = input.val();
        });
    }
};


module.exports = {
    default: Profile,
    new: NewProfile,
    edit: EditProfile,
    paid: PaidTutorProfile,
};