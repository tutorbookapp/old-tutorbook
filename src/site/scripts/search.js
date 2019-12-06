// Script to actually show search results by proxying text searches to Firestore
// query filters and then populating the results in a newly created mdc-list div.
//
// We basically just render the search view here and append it to the site view
// (with styling from our site styles)

import {
    MDCDialog
} from "@material/dialog/index";

import $ from 'jquery';

const searchSection = document.querySelector('.search_results');
const searchForm = document.querySelector('.search_part .search_bar form');
const searchEl = document.querySelector('.search_results .main');

const dialogEl = document.querySelector('#login-dialog');

const Render = require('../../app/packages/render/index.js');
const Search = require('../../app/packages/search/index.js').default;

// TODO: Make an MDC Menu pop down on keyup (i.e. as the user is typing) that
// has filter suggestions.

function results() {
    // Actually show the results
    searchSection.removeAttribute('hidden');
    searchSection.scrollIntoView({
        behavior: 'smooth'
    });

    $(searchEl).find('.mdc-list-item').off('click').click(() => {
        $(dialogEl).attr('style', 'z-index:10000!important;');
        MDCDialog.attachTo(dialogEl).open();
    });
};

$(searchForm).submit((event) => {
    event.preventDefault();
    window.app = {
        location: 'Any',
        nav: {
            selected: 'Tutors',
        },
        user: {
            type: 'Pupil',
        },
        render: new Render(),
    };
    const search = new Search();
    search.main = $('#search_results .main')[0];
    search.filters.type = 'Tutor';
    search.viewResults();
    setTimeout(results, 500);
});