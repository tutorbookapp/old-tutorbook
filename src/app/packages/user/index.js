import {
    MDCRipple
} from '@material/ripple/index';
import {
    MDCTopAppBar
} from '@material/top-app-bar/index';

import $ from 'jquery';

const NewRequestDialog = require('dialogs').newRequest;
const PaidRequestDialog = require('dialogs').paidRequest;
const StripeRequestDialog = require('dialogs').stripeRequest;
const Utils = require('utils');
const Data = require('data');

// Class that creates it's view when called (such that mains are always
// ready to go).
class User {

    constructor(profile) {
        this.render = app.render;
        profile.availableTimes = Utils
            .getAvailabilityStrings(profile.availability);
        if (profile.payments.type === 'Paid') {
            profile.paid = true;
            profile.showAbout = true;
        } else {
            profile.free = true;
        }
        this.profile = profile;
        this.renderSelf();
    }

    static async viewUser(id) {
        const users = window.app.search.users;
        if (!users[id]) {
            const p = await Data.getUser(id);
            users[id] = new User(p);
        }
        return users[id].view();
    }

    renderSelf() {
        this.main = this.render.template('user-view', this.profile);
        this.header = this.render.header('header-back', {
            title: 'View User'
        });
    }

    view() {
        app.intercom.view(false);
        app.view(
            this.header,
            this.main,
            '/app/users/' + this.profile.id
        );
        this.manage();
    }

    reView() {
        this.main = $('.main .user-view')[0];
    }

    manage() {
        // SUBJECTS
        this.main.querySelectorAll('#subjects .mdc-list-item').forEach((el) => {
            MDCRipple.attachTo(el);
            el.addEventListener('click', () => {
                if (this.profile.payments.type === 'Paid') {
                    return new StripeRequestDialog(el.innerText, this.profile).view();
                }
                return new NewRequestDialog(el.innerText, this.profile).view();
            });
        });

        // MESSAGE FAB
        const messageFab = this.main.querySelector('#message-button');
        MDCRipple.attachTo(messageFab);
        messageFab.addEventListener('click', () => {
            return window.app.chats.newWith(this.profile);
        });

        // REQUEST FAB
        const requestFab = this.main.querySelector('#request-button');
        MDCRipple.attachTo(requestFab);
        requestFab.addEventListener('click', () => {
            if (this.profile.payments.type === 'Paid') {
                return new StripeRequestDialog('', this.profile).view();
            }
            return new NewRequestDialog('', this.profile).view();
        });

        // HEADER
        MDCTopAppBar.attachTo(this.header);
    }

};

module.exports = User;