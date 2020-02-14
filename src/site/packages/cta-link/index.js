const $ = require('jquery');
const html = require('./index.html');
const css = require('./index.scss').toString();

class CTALink extends HTMLElement {
    constructor() {
        super();
        const text = this.innerText;
        this.innerText = '';
        const href = this.getAttribute('href') || '/app';
        const color = this.getAttribute('color');
        const isSmall = this.hasAttribute('small');
        const isWide = this.hasAttribute('wide');
        const hideArrow = this.hasAttribute('noarrow');
        const shadow = this.attachShadow({
            mode: 'open',
        });
        shadow.innerHTML = '<style>' + css + '</style>' + html;
        const btn = $(shadow).find('.cta-link');
        btn.attr('href', href).prepend(text);
        switch (color) {
            case 'black':
                btn.addClass('cta-link--black-fill');
                break;
            case 'white':
                btn.addClass('cta-link--white-outline');
                break;
            case 'black-only':
                btn.addClass('cta-link--link-only-black');
                break;
            case 'white-only':
                btn.addClass('cta-link--link-only-white');
                break;
            case 'purple':
                btn.addClass('cta-link--purple');
                break;
            default:
                btn.addClass('cta-link--black-fill');
                break;
        };
        if (isSmall) btn.addClass('cta-link--small');
        if (isWide) btn.addClass('cta-link--wide');
        if (hideArrow) $(shadow).find('svg').remove();
    }
}

window.customElements.define('cta-link', CTALink);

module.exports = CTALink;