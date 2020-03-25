/**
 * Package that contains the navigation class that powers the user's navigation
 * experience (e.g. the nav drawer, back navigation, etc).
 * @module @tutorbook/navigation
 * @see {@link https://npmjs.com/package/@tutorbook/navigation}
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

import {
    MDCDrawer
} from '@material/drawer/index';
import {
    MDCRipple
} from '@material/ripple/index';

import * as $ from 'jquery';

import Data from '@tutorbook/data';
import User from '@tutorbook/user';
import Utils from '@tutorbook/utils';
import Navigo from 'navigo';

/**
 * Class that manages app URLs, the navigation drawer, and back navigation.
 * @todo Finish documentation.
 * @todo Don't break the browser's built-in navigation (i.e. hitting the back 
 * button in the browser should be the same as hitting the back button within 
 * the PWA).
 */
export default class Navigation {

    constructor() {
        this.render = window.app.render;
        this.views = [];
        this.menus = {};
        this.initRouter();
        this.initDrawer();
    }

    update() {
        // We store all past views in an array. To go back, simply show the
        // last item in that array. If the array is empty, go to the dashboard.
        if ($('.header .mdc-top-app-bar').length) { // Skip initial empty view
            this.views.push({
                header: document.querySelector('.header').firstElementChild,
                main: document.querySelector('.main').firstElementChild,
                url: document.location.pathname,
            });
            this.views[this.views.length - 1].scroll = $(document).scrollTop();
        }
    }

    back() {
        // Show lastView and update views
        // TODO: Fix errors in "Matching" view that require us to do this
        const lastView = window.app.nav.views.pop();
        if (!lastView) return window.app.dashboard.view(); // Show home view
        $('.header').empty().append(lastView.header);
        $('.main').empty().append(lastView.main);
        window.scrollTo(lastView.scroll, lastView.scroll);
        Utils.url(lastView.url);
        window.app.nav.manage();
        switch (lastView.url.split('/')[2]) { // Adds listeners to existing view
            case 'search':
                return window.app.search.reView();
            case 'home':
                switch (lastView.url.split('/')[3]) {
                    case 'tutors':
                        return window.app.dashboard.tutors.reView();
                    case 'pupils':
                        return window.app.dashboard.pupils.reView();
                    default:
                        return window.app.dashboard.reView();
                };
            case 'users':
                const id = Utils.getCleanPath(document.location.pathname)
                    .split('/')[3];
                return window.app.search.reViewUser(id);
            case 'profile':
                return window.app.profile.reView();
            case 'messages':
                return window.app.chats.reView();
            case 'matching':
                return window.app.matching.reView();
            case 'config':
                return window.app.configuration.reView();
            case 'schedule':
                return window.app.schedule.reView();
            case 'payments':
                return window.app.payments.reView();
        };
    }

    manage() { // Define this here once so each class doesn't have to repeat it
        $('.mdc-ripple-upgraded--background-focused')
            .removeClass('mdc-ripple-upgraded--background-focused');
    }

    viewMenu() {
        const menu = $('header .mdc-top-app-bar .mdc-menu')[0];
        if (!menu.hasAttribute('data-nav-id')) {
            const id = Utils.genID();
            $(menu).attr('data-nav-id', id);
            this.menus[id] = Utils.attachMenu(menu);
        }
        this.menus[$(menu).attr('data-nav-id')].open = true;
    }

    route(dest) {
        return this.router.navigate(dest);
    }

    initRouter() {
        this.router = new Navigo(null, false, '#');

        var that = this;
        var app = window.app;
        this.router
            .on({
                '/app/pupils': function() {
                    window.app.search.view({
                        type: 'Pupil'
                    });
                },
                '/app/tutors': function() {
                    window.app.search.view({
                        type: 'Tutor'
                    });
                },
                '/app/search': function() {
                    window.app.search.view();
                },
                '/app/schedule': function() {
                    window.app.schedule.view();
                },
                '/app/messages': function() {
                    window.app.chats.view();
                },
                '/app/messages/*': function() {
                    var path = Utils.getCleanPath(document.location.pathname);
                    var id = path.split('/')[3];
                    window.app.chats.chat(id);
                },
                '/app/settings': function() {
                    window.app.settings.view();
                },
                '/app/payments/': () => {
                    window.app.payments.view();
                },
                '/app/users/*': async function() {
                    var id = Utils.getCleanPath().split('/')[3];
                    const profile = await Data.getUser(id);
                    new User(profile).view();
                },
                '/app/users/': function() {
                    app.search.view();
                },
                '/app/profile': function() {
                    app.profile.view();
                },
                '/app/matching': function() {
                    if (app.user.type === 'Supervisor') {
                        app.matching.view();
                    } else {
                        app.router.navigate('/app/home');
                    }
                },
                '/app/config': function() {
                    if (app.user.type === 'Supervisor') {
                        app.config.view();
                    } else {
                        app.router.navigate('/app/home');
                    }
                },
                '/app/dashboard': function() {
                    app.dashboard.view();
                },
                '/app/home/*': function() {
                    if (app.user.type === 'Supervisor') {
                        app.dashboard.viewEverythingElse();
                        app.dashboard[Utils.getCleanPath().split('/')[3]].view();
                    } else {
                        app.router.navigate('/app/home');
                    }
                },
                '/app/home': function() {
                    window.app.dashboard.view();
                },
                '/app': function() {
                    app.dashboard.view();
                },
                '/app/*': function() {
                    app.dashboard.view();
                },
            }); // NOTE: Do not add the .resolve() as it will automatically redirect
    }

