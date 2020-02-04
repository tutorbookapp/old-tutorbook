const FeatureSpotlight = require('@tutorbook/feature-spotlight');
const html = require('./index.html').toString();
const css = require('./index.scss').toString();

class Features extends HTMLElement {
    constructor() {
        super();
        const shadow = this.attachShadow({
            mode: 'open',
        });
        shadow.innerHTML = '<style>' + css + '</style>' + html;
    }
}

window.customElements.define('spotlight-features', Features);

module.exports = Features;