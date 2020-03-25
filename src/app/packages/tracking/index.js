/**
 * Package that manages our tracking dashboard and cards.
 * @module @tutorbook/tracking
 * @see {@link https://npmjs.com/package/@tutorbook/tracking}
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

import Card from '@tutorbook/card';
import Utils from '@tutorbook/utils';
import Data from '@tutorbook/data';

import * as $ from 'jquery';
import to from 'await-to-js';
import axios from 'axios';

/**
 * Class that manages the "Service Hour Tracking" card in the supervisor's
 * dashboard view.
 * @todo Finish documentation.
 */
export default class Tracking {

    static renderShortcutCard() {
        const url = (window.app.location.name === 'Gunn Academic Center') ?
            'https://docs.google.com/spreadsheets/d/1NRdoDa1VDcivCFUCZLLwBsOe' +
            'Swlp89QessS4BzNLejs/edit?usp=sharing' : 'https://docs.google.com' +
            '/spreadsheets/d/1MUvYy3xm4YmjmC9CMgT0NEnWgDrSYkXgtQATmt_bwkw/edi' +
            't?usp=sharing';
        const title = 'Service Hour Tracking';
        const subtitle = 'Sync service hour data to Google Sheets';
        const summary = 'Manipulate and manage your tutors\' service hours ' +
            'through your service hour spreadsheet (a Google Sheet that ' +
            'is updated every time a tutor successfuly clocks out of a ' +
            'tutoring appointment).';
        var card;
        const actions = {
            snooze: () => $(card).remove(),
            update: () => {
                window.app.snackbar.view('Updating sheet...');
                axios({
                    method: 'get',
                    url: window.app.functionsURL + 'updateSheet',
                    params: {
                        location: window.app.location.name,
                    },
                }).then((res) => {
                    if (res.data.err) return window.app.snackbar.view('Could ' +
                        'not update sheet. Try again in a few minutes.');
                    window.app.snackbar.view('Updated sheet.', 'View', () => {
                        window.open(url);
                    }, false);
                }).catch((err) => {
                    console.error('[ERROR] Could not update sheet:', err);
                    window.app.snackbar.view('Could not update sheet. Try ' +
                        'again in a few minutes.');
                });
            },
            export: async () => {
                window.app.snackbar.view('Generating service hour logs...');
                const [err, res] = await to(Data.getServiceHoursLog());
                if (err) return window.app.snackbar.view('Could not generate ' +
                    'service hour logs.');
                window.app.snackbar.view('Generated service hour logs.', 'view',
                    () => window.open(res), true, -1);
            },
            primary: () => window.open(url),
        };
        card = Card.renderCard(title, subtitle, summary, actions);
        $(card)
            .attr('id', 'shortcut-to-tracking-sheet')
            .attr('type', 'shortcut')
            .attr('priority', 10);
        return card;
    }
};