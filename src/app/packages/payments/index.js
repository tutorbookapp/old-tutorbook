import {
    MDCTextField
} from '@material/textfield/index';
import {
    MDCRipple
} from '@material/ripple/index';
import {
    MDCTopAppBar
} from '@material/top-app-bar/index';

import $ from 'jquery';
import to from 'await-to-js';

const axios = require('axios');
const Profile = require('@tutorbook/profile').default;
const PaidProfile = require('@tutorbook/profile').paid;
const TutorProfile = require('@tutorbook/profile').tutor;
const NotificationDialog = require('@tutorbook/dialogs').notify;
const Card = require('@tutorbook/card');
const Utils = require('@tutorbook/utils');
const Data = require('@tutorbook/data');
const getDayAndDateString = require('@tutorbook/schedule').default.getDayAndDateString;

// TODO: Class that provides the payments view and header and manages all data flow
// concerning payment management (overrides the newRequest dialog).
class Payments {

    constructor() {
        this.render = window.app.render;
        this.data = window.app.data;
        this.recycler = {
            remove: (doc, type) => {
                return $(this.main)
                    .find('[id="' + doc.id + '"][type="' + type + '"]')
                    .remove();
            },
            display: (doc, type) => {
                switch (type) {
                    case 'authPayments':
                        var listItem = Payments.renderAuthPayment(doc);
                        break;
                    case 'invalidPayments':
                        var listItem = Payments.renderInvalidPayment(doc);
                        break;
                    case 'deniedPayments':
                        var listItem = Payments.renderDeniedPayment(doc);
                        break;
                    case 'approvedPayments':
                        var listItem = Payments.renderApprovedPayment(doc);
                        break;
                    case 'pastPayments':
                        var listItem = Payments.renderPastPayment(doc);
                        break;
                    case 'pastPayouts':
                        var listItem = Payments.renderPastPayout(doc);
                        break;
                    case 'requestedPayouts':
                        var listItem = Payments.renderRequestedPayout(doc);
                        break;

                };
                return this.viewTransaction(listItem);
            },
            empty: (type) => {
                $(this.main).find('[type="' + type + '"]').remove();
            },
        };
        this.renderSelf();
        if (window.app.user.type === 'Tutor' &&
            window.app.user.payments.type === 'Paid') this.initStripe();
    }

    async initStripe() {
        // URL that opens Stripe's Express onboarding flow for Connect Accounts
        const url = window.app.test ? 'http://localhost:5005/app' : 'https://' +
            ((window.app.location.name === 'Gunn Academic Center') ? 'gunn.' :
                (window.app.location.name === 'Paly Peer Tutoring Center') ?
                'paly.' : (window.app.location.name === 'JLS Library') ? 'jls.' :
                '') + 'tutorbook.app/app';
        const client = window.app.test ? 'ca_Fv3pF2bbTTRhgS5Buzieaikie2hUOR3C' :
            'ca_Fv3pVzsbrh5FfoBxIRnO8dsbmD6XNtHX';
        this.setupURL = 'https://connect.stripe.com/express/oauth/' +
            'authorize?redirect_uri=' + url + '&client_id=' +
            client + '&stripe_user' +
            '[business_type]=individual&stripe_user[email]=' +
            window.app.user.email + '&stripe_user[first_name]=' +
            window.app.user.name.split(' ')[0] + '&stripe_user[' +
            'last_name]=' + window.app.user.name.split(' ')[1] +
            '&stripe_user[phone_number]=' + window.app.user.phone +
            '&stripe_user[country]=US&stripe_user[product_' +
            'description]=Tutoring%20services%20provided%20via%20' +
            'Tutorbook.&stripe_user[url]=' + url +
            '/users/' + window.app.user.uid;
        const doc = await window.app.db.collection('stripeAccounts')
            .doc(window.app.user.uid).get();
        if (!doc.exists && !window.app.redirectedFromStripe) {
            window.app.user.cards.setupStripe = true;
            await window.app.updateUser();
            return window.app.dashboard.viewCard(Card.renderSetupStripeCard());
        }
        const getAccountURL = () => {
            return axios({
                method: 'get',
                url: window.app.functionsURL + 'accountURL',
                params: {
                    id: window.app.user.uid,
                    test: window.app.test,
                },
            }).then((res) => {
                if (typeof res.data === 'string' &&
                    res.data.indexOf('ERROR') > 0) {
                    console.error('[ERROR] On server while fetching new ' +
                        'Stripe Connect Account url:', res.data);
                    return setTimeout(getAccountURL, 10000);
                }
                this.accountURL = res.data.url;
            }).catch((err) => {
                console.error('[ERROR] While fetching new Stripe Connect ' +
                    'Account url:', err);
                setTimeout(getAccountURL, 10000);
            });
        };
        getAccountURL();
    }

