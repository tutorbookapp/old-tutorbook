const Card = require('card');
const Utils = require('utils');
const axios = require('axios');

import $ from 'jquery';

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
            snooze: () => {
                $(card).remove();
            },
            update: () => {
                window.app.snackbar.view('Updating sheet...');
                axios({
                    method: 'get',
                    url: window.app.functionsURL + '/updateSheet',
                    params: {
                        location: window.app.location.name,
                    },
                }).then((res) => {
                    if (res.data.err) return window.app.snackbar.view('Could ' +
                        'not update sheet. Try again in a few minutes.');
                    window.app.snackbar.view('Updated sheet.', 'View', () => {
                        window.open(url);
                    });
                }).catch((err) => {
                    console.error('Error while invoking function:', err);
                    window.app.snackbar.view('Could not update sheet. Try ' +
                        'again in a few minutes.');
                });
            },
            view: () => {
                window.open(url);
            },
            primary: () => {
                window.open(url);
            },
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