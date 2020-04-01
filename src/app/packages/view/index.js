/**
 * Package that contains the base view class for Tutorbook's web app.
 * @module @tutorbook/view
 * @see {@link https://npmjs.com/package/@tutorbook/view}
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

/**
 * Base class that represents a **view** in Tutorbook's web app.
 * @abstract
 */
export default class View {
  /**
   * Creates (and renders) a new **view** in the Tutorbook web app.
   * @param {bool} skip - If `skip` is `true`, this constructor won't actually
   * do anything except point `this.render` to `window.app.render`.
   */
  constructor(skip = false) {
    this.render = window.app.render;
    if (!skip) this.renderSelf();
  }

  /**
   * Views (and subsequently manages) the **view** with the `window.app.view`
   * method.
   * @param {string} [url] - The URL to view (if any).
   * @abstract
   */
  view(url) {
    window.app.view(this.header, this.main, url);
    this.managed ? this.manage() : this.reManage();
  }

  /**
   * Manages the **view** after it's been appended to the `main` and `header`
   * divs using the `window.app.view` method.
   */
  manage() {}

  /**
   * Re-manages the **view** if it has already been viewed (and managed).
   */
  reManage() {}

  /**
   * Renders the **view** by making `this.header` and `this.main` point to
   * `HTMLElement`s.
   */
  renderSelf() {}
}