    start() {
        // a) No redirect, show home screen
        if (window.location.toString().indexOf('redirect') < 0)
            return this.router.navigate('/app/home');
        // b) Redirect user to desired destination
        const pairs = window.location.toString().split('?');
        pairs.map(p => p.split('=')).map(([key, val]) => {
            if (key === 'redirect') this.router.navigate('/app/' + val);
        });
    }

    initDrawer() {
        const destinations = {
            showSearch: function() {
                window.app.search.view();
            },
            showTutors: function() {
                window.app.search.view({
                    type: 'Tutor'
                });
            },
            showPupils: function() {
                window.app.search.view({
                    type: 'Pupil'
                });
            },
            showHome: function() {
                window.app.dashboard.view();
            },
            showSchedule: function() {
                window.app.schedule.view();
            },
            showProfile: function() {
                window.app.profile.view();
            },
            supervisor: window.app.user.type === 'Supervisor',
            showMatching: () => {
                window.app.matching.view();
            },
            showConfig: () => {
                window.app.configuration.view();
            },
            showChats: function() {
                window.app.chats.view();
            },
            showSettings: function() {
                window.app.settings.view();
            },
            payments: window.app.user.config.showPayments || false,
            showPayments: () => {
                window.app.payments.view();
            },
        }

        var drawerEl = $('#nav-drawer')[0];
        var navListEl = this.render.template('nav-drawer-list', destinations);
        var navList = navListEl.querySelector('.mdc-list');

        $('#nav-drawer .mdc-drawer__content').empty().append(navList);

        var drawer = MDCDrawer.attachTo(drawerEl);
        drawerEl.querySelectorAll('.mdc-list-item').forEach((el) => {
            MDCRipple.attachTo(el);
            el.addEventListener('click', () => {
                drawer.open = false;
            });
        });
    }

    viewDrawer() {
        const active = 'mdc-list-item--activated';
        $('#nav-drawer .' + active).attr('class', 'mdc-list-item');
        $('#nav-drawer [style="display: none;"]').remove();
        switch (this.selected) {
            case 'Tutorbook': // Home is selected
                $('#nav-drawer .mdc-list #home').addClass(active);
                break;
            case 'Matching':
                $('#nav-drawer .mdc-list #matching').addClass(active);
                break;
            case 'Config':
                $('#nav-drawer .mdc-list #config').addClass(active);
                break;
            case 'Home':
                $('#nav-drawer .mdc-list #home').addClass(active);
                break;
            case 'Schedule':
                $('#nav-drawer .mdc-list #schedule').addClass(active);
                break;
            case 'Messages':
                $('#nav-drawer .mdc-list #chats').addClass(active);
                break;
            case 'Accounts':
                $('#nav-drawer .mdc-list #accounts').addClass(active);
                break;
            case 'Locations':
                $('#nav-drawer .mdc-list #locations').addClass(active);
                break;
            case 'History':
                $('#nav-drawer .mdc-list #history').addClass(active);
                break;
            case 'Payments':
                $('#nav-drawer .mdc-list #payments').addClass(active);
                break;
            case 'Search':
                $('#nav-drawer .mdc-list #search').addClass(active);
                break;
            case 'Settings':
                $('#nav-drawer .mdc-list #settings').addClass(active);
                break;
            case 'Tutors':
                $('#nav-drawer .mdc-list #tutors').addClass(active);
                break;
            case 'Pupils':
                $('#nav-drawer .mdc-list #pupils').addClass(active);
                break;
            case 'Profile':
                $('#nav-drawer .mdc-list #profile').addClass(active);
                break;
            default:
                $('#nav-drawer .mdc-list #home').addClass(active);
        };
        $('#nav-drawer .mdc-list-item').each(function() {
            MDCRipple.attachTo(this);
        });
        return MDCDrawer.attachTo($('#nav-drawer')[0]).open = true;
    }

};