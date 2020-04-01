/**
 * Package that contains a `Render` object used to render templates and other
 * components commonly used across Tutorbook's web app.
 * @module @tutorbook/render
 * @see {@link https://npmjs.com/package/@tutorbook/render}
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

import { MDCTopAppBar } from '@material/top-app-bar/index';
import { MDCTextField } from '@material/textfield/index';
import { MDCRipple } from '@material/ripple/index';

import * as $ from 'jquery';

import Chart from 'chart.js';
import User from '@tutorbook/user';
import Templates from '@tutorbook/templates';
import Data from '@tutorbook/data';
import Utils from '@tutorbook/utils';

/**
 * Class that contains commonly used rendering functions.
 * @todo Finish documentation.
 */
export default class Render {
  /**
   * Creates a new Render object and intializes it's
   * [Templates]{@link Templates} object.
   */
  constructor() {
    this.templates = new Templates();
  }

  /**
   * Renders a `login__button` styled (see `@tutorbook/app/styles/login.scss`)
   * button.
   * @param {string} label - The text that is inside labeling the button.
   * @param {Function} action - The function that is called when the button is
   * clicked.
   * @param {Map} [options] - Options that specify other attributes about the
   * button.
   * @todo Add support for `google` (to render a Google Logo with the button)
   * and `arrow` (to render an arrow that moves `onhover` like our marketing
   * site CTAs) `boolean` options.
   * @return {HTMLElement} The rendered (and managed) button element that
   * triggers `action` when it is clicked (note that this function does
   * **not** attach the [MDCRipple]{@link external:MDCRipple}; you have to do
   * that yourself).
   */
  button(label, action, options) {
    return this.template('login-prompt-btn', {
      label: label,
      action: action,
    });
  }

  /**
   * Renders the proof carousel that enables peer tutoring supervisors to
   * view previews and open the tutoring session proof uploaded by the peer
   * tutors.
   * @param {Proof[]} proof - The proof of the tutoring session.
   * @return {external:HTMLElement} The rendered carousel.
   */
  proofCarouselItem(proof) {
    const carousel = this.template('proof-carousel', {});
    for (const proof of proof) $(carousel).append(this.carouselItem(proof));
    const item = this.inputItem(carousel);
    $(item).attr('style', 'height:50vh!important;');
    return item;
  }

  /**
   * Renders one of the items in the proof carousel. This is **not be to be
   * confused with the [proofCarouselItem]{@link Render#proofCarouselItem}**
   * which renders the actual carousel with all of it's items. This method
   * merely renders one of the items in that carousel.
   * @param {Proof} proof - The proof to preview in this carousel item.
   * @return {external:HTMLElement} The rendered preview carousel item.
   */
  carouselItem(proof) {
    const item = this.template('carousel-item', {
      id: proof.name,
    });
    switch (proof.type) {
      case 'image/png':
        $(item).css('background', 'url(' + proof.url + ')');
        break;
      case 'image/jpeg':
        $(item).css('background', 'url(' + proof.url + ')');
        break;
      case 'image/gif':
        $(item).css('background', 'url(' + proof.url + ')');
        break;
      case 'application/pdf':
        $(item).append(
          '<embed src="https://drive.google.com/viewerng' +
            '/viewer?embedded=true&url=' +
            encodeURIComponent(proof.url) +
            '">'
        );
        break;
      case 'audio/mpeg':
        $(item).append(
          '<audio controls src="' +
            proof.url +
            '" type=' +
            '"' +
            proof.type +
            '">'
        );
        break;
      case 'audio/ogg':
        $(item).append(
          '<audio controls src="' +
            proof.url +
            '" type=' +
            '"' +
            proof.type +
            '">'
        );
        break;
      case 'audio/wav':
        $(item).append(
          '<audio controls src="' +
            proof.url +
            '" type=' +
            '"' +
            proof.type +
            '">'
        );
        break;
      case 'video/mp4':
        $(item).append(
          '<video controls src="' +
            proof.url +
            '" type=' +
            '"' +
            proof.type +
            '">'
        );
        break;
      case 'video/ogg':
        $(item).append(
          '<video controls src="' +
            proof.url +
            '" type=' +
            '"' +
            proof.type +
            '">'
        );
        break;
      default:
        $(item).append(
          this.template('carousel-item-link', {
            name: 'View ' + proof.name,
            url: proof.url,
          })
        );
        break;
    }
    return item;
  }

