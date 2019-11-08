import {
    MDCTopAppBar
} from '@material/top-app-bar/index';
import {
    MDCTextField
} from '@material/textfield/index';
import {
    MDCRipple
} from '@material/ripple/index';

import $ from 'jquery';

const Chart = require('chart.js');
const User = require('user');
const Templates = require('templates');
const Data = require('data');
const Utils = require('utils');

// Class that contains commonly used rendering functions
class Render {

    constructor() {
        this.templates = new Templates();
    }

    progressDoughnut(options) {
        new Chart(options.canvas, {
            type: 'pie',
            data: {
                labels: ['Hours', 'Needed'],
                datasets: [{
                    data: [options.tracked, options.requirement],
                    backgroundColor: [
                        '#6200EE',
                        '#DFDFDF',
                    ],
                }]
            },
            options: {
                legend: {
                    display: false,
                },
                layout: {
                    padding: {
                        left: 20,
                        top: 20,
                        right: 0,
                        bottom: 20,
                    },
                },
                tooltips: {
                    bodyFontFamily: 'Roboto, sans-serif',
                    bodyFontSize: 14,
                    bodyFontColor: 'rgba(0, 0, 0, 0.54)',
                    backgroundColor: '#fff',
                    caretPadding: 5,
                    displayColors: false,
                },
                cutoutPercentage: 25,
            },
        });
    }

    checkBox(label, id) {
        return this.template('checkbox-input', {
            id: id || label,
            label: label,
        });
    }

    locationInput(listener) { // TODO: Customize UI w/ the AutocompleteService
        const input = this.textField('Location', '');
        $(input).find('input').attr('placeholder', '');
        const autocomplete = new google.maps.places.Autocomplete(
            $(input).find('input')[0], {
                componentRestrictions: {
                    country: 'us'
                },
            });
        window.autocomplete = autocomplete;
        const txt = new MDCTextField(input);
        autocomplete.addListener('place_changed', () => {
            listener(autocomplete.getPlace());
        });
        return input;
    }

    switch (label, descriptions, on) {
        const description = (on) ? descriptions.on : descriptions.off;
        const switchEl = this.template('input-switch', {
            id: label,
            title: label,
            subtitle: description,
        });
        if (on) {
            $(switchEl).find('.mdc-switch').addClass('mdc-switch--checked')
                .find('input').attr('checked', 'true');
        }
        return switchEl;
    }

    wrapper() {
        return this.template('wrapper');
    }

    snackbar(label, action, close) {
        if (typeof label === 'boolean' || typeof label === 'undefined')
            return this.template('snackbar-empty', {
                close: label,
            });
        return this.template('snackbar', {
            label: label,
            action: action,
            close: close,
            id: Utils.genID(),
        });
    }

    paypalButtonsItem() {
        if (window.app.onMobile) {
            const buttons = this.template('input-list-item');
            buttons.setAttribute('id', 'paypal-buttons');
            buttons.setAttribute('style', 'height:auto!important;margin-top:10px;');
            return buttons;
        }
        const buttons = this.template('wrapper');
        buttons.setAttribute('id', 'paypal-buttons');
        const description = this.textArea('Authorize payment', 'Sending' +
            ' lesson requests is free, but we need to ensure that your' +
            ' prospective tutor will be paid. Please note that we are not charging' +
            ' you and will not charge you until after you are completely ' +
            'satisfied with your tutoring lesson. Still need help? Go to your ' +
            'dashboard and click on the chat icon to open a chat with us.');
        const listEl = this.splitListItem(buttons, description);
        $(listEl).attr('style', 'min-height:290px;');
        $(buttons).attr('style', 'width:50%!important;margin: -20px 20px 0 0 ' +
            '!important;height:auto!important;'
        );
        $(description).attr('style', 'width:50%!important;');
        return listEl;
    }

    fab(type) {
        switch (type) {
            case 'edit':
                return this.template('fab-labeled', {
                    id: 'edit',
                    icon: 'edit',
                    label: 'edit',
                });
            case 'clockIn':
                return this.template('fab-labeled', {
                    id: 'clockInButton',
                    icon: 'timer',
                    label: 'ClockIn',
                });
            case 'requestPayment':
                return this.template('fab-labeled', {
                    id: 'requestPayment',
                    icon: 'account_balance_wallet',
                    label: 'Request Payment',
                });
            case 'viewStripe':
                return this.template('fab-labeled', {
                    id: 'viewStripe',
                    icon: 'account_balance',
                    label: 'Account',
                });
            case 'withdraw':
                return this.template('fab-labeled', {
                    id: 'withdraw',
                    icon: 'account_balance_wallet',
                    label: 'Pay Me',
                });
            case 'scrollToUpcoming':
                return this.template('fab-labeled', {
                    id: 'scrollButton',
                    icon: 'arrow_downward',
                    label: 'Past',
                });
            case 'scrollToLatest':
                return this.template('fab-labeled', {
                    id: 'scrollButton',
                    icon: 'arrow_downward',
                    label: 'Recent',
                });
            case 'sendMessage':
                return this.template('fab-labeled', {
                    id: 'sendMessage',
                    icon: 'send',
                    label: 'Send Feedback',
                });
        };
    }

