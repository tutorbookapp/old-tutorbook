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

import {
    Legal
} from '@tutorbook/legal';
import {
    EmailForm
} from '@tutorbook/email-form';
import {
    CTALink
} from '@tutorbook/cta-link';

import {
    Header
} from '@tutorbook/header';

import {
    HeroEmailCapture
} from '@tutorbook/hero-email-capture';

import {
    LogoParty
} from '@tutorbook/logo-party';

import {
    FeatureSpotlightVertical
} from '@tutorbook/feature-spotlight-vertical';

import {
    Features
} from '@tutorbook/features';

import {
    LargeTestimonial
} from '@tutorbook/large-testimonial';

import {
    HeadingBlock
} from '@tutorbook/heading-block';

import {
    FeatureAnnouncement
} from '@tutorbook/feature-announcement';

import {
    EmailCapture
} from '@tutorbook/email-capture';

import {
    Footer
} from '@tutorbook/footer';

/**
 * Primary class that updates the header view if the user is signed in.
 */
export class Site {
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