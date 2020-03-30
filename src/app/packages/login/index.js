/**
 * Package that contains our login/sign-up screen and basic onboarding process
 * (where we ensure that user's are verified before letting them access a 
 * school's or school district's data).
 * @module @tutorbook/login
 * @see {@link https://npmjs.com/package/@tutorbook/login}
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
    MDCDialog
} from '@material/dialog/index';
import {
    MDCTextField
} from '@material/textfield/index';

import * as $ from 'jquery';

import * as firebase from 'firebase/app';
import 'firebase/auth';

import Utils from '@tutorbook/utils';

/**
 * Class that handles new logins and user sign-ups.
 * @todo Finish documentation.
 * @todo Style this login screen like our landing pages and marketing site.
 * @todo Update the styling on the Google Login button to conform with their
 * branding guidelines.
 */
export class Login {
    /**
     * Creates (and renders using `window.app.render`) a new login instance and 
     * resets the `window.app`'s user.
     */
    constructor() {
        this.render = window.app.render;
        this.renderSelf();
    }

    /**
     * Helper function to sign the user out.
     * @deprecated Use {@link module:@tutorbook/app~Tutorbook#signOut} instead.
     */
    static signOut() {
        window.app.analytics.log('logout');
        firebase.auth().signOut();
        location = '/';
    };

    view() {
        if (window.app.intercom) window.app.intercom.view(true);
        window.app.view(this.header, this.main, '/app/login');
        this.manage();
    };

    renderSelf() {
        this.header = this.render.template('wrapper');
        this.main = this.render.template('login', {
            back: () => displaySection('page-login'),
            login: () => {
                Utils.url('/app/home'); // Don't redirect back to login page
                Login.viewGoogleSignIn();
            },
            signup: () => {
                displaySection('page-signup');
                window.app.user.cards = {};
            },
            expand: () => {
                // TODO: Add animations to scroll these els in and out
                this.main.querySelector('#expand-button').style.display =
                    'none';
                this.main.querySelector('#expand').style.display = 'inherit';
                $(this.main).find('#first-login-prompt').hide();
            },
            collapse: () => {
                this.main.querySelector('#expand').style.display = 'none';
                // NOTE: Settings display to inline-block centers the button el
                this.main.querySelector('#expand-button').style.display =
                    'inline-block';
                $(this.main).find('#first-login-prompt').show();
            },
            pupil: () => {
                /**
                 * Show setup cards in the dashboard for:
                 * 1) Their profile (i.e. subjects, availability, locations)
                 * 2) Linking Google Calendar or iCal to their account
                 * 3) Setting up their first payment method
                 * We want them to set availability so that tutors can edit
                 * their requests as needed.
                 */
                Utils.url('/app/home?cards=' + window.encodeURIComponent([
                    'searchTutors',
                    'setupNotifications',
                    'setupAvailability',
                ]) + '&auth=true&type=Pupil');
                Login.viewGoogleSignIn();
            },
            paidTutor: () => {
                Utils.url('/app/home?cards=' + window.encodeURIComponent([
                    'setupProfile',
                    'setupNotifications',
                ]) + '&payments=true&auth=true&type=Tutor');
                Login.viewGoogleSignIn();
            },
            tutor: () => {
                /**
                 * Show setup cards in the dashboard for:
                 * 1) Their profile (i.e. subjects, availability, locations)
                 * 2) Linking Google Calendar or iCal to their account
                 * 3) Setting up their first deposit/payment method
                 */
                Utils.url('/app/home?cards=' + window.encodeURIComponent([
                    'setupProfile',
                    'setupNotifications',
                ]) + '&auth=true&type=Tutor');
                Login.viewGoogleSignIn();
            },
            supervisor: () => {
                /**
                 * Show setup cards in the dashboard for:
                 * 1) Their profile (i.e. subjects, availability, locations)
                 * 2) Linking Google Calendar or iCal to their account
                 * 3) Setting up their first location or applying to be a 
                 * supervisor for an existing location
                 */
                Utils.url('/app/home?cards=' + window.encodeURIComponent([
                    'setupNotifications',
                ]) + '&auth=false&type=Supervisor');
                Login.viewGoogleSignIn();
            },
        });
        $(this.main).prepend(this.render.template('login-header'));
        const pages = this.main.querySelectorAll('.login__page');

        function displaySection(id) {
            pages.forEach(function(sel) {
                if (sel.id === id) {
                    sel.style.display = 'inherit';
                } else {
                    sel.style.display = 'none';
                }
            });
        };
        displaySection('page-login');
    }

    manage() {
        $(this.main).find('.mdc-button').each(function() {
            MDCRipple.attachTo(this);
        });
        $(this.main).find('.mdc-icon-button').each(function() {
            MDCRipple.attachTo(this).unbounded = true;
        });
    }

