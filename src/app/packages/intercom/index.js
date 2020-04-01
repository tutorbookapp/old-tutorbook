/**
 * Package that contains a wrapper for Tutorbook's Intercom integration.
 * @module @tutorbook/intercom
 * @see {@link https://npmjs.com/package/@tutorbook/intercom}
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

/**
 * Class that inits and manages our Intercom integration.
 * @see {@link https://intercom.com}
 */
export default class Help {
  /**
   * Creates a new Help object by initializing the Intercom Messenger widget
   * with our current app user data.
   * @see {@link https://developers.intercom.com/installing-intercom/docs/intercom-javascript#section-intercomboot-intercomsettings}
   */
  constructor(user) {
    return console.warn('[WARNING] Intercom subscription has been paused.');
    window.intercomSettings = {
      app_id: 'faz7lcyb',
      name: user.name, // Full name
      email: user.email, // Email address
      created_at: user.timestamp, // Signup date as a Unix timestamp
      phone: user.phone,
      Type: user.type,
      Grade: user.grade,
      Gender: user.gender,
      Authenticated: user.authenticated,
      Subjects: user.subjects,
      'Business Type': user.payments.type,
      'Hourly Rate': user.payments.hourlyChargeString,
      'Current Balance': user.payments.currentBalanceString,
      'Total Charged': user.payments.totalChargedString,
    };
    return (function () {
      var w = window;
      var ic = w.Intercom;
      if (typeof ic === 'function') {
        ic('reattach_activator');
        ic('update', w.intercomSettings);
      } else {
        var d = document;
        var i = function () {
          i.c(arguments);
        };
        i.q = [];
        i.c = function (args) {
          i.q.push(args);
        };
        w.Intercom = i;
        var l = function () {
          var s = d.createElement('script');
          s.type = 'text/javascript';
          s.async = true;
          s.src = 'https://widget.intercom.io/widget/faz7lcyb';
          var x = d.getElementsByTagName('script')[0];
          x.parentNode.insertBefore(s, x);
        };
        if (w.attachEvent) {
          w.attachEvent('onload', l);
        } else {
          w.addEventListener('load', l, false);
        }
      }
    })();
  }

  /**
   * Shows or hides the default Intercom Messenger launcher. Note that this
   * does not close the messaging window if it is already open.
   * @param {bool} [show=true] - Whether to show the launcher or hide it.
   */
  view(show = true) {
    return console.warn('[WARNING] Intercom subscription has been paused.');
    window.intercomSettings.hide_default_launcher = !show;
    return window.Intercom('boot');
  }

  /**
   * Logs the user out of the Intercom Messenger widget and removes Intercom's
   * cookies.
   * @see {@link https://developers.intercom.com/installing-intercom/docs/intercom-javascript#section-intercomshutdown}
   */
  logout() {
    return console.warn('[WARNING] Intercom subscription has been paused.');
    return window.Intercom('shutdown');
  }
}
