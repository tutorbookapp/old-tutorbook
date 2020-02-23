import $ from 'jquery';

const Utils = require('@tutorbook/utils');
const Card = require('@tutorbook/card');

class Stats {

    constructor() {
        this.render = window.app.render;
        this.renderSelf();
    }

    renderSelf() {
        this.header = this.render.header('header-main', {
            title: 'Tutorbook',
        });
        this.main = this.render.template('stats', {
            title: window.app.location.name.split(' ')[0] + ' Statistics',
            welcome: !window.app.onMobile,
        });
    }

    view() {
        window.app.nav.selected = 'Stats';
        window.app.intercom.view(true);
        window.app.view(this.header, this.main, '/app/stats');
        this.cardsViewed ? null : this.viewCards();
    }

    viewCards() {
        this.cardsViewed = true;
        this.viewRecentActivityCards();
        this.viewServiceHourCards();
    }

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

    viewServiceHourCards() {

    }
}

module.exports = Stats;