/**
 * Package that contains the profile views from Tutorbook's web app.
 * @module @tutorbook/profile
 * @see {@link https://npmjs.com/package/@tutorbook/profile}
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

import * as $ from 'jquery';
import to from 'await-to-js';

import {
    EditAvailabilityDialog,
    EditSubjectsDialog,
    NotificationDialog,
    ConfirmationDialog,
} from '@tutorbook/dialogs';
import Data from '@tutorbook/data';
import Utils from '@tutorbook/utils';
import User from '@tutorbook/user';

/**
 * Class that provides a profile view and header and manages all data flow
 * concerning the user's profile.
 * @todo Finish documenting this class's methods and other properties.
 */
export class Profile {

    /**
     * Creates and renders a new profile view.
     * @param {Profile} profile - The profile to render as a profile view.
     */
    constructor(profile) {
        this.render = window.app.render;
        this.profile = profile;
        this.renderSelf();
    }

    /**
     * Views the profile view and header (and hides the Intercom messenger).
     * @see {@link module:@tutorbook/app~Tutorbook#view}
     */
    view() {
        window.app.intercom.view(false);
        window.app.nav.selected = 'Profile';
        window.app.view(this.header, this.main, '/app/profile');
        this.managed ? this.reManage() : this.manage();
    }

    /**
     * Re-manages (or manages, if it hasn't already been managed) the profile
     * view.
     */
    reView() {
        this.managed ? this.reManage() : this.manage(); // Don't attach MDC twice
    }

