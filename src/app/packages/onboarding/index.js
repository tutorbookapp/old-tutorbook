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

import './style.scss';

import {
    Login
} from '@tutorbook/login';
import View from '@tutorbook/view';

/**
 * Class that represents the onboarding flow screen that guides the new school 
 * through the process of:
 * 1. Selecting their subdomain (e.g. `gunn.tutorbook.app`).
 * 2. Adding a description for their school (that initially populates their
 * unique "virtual student support" landing page).
 * 3. Configuring their website configuration and location data; this could also
 * create a new `access` or school district if necessary.
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
        ['name', 'subdomain', 'description', 'email'].forEach(param => {
            this[param] = params.get(param) || '';
        });
        this.renderSelf();
    }

    view() {
        super.view('/app/signup');
        this.viewPage('name');
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
        };
        Object.values(this.pages).map(page => $(this.main).append(page));
    }

    /**
     * Renders and returns the name selection page.
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
            }).end().find('#onboarding-input').keydown(event => {
                if ($(page).find('#onboarding-input').val() !== '') $(page)
                    .find('#onboarding-input').attr('aria-invalid', false)
                    .find('#onboarding-error')
                    .removeClass('email-form__error-message--active');
            });
        return page;
    }

    /**
     * Renders and returns the subdomain/app location selection page.
     * @todo Check our Firestore database and ensure that there are no existing
     * `website`s already using the inputted subdomain.
     * @todo Verify that the subdomain only contains valid characters.
     * @todo Send or store signup flow information such that the app can access
     * it once the user signs in (**and** make sure to create the `website` and
     * `location` documents **only after** the user has signed in to verify 
     * they're an actual human).
     * @return {HTMLElement} The rendered and managed subdomain selection page.
     */
    renderSubdomainPage() {
        const page = this.render.template('onboarding-page', {
            title: 'Choose a name for your school\'s or organization\'s web app.',
            placeholder: 'organization',
            label: '.tutorbook.app',
            error: 'Please enter a valid subdomain.',
        });
        const btn = this.render.template('onboarding-signup-btn', {
            signup: () => Login.viewGoogleSignIn(),
        });
        MDCRipple.attachTo(btn);
        $(page).find('#onboarding-form').addClass('onboarding__subdomain-form')
            .find('button').attr('disabled', 'disabled').end().end()
            .find('#onboarding-terms').append('This name can only contain ' +
                '<code>a-z</code>, <code>0-9</code>, and <code>-</code> (no ' +
                'spaces). You can change this name later by <a href="mailto:' +
                'nc26459@pausd.us" target="_blank">contacting support</a>.')
            .end().find('.onboarding__content').append(btn);
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