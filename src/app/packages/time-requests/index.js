/**
 * Package that enables peer tutors to request service hrs via the Tutorbook web * app.
 * @module @tutorbook/time-requests
 * @see {@link https://npmjs.com/package/@tutorbook/time-requests}
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
import {
    MDCRipple
} from '@material/ripple/index';

import $ from 'jquery';
import to from 'await-to-js';

const Data = require('@tutorbook/data');
const Utils = require('@tutorbook/utils');

/**
 * A time request.
 * @typedef {Object} TimeRequest
 * @property {Profile[]} pupils - The pupil(s) that the tutor is requesting time 
 * with.
 * @property {Profile[]} tutors - The tutor(s) that are requesting the time.
 * @property {(Date|external:Timestamp)} start - When the session started.
 * @property {(Date|external:Timestamp)} end - When the session ended.
 * @property {Proof[]} proof - The proof that shows the tutor(s) teaching the
 * pupil(s) from `start` until `end`.
 */

/**
 * A piece of proof for a time request.
 * @typedef {Object} Proof
 * @property {string} type - The type of the proof (typically just the file 
 * extension or filetype of the proof).
 * @property {string} [url] - The URL of the proof.
 */

class CaptureProofDialog {
    constructor() {
        this.proof = [];
        this.render = window.app.render;
        this.renderSelf();
    }

    view() {
        $('body').prepend(this.el);
        if (!this.managed) this.manage();
        this.dialog.open();
        return new Promise((reject, resolve) => {
            this.reject = reject;
            this.resolve = resolve;
        });
    }

    renderSelf() {
        this.el = this.render.template('dialog-popup', {
            title: 'Upload Proof',
            summary: 'Upload proof of your tutoring session and your peer ' +
                'tutoring supervisor will review your request as soon as ' +
                'possible.',
        });
        const addBtn = (l, a) => $(this.el).find('.mdc-dialog__actions')
            .append(this.render.template('dialog-button', {
                action: a,
                label: l,
            }));
        addBtn('Cancel', () => this.dialog.close('cancel'));
        addBtn('Ok', () => this.dialog.close('ok'));
        $(this.el).find('.mdc-dialog__content').append(
            this.render.template('upload-input', {
                filetype: '*',
            }));
    }

    manage() {
        this.managed = true;
        this.dialog = MDCDialog.attachTo(this.el);
        this.dialog.autoStackButtons = false;
        this.dialog.listen('MDCDialog:closing', event => {
            event.detail === 'ok' ? this.resolve(this.proof) : this.reject();
        });
        this.dialog.listen('MDCDialog:closed', () => $(this.el).remove());
        $(this.el)
            .find('#previews').hide().end()
            .find('#upload').change(async event => {
                event.preventDefault();
                window.app.snackbar.view('Uploading proof file(s)...');
                const [err, res] = await to(this.saveFiles(event.target.files));
                if (err) {
                    console.error('[ERROR] While uploading proof files:', err);
                    return window.app.snackbar.view('Could not upload file(s).');
                }
                window.app.snackbar.view('Uploaded proof file(s).');
            });
    }

    saveFiles(fileList) {
        const files = [];
        for (var file of fileList) files.push(file);
        return Promise.all(files.map(async file => {
            const path = 'users/' + window.app.user.uid + '/proof/' + file.name;
            const snap = await firebase.storage().ref(path).put(file);
            const url = await snap.ref.getDownloadURL();
            this.proof.push({
                type: file.type,
                path: path,
                url: url,
            });
            const preview = this.render.template('uploaded-file-preview');
            $(preview).css('background', 'url(' + url + ')');
            $(this.el)
                .find('.upload-input').addClass('upload-input--previews').end()
                .find('#previews').show().prepend(preview);
        }));
    }
}


/**
 * Class that represents the dialog that enables tutors to send time requests.
 * @deprecated
 */
class NewTimeRequestDialog {
    /**
     * Creates a new time request dialog given optional time request params.
     * @param {TimeRequest} [prefilled] - A set of prefilled properties of a 
     * time request.
     */
    constructor(prefilled) {
        this.render = window.app.render;
        this.request = Utils.combineMaps({
            pupils: [],
            tutors: [],
            start: new Date(),
            end: new Date(),
            proof: [],
        }, prefilled);
        this.renderSelf();
    }

    view() {
        $('body').prepend(this.el);
        if (!this.managed) this.manage();
        this.dialog.open();
    }

    renderSelf() {
        this.el = this.render.template('dialog-popup', {
            title: 'Request Service Hours',
            summary: 'Upload proof of your tutoring session and your peer ' +
                'tutoring supervisor will review your request as soon as ' +
                'possible.',
        });
        const addBtn = (l, a) => $(this.el).find('.mdc-dialog__actions')
            .append(this.render.template('dialog-button', {
                action: a,
                label: l,
            }));
        addBtn('Cancel', () => this.dialog.close('cancel'));
        addBtn('Send', () => this.dialog.close('send'));
        $(this.el).find('.mdc-dialog__content').append(
            this.render.template('upload-input', {
                filetype: '*',
            }));
    }

    manage() {
        this.managed = true;
        this.dialog = MDCDialog.attachTo(this.el);
        this.dialog.autoStackButtons = false;
        this.dialog.listen('MDCDialog:closing', async event => {
            if (event.detail.action !== 'send') return;
            window.app.snackbar.view('Sending time request...');
            const [err, res] = await to(Data.newTimeRequest(this.request));
            if (err) return window.app.snackbar.view('Could not send time ' +
                'request.');
            window.app.snackbar.view('Sent time request to ' +
                res.recipient.name + '.');
        });
        this.dialog.listen('MDCDialog:closed', () => $(this.el).remove());
        $(this.el)
            .find('#previews').hide().end()
            .find('#upload').change(async event => {
                event.preventDefault();
                window.app.snackbar.view('Uploading proof file(s)...');
                const [err, res] = await to(this.saveFiles(event.target.files));
                if (err) {
                    console.error('[ERROR] While uploading proof files:', err);
                    return window.app.snackbar.view('Could not upload file(s).');
                }
                window.app.snackbar.view('Uploaded proof file(s).');
            });
    }

    saveFiles(fileList) {
        const files = [];
        for (var file of fileList) files.push(file);
        return Promise.all(files.map(async file => {
            const path = 'users/' + window.app.user.uid + '/timeRequests/' +
                file.name;
            const snap = await firebase.storage().ref(path).put(file);
            const url = await snap.ref.getDownloadURL();
            this.request.proof.push({
                type: file.type,
                path: path,
                url: url,
            });
            const preview = this.render.template('uploaded-file-preview');
            $(preview).css('background', 'url(' + url + ')');
            $(this.el)
                .find('.upload-input').addClass('upload-input--previews').end()
                .find('#previews').show().prepend(preview);
        }));
    }
}

class ViewTimeRequestDialog {
    constructor(request, id) {

    }

    view() {

    }

    renderSelf() {

    }

    manage() {

    }
}

module.exports = {
    new: NewTimeRequestDialog,
    view: ViewTimeRequestDialog,
    capture: CaptureProofDialog,
};