  /**
   * Renders the service hour progress graph for peer tutor dashboards.
   * @param {Object} options - A set of options.
   * @return {external:HTMLElement} The rendered graph.
   * @todo Actually complete this documentation.
   */
  progressDoughnut(options) {
    new Chart(options.canvas, {
      type: 'pie',
      data: {
        labels: ['Hours', 'Needed'],
        datasets: [
          {
            data: [options.tracked, options.requirement],
            backgroundColor: ['#6200EE', '#DFDFDF'],
          },
        ],
      },
      options: {
        legend: {
          display: false,
        },
        layout: {
          padding: {
            left: 20,
            top: 20,
            right: 0,
            bottom: 20,
          },
        },
        tooltips: {
          bodyFontFamily: 'Roboto, sans-serif',
          bodyFontSize: 14,
          bodyFontColor: 'rgba(0, 0, 0, 0.54)',
          backgroundColor: '#fff',
          caretPadding: 5,
          displayColors: false,
        },
        cutoutPercentage: 25,
      },
    });
  }

  checkBox(label, id) {
    return this.template('checkbox-input', {
      id: id || label,
      label: label,
    });
  }

  locationInput(listener) {
    // TODO: Customize UI w/ the AutocompleteService
    const input = this.textField('Location', '');
    $(input).find('input').attr('placeholder', '');
    const autocomplete = new google.maps.places.Autocomplete(
      $(input).find('input')[0],
      {
        componentRestrictions: {
          country: 'us',
        },
      }
    );
    const txt = new MDCTextField(input);
    autocomplete.addListener('place_changed', () => {
      listener(autocomplete.getPlace());
    });
    return input;
  }

  switch(label, descriptions, on) {
    const description = on ? descriptions.on : descriptions.off;
    const switchEl = this.template('input-switch', {
      id: label,
      title: label,
      subtitle: description,
    });
    if (on) {
      $(switchEl)
        .find('.mdc-switch')
        .addClass('mdc-switch--checked')
        .find('input')
        .attr('checked', 'true');
    }
    return switchEl;
  }

  wrapper() {
    return this.template('wrapper');
  }

  snackbar(label, action, close) {
    if (typeof label === 'boolean' || typeof label === 'undefined')
      return this.template('snackbar-empty', {
        close: label,
        id: Utils.genID(),
      });
    return this.template('snackbar', {
      label: label,
      action: action,
      close: close,
      id: Utils.genID(),
    });
  }

  paypalButtonsItem() {
    if (window.app.onMobile) {
      const buttons = this.template('input-list-item');
      buttons.setAttribute('id', 'paypal-buttons');
      buttons.setAttribute('style', 'height:auto!important;margin-top:10px;');
      return buttons;
    }
    const buttons = this.template('wrapper');
    buttons.setAttribute('id', 'paypal-buttons');
    const description = this.textArea(
      'Authorize payment',
      'Sending' +
        ' lesson requests is free, but we need to ensure that your' +
        ' prospective tutor will be paid. Please note that we are not charging' +
        ' you and will not charge you until after you are completely ' +
        'satisfied with your tutoring lesson. Still need help? Go to your ' +
        'dashboard and click on the chat icon to open a chat with us.'
    );
    const listEl = this.splitListItem(buttons, description);
    $(listEl).attr('style', 'min-height:290px;');
    $(buttons).attr(
      'style',
      'width:50%!important;margin: -20px 20px 0 0 ' +
        '!important;height:auto!important;'
    );
    $(description).attr('style', 'width:50%!important;');
    return listEl;
  }

