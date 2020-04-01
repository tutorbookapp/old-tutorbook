/**
 * Package that contains the (currently **unused**)
 * [settings view]{@link https://tutorbook.app/app/settings}.
 * @module @tutorbook/settings
 * @see {@link https://npmjs.com/package/@tutorbook/settings}
 * @todo Finish implementation and add a 'Settings' destination to the user's
 * [navigation drawer]{@linkplain module:@tutorbook/navigation~Navigation}.
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

import Data from '@tutorbook/data';

/**
 * Class that provides the settings screen and header and manages all data flow
 * relating to the user's config and settings objects.
 * @todo Finish documentation (and implementation for that matter).
 * @deprecated
 */
export default class Settings {
  constructor() {
    this.render = window.app.render;
    this.renderSelf();
  }

  view() {
    window.app.intercom.view(true);
    window.app.view(this.header, this.main, '/app/settings');
    this.manage();
  }

  manage() {
    this.switches = {
      showWelcome: new MDCSwitch(
        $(this.main).find('[id="Show welcome messages"]')[0]
      ),
    };
    Object.entries(this.switches).forEach((entry) => {
      const key = entry[0];
      const swtch = entry[1];
      swtch.listen('MDCSwitch:change', () => {});
    });
  }
}