    reView() {
        if (this.user.type !== 'Tutor') return;
        $(main).find('#viewStripe').click(() => {
            if (window.app.user.type === 'Tutor' &&
                window.app.user.payments.type === 'Paid') {
                window.open(this.accountURL);
                this.initStripe();
            } else {
                new NotificationDialog('Payouts Account', 'To access your' +
                    ' payouts account, enable payments by changing your ' +
                    '"Business Type" to "Paid". Once you do, reload this ' +
                    'page and you should have instant access to your ' +
                    'Stripe Connect payouts dashboard through this button.',
                    () => {}).view();
            }
        });
        $(main).find('#withdraw').click(async () => {
            new NotificationDialog('Instant Payouts', 'Instant payouts are ' +
                'coming soon but for now we\'re still working out some cinks.' +
                ' In the meantime, funds sent to your account will ' +
                'automatically be paid out at the end of each day (click the ' +
                '"Account" button for more info).', () => {}).view();
        });
    }

    view() {
        window.app.nav.selected = 'Payments';
        window.app.intercom.view((window.app.user.type !== 'Tutor'));
        window.app.view(this.header, this.main, '/app/payments');
        this.viewTransactions();
        this.manage();
    }

    manage() {
        MDCTopAppBar.attachTo(this.header);
        if (window.app.user.type !== 'Tutor') return;

        const main = this.main;
        const p = window.app.user.payments;
        const snackbar = window.app.snackbar.view;

        $(main).find('.mdc-fab').each(function() {
            MDCRipple.attachTo(this);
        });
        $(main).find('#viewStripe').click(() => {
            if (window.app.user.type === 'Tutor' &&
                window.app.user.payments.type === 'Paid') {
                window.open(this.accountURL);
                this.initStripe();
            } else {
                new NotificationDialog('Payouts Account', 'To access your' +
                    ' payouts account, enable payments by changing your ' +
                    '"Business Type" to "Paid". Once you do, reload this ' +
                    'page and you should have instant access to your ' +
                    'Stripe Connect payouts dashboard through this button.',
                    () => {}).view();
            }
        });
        $(main).find('#withdraw').click(async () => {
            new NotificationDialog('Instant Payouts', 'Instant payouts are ' +
                'coming soon but for now we\'re still working out some cinks.' +
                'In the meantime, funds sent to your account will ' +
                'automatically be paid out at the end of each day (click the ' +
                '"Account" button for more info).', () => {}).view();
            /*
             *var err;
             *var res;
             *[err, res] = await to(Data.requestPayout());
             *if (err) return window.app.snackbar.view('Could not request ' +
             *    'payout. Please ensure this isn\'t a duplicate request.');
             *window.app.snackbar.view('Sent payout request. Your funds should ' +
             *    'be available shortly.');
             */
        });
        if (this.managed) return;
        this.managed = true;

        function s(q) { // Attach select based on query
            return Utils.attachSelect($(main).find(q)[0]);
        };

        function listen(s, action) { // Add change listener
            s.listen('MDCSelect:change', () => {
                action(s);
            });
        };

        function a(q, action) { // Attaches select and adds listener
            const select = s(q);
            listen(select, action);
            return select;
        };

        function t(q, action) {
            $($(main).find(q + ' textarea').first()).focusout(async () => {
                action();
            });
            return MDCTextField.attachTo($(main).find(q).first()[0]);
        };

        function disableT(q) {
            const t = MDCTextField.attachTo($(main).find(q).first()[0]);
            $(main).find(q + ' input').attr('disabled', 'disabled');
            return t;
        };

        function disable(yes) {
            charge.disabled = yes;
            policy.disabled = yes;
            balance.disabled = yes;
            hours.disabled = yes;
            $(main).find('[id="Current balance"] input')
                .attr('disabled', 'disabled');
            $(main).find('[id="Total hours worked"] input')
                .attr('disabled', 'disabled');
        };

        const type = a('#Type', async (s) => {
            p.type = s.value;
            if (s.value === 'Free') {
                window.app.profile = (window.app.user.type === 'Tutor') ?
                    new TutorProfile(window.app.user) :
                    new Profile(window.app.user);
                disable(true);
            } else {
                window.app.profile = new PaidProfile(window.app.user);
                this.initStripe();
                disable(false);
            }
            await window.app.updateUser();
            window.app.snackbar.view('Business type updated.');
        });
        const charge = a('[id="Hourly charge"]', async (s) => {
            p.policy = p.policy.split(p.hourlyChargeString).join(s.value);
            $(main).find('[id="Payment policy"] textarea').text(p.policy);
            p.hourlyCharge = new Number(s.value.replace('$', '')).valueOf();
            p.hourlyChargeString = s.value;
            await window.app.updateUser();
            window.app.snackbar.view('Hourly charge updated.');
        });
        const balance = disableT('[id="Current balance"]');
        const hours = disableT('[id="Total hours worked"]');
        const policy = t('[id="Payment policy"]', async () => {
            p.policy = policy.value;
            await window.app.updateUser();
            window.app.snackbar.view('Payment policy updated.');
        });
    }

