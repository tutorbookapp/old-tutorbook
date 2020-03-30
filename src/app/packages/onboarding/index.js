/**
 * Package that contains the onboarding flow for new schools.
 * @module @tutorbook/onboarding
 * @see {@link https://npmjs.com/package/@tutorbook/onboarding}
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

import * as $ from 'jquery';
import to from 'await-to-js';

import './style.scss';

import {
    Login
} from '@tutorbook/login';
import View from '@tutorbook/view';
import Utils from '@tutorbook/utils';
import Data from '@tutorbook/data';

/**
 * Class that represents the onboarding flow screen that guides the new school 
 * through the process of:
 * 1. Selecting their subdomain (e.g. `gunn.tutorbook.app`). Once they select 
 * their subdomain, we redirect them to Google to login after which they are
 * redirected back to this onboarding page to continue setting things up.
 * 2. Adding a description for their school (that initially populates their
 * unique "virtual student support" landing page).
 * 3. Configuring their website configuration and location data; this could also
 * create a new `access` or school district if necessary.
 * **Note that** you can skip any of these steps by sending their corresponding
 * data pre-filled as URL query parameters and setting the query parameter 
 * `skip=true`.
 * @todo Accept query parameters to pre-fill signup items.
 * @extends module:@tutorbook/view
 */
export default class Onboarding extends View {
    /**
     * Creates (and renders) a new onboarding view and pre-populates it with ' +
     * info sent via the URL queries.
     */
    constructor() {
        super(true);
        const params = new URLSearchParams(window.location.search);
        ['name', 'subdomain', 'skip'].forEach(param => {
            this[param] = params.get(param) || '';
        });
        this.renderSelf();
    }

    /**
     * Views the onboarding screen at `/app/signup` and forwards to the correct 
     * page in the onboarding flow (see the class description for more info on
     * how that works).
     */
    view() {
        super.view('/app/signup');
        if (this.name && this.subdomain && this.skip) {
            this.viewPage('setup');
        } else if (this.name && this.skip) {
            this.viewPage('subdomain');
        } else {
            this.viewPage('name');
        }
    }

    /**
     * Views the given page.
     * @param {string} id - The ID of the page to view (there must be a valid 
     * `HTMLElement` at `this.pages[id]`).
     * @todo Check that we have filled out the previous pages before viewing a 
     * page later on in the onboarding flow.
     */
    viewPage(id) {
        Object.values(this.pages).map(page => $(page).hide());
        $(this.pages[id]).show();
        if (id === 'setup') this.setup();
    }

    /**
     * Renders `this.header` and `this.main` using the corresponding 
     * `onboarding` templates (e.g. `onboarding-main` for `this.main`) and 
     * appends each onboarding page to `this.pages` and `this.main`.
     */
    renderSelf() {
        this.header = this.render.template('onboarding-header');
        this.main = this.render.template('onboarding-main');
        this.pages = {
            name: this.renderNamePage(),
            subdomain: this.renderSubdomainPage(),
            setup: this.renderSetupPage(),
        };
        Object.values(this.pages).map(page => $(this.main).append(page));
    }

    /**
     * Creates the `website` document in the `root` district.
     * @todo Add email domain restriction configuration to settings or 
     * onboarding flow.
     * @return {Promise} Promise that resolves with the website URL once the 
     * `website` configuration has been created.
     */
    async setup() {
        const btn = $(this.pages.setup).find('#loading-btn');
        const arrow = this.render.template('cta-link-arrow');
        const messages = [
            'Creating landing page...',
            'Partitioning resources...',
            'Putting it all together...',
            'Adding final touches...',
        ];
        var messageIndex = 0;
        const loadingMessages = window.setInterval(() => {
            messageIndex++;
            if (messageIndex > messages.length - 1) messageIndex = 0;
            $(btn).find('.mdc-button__label').text(messages[messageIndex]);
        }, 1500);
        const website = {
            name: this.name,
            hostnames: [this.subdomain + '.tutorbook.app'],
            url: 'https://' + this.subdomain + '.tutorbook.app/',
            locations: ['root'],
            access: 'root',
            created: new Date(),
            updated: new Date(),
        };
        const [err, res] = await to(Data.createWebsite(website));
        window.clearInterval(loadingMessages);
        if (err) {
            btn.find('.mdc-button__label').text('Could not create app.').end()
                .find('.loader').remove();
            window.app.snackbar.view(
                'Could not create web app.',
                'Get Help',
                () => window.location = 'mailto:nc26459@pausd.us',
                true,
                -1,
            );
        } else {
            btn.removeAttr('disabled').click(() => window.location = url)
                .find('.mdc-button__label')
                .text('Go to ' + this.name + '\'s app').append(arrow).end()
                .find('.loader').remove();
        }
    }

    /**
     * Renders, manages, and returns the setup loading page. This is just a 
     * fancy loading page that shows descriptions of what's going on behind the 
     * scenes before we redirect them to their own app and launch an Intercom 
     * product tour.
     * @return {HTMLElement} The rendered (and managed) setup loading page.
     */
    renderSetupPage() {
        const page = this.render.template('onboarding-page', {
            title: 'Welcome, ' + window.app.user.name.split(' ')[0] + '. ' +
                'We\'re creating your web app...',
        });
        const loader = this.render.template('onboarding-loading-btn');
        MDCRipple.attachTo(loader);
        $(page).find('.onboarding__content').find('form').replaceWith(loader);
        return page;
    }