  fab(type) {
    switch (type) {
      case 'edit':
        return this.template('fab-labeled', {
          id: 'edit',
          icon: 'edit',
          label: 'edit',
        });
      case 'clockIn':
        return this.template('fab-labeled', {
          id: 'clocking',
          icon: 'timer',
          label: 'ClockIn',
        });
      case 'requestPayment':
        return this.template('fab-labeled', {
          id: 'request-payment',
          icon: 'account_balance_wallet',
          label: 'Request Payment',
        });
      case 'requestTime':
        return this.template('fab-labeled', {
          id: 'request-time',
          icon: 'event_note',
          label: 'Log Time',
        });
      case 'viewStripe':
        return this.template('fab-labeled', {
          id: 'viewStripe',
          icon: 'account_balance',
          label: 'Account',
        });
      case 'withdraw':
        return this.template('fab-labeled', {
          id: 'withdraw',
          icon: 'account_balance_wallet',
          label: 'Pay Me',
        });
      case 'scrollToUpcoming':
        return this.template('fab-labeled', {
          id: 'scrollButton',
          icon: 'arrow_downward',
          label: 'Past',
        });
      case 'scrollToLatest':
        return this.template('fab-labeled', {
          id: 'scrollButton',
          icon: 'arrow_downward',
          label: 'Recent',
        });
      case 'sendMessage':
        return this.template('fab-labeled', {
          id: 'sendMessage',
          icon: 'send',
          label: 'Send Feedback',
        });
    }
  }

  splitInputItem(inputA, inputB) {
    return $(this.template('input-item')).append(inputA).append(inputB)[0];
  }

  splitListItem(inputA, inputB, inputC) {
    $(inputA).css('margin-right', '20px');
    if (inputC) $(inputB).css('margin-right', '20px');
    return $(this.template('input-list-item'))
      .append(inputA)
      .append(inputB)
      .append(inputC)[0];
  }

  actionDivider(text, actions) {
    const divider = this.template('action-list-divider', {
      text: text,
    });
    Object.entries(actions).forEach((action) => {
      $(divider)
        .find('h4')
        .append(
          this.template('list-divider-btn', {
            action: action[1],
            label: action[0],
          })
        );
    });
    return divider;
  }

  listDivider(text) {
    return this.template('input-list-divider', {
      text: text,
    });
  }

  divider(text) {
    return this.template('divider', {
      text: text,
    });
  }

  template(id, data) {
    return this.templates.render(id, data);
  }

  rating(rating) {
    var el = this.template('wrapper');
    for (var r = 0; r < 5; r += 1) {
      var star;
      if (r < Math.floor(rating)) {
        star = this.template('star-icon', {});
      } else {
        star = this.template('star-border-icon', {});
      }
      el.append(star);
    }
    return el;
  }

  profileHeader(user) {
    const userData = {
      pic: user.photo || user.photoURL,
      name: user.name || user.displayName,
      email: user.email,
      type: user.type || 'No type',
      go_to_user: () => User.viewUser(user.uid),
    };
    return this.template('profile-header', userData);
  }

  userHeader(user) {
    const userData = {
      pic: user.photo || user.photoURL,
      name: user.name || user.displayName,
      paid: user.payments ? user.payments.type === 'Paid' : false,
      free: user.payments ? user.payments.type === 'Free' : true,
      rate: '$' + (user.payments ? user.payments.hourlyCharge : 25),
      grade: user.grade || 'No grade',
      type: user.type || 'No type',
    };
    return this.template('user-header', userData);
  }

