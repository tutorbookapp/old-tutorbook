const html = require('./index.html').toString();
const css = require('./index.scss').toString();

class Footer extends HTMLElement {
    constructor() {
        super();
        const shadow = this.attachShadow({
            mode: 'open',
        });
        shadow.innerHTML = '<style>' + css + '</style>' + html;
    }
}

window.customElements.define('site-footer', Footer);

module.exports = Footer;