    /**
     * Renders, manages, and returns the name selection page.
     * @todo Check our Firestore database and ensure that there are no duplicate 
     * school names.
     * @return {HTMLElement} The rendered (and managed) name input page.
     */
    renderNamePage() {
        const page = this.render.template('onboarding-page', {
            title: 'What\'s the name of your school or organization?',
            placeholder: 'Ex. Gunn High School or Americorps',
            label: 'Next',
            error: 'Please enter a valid name.',
        });
        $(page)
            .find('#onboarding-terms').append('By continuing, you\'re ' +
                'agreeing to our <a href="/legal/#terms">Terms and Conditions' +
                'of Use</a>, <a href="/legal/#privacy">Privacy Policy</a>, ' +
                'and <a href="/legal/#security">Security Policy</a>.').end()
            .find('#onboarding-form').on('submit', event => {
                event.preventDefault();
                // TODO: Check our Firestore database and ensure that there are 
                // no duplicate school names.
                this.name = $(page).find('#onboarding-input').val();
                if (this.name === '') {
                    $(page)
                        .find('#onboarding-input').attr('aria-invalid', true)
                        .end().find('#onboarding-error')
                        .addClass('email-form__error-message--active');
                } else {
                    $(page).find('#onboarding-error')
                        .removeClass('email-form__error-message--active');
                    this.viewPage('subdomain');
                }
                return false;
            }).end().find('#onboarding-input').keydown(() => {
                if ($(page).find('#onboarding-input').val() !== '') $(page)
                    .find('#onboarding-input').attr('aria-invalid', false)
                    .find('#onboarding-error')
                    .removeClass('email-form__error-message--active');
            });
        return page;
    }

    /**
     * Renders, manages, and returns the subdomain/app location selection page.
     * @todo Check our Firestore database and ensure that there are no existing
     * `website`s already using the inputted subdomain.
     * @todo Reserve the selected subdomain name if it is valid for a couple 
     * minutes while the user signs up with Google.
     * @todo Send or store signup flow information such that the app can access
     * it once the user signs in (**and** make sure to create the `website` and
     * `location` documents **only after** the user has signed in to verify 
     * they're an actual human).
     * @see {@link https://stackoverflow.com/questions/7930751/regexp-for-subdomain}
     * @return {HTMLElement} The rendered and managed subdomain selection page.
     */
    renderSubdomainPage() {
        const page = this.render.template('onboarding-page', {
            title: 'Choose a name for your school\'s or organization\'s web app.',
            placeholder: 'organization',
            label: '.tutorbook.app',
            error: 'Please enter a valid subdomain.',
        });
        const validSubdomain = new RegExp('[A-Za-z0-9](?:[A-Za-z0-9\\-]{0,61}' +
            '[A-Za-z0-9])?');
        const invalid = () => $(page)
            .find('#onboarding-input').attr('aria-invalid', true)
            .end().find('#onboarding-error')
            .addClass('email-form__error-message--active');
        const valid = () => $(page)
            .find('#onboarding-input').attr('aria-invalid', false)
            .end().find('#onboarding-error')
            .removeClass('email-form__error-message--active');
        const signup = event => {
            event.preventDefault();
            // TODO: Check our Firestore database and ensure that there are 
            // no duplicate subdomain names.
            this.subdomain = $(page).find('#onboarding-input').val();
            if (this.subdomain === '') {
                invalid();
            } else if (!validSubdomain.test(this.subdomain)) {
                invalid();
            } else {
                valid();
                Utils.url('/app/signup?skip=true&name=' +
                    window.encodeURIComponent(this.name) + '&subdomain=' +
                    window.encodeURIComponent(this.subdomain));
                Login.viewGoogleSignIn();
            }
        };
        const btn = this.render.template('onboarding-signup-btn', {
            signup: signup,
        });
        MDCRipple.attachTo(btn);
        $(page).find('#onboarding-form').addClass('onboarding__subdomain-form')
            .find('button').attr('disabled', 'disabled').end().end()
            .find('#onboarding-terms').append('This name can only contain ' +
                '<code>a-z</code>, <code>0-9</code>, and <code>-</code> (no ' +
                'spaces). You can change this name later by <a href="mailto:' +
                'nc26459@pausd.us" target="_blank">contacting support</a>.')
            .end().find('.onboarding__content').append(btn).end()
            .find('#onboarding-input').keydown(event => {
                const subdomain = $(page).find('#onboarding-input').val();
                if (subdomain !== '' && validSubdomain.test(subdomain)) valid();
                if (event.keyCode === 13) $(page).find('#signup-btn').click();
            });
        return page;
    }

    /**
     * Searches the existing school names so that the user doesn't select a 
     * duplicate when their school already exists. If it does already exist, 
     * the user should click on the search result and be redirected to the 
     * sign-in page or landing page of their school.
     * @todo Finish implementation and make sure to **also search** the 
     * subdomains (as that is even more important that the school names).
     * @type searchCallback
     */
    searchNames() {}
}