  matchingUserHeader(user) {
    const userView = new User(user);
    const userData = {
      pic: user.photo || user.photoURL,
      name: user.name || user.displayName,
      paid: user.payments ? user.payments.type === 'Paid' : false,
      free: user.payments ? user.payments.type === 'Free' : true,
      rate: '$' + (user.payments ? user.payments.hourlyCharge : 25),
      grade: user.grade || 'No grade',
      type: user.type || 'No type',
      go_to_user: () => userView.view(),
    };
    return this.template('matching-user-header', userData);
  }

  selectItem(label, val, vals) {
    return this.inputItem(this.select(label, val, vals));
  }

  textAreaItem(label, val) {
    const el = this.inputItem(this.textArea(label, val));
    el.setAttribute('style', 'min-height:290px;');
    return el;
  }

  /**
   * Searches, renders, and shows search results (most likely by querying an
   * [Algolia index]{@link https://www.algolia.com/doc/api-reference/api-methods/search/}).
   * @callback searchCallback
   * @param {HTMLElement} - The search element to get the search query from
   * and to show/append the rendered results to.
   */

  /**
   * Renders a search text field item that is essentially a text field input
   * proxying to a select (except a lot more functional as it searches an
   * [Algolia index]{@link https://www.algolia.com/doc/api-reference/api-methods/search/} instead of a set list of select options).
   * @see {@link https://www.algolia.com/doc/api-reference/api-methods/search/}
   * @see {@link module:@tutorbook/search~SearchHeader}
   * @param {string} label - The label for the text field item.
   * @param {string} val - The preset value for the text field item.
   * @param {searchCallback} search - Function called when text field value
   * changes (i.e. function that searches, renders, and show results).
   * @return {HTMLElement} The rendered (and managed) text field item that
   * raises elevation and shows a search results list when focused/clicked and
   * updates those search results as the user types.
   */
  searchTextFieldItem(label, val, search) {
    const textFieldItem = this.template('search-input-list-item', {
      label: label,
      labelId: label.toLowerCase() + '-label',
      text: val,
      id: label.toLowerCase() + '-list-item',
    });
    const hideResults = () => {
      $(textFieldItem).find('.search-results').hide();
      $(textFieldItem).find('.search-box').removeClass('search-box--elevated');
    };
    const showResults = () => {
      $(textFieldItem).find('.search-results').show();
      $(textFieldItem).find('.search-box').addClass('search-box--elevated');
    };
    $(document).click((event) => {
      const $target = $(event.target);
      const clicked =
        $target.closest($(textFieldItem).find('.search-results')).length ||
        $target.closest($(textFieldItem).find('.search-box')).length;
      const open = $(textFieldItem).find('.search-results').is(':visible');
      if (!clicked && open) return hideResults();
      if (clicked && !open) return showResults();
    });
    $(textFieldItem)
      .find('.search-box input')
      .on('input', () => search(textFieldItem))
      .focusout(() => {
        if (!$(textFieldItem).find('.search-results li:hover').length)
          hideResults();
      })
      .focus(() => showResults());
    return textFieldItem;
  }

  /**
   * Renders a divided text field list item element where the `end` parameter
   * refers to the text visually appended to the inputted text.
   * @param {string} label - The label of the text field.
   * @param {string} [val] - The current value of the text field.
   * @param {string} end - The text that is visually appended to the inputted
   * text on the right side of the split text field.
   * @todo Actually finish implementation.
   * @return {HTMLElement} The rendered split text field list item element.
   */
  splitTextFieldItem(label, val, end) {
    return this.inputItem(this.splitTextField(label, val, end));
  }

  /**
   * Renders a divided text field element where the `end` parameter refers to
   * the text visually appended to the inputted text.
   * @param {string} label - The label of the text field.
   * @param {string} [val] - The current value of the text field.
   * @param {string} end - The text that is visually appended to the inputted
   * text on the right side of the split text field.
   * @todo Actually finish implementation.
   * @return {HTMLElement} The rendered split text field element.
   */
  splitTextField(label, val, end) {
    return this.template('input-split-text-field', {
      label: label,
      value: val,
      rightValue: end,
    });
  }

