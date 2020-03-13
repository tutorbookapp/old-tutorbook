/**
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

const $ = require('jquery');
const html = require('./index.html').toString();
const css = require('./index.scss').toString();

class EmailForm extends HTMLElement {
    constructor() {
        super();
        const color = this.getAttribute('color');
        const shadow = this.attachShadow({
            mode: 'open',
        });
        shadow.innerHTML = '<style>' + css + '</style>' + html;
        if (this.hasAttribute('small')) $(shadow).find('.email-form')
            .addClass('email-form--small');
        if ([
                'white-outline', 'link-only-black', 'black-outline',
                'black-fill-transparent-hover', 'white-fill', 'black-fill',
            ].indexOf(color) >= 0) $(shadow).find('.email-form__submit')
            .addClass('email-form__submit--' + color).end()
            .find('.email-form__input').addClass('email-form__input--' + color);
    }
}

window.customElements.define('email-form', EmailForm);

module.exports = EmailForm;