    renderSelf() {
        this.header = this.render.header('header-main', {
            title: 'Payments',
        });
        this.main = this.render.template('payments', {
            welcomeTitle: 'Payments',
            welcomeSubtitle: (window.app.user.type === 'Tutor') ? 'Manage your payment ' +
                'methods, business preferences, and history all in one place.' : '' +
                'Manage your payment methods and view your transaction history ' +
                'all in one place.',
            showWelcome: !this.onMobile,
            showSettings: window.app.user.type === 'Tutor',
            showMethods: true,
            showHistory: true,
        });
        if (window.app.user.type === 'Tutor') {
            $(this.render.listDivider('My business'))
                .insertBefore($(this.main).find('#settings'));
            $(this.main).find('#settings').append(this.renderBusiness());
            $(this.main).append(this.render.fab('withdraw'));
            $(this.main).append(this.render.fab('viewStripe'));
        }
        $(this.render.listDivider('Transaction history'))
            .insertBefore($(this.main).find('#history'));
    }

    renderBusiness() {
        const view = this.render.template('dialog-input');
        view.appendChild(this.render.selectItem('Type',
            window.app.user.payments.type || '', this.data.payments.types
        ));
        view.appendChild(this.render.splitListItem(
            this.render.select('Hourly charge', window.app.user.payments.hourlyChargeString,
                this.data.payments.hourlyChargeStrings),
            this.render.textField('Current balance', window.app.user.payments.currentBalanceString),
        ));
        view.appendChild(this.render.textFieldItem('Total hours worked',
            Utils.getDurationStringFromSecs(window.app.user.secondsTutored || 0)
        ));
        view.appendChild(this.render.textAreaItem('Payment policy',
            window.app.user.payments.policy
        ));
        return view;
    }

    viewTransactions() {
        $(this.main).find('#history ul').empty();
        const db = window.app.db.collection('users')
            .doc(window.app.user.uid);
        const queries = {
            authPayments: db.collection('authPayments')
                .orderBy('timestamp', 'desc'),
            approvedPayments: db.collection('approvedPayments')
                .orderBy('approvedTimestamp', 'desc'),
            deniedPayments: db.collection('deniedPayments')
                .orderBy('deniedTimestamp', 'desc'),
            pastPayments: db.collection('pastPayments')
                .orderBy('timestamp', 'desc'),
            invalidPayments: db.collection('invalidPayments')
                .orderBy('timestamp', 'desc').limit(20),
        };
        Utils.recycle(queries, this.recycler);
    }

    viewTransaction(listItem) {
        Utils.viewCard(listItem, $(this.main).find('#history ul'));
    }
};



Payments.renderRequestedPayout = function(doc) {

};


Payments.renderPastPayout = function(doc) {

};


