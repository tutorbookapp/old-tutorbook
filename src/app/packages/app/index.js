/**
 * Package that contains the primary app class (`Tutorbook`) that depends on all 
 * of our other app packages and creates an instance of each one depending on 
 * the app user's and website's configuration.
 * @module @tutorbook/app
 * @see {@link https://npmjs.com/package/@tutorbook/app}
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

// Dependencies
import * as $ from 'jquery';

// App styling (Sass)
import './styles/main.scss';
import './styles/cards.scss';
import './styles/welcome.scss';
import './styles/dialogs.scss';
import './styles/schedule.scss';
import './styles/chat.scss';
import './styles/profile.scss';
import './styles/search.scss';
import './styles/ads.scss';
import './styles/dashboard.scss';
import './styles/snackbar.scss';
import './styles/login.scss';
import './styles/cta-link.scss';
import './styles/email-form.scss';

// App styling (CSS)
import './styles/loader.css';
import './styles/payments.css';
import './styles/clock.css';
import './styles/user.css';
import './styles/search.css';
import './styles/filters.css';
import './styles/history.css';
import './styles/matching.css';
import './styles/chats.css';
import './styles/header.css';

$('body').show(); // Only show `body` after styles have been loaded.

// Polyfills
import 'core-js';
import 'regenerator-runtime';

// Dependencies (cont.)
import to from 'await-to-js';

// Firebase
import * as firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';

// App packages
import {
    Dashboard,
    SupervisorDashboard,
} from '@tutorbook/dashboard';
import {
    Search,
    SearchHeader,
} from '@tutorbook/search';
import {
    Profile,
    PaidTutorProfile,
    TutorProfile,
    EditProfile,
} from '@tutorbook/profile';
import {
    Schedule,
    SupervisorSchedule,
} from '@tutorbook/schedule';
import {
    Chats,
    SupervisorChats,
} from '@tutorbook/chats';
import {
    Login,
    GoToWebsitePrompt,
    GoToRootPrompt,
    WebsiteConfigMissingPrompt,
} from '@tutorbook/login';
import {
    Matching,
    MatchingDialog,
} from '@tutorbook/matching';
import Stats from '@tutorbook/stats';
import Config from '@tutorbook/config';
import Analytics from '@tutorbook/analytics';
import Payments from '@tutorbook/payments';
import Notify from '@tutorbook/notify';
import Snackbar from '@tutorbook/snackbar';
import Navigation from '@tutorbook/navigation';
import Help from '@tutorbook/intercom';
import Listener from '@tutorbook/listener';
import Onboarding from '@tutorbook/onboarding';

// Dependency cycle workarounds
import {
    NotificationDialog,
} from '@tutorbook/dialogs';
import Card from '@tutorbook/card';

// Helper packages
import Utils from '@tutorbook/utils';
import Render from '@tutorbook/render';
import Data from '@tutorbook/data';

/** 
 * Class that represents the uppermost level of our web app and holds all the 
 * other main app views (i.e. those accessible from the modal navigation 
 * drawer) as properties (e.g. `window.app.chats` points to the user's messages 
 * view). 
 */
export default class Tutorbook {

