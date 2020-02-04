const $ = require('jquery');
const html = require('./index.html').toString();
const css = require('./index.scss').toString();

class Header extends HTMLElement {
    constructor() {
        super();
        const shadow = this.attachShadow({
            mode: 'open',
        });
        shadow.innerHTML = '<style>' + css + '</style>' + html;
        $(shadow).find('#open-menu-btn')[0].addEventListener('click', () => {
            const open = $(shadow).find('header')
                .hasClass('header__mobile-menu--active');
            if (open) {
                $(shadow).find('header')
                    .removeClass('header__mobile-menu--active').end()
                    .find('#open-menu-btn')
                    .removeClass('header-nav-mobile__menu-button-wrapper--active').end()
                    .find('.header-nav-mobile__menu')
                    .removeClass('header-nav-mobile__menu--active').end();
            } else {
                $(shadow).find('header')
                    .addClass('header__mobile-menu--active').end()
                    .find('#open-menu-btn')
                    .addClass('header-nav-mobile__menu-button-wrapper--active').end()
                    .find('.header-nav-mobile__menu')
                    .addClass('header-nav-mobile__menu--active').end();
            }
        });
        this.shadow = shadow;
    }

    setLoggedIn(loggedIn) {
        $(this.shadow).find('[href="/app"]')
            .text(loggedIn ? 'Go to app' : 'Sign in');
    }
}

window.customElements.define('site-header', Header);

module.exports = Header;