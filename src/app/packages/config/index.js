import {
    MDCTopAppBar
} from '@material/top-app-bar/index';

import $ from 'jquery';
import to from 'await-to-js';

const Data = require('@tutorbook/data');
const Utils = require('@tutorbook/utils');
const SearchHeader = require('@tutorbook/search').header;
const ConfirmationDialog = require('@tutorbook/dialogs').confirm;
const EditLocationDialog = require('@tutorbook/dialogs').editLocation;
const NewLocationDialog = require('@tutorbook/dialogs').newLocation;
const Card = require('@tutorbook/card');
const HorzScroller = require('@tutorbook/horz-scroller');

// Creates a configuration screen to manage all data unique to each school or
// location. Enables supervisors to:
// 1) Create and edit locations
// 2) Edit list of subjects
// 3) Edit list of grades
// 4) Edit school schedule
// 5) Define service hour rounding rules

class Config {
    constructor() {
        this.render = window.app.render;
        this.search = new SearchHeader({
            title: 'Configuration',
        });
        this.horz = new HorzScroller('locations');
        this.renderSelf();
    }

    renderSelf() {
        this.main = this.render.template('config', {
            welcome: !window.app.onMobile,
        });
        $(this.main)
            .append(this.render.divider('Locations'))
            .append(this.horz.el);
        this.header = this.search.el;
    }

    manage() {
        this.managed = true;
        MDCTopAppBar.attachTo(this.header);
    }

    view() {
        window.app.nav.selected = 'Config';
        window.app.intercom.view(true);
        window.app.view(this.header, this.main, '/app/config');
        if (!this.cardsViewed) this.viewCards();
        if (!this.managed) this.manage();
        this.search.manage();
        this.horz.manage();
    }

    reView() {
        if (!this.managed) this.manage();
        this.search.manage();
        this.horz.manage();
    }

    viewCards() {
        this.cardsViewed = true;
        this.viewConfigCards(); // Subjects/Grades, Schedule, and Service Hrs
        this.viewLocationCards();
    }

    viewConfigCards() {
        [{
            title: 'Subjects and Grades',
            subtitle: 'Configure subjects and grades',
            summary: 'Contact us to edit the subjects and grade levels ' +
                'students can select.',
            actions: {
                primary: () => window.open('mailto:nc26459@pausd.us?subject=' +
                    '[Tutorbook Help] Configure the ' + window.app.location
                    .name + '\'s subjects and grades on Tutorbook.'),
            },
        }, {
            title: 'Bell Schedule',
            subtitle: 'Configure your bell schedule',
            summary: 'Contact us to add your school\'s bell schedule to use ' +
                'periods as times.',
            actions: {
                primary: () => window.open('mailto:nc26459@pausd.us?subject=' +
                    '[Tutorbook Help] Add the ' + window.app.location.name +
                    '\'s bell schedule to Tutorbook.'),
            },
        }, {
            title: 'Service Hour Rules',
            subtitle: 'Configure service hour rules',
            summary: 'Contact us to setup custom service hour rounding rules.',
            actions: {
                primary: () => window.open('mailto:nc26459@pausd.us?subject=' +
                    '[Tutorbook Help] Setup custom service hour tracking ' +
                    'rules for ' + window.app.location.name + ' students.'),
            },
        }].forEach(c => $(this.main).find('#cards').append(Card.renderCard(
            c.title, c.subtitle, c.summary, c.actions)));
    }

    viewLocationCards() {
        const empty = this.render.template('centered-text', {
            text: 'No locations.',
        });
        const queries = {
            locations: window.app.db.collection('locations')
                .where('supervisors', 'array-contains', window.app.user.uid),
        };
        const recycler = {
            display: doc => {
                $(empty).remove();
                const d = doc.data();
                const dialog = new EditLocationDialog(d, doc.id);
                const actions = {
                    delete: () => new ConfirmationDialog('Delete Location?',
                        'You are about to permanently delete all ' + d.name +
                        ' data. This action cannot be undone. Please ensure ' +
                        'to check with your fellow supervisors before ' +
                        'continuing.', async () => {
                            window.app.snackbar.view('Deleting location...');
                            const [err, res] = await to(Data
                                .deleteLocation(doc.id));
                            if (err) return window.app.snackbar.view('Could ' +
                                'not delete location.');
                            window.app.snackbar.view('Deleted location.');
                        }).view(),
                    edit: () => dialog.view(),
                    primary: () => dialog.view(),
                };
                const card = Card.renderCard(
                    d.name,
                    Object.keys(d.hours).join(', '),
                    d.description,
                    actions,
                );
                $(card).attr('id', doc.id);
                const existing = $(this.main).find('#locations #' + doc.id);
                if (existing.length) return $(existing).replaceWith(card);
                $(this.main).find('#locations #cards').append(card);
            },
            remove: doc => $(this.main).find('#locations #cards #' + doc.id)
                .remove(),
            empty: () => $(this.main).find('#locations #cards').empty()
                .append(empty),
        };
        Utils.recycle(queries, recycler);
    }
}

module.exports = Config;