    static viewGoogleSignIn() {
        const provider = new firebase.auth.GoogleAuthProvider();
        return firebase.auth().signInWithRedirect(provider).catch((error) => {
            var errorCode = error.code;
            var errorMessage = error.message;
            var email = error.email;
            window.app.snackbar.view('Could not open Google login. Reload ' +
                'this page and try again.');
            console.error('[ERROR] While signing in with Google Popup:', error);
        });
    }

    static getSupervisorCodes() {
        return window.app.db.collection('auth').doc('supervisors')
            .get().catch((err) => {
                console.error('[ERROR] While getting supervisor codes:', err);
                window.app.snackbar.view('Could not fetch verification codes.');
            });
    }

    static async codeSignIn() {
        // First, we check if they have a valid supervisor code.
        const codes = (await Login.getSupervisorCodes()).data();
        const dialogEl = window.app.render.template('dialog-code-signup');
        const dialog = MDCDialog.attachTo(dialogEl);

        const codeEl = dialogEl.querySelector('#code-input');
        const codeTextField = MDCTextField.attachTo(codeEl);

        $(dialogEl).find('#description').text('To ensure that you are ' +
            'an authenticated ' + window.app.user.type.toLowerCase() + ', ' +
            'please enter the verification code that you were assigned after ' +
            'your application was processed.');

        dialog.autoStackButtons = false;
        dialog.scrimClickAction = '';
        dialog.escapeKeyAction = '';
        $('body').prepend(dialogEl);
        dialog.open();

        // Then, we check if the email that they're trying to sign into is
        // associated with that code.
        const confirmButton = dialogEl.querySelector('#confirm-button');
        confirmButton.addEventListener('click', () => {
            try {
                if (codes[firebase.auth().currentUser.uid] ===
                    codeTextField.value) {
                    dialog.close();
                    window.app.user.authenticated = true;
                    window.app.updateUser();
                    window.app.snackbar.view('Code authenticated. ' +
                        'Successfully created ' + window.app.user.type
                        .toLowerCase() + ' account.');
                    window.app.init();
                    window.app.loader(false);
                    window.app.nav.start();
                } else {
                    window.app.snackbar.view('Invalid code. Please try again.');
                    codeTextField.valid = false;
                    codeTextField.required = true;
                }
            } catch (e) {
                codeTextField.valid = false;
                codeTextField.required = true;
            }
        });

        dialog.listen('MDCDialog:closing', (event) => {
            if (event.detail.action === 'close') {
                firebase.auth().signOut();
                window.app.snackbar.view('Could not verify account. Logged ' +
                    'out.');
            }
            $(dialogEl).remove();
        });
    }
};

/**
 * Class that represents the error screen that prompts the user to:
 * a) Request access to the website partition.
 * b) Go to the [root website]{@link https://tutorbook.app/app} partition.
 */
export class GoToRootPrompt {
    /**
     * Creates (and renders) a new error screen using the given district (or 
     * `access`) configuration and `window.app.render` to render the 
     * `login-prompt` template.
     */
    constructor(access) {
        this.access = access.data();
        this.access.id = access.id;
        this.render = window.app.render;
        this.renderSelf();
    }

    /**
     * Renders the error screen that asks the user if they want to go to the
     * root app partition (using the `login-prompt` template).
     */
    renderSelf() {
        this.header = this.render.template('wrapper');
        this.main = this.render.template('login-prompt', {
            title: 'Unauthorized.',
            description: 'Sorry, you must login with an ' +
                Utils.join(this.access.domains.map(d => '@' + d), 'or', false) +
                ' email address to access this ' + this.access.name + ' app. ' +
                'Did you mean to go to our public web app?',
            secondaryDescription: 'Used the wrong email?',
            secondaryLabel: 'Login again',
            secondaryAction: () => window.app.signOut(),
        });
        const btn = this.render.template('login-prompt-btn', {
            label: 'Go to public app',
            action: () => window.location = 'https://tutorbook.app/app',
        });
        MDCRipple.attachTo(btn);
        $(this.main).find('.login__button-container').prepend(btn);
        $(this.main).prepend(this.render.template('login-header'));
    }

    /**
     * Views the error prompt screen and doesn't resolve until the user has
     * chosen an option.
     * @return {Promise} Promise that resolves after the user has chosen an
     * option.
     */
    view() {
        if (window.app.intercom) window.app.intercom.view(true);
        window.app.loader(false);
        window.app.view(this.header, this.main);
        return new Promise((res, rej) => this.wait(res, rej));
    }

    /**
     * The tether function passed to the `Promise` returned by 
     * {@link module:@tutorbook/login~GoToRootPrompt#view}.
     * @param {Function} res - The `resolutionFunc` that resolves the `Promise`.
     * @param {Function} rej - The `rejectionFunc` that rejects the `Promise`.
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise}
     */
    wait(res, rej) {
        this.resolve = res;
        this.reject = rej;
    }
};

