/**
 * Package that defines the `email-capture` custom HTML Web Component.
 * @module @tutorbook/email-capture
 * @see {@link https://npmjs.com/package/@tutorbook/email-capture}
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

import { EmailForm } from '@tutorbook/email-form';

import { Checkmarks } from '@tutorbook/checkmarks';

import * as html from './index.html';
import * as css from './index.scss';

/**
 * Class that defines the `email-capture` custom HTML Web Component.
 * @todo Document attributes of the `email-capture` tag.
 */
export default class EmailCapture extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({
      mode: 'open',
    });
    shadow.innerHTML = '<style>' + css + '</style>' + html;
  }
}

window.customElements.define('email-capture', EmailCapture);
