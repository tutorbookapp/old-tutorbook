/**
 * Package that defines the `heading-block` custom HTML Web Component.
 * @module @tutorbook/heading-block
 * @see {@link https://npmjs.com/package/@tutorbook/heading-block}
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

import * as html from './index.html';
import * as css from './index.scss';

/**
 * Class that defines the `heading-block` custom HTML Web Component.
 * @extends external:HTMLElement
 */
export class HeadingBlock extends HTMLElement {
    constructor() {
        super();
        const text = this.innerText;
        this.innerText = '';
        const shadow = this.attachShadow({
            mode: 'open',
        });
        shadow.innerHTML = '<style>' + css + '</style>' + html;
        if (text) shadow.querySelector('h1').innerText = text;
    }
}

window.customElements.define('heading-block', HeadingBlock);