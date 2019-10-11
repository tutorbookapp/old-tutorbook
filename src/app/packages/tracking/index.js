const Card = require('card');
const Utils = require('utils');
const axios = require('axios');

import $ from 'jquery';

// Class that manages the "Service Hour Tracking" card in the supervisor's
// dashboard view.
class Tracking {

    constructor() {}

    static renderCard() {
        const url = 'https://docs.google.com/spreadsheets/d/1NRdoDa1VDcivCFUC' +
            'ZLLwBsOeSwlp89QessS4BzNLejs/edit?usp=sharing';
        const title = 'Service Hour Tracking';
        const subtitle = 'Sync service hour data to Google Sheets';
        const summary = 'Manipulate and manage your tutors\' service hours ' +
            'through your service hour spreadsheet (a Google Sheet that ' +
            'is updated every time a tutor successfuly clocks out of a ' +
            'tutoring appointment).';
        const actions = {
            update: () => {
                window.app.snackbar.view('Updating sheet...');
                axios({
                    method: 'get',
                    url: window.app.functionsURL + '/updateSheet',
                }).then((res) => {
                    if (!res.err) {
                        return window.app.snackbar.view(
                            'Updated sheet.', 'View', () => {
                                window.open(url);
                            });
                    }
                    console.error('Error while updating sheet:', err);
                    window.app.snackbar.view('Could not update sheet.');
                }).catch((err) => {
                    console.error('Error while invoking function:', err);
                    window.app.snackbar.view('Could not update sheet.');
                });
            },
            view: () => {
                window.open(url);
            },
            primary: () => {
                window.open(url);
            },
        };
        const card = Card.renderCard(title, subtitle, summary, actions);
        $(card)
            .attr('id', 'service-hour-tracking')
            .attr('type', 'serviceHourTracking')
            .attr('priority', 10);
        return card;
    }
};

module.exports = Tracking;