const html = require('./index.html').toString();
const css = require('./index.scss').toString();

class HeadingBlock extends HTMLElement {
    constructor() {
        super();
        const text = this.innerText;
        this.innerText = '';
        const shadow = this.attachShadow({
            mode: 'open',
        });
        shadow.innerHTML = '<style>' + css + '</style>' + html;
        if (text) shadow.querySelector('h1').innerText = text;
    }
}

window.customElements.define('heading-block', HeadingBlock);

module.exports = HeadingBlock;