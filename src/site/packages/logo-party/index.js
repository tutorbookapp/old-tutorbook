const $ = require('jquery');
const logoHTML = require('./logo.html').toString();
const html = require('./index.html').toString();
const css = require('./index.scss').toString();

class LogoParty extends HTMLElement {
    constructor() {
        super();
        const logos = ['gunn', 'gunn', 'gunn'];
        const shadow = this.attachShadow({
            mode: 'open',
        });
        shadow.innerHTML = '<style>' + css + '</style>' + html;
        logos.forEach(logo => {
            const logoSVG = require('./logos/' + logo + '.svg').toString();
            $(shadow).find('.logo-party__logos').append(logoHTML
                .replace('{ id }', logo));
            $(shadow).find('.logo-party__logos #' + logo + ' img')
                .attr('src', logoSVG);
        });
    }
}

window.customElements.define('logo-party', LogoParty);

module.exports = LogoParty;