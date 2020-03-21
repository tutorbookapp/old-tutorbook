/**
 * Package that defines the `cta-link` custom HTML Web Component.
 * @module @tutorbook/cta-link
 * @see {@link https://npmjs.com/package/@tutorbook/cta-link}
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

const $ = require('jquery');
const html = require('./index.html');
const css = require('./index.scss').toString();

/**
 * Class that defines the `cta-link` custom HTML Web Component.
 * @todo Document the valid `cta-link` tag attributes and what they do.
 */
class CTALink extends HTMLElement {
    constructor() {
        super();
        const text = this.innerText;
        this.innerText = '';
        const href = this.getAttribute('href') || '/app';
        const color = this.getAttribute('color');
        const isSmall = this.hasAttribute('small');
        const isWide = this.hasAttribute('wide');
        const hideArrow = this.hasAttribute('noarrow');
        const shadow = this.attachShadow({
            mode: 'open',
        });
        shadow.innerHTML = '<style>' + css + '</style>' + html;
        const btn = $(shadow).find('.cta-link');
        btn.attr('href', href).prepend(text);
        switch (color) {
            case 'black':
                btn.addClass('cta-link--black-fill');
                break;
            case 'white':
                btn.addClass('cta-link--white-outline');
                break;
            case 'black-only':
                btn.addClass('cta-link--link-only-black');
                break;
            case 'white-only':
                btn.addClass('cta-link--link-only-white');
                break;
            case 'purple':
                btn.addClass('cta-link--purple');
                break;
            default:
                btn.addClass('cta-link--black-fill');
                break;
        };
        if (isSmall) btn.addClass('cta-link--small');
        if (isWide) btn.addClass('cta-link--wide');
        if (hideArrow) $(shadow).find('svg').remove();
    }
}

window.customElements.define('cta-link', CTALink);

module.exports = CTALink;