    /**
     * Re-manages the profile view when the MDC components have already been
     * attached (i.e. just add text field `focusout` listeners).
     */
    reManage() {
        const that = this;
        const p = this.profile;
        this.manageHeader();

        function t(q, action) {
            $(that.main.querySelector(q + ' input')).focusout(async () => {
                action($(that.main).find(q + ' input'));
                Utils.updateSetupProfileCard(p);
                const [e, res] = await to(window.app.updateUser(that.profile));
                if (e) return window.app.snackbar.view('Could not update ' +
                    'profile.');
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
        $(this.main).find('[data-fir-click="delete"]').click(() => {
            new ConfirmationDialog('Delete Account?',
                'You are about to permanently delete all of your account data' +
                ' (including any appointments, requests, messages, or service' +
                ' hours that you might have). This action cannot be undone. ' +
                'Still sure you want to delete this account?', async () => {
                    const [err, res] = await to(Data.deleteUser(p.uid));
                    if (err) return window.app.snackbar.view('Could not ' +
                        'delete account.');
                    window.app.signOut();
                    window.app.snackbar.view('Deleted account and signed out.');
                }).view();
        });
    }

    /**
     * Saves an image to be the profile's new photo by:
     * 1. Changing the profile image to a loading icon that will get updated
     * with the shared image.
     * 2. Uploading the image to Cloud Storage.
     * 3. Generating a public URL for the uploaded file.
     * 4. Updating the chat message placeholder with the image's URL and 
     * re-renders the profile view with the updated profile image.
     * @param {File} file - The file to upload to Google Storage and set as the
     * new profile photo (for `this.profile`).
     */
    async saveImage(file) {
        // 1 - We change the profile image to a loading icon that will get updated 
        // with the shared image.
        const db = window.app.db;
        window.app.snackbar.view('Uploading profile image...');
        this.profile.photo = 'https://tutorbook.app/app/img/loading.gif';
        await window.app.updateUser(this.profile);

        // 2 - Upload the image to Cloud Storage.
        var filePath = 'users/' + this.profile.uid + '/profileImages/' + file.name;
        var err;
        var fileSnapshot;
        [err, fileSnapshot] = await to(firebase.storage().ref(filePath).put(file));
        if (err) {
            console.error('[ERROR] While uploading profile image:', err);
            throw err;
        }

        // 3 - Generate a public URL for the file.
        err = undefined;
        var url;
        [err, url] = await to(fileSnapshot.ref.getDownloadURL());
        if (err) {
            console.error('[ERROR] While getting profile image url:', err);
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

    /**
     * Enables users to update their profile picture by clicking on the user
     * header image.
     * @see {@link Profile#saveImage}
     */
    manageHeader() {
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

    /**
     * Manages the profile view.
     * @param {bool} [dontUpdate=false] - Whether to update the profile every 
     * time an input is updated (e.g. when a text field loses focus).
     */
    manage(dontUpdate = false) {
        this.managed = true;
        MDCTopAppBar.attachTo(this.header);
        $(this.header).find('.material-icons').each(function() {
            MDCRipple.attachTo($(this)[0]).unbounded = true;
        });
        this.manageHeader();

        const subjectsDialog = this.subjectsDialog =
            new EditSubjectsDialog(this, !dontUpdate);
        const p = this.profile;
        const s = (q) => Utils.attachSelect($(this.main).find(q)[0]);
        const t = (q, action) => {
            $(this.main).find(q + ' input').focusout(async () => {
                action();
                Utils.updateSetupProfileCard(p);
                if (dontUpdate) return;
                const [err, res] = await to(window.app.updateUser(p));
                if (err) return window.app.snackbar.view('Could not update ' +
                    'profile.');
                window.app.snackbar.view('Profile updated.');
            });
            return MDCTextField.attachTo($(this.main).find(q)[0]);
        };
        const listen = (s, action) => s.listen('MDCSelect:change', async () => {
            action();
            Utils.updateSetupProfileCard(p);
            if (dontUpdate) return;
            const [err, res] = await to(window.app.updateUser(p));
            if (err) return window.app.snackbar.view('Could not update ' +
                'profile.');
            window.app.snackbar.view('Profile updated.');
        });

        if (this.profile.payments.type !== 'Paid' &&
            this.profile.type !== 'Tutor') {
            const bio = t('#Bio', () => p.bio = bio.value);
        }
        const typeCanBeChanged = $(this.main).find('#Type .mdc-menu').length;
        const type = (typeCanBeChanged) ? s('#Type') : t('#Type');
        if (typeCanBeChanged) { // Users can only change type once
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
        $(this.main).find('[id="Subject"]').each(function(i) {
            this.addEventListener('click', () => subjectsDialog.view());
            MDCTextField.attachTo(this);
        });
        $(this.main).find('[id="Available"]').each(function(i) {
            const dialog = new EditAvailabilityDialog(
                this,
                dontUpdate ? p : undefined,
            );
            this.addEventListener('click', () => dialog.view());
            MDCTextField.attachTo(this);
        });
        if (dontUpdate) return;
        MDCRipple.attachTo($(this.main).find('[data-fir-click="delete"]')[0]);
        $(this.main).find('[data-fir-click="delete"]').click(() => {
            new ConfirmationDialog('Delete Account?',
                'You are about to permanently delete all of your account data' +
                ' (including any appointments, requests, messages, or service' +
                ' hours that you might have). This action cannot be undone. ' +
                'Still sure you want to delete this account?', async () => {
                    const [err, res] = await to(Data.deleteUser(p.uid));
                    if (err) return window.app.snackbar.view('Could not ' +
                        'delete account.');
                    window.app.signOut();
                    window.app.snackbar.view('Deleted account and signed out.');
                }).view();
        });
    }

    /**
     * Renders the profile view (with the global `window.app.render` object).
     * @see {@link Render}
     */
    renderSelf() {
        const profile = this.profile;
        this.header = this.render.header('header-main', {
            'title': 'Profile',
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
            s('Grade', profile.grade, window.app.data.grades),
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
        $(this.main).append(this.render.template('delete-user-input', {
            delete: () => {},
        }));
    }

    /**
     * Adds (and manages) a new split subject input list item to the profile 
     * view.
     */
    addSubjectInput() {
        const add = (e, el) => { // Adds a split list item to the profile view 
            const sel = this.render.splitListItem(e, el);
            if ($('[id="Subject"]').length) {
                $(sel).insertAfter($('[id="Subject"]').last().parent());
            } else if (this.profile.type === '') {
                $(sel).insertAfter($('[id="User for"]'));
            } else {
                $(sel).insertAfter($('[id="' + this.profile.type + ' for"]'));
            }
            sel.scrollIntoView();
            this.subjectsDialog.view();
        };
        const t = (l, v) => { // Render and attach subject text field
            const el = this.render.textField(l, v);
            MDCTextField.attachTo(el);
            $(el).click(() => this.subjectsDialog.view());
            return el;
        };

        add(t('Subject', ''), t('Subject', '')); // Add empty inputs
    }

    /**
     * Removes a split subject list item and it's corresponding subject values
     * from the (current user's) profile, the profile's Firestore document, and 
     * the profile view.
     * @see {@link EditSubjectsDialog#updateSubjects}
     */
    async removeSubjectInput() {
        $(this.main).find('[id="Subject"]').last().parent().remove();
        EditSubjectsDialog.updateSubjects();
    }

    /**
     * Adds (and manages) an availability input list item.
     */
    addAvailabilityInput() {
        const el = this.render.textFieldItem('Available', '');
        const dialog = new EditAvailabilityDialog(el);
        MDCTextField.attachTo(el);
        el.addEventListener('click', () => dialog.view());
        if ($(this.main).find('[id="Available"]').length) {
            $(el).insertAfter(
                $(this.main).find('[id="Available"]').last().parent());
        } else {
            $(el).insertAfter($(this.main).find('[id="Availability"]'));
        }
        el.scrollIntoView();
        $(el).click();
    }

    /**
     * Removes an availability input and it's corresponding availability from
     * the profile and profile view.
     * @see {@link EditAvailabilityDialog#updateAvailability}
     */
    removeAvailabilityInput() {
        $(this.main).find('[id="Available"]').last().parent().remove();
        EditAvailabilityDialog.updateAvailability();
    }

    /**
     * Adds the initial (and pre-filled) availability inputs to the profile view
     * based on `this.profile.availability`.
     */
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

    /**
     * Adds the initial (pre-filled) subject input list items based on the 
     * subjects currently selected in `this.profile.subjects`.
     */
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

/**
 * Class that represents the dialog that enables peer tutoring supervisors to
 * create new user profiles.
 * @extends Profile
 */
export class NewProfile extends Profile {
    /**
     * Renders the new profile view by replacing the text in the mdc top app bar
     * title, adding the "Basic Info" section (for the user's name and email),
     * adding the "Show profile" switch list item, and removing the "Delete
     * Account" button.
     */
    renderSelf() {
        super.renderSelf();
        this.header = this.render.header('header-action', {
            title: 'New Profile',
            ok: () => {
                this.createProfile();
            },
        });
        $(this.main).find('.profile-header').replaceWith(
            this.render.listDivider('Basic info')
        );
        const renderHit = (hit) => {
            const user = Utils.filterProfile(Utils.combineMaps(hit, {
                proxy: hit.proxy && hit.proxy.indexOf(window.app.user.uid) <
                    0 ? hit.proxy.concat([window.app.user.uid]) :
                    !hit.proxy ? [window.app.user.uid] : hit.proxy,
            }));
            const profile = new EditProfile(user);
            const el = window.app.renderHit(hit, this.render);
            $(el).find('[data-fir-click="edit"]').remove();
            el.addEventListener('click', async (event) => {
                if ($(event.target).closest('button').length) return;
                profile.view();
                window.app.nav.views.pop(); // TODO: Don't open UserView at all.
                window.app.nav.views.pop(); // Don't keep old NewProfile view.
                const [err, res] = await to(Data.updateUser(user));
                if (err) window.app.snackbar.view('Could not add ' + user.name +
                    ' to matching workspace.');
            });
            return el;
        };
        const index = Data.algoliaIndex('users');
        const search = async (textFieldItem) => {
            const query = $(textFieldItem).find('.search-box input').val();
            const res = await index.search(query, {
                facetFilters: !window.app.id ? [] : [
                    'payments.type:Free',
                    window.app.locations.map(l => 'location:' + l.name),
                ],
            });
            $(textFieldItem).find('#results').empty();
            res.hits.forEach((hit) => {
                try {
                    $(textFieldItem).find('#results').append(renderHit(hit));
                } catch (e) {
                    console.warn('[ERROR] Could not render hit (' +
                        hit.objectID + ') b/c of', e);
                }
            });
        };
        $(this.render.searchTextFieldItem('Name', this.profile.name, search))
            .insertAfter($(this.main).find('[id="Basic info"]'));
        $(this.render.searchTextFieldItem('Email', this.profile.email, search))
            .insertAfter($(this.main).find('#Name').parent().parent());
        $(this.render.listDivider('Visibility'))
            .insertAfter($(this.main).find('#Email').first().parent().parent());
        $(this.render.switch('Show profile', {
            on: 'Others are able to see and request this user.',
            off: 'Others cannot see or request this user.',
        }, this.profile.config.showProfile)).insertAfter(
            $(this.main).find('#Visibility')
        );
        $(this.main).find('[data-fir-click="delete"]').parent().remove();
    }

    /**
     * Views the new profile dialog (only thing that changes from the normal
     * profile is that we don't change the user's app URL).
     * @see {@link Profile#view}
     */
    view() {
        window.app.intercom.view(false);
        window.app.view(this.header, this.main);
        (!this.managed) ? this.manage(): this.reManage(); // Don't attach MDC twice
    }

    /**
     * Manages the edit profile view.
     * @todo Document exactly what MDC components and listeners this function
     * attaches.
     */
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
        $(this.main)
            .find('[id="Show profile"] .mdc-switch input')[0]
            .addEventListener('click', () => {
                p.config.showProfile = !p.config.showProfile;
                $(this.main)
                    .find('[id="Show profile"] .mdc-list-item__secondary-text')
                    .text((p.config.showProfile) ? d.on : d.off);
            });

        function t(q, action) {
            $(main).find(q + ' input').first().focusout(action);
            return new MDCTextField($(main).find(q).first()[0]);
        };

        const bio = t('#Bio', () => {
            p.bio = bio.value;
        });
        const name = t('#Name', () => {
            p.name = Utils.caps(name.value);
        });
        name.required = true;
        const email = t('#Email', () => {
            p.email = email.value;
            $(main).find('#Email input').last().val(email.value);
            that.styleEmailInput();
        });
        email.required = true;
        email.disabled = false;
        this.req = [{
            input: name,
            valid: () => {
                try {
                    Utils.caps(name.value);
                    return true;
                } catch (e) {
                    return false;
                }
            },
        }, {
            input: email,
            valid: () => {
                const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                return re.test(email.value.toLowerCase());
            },
        }];
    }

    /**
     * Styles the email input (makes the floating label float above).
     * @todo Document why this is necessary to include (and where it is actually
     * used).
     */
    styleEmailInput() {
        $(this.main).find('#Email .mdc-floating-label').last()
            .addClass('mdc-floating-label--float-above');
        $(this.main).find('#Email .mdc-notched-outline').last()
            .addClass('mdc-notched-outline--notched');
    }

    addSubjectInput() {
        const add = (e, el) => { // Add split input item to profile
            const sel = this.render.splitListItem(e, el);
            if ($('[id="Subject"]').length) {
                $(sel).insertAfter($('[id="Subject"]').last().parent());
            } else if (this.profile.type === '') {
                $(sel).insertAfter($('[id="User for"]'));
            } else {
                $(sel).insertAfter($('[id="' + this.profile.type + ' for"]'));
            }
            sel.scrollIntoView();
            this.subjectsDialog.view();
        };
        const t = (l, v) => { // Render and attach subject text field
            const el = this.render.textField(l, v);
            MDCTextField.attachTo(el);
            $(el).click(() => this.subjectsDialog.view());
            return el;
        };

        add(t('Subject', ''), t('Subject', '')); // Add empty inputs
    }

    /**
     * Removes the subject input and updates the profile's subjects locally
     * (we override the original {@link Profile#removeSubjectInput} method to
     * ensure that the profile's Firestore document isn't updated until the
     * supervisor clicks 'Ok').
     * @see {@link EditSubjectsDialog#updateSubjects}
     */
    async removeSubjectInput() {
        $(this.main).find('[id="Subject"]').last().parent().remove();
        EditSubjectsDialog.updateSubjects(this.profile);
    }

    /**
     * Adds the availability input (we override the original 
     * {@link Profile#addAvailabilityInput} method to ensure tat the profile's 
     * Firestore document isn't updated until the supervisor clicks 'Ok').
     */
    addAvailabilityInput() {
        const el = this.render.textFieldItem('Available', '');
        const dialog = new EditAvailabilityDialog(el, this.profile);
        MDCTextField.attachTo(el);
        el.addEventListener('click', () => dialog.view());
        $(el).insertAfter(
            $(this.main).find('[id="Available"]').last().parent());
        el.scrollIntoView();
        $(el).click();
    }

    /**
     * Removes the availability input and updates the profile's availability 
     * locally (we override the original {@link Profile#removeAvailabilityInput} 
     * method to ensure that the profile's Firestore document isn't updated 
     * until the supervisor clicks 'Ok').
     * @see {@link EditAvailabilityDialog#updateAvailability}
     */
    removeAvailabilityInput() {
        $(this.main).find('[id="Available"]').last().parent().remove();
        EditAvailabilityDialog.updateAvailability(this.profile);
    }

    /**
     * Gets if the currently populated fields are valid or not.
     * @return {bool} Whether the currently selected/inputted values are valid.
     */
    get valid() {
        String.prototype.replaceAll = function(search, replacement) {
            var target = this;
            return target.replace(new RegExp(search, 'g'), replacement);
        };
        var valid = true;
        this.req.forEach((req) => {
            if (!req.input.valid ||
                req.input.value.replaceAll(' ', '') === '' ||
                !req.valid()) valid = req.input.valid = false;
        });
        return valid;
    }

    /**
     * Navigates back and creates a new profile with the currently selected 
     * values.
     */
    createProfile() {
        if (!this.valid) return;
        this.profile.location = window.app.location.name;
        this.profile.id = this.profile.email;
        this.profile.authenticated = this.profile.type === 'Tutor' ||
            this.profile.type === 'Pupil';
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
        window.app.snackbar.view('Creating profile...');
        Data.createUser(this.profile).then(() => {
            window.app.snackbar.view('Created ' +
                this.profile.type.toLowerCase() + ' profile for ' +
                this.profile.name + '.');
        }).catch((err) => {
            console.error('[ERROR] While creating profile for ' +
                this.profile.email + ':', err);
            window.app.snackbar.view('Could not create profile. ' +
                this.profile.name.split(' ')[0] + ' probably already has one.');
        });
    }
};

/**
 * Class that represents the dialog view that enables supervisors to edit 
 * profiles that already exist.
 * @extends NewProfile
 */
export class EditProfile extends NewProfile {
    /**
     * Manages the profile view by attaching an mdc ripple to the delete user 
     * button (in addition to everything that the 
     * [NewProfile]{@link NewProfile#manage} already does).
     */
    manage() {
        super.manage();
        MDCRipple.attachTo($(this.main).find('.delete-user-input button')[0]);
    }

    /**
     * Renders the edit profile view by:
     * 1. Replacing the title (and submission action) of the mdc top app bar.
     * 2. Styling the email input (see {@link NewProfile#styleEmailInput}).
     * 3. Adding (and managing) the delete user button again.
     * 4. Replacing the type text field with a type select (such that 
     * supervisors are able to modify a user's type before matching them --> the 
     * current workaround for those who are both pupil and tutor).
     * 5. Replacing the text field search items with just normal text fields (we
     * no longer care about duplicate accounts). 
     */
    renderSelf() {
        super.renderSelf();
        this.header = this.render.header('header-action', {
            title: 'Edit Profile',
            ok: () => this.updateProfile(),
        });
        this.styleEmailInput();
        $(this.main).append(this.render.template('delete-user-input', {
            delete: () => new ConfirmationDialog('Delete Account?',
                'You are about to permanently delete ' + this.profile.name +
                '\'s account data. This action cannot be undone. Please ' +
                'ensure to check with your fellow supervisors before ' +
                'continuing.', async () => {
                    window.app.nav.back();
                    const [err, res] = await to(
                        Data.deleteUser(this.profile.uid));
                    if (err) return window.app.snackbar.view('Could not ' +
                        'delete account.');
                    window.app.snackbar.view('Deleted account.');
                }).view(),
        }));
        $(this.main).find('#Type').replaceWith(this.render.select('Type', this
            .profile.type, Data.types));
        $(this.main).find('#Name').parent().parent().replaceWith(
            this.render.textFieldItem('Name', this.profile.name));
        $(this.main).find('#Email').first().parent().parent().replaceWith(
            this.render.textFieldItem('Email', this.profile.email));
    }

    /**
     * Updates the profile with the currently selected items.
     */
    updateProfile() {
        if (!this.valid) return;
        this.profile.id = this.profile.email;
        window.app.nav.back();
        Data.updateUser(this.profile).then(() => {
            window.app.snackbar.view('Updated ' + this.profile.name + '\'s ' +
                'profile.');
        }).catch((err) => {
            console.error('[ERROR] While updating profile for ' +
                this.profile.email + ':', err);
            window.app.snackbar.view('Could not update profile.');
        });
    }
};

/**
 * Class that represents the profile that service hour tutors see in their
 * "Profile" tab.
 * @extends Profile
 */
export class TutorProfile extends Profile {
    /**
     * Renders the tutor profile view by replacing the bio field with a service 
     * hours field (shows the tutor how many service hours they've tracked).
     */
    renderSelf() {
        super.renderSelf();
        $(this.main).find('#Bio').replaceWith($(this.render.textField(
            'Service hours',
            Utils.getDurationStringFromSecs(this.profile.secondsTutored || 0),
        )).attr('style', 'margin-right:20px;'));
    }

    manage(dontUpdate) {
        super.manage(dontUpdate);
        MDCTextField.attachTo($(this.main).find('[id="Service hours"]')[0]);
        $(this.main).find('[id="Service hours"] input').attr('disabled', 'true');
    }

    renderServiceHourCard() {
        const card = this.render.template('card-service-hours', {
            title: (window.app.onMobile) ? 'Service' : 'Service Hours',
            subtitle: (window.app.onMobile) ? 'Track your hours' : 'Track ' +
                'your progress',
            summary: (window.app.onMobile) ? 'Keep track of your service ' +
                'hours and progression towards your goals.' : 'Visualize ' +
                'your progress towards graduation requirements (a total of 15' +
                ' hours as part of the Living Skills class that are shown ' +
                'here) or other goals.',
            snooze: () => {
                $(card).remove();
            },
            history: () => {
                window.app.schedule.view();
            },
            info: () => {
                window.open('https://gunn.pausd.org/campus-life/community-' +
                    'service');
            },
            paid: () => {
                Utils.showPayments();
            },
        });
        setTimeout(() => {
            const tracked = new Number(Utils.getDurationStringFromSecs(
                this.profile.secondsTutored).split(':')[0]);
            this.render.progressDoughnut({
                requirement: (15 - tracked),
                tracked: tracked,
                canvas: $(card).find('canvas')[0],
            });
        }, 200);
        const menu = Utils.attachMenu($(card).find('.mdc-menu')[0]);
        $(card).find('button')[0].addEventListener('click', () => {
            menu.open = true;
        });
        $(card).find('button').each(function() {
            MDCRipple.attachTo(this).unbounded = true;
        });
        $(card).find('.mdc-list-item').each(function() {
            MDCRipple.attachTo(this);
        });
        return card;
    }
};

/**
 * Class representing the profile view that paid tutors see.
 * @todo Finish documentation.
 */
export class PaidTutorProfile extends Profile {

    constructor(profile) {
        super(profile);
    }

    renderSelf() {
        super.renderSelf();
        $(this.main).find('#Bio').replaceWith($(this.render.select(
            'Hourly rate',
            '$' + this.profile.payments.hourlyCharge.toFixed(2),
            window.app.data.payments.hourlyChargeStrings
        )).attr('style', 'margin-right:20px;'));
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
                const [err, res] = await to(window.app.updateUser(p));
                if (err) return window.app.snackbar.view('Could not update ' +
                    'profile.');
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
                const [e, res] = await to(window.app.updateUser(that.profile));
                if (e) return window.app.snackbar.view('Could not update ' +
                    'profile.');
                window.app.snackbar.view('Profile updated.');
            });
        };

        const bio = t('[id="Background & Qualifications"]', (input) => {
            this.profile.bio = input.val();
        });
    }
};