const $ = require('jquery');
const html = require('./index.html').toString();
const css = require('./index.scss').toString();

class EmailForm extends HTMLElement {
    constructor() {
        super();
        const color = this.getAttribute('color');
        const shadow = this.attachShadow({
            mode: 'open',
        });
        shadow.innerHTML = '<style>' + css + '</style>' + html;
        if (this.hasAttribute('small')) $(shadow).find('.email-form')
            .addClass('email-form--small');
        if ([
                'white-outline', 'link-only-black', 'black-outline',
                'black-fill-transparent-hover', 'white-fill', 'black-fill',
            ].indexOf(color) >= 0) $(shadow).find('.email-form__submit')
            .addClass('email-form__submit--' + color).end()
            .find('.email-form__input').addClass('email-form__input--' + color);
    }
}

window.customElements.define('email-form', EmailForm);

module.exports = EmailForm;