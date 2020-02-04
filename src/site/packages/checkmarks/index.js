const $ = require('jquery');
const checkmarkHTML = require('./checkmark.html').toString();
const html = require('./index.html').toString();
const css = require('./index.scss').toString();

class Checkmarks extends HTMLElement {
    constructor() {
        super();
        const items = this.innerHTML.split(',');
        const marginTop = this.getAttribute('margin-top') || 0;
        const color = this.getAttribute('color');
        this.innerHTML = '';
        const shadow = this.attachShadow({
            mode: 'open',
        });
        shadow.innerHTML = '<style>' + css + '</style>' + html;
        items.forEach(item => $(shadow).find('ul').append(checkmarkHTML
            .replace('{ text }', item)));
        if (marginTop) $(shadow).find('ul').css('margin-top', marginTop);
        if (['white', 'black'].indexOf(color) >= 0) $(shadow)
            .find('.checkmark-item__icon').addClass('checkmark-item__icon--' +
                color).end()
            .find('.checkmark-item__text').addClass('checkmark-item__text--' +
                color).end();
    }
}

window.customElements.define('checkmarks-list', Checkmarks);

module.exports = Checkmarks;