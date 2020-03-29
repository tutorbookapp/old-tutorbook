/**
 * Package that defines the `error-msg` custom HTML Web Component that shows the
 * user a custom page in response to an HTTP error status (returned by AWS 
 * CloudFront when it was fetching resources from AWS S3).
 * @module @tutorbook/error-msg
 * @see {@link https://npmjs.com/package/@tutorbook/error-msg}
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
    MDCRipple
} from '@material/ripple/index';

import * as html from './index.html';
import * as css from './index.scss';

/**
 * Class that shows a custom page in response to a given HTTP error status code
 * (in the `code` attribute).
 * @example
 * <error-msg code="404"></error-msg>
 */
export default class ErrorMsg extends HTMLElement {
    constructor() {
        super();
        const error = this.getAttribute('code');
        const shadow = this.attachShadow({
            mode: 'open',
        });
        var title, message;
        switch (error) {
            case '400':
                title = 'Bad Request';
                message = 'Uh oh, the page you requested does not exist. Did ' +
                    'you mean to go to our homepage that does exist?';
                break;
            case '403':
                title = 'Forbidden';
                message = 'It looks like you\'re not authorized to access ' +
                    'this page. Did you mean to go to our homepage instead?';
                break;
            case '404':
                title = 'Not Found';
                message = 'Uh oh, the page you requested does not exist. Did ' +
                    'you mean to go to our homepage that does exist?';
                break;
            case '405':
                title = 'Method Not Allowed';
                message = 'Sorry, we couldn\'t understand your request. Did ' +
                    'you mean to go to our homepage instead?';
                break;
            case '414':
                title = 'URI Too Long';
                message = 'Uh oh, the URL you requested was too long. Try ' +
                    'again with a shorter one or head over to our homepage:';
                break;
            case '416':
                title = 'Range Unsatisfiable';
                message = 'Sorry, we encountered a very technical error when ' +
                    'we tried to process your request. Try heading over to ' +
                    'our homepage instead:';
                break;
            case '500':
                title = 'Server Error';
                message = 'Oops, this one\'s our bad. Our server encountered ' +
                    'an unexpected condition that prevented it from ' +
                    'fulfilling your request. Try heading over to our home ' +
                    'page instead:';
                break;
            case '501':
                title = 'Not Implemented';
                message = 'Oops, this one\'s our bad. Our server does not ' +
                    'support the functionality required to fulfill your ' +
                    'request. Try heading over to our homepage instead:';
                break;
            case '502':
                title = 'Bad Gateway';
                message = 'Oops, this one\'s our bad. Our server couldn\'t ' +
                    'access the resources you requested. Try again later or ' +
                    'head over to our homepage instead:';
                break;
            case '503':
                title = 'Service Unavailable';
                message = 'Oops, this one\'s our bad. Our server is currently' +
                    'unable to handle your request due to a temporary ' +
                    'overload or scheduled maintenance. Try again later or ' +
                    'try loading our homepage instead:';
                break;
            case '504':
                title = 'Gateway Timeout';
                message = 'Oops, this one\'s our bad. Our sever couldn\'t ' +
                    'fetch the resources you requested in a timely fashion. ' +
                    'Try heading over to our homepage instead:';
                break;
            default:
                title = 'Error';
                message = 'Uh oh, it looks like we encountered an error while' +
                    ' we were processing your request. Try again later or try' +
                    ' heading over to our homepage:';
                break;
        };
        shadow.innerHTML = '<style>' + css + '</style>' +
            html.replace('{ title }', title).replace('{ message }', message);
        const btn = shadow.querySelector('.mdc-button');
        btn.addEventListener('click', () => window.location.href = '/');
        MDCRipple.attachTo(btn);
    }
}

window.customElements.define('error-msg', ErrorMsg);