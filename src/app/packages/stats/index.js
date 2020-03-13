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

import $ from 'jquery';

const Utils = require('@tutorbook/utils');
const Card = require('@tutorbook/card');

/**
 * Class that represents the statistics screen from which supervisors can track
 * users, app usage, service hours, etc.
 * @deprecated
 */
class Stats {

    /**
     * Creates and renders (using the global `window.app.render` object) a new 
     * Stats object.
     */
    constructor() {
        this.render = window.app.render;
        this.renderSelf();
    }

    /**
     * Renders the statistics view/page.
     */
    renderSelf() {
        this.header = this.render.header('header-main', {
            title: 'Tutorbook',
        });
        this.main = this.render.template('stats', {
            title: window.app.location.name.split(' ')[0] + ' Statistics',
            welcome: !window.app.onMobile,
        });
    }

    /**
     * Views the statistics page (using the global `window.app.view` function).
     * @see {@link Tutorbook#view}
     */
    view() {
        window.app.nav.selected = 'Stats';
        window.app.intercom.view(true);
        window.app.view(this.header, this.main, '/app/stats');
        this.cardsViewed ? null : this.viewCards();
    }

    /**
     * Views the recent activity cards and service hour statistics card(s).
     */
    viewCards() {
        this.cardsViewed = true;
        this.viewRecentActivityCards();
        this.viewServiceHourCards();
    }

    /**
     * Views the recent activity cards from all of the current user's locations.
     */
    async viewRecentActivityCards() {
        const emptyCard = Card.renderCard(
            'You\'re Done!',
            'Hooray you\'re all caught up, for now...',
            'No recent activity at the ' + window.app.location.name + ' that ' +
            'you haven\'t already addressed. Note that (right now) we only ' +
            'show cards for new requests, canceled requests, and updated ' +
            'profiles. More updates coming soon!', {
                great: () => {
                    $(emptyCard).remove();
                },
            },
        );
        $(emptyCard).attr('id', 'empty-card');
        const renderCard = (doc, index) => {
            const action = doc.data();
            const card = Card.renderCard(
                action.title,
                action.subtitle,
                action.summary, {
                    dismiss: () => {
                        $(card).remove();
                        return doc.ref.delete();
                    },
                },
            );
            $(card).attr('id', doc.id).attr('index', index)
                .attr('timestamp', action.timestamp);
            return card;
        };
        const recycler = {
            display: (doc, type, index) => {
                $(this.main).find('#activity #cards')
                    .find('#empty-card').remove().end()
                    .append(renderCard(doc, index));
            },
            remove: (doc, type, index) => {
                $(this.main).find('#activity #cards')
                    .find('#empty-card').remove().end()
                    .find('#' + doc.id).remove().end();
            },
            empty: (type, index) => {
                $(this.main).find('#activity #cards [index="' + index + '"]')
                    .remove();
            },
        };
        const queries = {
            activity: [],
        };
        (await Data.getLocations()).forEach(location => queries.activity
            .push(window.app.db.collection('locations').doc(location.id)
                .collection('recentActions').orderBy('timestamp').limit(10)));
        Utils.recycle(queries, recycler);
    }

    /**
     * Views the service hour statistics cards.
     * @todo Actually make this do something.
     */
    viewServiceHourCards() {}
}

module.exports = Stats;