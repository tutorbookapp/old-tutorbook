/**
 * Package that defines the `logo-party` custom HTML Web Component.
 * @module @tutorbook/logo-party
 * @see {@link https://npmjs.com/package/@tutorbook/logo-party}
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
const logoHTML = require('./logo.html').toString();
const html = require('./index.html').toString();
const css = require('./index.scss').toString();

/**
 * Class that defines the (currently **unused**) `logo-party` custom HTML Web
 * Component.
 */
class LogoParty extends HTMLElement {
    constructor() {
        super();
        const logos = ['gunn', 'gunn', 'gunn'];
        const shadow = this.attachShadow({
            mode: 'open',
        });
        shadow.innerHTML = '<style>' + css + '</style>' + html;
        logos.forEach(logo => {
            const logoSVG = require('./logos/' + logo + '.svg').toString();
            $(shadow).find('.logo-party__logos').append(logoHTML
                .replace('{ id }', logo));
            $(shadow).find('.logo-party__logos #' + logo + ' img')
                .attr('src', logoSVG);
        });
    }
}

window.customElements.define('logo-party', LogoParty);

module.exports = LogoParty;