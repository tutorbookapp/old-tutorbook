/**
 * Package that defines the `checkmarks-list` custom HTML Web Component.
 * @module @tutorbook/checkmarks
 * @see {@link https://npmjs.com/package/@tutorbook/checkmarks}
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

const $ = require('jquery');
const checkmarkHTML = require('./checkmark.html').toString();
const html = require('./index.html').toString();
const css = require('./index.scss').toString();

/**
 * Class that defines the `checkmarks-list` custom HTML Web Component.
 * @todo Document that `checkmarks-list` tag attributes and what they do (i.e.
 * how does one create a list with different checkmark labels).
 */
class Checkmarks extends HTMLElement {
    constructor() {
        super();
        const items = this.innerHTML.split(',');
        const marginTop = this.getAttribute('margin-top') || 0;
        const color = this.getAttribute('color');
        this.innerHTML = '';
        const shadow = this.attachShadow({
            mode: 'open',
        });
        shadow.innerHTML = '<style>' + css + '</style>' + html;
        items.forEach(item => $(shadow).find('ul').append(checkmarkHTML
            .replace('{ text }', item)));
        if (marginTop) $(shadow).find('ul').css('margin-top', marginTop);
        if (['white', 'black'].indexOf(color) >= 0) $(shadow)
            .find('.checkmark-item__icon').addClass('checkmark-item__icon--' +
                color).end()
            .find('.checkmark-item__text').addClass('checkmark-item__text--' +
                color).end();
    }
}

window.customElements.define('checkmarks-list', Checkmarks);

module.exports = Checkmarks;