/**
 * Class that represents the prompt screen that prompts the user to:
 * a) Go to the given website's partition.
 * b) Continue to the [root website]{@link https://tutorbook.app/app} partition.
 */
export class GoToWebsitePrompt {
    /**
     * Creates (and renders) a new prompt screen that prompts the user to go to 
     * the given website's app partition.
     * @param {AccessConfig} access - The district (or `access`) configuration 
     * to ask the user to go to.
     */
    constructor(access) {
        this.access = access.data();
        this.access.id = access.id;
        this.render = window.app.render;
        this.rendering = this.renderSelf();
    }

    /**
     * Renders the prompt screen that asks the user if they want to login to
     * their school's app partition (using the `login-prompt` template).
     */
    async renderSelf() {
        this.header = this.render.template('wrapper');
        this.main = this.render.template('login-prompt', {
            title: 'Part of ' + this.access.symbol + '?',
            description: 'You\'re signed in with a ' + this.access.name +
                ' email address but are accessing Tutorbook\'s public web app' +
                '. Did you mean to go to one of ' + this.access.symbol +
                '\'s apps?',
            secondaryDescription: 'Not part of ' + this.access.symbol + '?',
            secondaryLabel: 'Continue to Tutorbook',
            secondaryAction: () => this.resolve(),
        });
        $(this.main).prepend(this.render.template('login-header'));
        (await window.app.db
            .collection('websites')
            .where('access', '==', this.access.id)
            .get()
        ).docs.sort((a, b) => a.data().name.localeCompare(b.data().name))
            .map(website => {
                const btn = this.render.template('login-prompt-btn', {
                    label: 'Go to ' + website.data().name + '\'s app',
                    action: () => window.location = website.data().url,
                });
                MDCRipple.attachTo(btn);
                $(this.main).find('.login__button-container').prepend(btn);
            });
    }

    /**
     * Views the website prompt screen and doesn't resolve until the user has
     * chosen an option.
     * @return {Promise} Promise that resolves after the user has chosen an
     * option.
     */
    async view() {
        await this.rendering;
        if (window.app.intercom) window.app.intercom.view(true);
        window.app.loader(false);
        window.app.view(this.header, this.main);
        return new Promise((res, rej) => this.wait(res, rej));
    }

    /**
     * The tether function passed to the `Promise` returned by 
     * {@link module:@tutorbook/login~GoToWebsitePrompt#view}.
     * @param {Function} res - The `resolutionFunc` that resolves the `Promise`.
     * @param {Function} rej - The `rejectionFunc` that rejects the `Promise`.
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise}
     */
    wait(res, rej) {
        this.resolve = res;
        this.reject = rej;
    }
};

/**
 * Class that represents the "website configuration could not be found" error
 * screen that triggers when there is no website configuration with the 
 * website's URL yet. We then prompt the user to return to our public web app or
 * contact support via phone/email.
 */
export class WebsiteConfigMissingPrompt {
    /**
     * Creates (and renders) a new error screen instance.
     */
    constructor() {
        this.render = window.app.render;
        this.renderSelf();
    }

    /**
     * Views the error screen and returns a promise that never resolves (as it 
     * resolves when the user is redirected to another page).
     * @return {Promise} Promise that never resolves (as the user should not be 
     * able to access a web app that lacks a configuration).
     */
    view() {
        if (window.app.intercom) window.app.intercom.view(true);
        window.app.loader(false);
        window.app.view(this.header, this.main);
        return new Promise((res, rej) => this.wait(res, rej));
    }

    /**
     * Renders the error screen with the `window.app.render` 
     * [Render]{@link module:@tutorbook/render} object.
     */
    renderSelf() {
        this.header = this.render.template('wrapper');
        this.main = this.render.template('login-prompt', {
            title: 'Unknown Website',
            description: 'We could not find the website configuration for ' +
                window.location.hostname + '. Did you mean to go to our ' +
                'public web app?',
            secondaryDescription: 'Is this a mistake?',
            secondaryLabel: 'Report an issue',
            secondaryAction: () => {
                window.open(window.app.sourceURL + '/issues/new');
            },
        });
        $(this.main)
            .prepend(this.render.template('login-header'))
            .find('.login__button-container')
            .prepend(this.render.template('login-prompt-btn', {
                label: 'Go to public app',
                action: () => window.location = 'https://tutorbook.app/app',
            })).find('.mdc-button').each(function() {
                MDCRipple.attachTo(this);
            });
    }

    /**
     * Stub function to create a `Promise` that never resolves.
     * @param {Function} res - The `Promise`'s resolution callback.
     * @param {Function} rej - The `Promise`'s rejection callback.
     */
    wait(res, rej) {}
};