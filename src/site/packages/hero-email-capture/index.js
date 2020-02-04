const Checkmarks = require('@tutorbook/checkmarks');
const html = require('./index.html').toString();
const css = require('./index.scss').toString();

class HeroEmailCapture extends HTMLElement {
    constructor() {
        super();
        const shadow = this.attachShadow({
            mode: 'open',
        });
        shadow.innerHTML = '<style>' + css + '</style>' + html;
    }
}

window.customElements.define('hero-email-capture', HeroEmailCapture);

module.exports = HeroEmailCapture;