    splitListItem(inputA, inputB) {
        const listItem = this.template('input-list-item');
        inputB.setAttribute('style', 'width:50% !important;');
        inputA.setAttribute('style', 'width:50% !important; ' +
            'margin-right:20px !important;');
        listItem.append(inputA);
        listItem.append(inputB);
        return listItem;
    }

    actionDivider(text, actions) {
        return this.template('action-list-divider', {
            'text': text,
            'add_field': actions.add,
            'remove_field': actions.remove,
        });
    }

    listDivider(text) {
        return this.template('input-list-divider', {
            'text': text
        });
    }

    divider(text) {
        return this.template('divider', {
            'text': text
        });
    }

    template(id, data) {
        return this.templates.render(id, data);
    }

    rating(rating) {
        var el = this.template('wrapper');
        for (var r = 0; r < 5; r += 1) {
            var star;
            if (r < Math.floor(rating)) {
                star = this.template('star-icon', {});
            } else {
                star = this.template('star-border-icon', {});
            }
            el.append(star);
        }
        return el;
    }

    profileHeader(user) {
        const userData = {
            'pic': user.photo || user.photoURL,
            'name': user.name || user.displayName,
            'email': user.email,
            'type': user.type || "",
            'go_to_user': () => {
                new User(user).view();
            },
        };
        return this.template('profile-header', userData);
    }

    userHeader(user) {
        const userData = {
            'pic': user.photo || user.photoURL,
            'name': user.name || user.displayName,
            'paid': ((user.payments) ? user.payments.type === 'Paid' : false),
            'free': ((user.payments) ? user.payments.type === 'Free' : true),
            'rate': '$' + ((user.payments) ? user.payments.hourlyCharge : 25),
            'grade': user.grade || 'No Grade',
            'type': user.type || 'No Type',
        };
        return this.template('user-header', userData);
    }

    selectItem(label, val, vals) {
        return this.inputItem(this.select(label, val, vals));
    }

    textAreaItem(label, val) {
        const el = this.inputItem(this.textArea(label, val));
        el.setAttribute('style', 'min-height:290px;');
        return el;
    }

    textFieldItem(label, val) {
        return this.inputItem(this.textField(label, val));
    }

    inputItem(el) {
        const inputListItemEl = this.template('input-list-item');
        inputListItemEl.appendChild(el);
        return inputListItemEl;
    }

    header(id, data) {
        var headerEl = this.template(id,
            Utils.combineMaps({
                'cancel': () => {
                    window.app.nav.back();
                },
                'back': () => {
                    window.app.nav.back();
                },
                'navigation': () => {
                    window.app.nav.viewDrawer();
                },
                'menu': () => {
                    window.app.nav.viewMenu();
                },
                'sign_out': () => {
                    window.app.signOut();
                },
                'payments': () => {
                    Utils.showPayments();
                },
                'settings': () => {
                    window.app.settings.view();
                },
            }, data));
        return headerEl;
    }

    textArea(label, val) {
        return this.template('input-text-area', {
            'label': label,
            // NOTE: By adding this or statement, we can still render empty 
            // textAreas even when val is null, undefined, or false.
            'text': val || ''
        });
    }

    textField(label, val) {
        return this.template('input-text-field', {
            'label': label,
            // NOTE: By adding this or statement, we can still render empty 
            // textFields even when val is null, undefined, or false.
            'text': val || ''
        });
    }

    select(label, val, vals) {
        return this.template('input-select', {
            'label': label,
            'vals': vals,
            // NOTE: By adding this or statement, we can still render empty selects
            // even when val is null, undefined, or false.
            'val': val || '',
        });
    }

    inputAvailability(availability) {
        const data = Utils.cloneMap(availability);
        const dayEl = this.select('Day', data.day || '', Data.days);
        const locationEl = this.select(
            'Location',
            data.location || Data.locations[1] || '',
            Data.locations
        );

        // NOTE: All of this changes once you add the data manager (as we want
        // to only show those times that are specified by the location supervisor)
        const times = Data.periods.concat(Data.timeStrings);
        const fromTimeEl = this.select(
            'From',
            data.fromTime || '',
            [data.fromTime].concat(times)
        );
        const toTimeEl = this.select(
            'To',
            data.toTime || '',
            [data.toTime].concat(times)
        );

        const content = this.template('input-wrapper');
        content.appendChild(this.inputItem(locationEl));
        content.appendChild(this.inputItem(dayEl));
        content.appendChild(this.inputItem(fromTimeEl));
        content.appendChild(this.inputItem(toTimeEl));

        return content;
    }
};

module.exports = Render;