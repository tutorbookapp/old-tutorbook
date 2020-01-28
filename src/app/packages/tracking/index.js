const Card = require('@tutorbook/card');
const Utils = require('@tutorbook/utils');
const axios = require('axios');

import $ from 'jquery';
import to from 'await-to-js';

// Class that manages the "Service Hour Tracking" card in the supervisor's
// dashboard view.
class Tracking {

    constructor() {}

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
                    () => window.open(res), true);
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

module.exports = Tracking;