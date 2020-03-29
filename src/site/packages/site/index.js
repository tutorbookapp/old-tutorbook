/**
 * Package that depends on all the other custom Web Component packages (and, by
 * definition, then defines all of those web components). This is the main 
 * driver behind our [marketing website]{@link https://tutorbook.app}.
 * @module @tutorbook/site
 * @see {@link https://npmjs.com/package/@tutorbook/site}
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

import './index.scss';

import * as firebase from 'firebase/app';
import 'firebase/auth';

const ErrorMsg = require('@tutorbook/error-msg');
const Legal = require('@tutorbook/legal');
const EmailForm = require('@tutorbook/email-form');
const CTALink = require('@tutorbook/cta-link');
const Header = require('@tutorbook/header');
const HeroEmailCapture = require('@tutorbook/hero-email-capture');
const LogoParty = require('@tutorbook/logo-party');
const FeatureSpotlightVertical = require('@tutorbook/feature-spotlight-' +
    'vertical');
const Features = require('@tutorbook/features');
const LargeTestimonial = require('@tutorbook/large-testimonial');
const HeadingBlock = require('@tutorbook/heading-block');
const FeatureAnnouncement = require('@tutorbook/feature-announcement');
const EmailCapture = require('@tutorbook/email-capture');
const Footer = require('@tutorbook/footer');

/**
 * Primary class that updates the header view if the user is signed in.
 */
class Site {
    constructor() {
        this.initFirebase();
        firebase.auth().onAuthStateChanged(user => {
            if (user) document.querySelector('site-header').setLoggedIn(true);
        });
    }

    /**
     * Initializes Firebase using the Firebase web app configuration.
     * @see {@link https://firebase.google.com/docs/web/setup#config-object}
     */
    initFirebase() {
        firebase.initializeApp({
            apiKey: 'AIzaSyC1BOKCrCkDOpAkyqtesQbel66dwa_7G5s',
            authDomain: 'tutorbook-779d8.firebaseapp.com',
            databaseURL: 'https://tutorbook-779d8.firebaseio.com',
            projectId: 'tutorbook-779d8',
            storageBucket: 'tutorbook-779d8.appspot.com',
            messagingSenderId: '488773238477',
            appId: '1:488773238477:web:2208dcb53cf7cd25f83384',
            measurementId: 'G-13845PV7P1',
        });
    }
}

window.onload = () => window.site = new Site();

module.exports = Site;