// Render function that returns an MDC List Item for the transaction history view 
// populated with the given documents transaction data.
Payments.renderPastPayment = function(doc) {
    const payment = doc.data();
    const time = payment.timestamp.toDate();
    const title = 'Completed Payment';
    const date = (time) => {
        const res = new Date();
        var hrs = new Number(time.split(':')[0]);
        var mins = new Number(time.split(':')[1].split(' ')[0]);
        if (time.split(' ')[0] === 'PM') hrs += 12;
        res.setHours(hrs);
        res.setMinutes(mins);
        return res;
    };
    if (window.app.user.email === payment.from.email) {
        var subtitle = 'You paid ' + payment.to.name + ' $' + payment.amount.toFixed(2) +
            ' for a ' + Utils.getDurationStringFromDates(
                date(payment.for.time.from),
                date(payment.for.time.to),
                true,
            ) + ' long lesson on ' + payment.for.for.subject + '.';
    } else if (window.app.user.email === payment.to.email) {
        var subtitle = payment.from.name + ' paid you $' + payment.amount.toFixed(2) +
            ' for a ' + Utils.getDurationStringFromDates(
                date(payment.for.time.from),
                date(payment.for.time.to),
                true,
            ) + ' long lesson on ' + payment.for.for.subject + '.';
    } else {
        var subtitle = payment.from.name + ' paid ' + payment.to.name + ' $' + payment.amount.toFixed(2) +
            ' for a ' + Utils.getDurationStringFromDates(
                date(payment.for.time.from),
                date(payment.for.time.to),
                true,
            ) + ' long lesson on ' + payment.for.for.subject + '.';
    }
    const meta_title = '$' + payment.amount.toFixed(2);
    const meta_subtitle = getDayAndDateString(time);
    const photo = payment.to.photo;

    const listItem = window.app.render.template('transaction-list-item', {
        photo: photo,
        title: title,
        subtitle: subtitle,
        meta_title: meta_title,
        meta_subtitle: meta_subtitle,
        timestamp: time,
        go_to_transaction: () => {
            that.viewPastApptDialog(that.combineMaps(payment.appt, {
                id: doc.id
            }));
        },
    });
    $(listItem).attr('id', doc.id).attr('type', 'pastPayments');
    return listItem;
};


// Render function that returns an MDC List Item for the transaction history view 
// populated with the given documents transaction data.
Payments.renderDeniedPayment = function(doc) {
    const payment = doc.data();
    const time = payment.deniedTimestamp.toDate();
    const title = 'Denied Payment';
    if (window.app.user.email === payment.for.from.email) {
        var subtitle = 'You denied a payment to ' + payment.for.to.name + '.' +
            " We are currently processing your refund. Your funds should be " +
            'available shortly.';
    } else if (window.app.user.email === payment.for.to.email) {
        var subtitle = payment.for.from.name + ' denied a payment.for.to you due to ' +
            'an unsatisfactory experience. See your reviews for more detail.';
    } else {
        var subtitle = payment.for.from.name + ' denied a payment.for.to ' +
            payment.for.to.name + '. We are currently processing this refund.' +
            ' Funds should be transferred shortly.';
    }
    const meta_title = '$' + payment.for.amount.toFixed(2);
    const meta_subtitle = getDayAndDateString(time);
    const photo = payment.for.to.photo;

    var that = this;
    const listItem = window.app.render.template('transaction-list-item', {
        photo: photo,
        title: title,
        subtitle: subtitle,
        meta_title: meta_title,
        meta_subtitle: meta_subtitle,
        timestamp: time,
        go_to_transaction: () => {
            that.viewPastApptDialog(that.combineMaps(payment.appt, {
                id: doc.id
            }));
        },
    });
    $(listItem).attr('id', doc.id).attr('type', 'deniedPayments');
    return listItem;
};