    /**
     * Creates a new Tutorbook object:
     * 1. Initializes the website's configuration data (**without** grabbing
     * any location data).
     * 2. Signs in (or uses existing authentication cookies if the user has 
     * already signed in) the user with [Firebase Authentication]{@link 
     * https://firebase.google.com/docs/auth/web/start}.
     * 3. Initializes the rest of the app's local data (e.g. locations), all app 
     * views and packages, and routes the user to their desired destination 
     * (based on their URL) within the app.
     * @example
     * window.app = new Tutorbook(); // Creates a new global web app instance.
     */
    constructor() {
        this.logJobPost();
        this.initFirebase();

        /**
         * The version of the app package. This should also match the versions
         * of each subpackage (as they're managed with 
         * [Lerna]{@link https://lerna.js.org}).
         * @const {string} version
         * @todo Each change released to production (via CI) should have a 
         * corresponding GitHub tag & release denoted here.
         * @memberof module:@tutorbook/app~Tutorbook#
         */
        this.version = 'v0.5.3';

        /**
         * The URL to view our source code. We must include clear links to view 
         * application source code as we are using the AGPL V3 license (see 
         * section 13) with the Commons Clause.
         * @const {string} sourceURL
         * @example
         * window.open(window.app.sourceURL);
         * @memberof module:@tutorbook/app~Tutorbook#
         */
        this.sourceURL = 'https://github.com/tutorbookapp/tutorbook';

        /**
         * Whether or not the app refers to a test partition.
         * @const {bool} test
         * @memberof module:@tutorbook/app~Tutorbook#
         */
        this.test = false;

        /**
         * An array of Firestore query `unsubscribe` functions (returned from 
         * calling `onSnapshot` on a [Query]{@link external:Query}). We `map` 
         * through this array and unsubscribe from all of those listeners before 
         * signing out (to avoid authentication errors).
         * @const {Array<Function>} listeners
         * @see {@link module:@tutorbook/app~Tutorbook#signOut}
         * @memberof module:@tutorbook/app~Tutorbook#
         */
        this.listeners = [];

        /**
         * The URL of our REST API endpoint (hosted with [Google Cloud 
         * Functions]{@link https://cloud.google.com/functions/}).
         * @const {string} functionsURL
         * @memberof module:@tutorbook/app~Tutorbook#
         */
        this.functionsURL = 'https://us-central1-tutorbook-779d8.cloudfunctio' +
            'ns.net/';

        /**
         * The database partition to be used by the rest of the app.
         * @const {external:CollectionReference} db
         * @example
         * const users = (await window.app.db.collection('users').get()).docs;
         * @example
         * const locations = await window.app.db.collection('locations').get();
         * @memberof module:@tutorbook/app~Tutorbook#
         */
        this.db = (this.test) ? firebase.firestore().collection('partitions')
            .doc('test') : firebase.firestore().collection('partitions')
            .doc('default');

        if (this.test) document.title = '[Demo] ' + document.title;

        this.render = new Render();
        this.initialization = this.initWebsiteConfig();
        firebase.auth().onAuthStateChanged(user => {
            if (user) return this.startApp();
            return this.startLogin();
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

    /**
     * Views the login screen after the website configuration has been fetched 
     * and successfully initialized.
     * @return {Promise} Promise that resolves after the website configuration
     * has been initialized and the user is viewing the login screen.
     */
    async startLogin() {
        // Ensure that the website configuration is ready
        await this.initialization;

        // Helper packages
        this.analytics = this.analytics || new Analytics();

        // View the login/sign-up screen
        this.user = {};
        this.login = this.login || new Login();
        this.loader(false);
        this.login.view();
    }

    /**
     * Creates and initializes the rest of the app views and packages (starts 
     * the navigation router that routes the user to the desired destination 
     * with the app based on their URL).
     */
    async startApp() {
        // Helper packages (only if they haven't already been initialized)
        this.analytics = this.analytics || new Analytics();

        // Ensure that the website configuration is ready
        await this.initialization;
        await this.initUser();
        this.initURLParams();
        this.initOnMobile();

        // Dependency cycle workarounds
        this.SearchHeader = SearchHeader;
        this.EditProfile = EditProfile;
        this.NotificationDialog = NotificationDialog;
        this.MatchingDialog = MatchingDialog;
        this.renderHit = SearchHeader.renderHit;
        this.renderCard = Card.renderCard;

        // Helper packages (only if they haven't already been initialized)
        this.data = new Data();
        await this.data.initialization;
        this.utils = new Utils();
        this.nav = new Navigation();

        // App packages
        this.snackbar = new Snackbar();
        this.login = this.login || new Login();
        this.notify = new Notify();
        this.intercom = new Help(this.user);
        this.cards = { // TODO: Where is this actually used?
            requestsOut: {},
            approvedRequestsOut: {},
            rejectedRequestsOut: {},
        };
        this.listener = new Listener();
        this.search = new Search(this);
        if (this.user.payments.type === 'Paid') {
            this.profile = new PaidTutorProfile(this.user);
        } else if (this.user.type === 'Tutor') {
            this.profile = new TutorProfile(this.user);
        } else {
            this.profile = new Profile(this.user);
        }
        if (this.user.type === 'Supervisor') {
            this.schedule = new SupervisorSchedule();
            this.dashboard = new SupervisorDashboard();
            this.matching = new Matching();
            this.stats = new Stats();
            this.configuration = new Config();
            this.chats = new SupervisorChats();
        } else {
            this.schedule = new Schedule();
            this.dashboard = new Dashboard();
            this.chats = new Chats();
        }
        this.payments = new Payments();
        this.onboarding = new Onboarding();

        this.loader(false);
        this.nav.start();
    }

    /**
     * Initializes app variables based on URL parameters.
     * @todo Debug security issues b/c anyone can fake any URL parameters.
     * @todo Actually use standard URL parameter syntax here (i.e. instead of 
     * separating pairs with a `?` use an `&`).
     * @return {Promise} Promise that resolves once the data has been synced 
     * with the app and the current user's Firestore profile document.
     */
    initURLParams() {
        const pairs = window.location.toString().split('?');
        return Promise.all(pairs.map(p => p.split('=')).map(([key, val]) => {
            switch (key) {
                case 'code':
                    this.user.cards.setupStripe = false;
                    this.redirectedFromStripe = true; // For payments
                    this.snackbar.view('Connecting payments account...');
                    return axios({
                        method: 'GET',
                        url: this.functionsURL + 'initStripeAccount',
                        params: {
                            code: val.replace('/', ''),
                            id: firebase.auth().currentUser.uid,
                            test: this.test,
                        },
                    }).then((res) => {
                        this.snackbar.view(
                            'Connected payments account.', 'View', () => {
                                window.open(res.data.url); // Opens dashboard
                            });
                    }).catch((err) => {
                        console.error('[ERROR] While initializing Stripe ' +
                            'account:', err);
                        this.snackbar.view('Could not connect payments ' +
                            'account.', 'Retry', () => {
                                window.location = this.payments.setupURL;
                            });
                    });
            }
        }));
    }

    /** 
     * Initializes Tutorbook's website configuration and location data before
     * initializing the rest of the helper packages and logging the user in.
     * @deprecated
     */
    async preInit() {
        // Website configuration and locations
        this.data = new Data(this.db, false);
        await this.initWebsiteConfig();
        this.data.init(this.config, this.locations);

        // Helper packages
        this.render = new Render();
        this.utils = new Utils();
        this.snackbar = new Snackbar(this.render);
        this.initOnMobile();

        // Authentication
        firebase.auth().onAuthStateChanged(async user => {
            if (user) {
                await this.initUser();
                Utils.urlData();
                if (this.user.type === 'Supervisor' &&
                    this.user.authenticated &&
                    !this.userClaims.supervisor) {
                    new NotificationDialog('Invalid Authentication', 'You ' +
                        'have tried to login as a supervisor but lack the ' +
                        'required custom authentication claims. Either wait ' +
                        'a few minutes and try reloading the app or continue ' +
                        '(by clicking OK or anywhere outside this dialog) ' +
                        'with your current authentication claims (that denote' +
                        ' you as a regular user). For more information, email' +
                        ' help@tutorbook.app or text me directly at (650) 861' +
                        '-2723.', () => {
                            this.init();
                            this.nav.start();
                        }).view();
                } else if (
                    this.user.authenticated ||
                    this.user.type === 'Tutor' ||
                    this.user.type === 'Pupil'
                ) {
                    this.user.authenticated = true;
                    this.init();
                    this.nav.start();
                } else {
                    Login.codeSignIn();
                }
            } else {
                this.loader(false);
                this.login();
            }
        });
    }

    /**
     * A website configuration that denotes who can access the website, what
     * locations are shown on the website, what grades can be selected on the
     * website, etc.
     * @global
     * @typedef {Object} WebsiteConfig
     * @property {external:Timestamp} created - When the website was created.
     * @property {external:Timestamp} updated - The last time the website was 
     * updated.
     * @property {string[]} domains - The email domains that can access this 
     * website (i.e. a user be logged in with an email that ends in one of these 
     * domains to be able to access this website configuration's app partition).
     * @property {string[]} grades - The grades that are shown (and thus can be 
     * selected) on this website (e.g. `['Freshman', 'Sophomore']`).
     * @property {string[]} locations - The IDs of the locations shown on this 
     * website.
     * @property {string} url - The URL of the website's app partition (e.g.
     * `'https://gunn.tutorbook.app'` or `'https://woodside.tutorbook.app'`).
     * @property {string} name - The name of the website configuration (used 
     * when showing the user error messages about invalid login attempts).
     */

    /**
     * Fetches this website's configuration data and initializes it's location 
     * data.
     * @todo Why are we using {@link Data.listen} here?
     * @return {Promise} Promise that resolves once the configuration data has
     * been fetched and initialized successfully (i.e. is accessible at 
     * `window.app.config`).
     */
    initWebsiteConfig() {
        return Data.listen(this.db
            .collection('websites')
            .where('hostnames', 'array-contains', window.location.hostname),
            websiteConfigsSnapshot => {
                const websiteConfigs = websiteConfigsSnapshot.docs;
                if (websiteConfigs.length === 1) {
                    this.config = websiteConfigs[0].data();
                    this.id = websiteConfigs[0].id;
                } else if (websiteConfigs.length > 1) {
                    console.warn('[WARNING] There was more than one website ' +
                        'config for ' + window.location + ', using first...');
                    this.config = websiteConfigs[0].data();
                    this.id = websiteConfigs[0].id;
                } else {
                    console.warn('[WARNING] There was no website config for ' +
                        window.location + ', showing error screen...');
                    return new WebsiteConfigMissingPrompt().view();
                }
            }, error => {
                console.error('[ERROR] Could not get website configurations, ' +
                    'acting as if root partition...', error);
            }, {
                db: this.db,
                listeners: this.listeners,
            });
    }

    /**
     * Replaces the currently viewed header, main, and URL and notifies the web 
     * app's navigation and ads.
     * @example
     * window.app.view(this.header, this.main, '/app/messages');
     * window.app.view(this.header, this.main); // For dialogs w/out app URLs.
     * @param {HTMLElement} header - The header element (typically an mdc-top-
     * app-bar).
     * @param {HTMLElement} main - The main element (typically an mdc-list or 
     * mdc-layout-grid)
     * @param {string} [url] - The view's URL.
     */
    view(header, main, url) {
        if (this.nav) this.nav.update(); // We can view without init();
        if (header) $('.header').empty().append(header);
        if (main) $('.main').empty().append(main);

        window.scrollTo(0, 0);

        if (!url) return;
        if (this.analytics) this.analytics.url(url);
        Utils.url(url);
    }

    /**
     * Initializes the app's user by:
     * 1. Fetching the current user's (denoted by Firebase Auth) Firestore data.
     * 2. Checking if the user fits within the current website configuration.
     * 3. Creating a new Firestore document if one doesn't already exist.
     * 4. Setting `window.app.user` equal to the whole profile, 
     * `window.app.conciseUser` equal to the 
     * [filtered]{@linkplain Utils.filterRequestUserData} profile, and 
     * `window.app.userClaims` equal to the user's custom authentication claims.
     * @todo The analytics logging here is inaccurate as the profile document is
     * updated without the user logging in or signing up.
     * @see {@link module:@tutorbook/app~Tutorbook#checkConfigCompliance}
     * @return {Promise} Promise that resolves once the app's user has 
     * successfully been initialized (and is ready to be used at 
     * `window.app.user`).
     */
    initUser() {
        const user = firebase.auth().currentUser;
        return Data.listen(['users', user.uid], async doc => {
            const profile = doc.data();
            if (!profile) {
                this.analytics.log('sign_up');
                await Data.createUser(Utils.filterProfile(user));
                await window.app.initUser();
            } else {
                this.analytics.log('login');
                await this.checkConfigCompliance(user, profile);
                this.user = Utils.filterProfile(profile);
                this.conciseUser = Utils.filterRequestUserData(profile);
                this.userClaims = (await user.getIdTokenResult(true)).claims;
                this.analytics.user(this.user);
            }
        }, async err => { // No user doc, create new user doc
            console.warn('[WARNING] Error (' + err.message + ') while ' +
                'initializing user, creating account...');
            this.analytics.log('sign_up');
            await Data.createUser(Utils.filterProfile(user));
            await window.app.initUser();
        });
    }

    /**
     * A Firebase `User` represents a user account and contains useful meta-data
     * about that user (e.g. their `displayName`, `email`, `phoneNumber`, and
     * `photoURL`).
     * @external FirebaseUser
     * @see {@link https://firebase.google.com/docs/reference/js/firebase.User}
     */

    /**
     * Checks if the given `user` (the `firebase.auth().currentUser`) and the 
     * user's `profile` (their Firestore document data) fits within the 
     * website's configuration.
     * @param {external:FirebaseUser} user - The `firebase.auth().currentUser` 
     * to check compliance for.
     * @param {Profile} [profile] - The `user`'s Firestore document data.
     * @return {Promise} Promise that resolves when we should continue with
     * the app's initialization (e.g. when we know the user fits within the
     * website configuration or wants to continue anyways in the case of the 
     * root website configuration).
     */
    async checkConfigCompliance(user, profile) {
        const continueWithInit = () => true;
        const showErrorScreen = (acc) => new GoToRootPrompt(acc).view();
        const showPromptScreen = (acc) => new GoToWebsitePrompt(acc).view();
        // If the website has a config (i.e. **not** root partition):
        if (this.checked) {} else if (this.id !== 'root' && this.config) {
            this.checked = true;
            // See if the user's email fits within the website config's access.
            const access = await this.db.collection('access').doc(this.config
                .access).get();
            for (const emailDomain of access.data().domains)
                if (user.email.endsWith(emailDomain)) return continueWithInit();
            for (const email of access.data().exceptions)
                if (user.email === email) return continueWithInit();
            // If it doesn't, show error screen that prompts the user to:
            // a) Request access
            // b) Go to root partition
            return showErrorScreen(access);
        } else { // If the website doesn't have a config (i.e. root partition):
            this.checked = true;
            // Fetch all website config IDs and check if the user's email fits 
            // within one of them.
            const accesses = (await this.db.collection('access').get()).docs;
            for (const access of accesses) {
                if (access.id === 'root') continue;
                // If it does, show prompt screen that prompts the user to:
                // a) Go to that app's partition
                // b) Continue in the root partition
                for (const emailDomain of access.data().domains)
                    if (user.email.endsWith(emailDomain))
                        return showPromptScreen(access);
                for (const email of access.data().exceptions)
                    if (user.email === email)
                        return showPromptScreen(access);
            }
            return continueWithInit(); // If it doesn't, continue.
        }
    }

    /**
     * Proxy function to Data's [updateUser]{@link Data.updateUser} method.
     * @example
     * await window.app.updateUser(); // Updates the current user's data.
     * await window.app.updateUser({ // Updates a subset of a specified user's
     * // data.
     *   uid: 'INSERT-THE-DESIRED-USER\'S-UID-HERE', // Make sure to always
     *   // include a valid user ID to update.
     *   grade: 'Junior', // Add data/fields you want to update here.
     *   gender: 'Male',
     *   subjects: ['Chemistry H'],
     * });
     * @see {@link Data.updateUser}
     */
    updateUser(user = this.user) {
        return Data.updateUser(user);
    }

    /**
     * Unsubscribes to Firestore onSnapshot listeners, logs out of Intercom 
     * Messenger widget, and logs the current user out with Firebase Auth.
     * @example
     * window.app.signOut(); // Logs the user out and unsubscribes from 
     * // Firestore `onSnapshot` listeners.
     * @see {@link Help#logout}
     * @see {@link https://firebase.google.com/docs/firestore/query-data/listen#detach_a_listener}
     */
    signOut() {
        (this.listeners || []).forEach(unsubscribe => unsubscribe());
        if (this.intercom) this.intercom.logout();
        if (this.analytics) this.analytics.log('logout');
        return firebase.auth().signOut();
    }

    /**
     * Shows and hides the default intermediate loading icon.
     * @example
     * window.app.loader(false); // Hides the loading icon.
     * @param {bool} [show=false] - Whether to show or hide the loading icon.
     */
    loader(show = false) {
        const loaderEl = $('#loader');
        if (show) {
            $('.main').empty().append(loaderEl);
            $('.header').empty();
        } else {
            loaderEl.hide();
        }
    }

    /**
     * Logs a nice welcome message (with contact information for those 
     * interested in contributing) to curious developers taking a peak at our 
     * logs or website via their browser's developer tools.
     * @see {@link http://megacooltext.com/generator/big-letters/}
     */
    logJobPost() { // Logs message to users peeking under the hood
        console.log('Welcome to...');
        console.log('===============================================');
        console.log('╔════╗╔╗─╔╗╔════╗╔═══╗╔═══╗╔══╗─╔═══╗╔═══╗╔╗╔═╗');
        console.log('║╔╗╔╗║║║─║║║╔╗╔╗║║╔═╗║║╔═╗║║╔╗║─║╔═╗║║╔═╗║║║║╔╝');
        console.log('╚╝║║╚╝║║─║║╚╝║║╚╝║║─║║║╚═╝║║╚╝╚╗║║─║║║║─║║║╚╝╝─');
        console.log('──║║──║║─║║──║║──║║─║║║╔╗╔╝║╔═╗║║║─║║║║─║║║╔╗║─');
        console.log('──║║──║╚═╝║──║║──║╚═╝║║║║╚╗║╚═╝║║╚═╝║║╚═╝║║║║╚╗');
        console.log('──╚╝──╚═══╝──╚╝──╚═══╝╚╝╚═╝╚═══╝╚═══╝╚═══╝╚╝╚═╝');
        console.log('===============================================');
        console.log('Taking a look under the hood? We\'d love to have you on ' +
            'the team. Check out our open source code at https://github.com/' +
            'tutorbookapp/tutorbook or email nicholaschiang@tutorbook.app for' +
            ' more info.');
    }

    /**
     * Prints the current view (minus any FAB buttons and the header).
     * @example
     * window.app.print(); // Hides the top app bar temporarily as it prints.
     */
    print() {
        $('.header').hide();
        $('.mdc-fab').hide();
        print();
        $('.header').show();
        $('.mdc-fab').show();
    }

    /**
     * Checks if the user is currently viewing the app on a mobile device
     * (with regex on the user agent and by checking the current window
     * viewport size).
     * @see {@link https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser}
     */
    initOnMobile() {
        var userAgentCheck = false;
        (function(a) {
            if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) userAgentCheck = true;
        })(navigator.userAgent || navigator.vendor || window.opera);

        // Now, use display size to check (NOTE: We use an || operator instead of &&
        // because we don't really care if they actually are on mobile but rather
        // care that our displays look good for their screen size)
        var screenSizeCheck = false;
        if (window.innerWidth <= 800 || window.innerHeight <= 600) {
            screenSizeCheck = true;
        }

        // If either return true, we assume the user is on mobile
        this.onMobile = userAgentCheck || screenSizeCheck;
    }
};

window.onload = () => {
    /** 
     * The `window`'s [Tutorbook]{@link module:@tutorbook/app~Tutorbook} web app 
     * instance. 
     *
     * You can access any variables or objects stored in that web app class from 
     * anywhere in your code (e.g. `window.app.render` points to a 
     * [Render]{@link Render} object).
     * @example
     * const headerEl = window.app.render.header('header-main'); // Points to an
     * // already initialized `Render` object used to render app elements.
     * @example
     * window.app.id; // Points to the hard-coded website configuration ID.
     * @example
     * for (location of window.app.locations) {
     *   // Do something with each of the locations stored in `window.app`.
     *   console.log(location.name + ' (' + location.id + ')');
     * }
     * @example
     * const timeSelect = window.app.render.select('Time', '', window.app.data
     *   .timeStrings); // Has an already initialized `Data` object too.
     * @global 
     * @see {@link module:@tutorbook/app~Tutorbook}
     */
    window.app = new Tutorbook();
};