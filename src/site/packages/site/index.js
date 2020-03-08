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
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

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
        firebase.auth().onAuthStateChanged(user => {
            if (user) document.querySelector('site-header').setLoggedIn(true);
        });
    }
}

window.onload = () => window.site = new Site();

module.exports = Site;