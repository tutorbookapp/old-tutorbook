/**
 * Package that contains the onboarding flow for new schools.
 * @deprecated We moved over to hosting the onboarding flow on a form on our
 * website for the MVP. We'll work on this more later when we have time (e.g. 
 * it'd be nice to show the user's a preview of their landing page as they're
 * inputting information like Slack does as you create a new workspace).
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

import * as $ from 'jquery';

import './style.scss';

import View from '@tutorbook/view';

/**
 * Class that represents the onboarding flow screen that guides the new school 
 * through the process of:
 * 1. Selecting their subdomain (e.g. `gunn.tutorbook.app`).
 * 2. Adding a description for their school (that initially populates their
 * unique "virtual student support" landing page).
 * 3. Configuring their website configuration and location data; this could also
 * create a new `access` or school district if necessary.
 * @deprecated We moved over to hosting the onboarding flow on a form on our
 * website for the MVP. We'll work on this more later when we have time (e.g. 
 * it'd be nice to show the user's a preview of their landing page as they're
 * inputting information like Slack does as you create a new workspace).
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

    viewPage(id) {
        Object.values(this.pages).map(page => $(page).hide());
        $(this.pages[id]).show();
    }

    renderSelf() {
        this.header = this.render.template('wrapper');
        this.main = this.render.template('onboarding-wrapper');
        this.pages = {
            name: this.renderNamePage(),
            description: this.renderDescriptionPage(),
        };
        Object.values(this.pages).map(page => $(this.main).append(page));
    }

    renderNamePage() {
        const page = this.render.template('onboarding-page');
        const add = (el) => $(page).append(el);
        add(this.render.template('onboarding-title', {
            title: 'First, enter your school\'s name',
        }));
        add(this.render.template('onboarding-description', {
            description: 'Voluptas perferendis autem quasi est saepe ea nobis' +
                ' molestiae. Nostrum nesciunt quia nihil distinctio atque ' +
                'debitis error. Nihil at voluptatem recusandae a est. Rerum ' +
                'dicta sapiente deleniti aspernatur.',
        }));
        add(
            this.render.searchTextFieldItem('School name'),
            this.name,
            this.searchNames,
        );
        add(this.render.splitTextFieldItem(
            'Landing page subdomain',
            this.subdomain,
            '.tutorbook.app',
        ));
        add(this.render.button('Continue setup', () => {}, {
            arrow: true,
        }));
        return page;
    }

    renderDescriptionPage() {
        const page = this.render.template('onboarding-page');
        const add = (el) => $(page).append(el);
        /*
         *add(this.render.textAreaItem('School description'));
         *add(this.render.button('Finish setup with Google', {
         *    arrow: true,
         *    google: true,
         *}));
         */
        return page;
    }

    /**
     * Searches the existing school names so that the user doesn't select a 
     * duplicate when their school already exists. If it does already exist, 
     * the user should click on the search result and be redirected to the 
     * sign-in page or landing page of their school.
     * @type searchCallback
     */
    searchNames() {

    }

    manage() {

    }
}