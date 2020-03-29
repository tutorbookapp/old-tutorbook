/**
 * Package that defines the `layered-legal` custom HTML Web Component and 
 * contains useful utilities to convert our markdown legal documents (exported
 * from [Notion]{@link https://notion.so}) into the final HTML Web Component.
 * @module @tutorbook/legal
 * @see {@link https://npmjs.com/package/@tutorbook/legal}
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

import * as $ from 'jquery';
import * as html from './index.html';
import * as css from './index.scss';

const DEFAULT_POLICY = 'privacy';

/**
 * Class that defines the `layered-legal` custom HTML Web Component that
 * contains all of our legalities in an easily navigatable layered format.
 * @see {@link https://tutorbook.app/legal}
 */
export class Legal extends HTMLElement {
    constructor() {
        super();
        const shadow = this.attachShadow({
            mode: 'open',
        });
        const viewPolicy = (policyId, policyName = $(shadow)
                .find('.terms__policy-nav [data-policy="' + policyId + '"]')
                .text()) => $(shadow)
            .find('.terms__nav-list .selected').removeClass('selected')
            .addClass('collapsed').end()
            .find('.terms__article').addClass('u__hidden').end()
            .find('.terms__content [data-policy="' + policyId + '"]')
            .removeClass('u__hidden').end()
            .find('.terms__nav-list [data-policy="' + policyId + '"]')
            .removeClass('collapsed').addClass('selected').end()
            .find('.terms__mobile-nav-header .terms__nav-heading')
            .attr('data-policy', policyId).text(policyName).end()
            .find('.terms__sidebar').removeClass('open').addClass('closed');
        const ids = {};
        shadow.innerHTML = '<style>' + css + '</style>' + html;
        $(shadow).find('.terms__nav-subheadings a').each(function() {
            const policyId = $(this).parents('.terms__policy-nav').attr('data' +
                '-policy');
            if (!ids[policyId]) ids[policyId] = [];
            ids[policyId].push($(this).attr('href').replace('#', ''));
            this.addEventListener('click', () => {
                const item = $(shadow).find($(this).attr('href'))[0];
                document.body.scrollBy({ // Thanks to https://bit.ly/2USf5HY
                    top: item.offsetTop - document.body.scrollTop - 100,
                    left: 0,
                    behavior: 'smooth',
                });
            });
        });
        $(shadow).find('.terms__nav-list .terms__policy-nav').each(function() {
            const policyId = $(this).attr('data-policy');
            this.addEventListener('click', () => viewPolicy(policyId));
        });
        $(shadow).find('.terms__mobile-nav-header')[0]
            .addEventListener('click', () => {
                const sidebar = $(shadow).find('.terms__sidebar');
                if (sidebar.hasClass('closed'))
                    return sidebar.removeClass('closed').addClass('open');
                sidebar.removeClass('open').addClass('closed');
            });
        const id = window.location.toString().split('#')[1];
        Object.entries(ids).forEach(([policyId, elIds]) => {
            if (policyId === id) return viewPolicy(policyId);
            elIds.forEach(elId => {
                if (elId !== id) return;
                if (policyId !== DEFAULT_POLICY) viewPolicy(policyId);
                $(shadow).find('#' + elId)[0].scrollIntoView();
            });
        });
    }
}

window.customElements.define('layered-legal', Legal);