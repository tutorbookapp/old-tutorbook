/**
 * Package that contains our ad dialog timers and such. Note that this is no
 * longer used (but still contains some useful code).
 * @deprecated
 * @module @tutorbook/ads
 * @see {@link https://npmjs.com/package/@tutorbook/ads}
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

import {
    MDCDialog
} from '@material/dialog/index';

import * as $ from 'jquery';

import Data from '@tutorbook/data';

class AdBanner {};

class AdDialog {

    constructor() {
        this.render = window.app.render;
        this.renderSelf();
    }

    view() {
        $('body').prepend(this.main);
        this.manage();
        this.dialog.open();
    }

    manage() {
        this.dialog = new MDCDialog(this.main);
        $(this.main).find('button').click(() => {
            this.dialog.close();
            window.app.search.validGrades.push('Adult');
            window.app.search.view({
                price: 'Paid',
                location: 'Any',
            });
        });
    }

    renderSelf() {
        this.main = this.render.template('ad-dialog');
    }

};

export default class Ads {

    constructor() {
        this.dialogs = {
            moreFlexibility: {
                timeout: 10000, // Ms to wait after trigger before calling view
                view: () => new AdDialog().view(), // Function that shows ad
                tests: ['type:Pupil', 'url:users'],
            },
        };
        this.banners = {
            bannerStub: {
                timeout: 5000,
                view: () => new AdBanner().view(),
                tests: ['type:Parent', 'url:stub'],
            },
        };
    }

    url(url) {
        switch (url.split('/')[2]) {
            case 'users':
                return this.trigger('dialogs:moreFlexibility');
        };
    }

    trigger(adId) {
        const ad = this[adId.split(':')[0]][adId.split(':')[1]];
        if (!ad) return console.warn('[WARNING] Ad (' + adId + ') not found.');
        clearTimeout(this.currentAd);
        this.currentAd = setTimeout(() => {
            if (this.test(ad)) ad.view();
        }, ad.timeout);
    }

    test(ad) {
        if (ad.seen) return false;
        var passed = true;
        for (var test of ad.tests) {
            var v = test.split(':')[0]; // Variable name
            var val = // Current value of what the variable name points to
                (v === 'type') ? window.app.user.type :
                (v === 'url') ? location.toString().split('/')[4] :
                false;
            var desiredVals = test.split(':')[1].split(','); // Desired values
            passed = desiredVals.indexOf(val) >= 0;
            if (!passed) return passed;
        }
        ad.seen = true;
        return passed;
    }
};