// Render function that returns an MDC List Item for the transaction history view 
// populated with the given documents transaction data.
Payments.renderApprovedPayment = function(doc) {
    const payment = doc.data();
    const time = payment.approvedTimestamp.toDate();
    const title = 'Approved Payment';
    if (window.app.user.email === payment.for.from.email) {
        var subtitle = 'You approved a payment to ' + payment.for.to.name + '.' +
            ' We are currently processing this payment. Funds should be ' +
            'transferred shortly.';
    } else if (window.app.user.email === payment.for.to.email) {
        var subtitle = payment.for.from.name + ' approved a payment to you.' +
            " We are currently processing this payment. Your funds should be " +
            'available shorty.';
    } else {
        var subtitle = payment.for.from.name + ' approved a payment.for.to ' +
            payment.for.to.name + '. We are currently processing this payment.' +
            ' Funds should be transferred shortly.';
    }
    const meta_title = '$' + payment.for.amount.toFixed(2);
    const meta_subtitle = getDayAndDateString(time);
    const photo = payment.for.to.photo;

    var that = this;
    const listItem = window.app.render.template('transaction-list-item', {
        photo: photo,
        title: title,
        subtitle: subtitle,
        meta_title: meta_title,
        meta_subtitle: meta_subtitle,
        timestamp: time,
        go_to_transaction: () => {
            that.viewPastApptDialog(that.combineMaps(payment.appt, {
                id: doc.id
            }));
        },
    });
    $(listItem).attr('id', doc.id).attr('type', 'approvedPayments');
    return listItem;
};


// Render function that returns an MDC List Item for the transaction history view 
// populated with the given documents transaction data.
Payments.renderInvalidPayment = function(doc) {
    const invalid = doc.data();
    const payment = invalid.for;
    const time = invalid.invalidTimestamp.toDate();
    const title = 'Invalid Payment';
    if (window.app.user.email === payment.from.email) {
        var subtitle = 'The payment you authorized to ' + payment.to.name +
            ' was invalid. Please reauthorize this payment within 24 hours or your ' +
            'tutoring lesson(s) will be canceled.';
    } else if (window.app.user.email === payment.to.email) {
        var subtitle = payment.from.name + '\'s payment to you was invalid.' +
            ' Your appointment(s) will be canceled in 24 hours unless ' +
            payment.from.name.split(' ')[0] + ' adds a valid payment method.';
    } else {
        var subtitle = payment.from.name + '\'s payment to ' +
            payment.to.name + ' was invalid. Their appointment(s) will be ' +
            'canceled in 24 hours unless ' + payment.from.name.split(' ')[0] +
            ' adds a valid payment method.';
    }
    const meta_title = '$' + payment.amount.toFixed(2);
    const meta_subtitle = getDayAndDateString(time);
    const photo = payment.to.photo;

    const listItem = window.app.render.template('transaction-list-item', {
        photo: photo,
        title: title,
        subtitle: subtitle,
        meta_title: meta_title,
        meta_subtitle: meta_subtitle,
        timestamp: time,
        go_to_transaction: () => {
            console.log('[TODO] Implement viewTransaction dialog');
        },
    });
    $(listItem).attr('id', doc.id).attr('type', 'invalidPayments');
    return listItem;
};


// Render function that returns an MDC List Item for the transaction history view 
// populated with the given documents transaction data.
Payments.renderAuthPayment = function(doc) {
    const payment = doc.data();
    const time = payment.timestamp.toDate();
    const title = 'Authorized Payment';
    if (window.app.user.email === payment.from.email) {
        var subtitle = 'You authorized a payment to ' + payment.to.name + '.' +
            " We won't process any money until after you're satisfied with " +
            Utils.getPronoun(payment.to.gender) + ' lesson.';
    } else if (window.app.user.email === payment.to.email) {
        var subtitle = payment.from.name + ' authorized a payment to you.' +
            " Note that you will not recieve this payment until after " +
            Utils.getPronoun(payment.from.gender) +
            ' is satisfied with your lesson.';
    } else {
        var subtitle = payment.from.name + ' authorized a payment to ' +
            payment.to.name + '. Note that ' + payment.to.name +
            ' will not recieve this payment until after ' +
            payment.from.name + ' is satisfied with ' +
            Utils.getPronoun(payment.from.gender)
        ' lesson.';
    }
    const meta_title = '$' + payment.amount.toFixed(2);
    const meta_subtitle = getDayAndDateString(time);
    const photo = payment.to.photo;

    const listItem = window.app.render.template('transaction-list-item', {
        photo: photo,
        title: title,
        subtitle: subtitle,
        meta_title: meta_title,
        meta_subtitle: meta_subtitle,
        timestamp: time,
        go_to_transaction: () => {
            console.log('[TODO] Implement viewTransaction dialog');
        },
    });
    $(listItem).attr('id', doc.id).attr('type', 'authPayments');
    return listItem;
};


module.exports = Payments;