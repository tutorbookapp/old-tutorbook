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

import * as $ from 'jquery';

import templateString from './templates.html';

/**
 * Class that reads in a string of templates, stores the DOM Nodes in an easily
 * accessible array, and renders requested templates given a dictionary of
 * values that map to `data-fir` modifiers in the requested template's HTML.
 */
export default class Templates {
  /**
   * Creates a new `Templates` class by reading the `templateString` from
   * `templates.html` and adding it to a `div` tag created by the global
   * `window.document` object.
   */
  constructor() {
    this.templates = {};
    const doc = document.createElement('div');
    doc.innerHTML = templateString;
    doc.querySelectorAll('.template').forEach((template) => {
      this.templates[template.getAttribute('id')] = template;
    });
  }

  log() {
    Object.entries(this.templates).forEach((template) => {
      console.log('[DEBUG] ' + template[0] + ':', template[1]);
    });
  }

  render(id, data) {
    const template = this.templates[id];
    const el = template.cloneNode(true);
    this.addData(el, data);
    return el.firstElementChild;
  }

  // Helper function that uses modifiers on a specific el
  useModifier(el, selector, modifier) {
    el.querySelectorAll('[' + selector + ']').forEach(modifier);
  }

  // Helper function that helps return items in a map
  getDeepItem(obj, path) {
    path.split('/').forEach(function (chunk) {
      obj = obj[chunk];
    });
    return obj;
  }

  addData(el, data) {
    if (!data) {
      return;
    }

    var that = this;
    var modifiers = {
      'data-fir-copies': function (tel) {
        var field = tel.getAttribute('data-fir-copies');
        var value = that.getDeepItem(data, field);
        // Only perform the copying once
        tel.removeAttribute('data-fir-copies');
        for (var i = 1; i < value; i++) {
          // i cannot equal numCopies because there is already one el there (the original)
          // Append as value number of copies of target el
          tel.parentNode.append(tel.cloneNode(true));
        }
      },
      'data-fir-foreach': function (tel) {
        var field = tel.getAttribute('data-fir-foreach');
        var values = that.getDeepItem(data, field);

        values.forEach(function (value, index) {
          var cloneTel = tel.cloneNode(true);
          tel.parentNode.append(cloneTel);

          Object.keys(modifiers).forEach(function (selector) {
            var children = Array.prototype.slice.call(
              cloneTel.querySelectorAll('[' + selector + ']')
            );
            children.push(cloneTel);
            children.forEach(function (childEl) {
              var currentVal = childEl.getAttribute(selector);

              if (!currentVal) {
                return;
              }
              childEl.setAttribute(
                selector,
                currentVal.replace('~', field + '/' + index)
              );
            });
          });
        });

        tel.parentNode.removeChild(tel);
      },
      'data-fir-content': function (tel) {
        var field = tel.getAttribute('data-fir-content');
        tel.innerText = that.getDeepItem(data, field);
      },
      'data-fir-click': function (tel) {
        // TODO: For some reason, addEventListener('click'); doesn't
        // work when we use this to render something twice.
        tel.addEventListener('click', (event) => {
          var field = $(tel).attr('data-fir-click');
          that.getDeepItem(data, field)(event);
        });
      },
      'data-fir-if': function (tel) {
        var field = tel.getAttribute('data-fir-if');
        // Triple not because we want to consider it even if it's undefined
        if (!!!that.getDeepItem(data, field)) {
          tel.style.display = 'none';
        }
      },
      'data-fir-if-not': function (tel) {
        var field = tel.getAttribute('data-fir-if-not');
        if (that.getDeepItem(data, field)) {
          tel.style.display = 'none';
        }
      },
      'data-fir-id': function (tel) {
        var field = tel.getAttribute('data-fir-id');
        tel.setAttribute('id', that.getDeepItem(data, field));
      },
      'data-fir-attr': function (tel) {
        tel
          .getAttribute('data-fir-attr')
          .split(',')
          .forEach((pair) => {
            var chunks = pair.split(':');
            var attr = chunks[0];
            var field = chunks[1];
            tel.setAttribute(attr, that.getDeepItem(data, field));
          });
      },
      'data-fir-style': function (tel) {
        tel
          .getAttribute('data-fir-style')
          .split(',')
          .forEach((pair) => {
            var chunks = pair.split(':');
            var attr = chunks[0];
            var field = chunks[1];
            var value = that.getDeepItem(data, field);

            if (attr.toLowerCase() === 'backgroundimage') {
              value = 'url(' + value + ')';
            }
            tel.style[attr] = value;
          });
      },
    };

    var preModifiers = ['data-fir-copies', 'data-fir-foreach'];

    preModifiers.forEach(function (selector) {
      var modifier = modifiers[selector];
      that.useModifier(el, selector, modifier);
    });

    Object.keys(modifiers).forEach(function (selector) {
      if (preModifiers.indexOf(selector) !== -1) {
        return;
      }

      var modifier = modifiers[selector];
      that.useModifier(el, selector, modifier);
    });
  }
}