  /**
   * Renders a text field input list item.
   * @param {string} label - The label of the text field.
   * @param {string} [val] - The pre-filled value of the text field. Note that
   * this function **does not** properly style pre-filled text fields. You
   * have to make sure to initialize them correctly after they are viewed in
   * the DOM to move the floating label up and such.
   * @todo Properly style pre-filled text fields.
   * @return {HTMLElement} The rendered `MDCTextField` element.
   */
  textFieldItem(label, val) {
    return this.inputItem(this.textField(label, val));
  }

  textFieldWithErrItem(label, val, err) {
    return $(this.inputItem(this.textFieldWithErr(label, val, err))).addClass(
      'err-input-list-item'
    )[0];
  }

  inputItem(el) {
    const inputListItemEl = this.template('input-list-item');
    inputListItemEl.appendChild(el);
    return inputListItemEl;
  }

  /**
   * Renders and returns the given header with the given data.
   * @param {string} id - The template ID of the desired header.
   * @param {Map} data - The options (to combine with the defaults) that are
   * passed to `renderTemplate`.
   * @return {HTMLElement} The rendered header element (typically an
   * `mdc-top-app-bar`).
   */
  header(id, data) {
    const headerEl = this.template(
      id,
      Utils.combineMaps(
        {
          cancel: () => window.app.nav.back(),
          back: () => window.app.nav.back(),
          navigation: () => window.app.nav.viewDrawer(),
          menu: () => window.app.nav.viewMenu(),
          sign_out: () => window.app.signOut(),
          payments: () => Utils.showPayments(),
          settings: () => window.app.settings.view(),
          print: () => window.app.print(),
          view_source: () => window.open(window.app.sourceURL),
        },
        data
      )
    );
    return headerEl;
  }

  textArea(label, val) {
    return this.template('input-text-area', {
      label: label,
      // NOTE: By adding this or statement, we can still render empty
      // textAreas even when val is null, undefined, or false.
      text: val || '',
    });
  }

  textFieldWithErr(label, val = '', err = 'Invalid response, try again.') {
    return this.template('err-text-field', {
      label: label,
      labelId: label.toLowerCase() + '-label',
      text: val,
      err: err,
    });
  }

  textField(label, val) {
    return this.template('input-text-field', {
      label: label,
      labelId: label.toLowerCase() + '-label',
      // NOTE: By adding this or statement, we can still render empty
      // textFields even when val is null, undefined, or false.
      text: val || '',
    });
  }

  select(label, val, vals) {
    return this.template('input-select', {
      label: label,
      labelId: label.toLowerCase() + '-label',
      vals: vals,
      // NOTE: By adding this or statement, we can still render empty selects
      // even when val is null, undefined, or false.
      val: val || '',
    });
  }

  inputAvailability(availability) {
    const data = Utils.cloneMap(availability);
    const dayEl = this.select('Day', data.day || '', Data.days);
    const locationEl = this.select(
      'Location',
      data.location || Data.locations[1] || '',
      Data.locations
    );

    // NOTE: All of this changes once you add the data manager (as we want
    // to only show those times that are specified by the location supervisor)
    const times = (window.app.data.periods[data.day] || []).concat(
      Data.timeStrings
    );
    const fromTimeEl = this.select(
      'From',
      data.fromTime || '',
      [data.fromTime].concat(times)
    );
    const toTimeEl = this.select(
      'To',
      data.toTime || '',
      [data.toTime].concat(times)
    );

    const content = this.template('input-wrapper');
    content.appendChild(this.inputItem(locationEl));
    content.appendChild(this.inputItem(dayEl));
    content.appendChild(this.inputItem(fromTimeEl));
    content.appendChild(this.inputItem(toTimeEl));

    return content;
  }
}
