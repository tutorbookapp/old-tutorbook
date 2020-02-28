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
const HrsConfig = require('@tutorbook/hrs-config');

/**
 * Class that represents a configuration screen to manage all data unique to 
 * each school, location, and website. Enables tutoring supervisors to:
 * - Create and edit locations
 * - Edit list of subjects
 * - Edit list of grades
 * - Edit school schedule
 * - Define service hour rounding rules
 */
class Config {
    /**
     * Creates and renders a new configuration main screen and search header.
     * @see {@link SearchHeader}
     */
    constructor() {
        this.render = window.app.render;
        this.search = new SearchHeader({
            title: 'Configuration',
        });
        this.hrsConfig = new HrsConfig();
        this.locations = {};
        this.horz = new HorzScroller('locations');
        this.renderSelf();
    }

    /**
     * Renders the main configuration screen template (the header element is
     * already rendered by it's [SearchHeader]{@link SearchHeader} object).
     */
    renderSelf() {
        this.main = this.render.template('config', {
            welcome: !window.app.onMobile,
        });
        $(this.main)
            .append(this.render.divider('Locations'))
            .append(this.horz.el);
        this.header = this.search.el;
    }

    /**
     * Attaches the top app bar.
     * @see {@link Utils#attachHeader}
     */
    manage() {
        this.managed = true;
        Utils.attachHeader(this.header);
    }

    /**
     * Views (and subsequently manages) the main configuration screen and 
     * header.
     * @example
     * window.app.config.view(); // Views the configuration screen and URL.
     */
    view() {
        window.app.nav.selected = 'Config';
        window.app.intercom.view(true);
        window.app.view(this.header, this.main, '/app/config');
        if (!this.cardsViewed) this.viewCards();
        if (!this.managed) this.manage();
        this.search.manage();
        this.horz.manage();
    }

    /**
     * Re-manages the configuration screen's search header and horizontal
     * scroller.
     */
    reView() {
        if (!this.managed) this.manage();
        this.search.manage();
        this.horz.manage();
    }

    /**
     * Views configuration shortcut-like cards and location cards in a 
     * horizontal scroller (locations that the current user supervises).
     */
    viewCards() {
        this.cardsViewed = true;
        this.viewConfigCards(); // Subjects/Grades, Schedule, and Service Hrs
        this.viewLocationCards();
    }

    /**
     * Views (and manages) the configuration shortcut-like cards.
     */
    viewConfigCards() {
        [{
            title: 'Service Hour Rules',
            subtitle: 'Configure service hour rules',
            summary: 'Contact us to setup custom service hour rounding rules.',
            actions: {
                primary: () => this.hrsConfig.view(),
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
            title: 'Subjects and Grades',
            subtitle: 'Configure subjects and grades',
            summary: 'Contact us to edit the subjects and grade levels ' +
                'students can select.',
            actions: {
                primary: () => window.open('mailto:nc26459@pausd.us?subject=' +
                    '[Tutorbook Help] Configure the ' + window.app.location
                    .name + '\'s subjects and grades on Tutorbook.'),
            },
        }].forEach(c => $(this.main).find('#cards').append(Card.renderCard(
            c.title, c.subtitle, c.summary, c.actions)));
    }

    /**
     * Updates the [HrsConfig]{@link HrsConfig} dialog/view whenever our
     * location data changes.
     */
    updateHrsConfig() {
        this.hrsConfig = new HrsConfig(Object.entries(this.locations).map(
            ([id, l]) => Utils.combineMaps(l.config.hrs, {
                location: {
                    id: id,
                    name: l.name,
                },
            })));
    }

    /**
     * Recycles/views the locations cards (for locations the current user
     * supervises) in a horizontal scrolling view.
     * @see {@link EditLocationDialog}
     * @see {@link Utils#recycle}
     * @see {@link Recycler}
     */
    viewLocationCards() {
        const empty = this.render.template('centered-text', {
            text: 'No locations.',
        });
        const queries = {
            locations: window.app.db.collection('locations')
                .where('supervisors', 'array-contains', window.app.user.uid),
        };
        /** @type {Recycler} */
        const recycler = {
            display: doc => {
                $(empty).remove();
                const d = Utils.filterLocationData(doc.data());
                this.locations[doc.id] = d;
                this.updateHrsConfig();
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
                this.horz.update();
            },
            remove: doc => {
                this.locations[doc.id] = undefined;
                this.updateHrsConfig();
                $(this.main).find('#locations #cards #' + doc.id).remove();
                this.horz.update();
            },
            empty: () => {
                this.locations = {};
                this.updateHrsConfig();
                $(this.main).find('#locations #cards').empty().append(empty);
                this.horz.update();
            },
        };
        Utils.recycle(queries, recycler);
    }
}

module.exports = Config;