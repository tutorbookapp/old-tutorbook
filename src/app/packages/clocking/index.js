/**
 * Package that contains Tutorbook's clock-in and clock-out approval/rejection 
 * dialogs.
 * @module @tutorbook/clocking
 * @see {@link https://npmjs.com/package/@tutorbook/clocking}
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
    MDCDialog
} from '@material/dialog/index';

import $ from 'jquery';
import to from 'await-to-js';

const Data = require('@tutorbook/data');
const Utils = require('@tutorbook/utils');

/**
 * Class that contains code used in both approve/reject request dialogs.
 * @todo Finish documentation.
 * @abstract
 */
class ConfirmDialog {
    constructor(doc) {
        this.render = window.app.render;
        this.request = doc.data();
        this.id = doc.id;
    }

    manage() {
        this.dialog = new MDCDialog(this.el);
        this.dialog.autoStackButtons = false;
        this.dialog.listen('MDCDialog:closing', event => {
            event.detail.action === 'yes' ? this.approve() : this.reject();
        });
        this.dialog.listen('MDCDialog:closed', () => $(this.el).remove());
    }

    view() {
        $('body').prepend(this.el);
        if (!this.managed) this.manage();
        this.dialog.open();
    }

    addBtn(label, action) {
        const btn = this.render.template('dialog-button', {
            action: action,
            label: label,
        });
        $(this.el).find('.mdc-dialog__actions').append(btn);
    }

    /**
     * Reject the clocking request. Called when the user clicks 'Yes'.
     * @abstract
     */
    approve() {}

    /**
     * Approve the clocking request. Called when the user clicks 'No'.
     * @abstract
     */
    reject() {}
}

/**
 * Class that represents the dialog asking the supervisor if they want to:
 * 1. Approve the pending clock-in request.
 * 2. Reject the pending clock-in request.
 * @extends ConfirmDialog
 * @todo Finish documentation.
 */
class ConfirmClockInDialog extends ConfirmDialog {
    constructor(doc) {
        super(doc);
        this.renderSelf();
    }

    renderSelf() {
        const data = this.request;
        const title = 'Approve Clock-In?';
        const summary = data.sentBy.name + ' clocked in at ' +
            Utils.getTimeString(data.sentTimestamp) + ' for ' +
            Utils.getPronoun(data.sentBy.gender) + ' appointment with ' +
            Utils.getOther(data.sentBy, data.for.attendees).name + ' at ' +
            data.for.time.from + '. Approve this clock-in request?';
        this.el = this.render.template('dialog-popup', {
            title: title,
            summary: summary,
        });
        this.addBtn('No', () => this.dialog.close('no'));
        this.addBtn('Yes', () => this.dialog.close('yes'));
        if (this.request.proof && this.request.proof.length) {
            const content = $(this.el).find('.mdc-dialog__content');
            content.append(data.sentBy.name + ' uploaded proof:\n\n');
            this.request.proof.forEach(proof => content.append('- <a href="' +
                proof.url + '">' + proof.name + '</a>\n'));
        }
    }

    async approve() {
        window.app.snackbar.view('Approving clock-in request...');
        const [err, res] = await to(Data.approveClockIn(this.request, this.id));
        if (err) return window.app.snackbar.view('Could not approve clock-in ' +
            'request.');
        window.app.snackbar.view('Approved clock-in request.');
    }

    async reject() {
        window.app.snackbar.view('Rejecting clock-in request...');
        const [err, res] = await to(Data.rejectClockIn(this.request, this.id));
        if (err) return window.app.snackbar.view('Could not reject clock-in ' +
            'request.');
        window.app.snackbar.view('Rejected clock-in request.');
    }
}

/**
 * Class that represents the dialog asking the supervisor if they want to:
 * 1. Approve the pending clock-out request.
 * 2. Reject the pending clock-out request.
 * @extends ConfirmDialog
 * @todo Finish documentation.
 */
class ConfirmClockOutDialog extends ConfirmDialog {
    constructor(doc) {
        super(doc);
        this.renderSelf();
    }

    renderSelf() {
        const data = this.request;
        const title = 'Approve Clock-Out?';
        const summary = data.sentBy.name + ' clocked out at ' +
            Utils.getTimeString(data.sentTimestamp) + ' for ' +
            Utils.getPronoun(data.sentBy.gender) + ' appointment with ' +
            Utils.getOther(data.sentBy, data.for.attendees).name +
            ' ending at ' + data.for.time.to + '. Approve this clock-out ' +
            'request?';
        this.el = this.render.template('dialog-popup', {
            title: title,
            summary: summary,
        });
        this.addBtn('No', () => this.dialog.close('no'));
        this.addBtn('Yes', () => this.dialog.close('yes'));
    }

    async approve() {
        window.app.snackbar.view('Approving clock-out request...');
        const [er, res] = await to(Data.approveClockOut(this.request, this.id));
        if (er) return window.app.snackbar.view('Could not approve clock-out' +
            ' request.');
        window.app.snackbar.view('Approved clock-out request.');
    }

    async reject() {
        window.app.snackbar.view('Rejecting clock-out request...');
        const [err, res] = await to(Data.rejectClockOut(this.request, this.id));
        if (err) return window.app.snackbar.view('Could not reject clock-out ' +
            'request.');
        window.app.snackbar.view('Rejected clock-out request.');
    }
}

module.exports = {
    in: ConfirmClockInDialog,
    out: ConfirmClockOutDialog,
};