/**
 * Package that contains the service hours configuration screen.
 * @module @tutorbook/hrs-config
 * @see {@link https://npmjs.com/package/@tutorbook/hrs-config}
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

import * as $ from 'jquery';
import to from 'await-to-js';

import Utils from '@tutorbook/utils';
import Data from '@tutorbook/data';

/**
 * Class that represents the configuration screen that enables supervisors to
 * create and edit service hour rounding rules:
 * - Round all service hours within the nearest minute/5 mins/15 mins/30 mins/hour
 * - Always round up/round down/round normally
 * @todo Finish documentation.
 */
export default class HrsConfig {
  constructor(
    rules = [
      {
        location: window.app.location,
        rounding: Data.roundings[0],
        threshold: Data.thresholds[0],
        timeThreshold: Data.timeThresholds[0],
      },
    ],
    locations = window.app.config ? window.app.config.locations : {}
  ) {
    this.rules = rules;
    this.locs = locations; // TODO: Waaay too hacky...
    this.render = window.app.render;
    this.renderSelf();
  }

  renderSelf() {
    this.main = this.render.template('dialog-input');
    this.header = this.render.header('header-back', {
      title: 'Service Hour Rules',
    });

    const add = (el) => $(this.main).append(el);
    const addD = (label) => add(this.render.listDivider(label));
    const addS = (l, v = '', d = [], id = l) =>
      add(
        $(this.render.selectItem(l, v, Utils.concatArr(d, [v]))).attr(
          'id',
          id
        )[0]
      );

    this.rules.forEach((rule) => {
      addD(rule.location.name);
      addS(
        'Round service hours',
        rule.rounding,
        Data.roundings,
        rule.location.id + '-rounding'
      );
      addS(
        'To the nearest',
        rule.threshold,
        Data.thresholds,
        rule.location.id + '-threshold'
      );
      addS(
        'Round times to the nearest',
        rule.timeThreshold,
        Data.timeThresholds,
        rule.location.id + '-timeThreshold'
      );
    });
  }

  view() {
    window.app.intercom.view(true);
    window.app.view(this.header, this.main);
    if (!this.managed) this.manage();
  }

  manage() {
    this.managed = true;
    Utils.attachHeader(this.header);
    const s = (q, a = () => {}) => {
      const s = Utils.attachSelect(
        $(this.main).find('#' + q + ' .mdc-select')[0]
      );
      s.listen('MDCSelect:change', () => a(s));
      return s;
    };
    ['rounding', 'threshold', 'timeThreshold'].forEach(
      (id) =>
        (this[id + 'Selects'] = this.rules.map((r) =>
          s(r.location.id + '-' + id, async (s) => {
            if (Data[id + 's'].indexOf(s.value) < 0) return (s.valid = false);
            const [err, res] = await to(
              Data.updateLocation(
                {
                  config: Utils.combineMaps(this.locs[r.location.id].config, {
                    hrs: {
                      rounding: id === 'rounding' ? s.value : r.rounding,
                      threshold: id === 'threshold' ? s.value : r.threshold,
                      timeThreshold:
                        id === 'timeThreshold' ? s.value : r.timeThreshold,
                    },
                  }),
                },
                r.location.id
              )
            );
            if (err)
              return window.app.snackbar.view(
                'Could not update ' +
                  'the ' +
                  r.location.name +
                  "'s service hour rules."
              );
            window.app.snackbar.view('Updated service hour rules.');
          })
        ))
    );
  }
}
