import {
    MDCSnackbar
} from "@material/snackbar/index";
import {
    MDCRipple
} from "@material/ripple/index";

import $ from 'jquery';

const Render = require('@tutorbook/render');

// Class that manages snackbars
class Snackbar {

    constructor(render) {
        this.render = render || new Render();
    }

    view(message, label, action, showClose) {
        const v = () => {
            if (!label || !action) {
                var el = this.render.snackbar(true);
            } else if (typeof showClose === 'boolean') {
                var el = this.render.snackbar(label, action, showClose);
            } else {
                var el = this.render.snackbar(label, action, true);
            }
            $(el).find('button').each(function() {
                MDCRipple.attachTo(this).unbounded =
                    $(this).hasClass('mdc-icon-button');
            });
            const snackbar = new MDCSnackbar(el);
            snackbar.labelText = message;
            snackbar.timeoutMs = message.endsWith('...') ? -1 : 4000;
            snackbar.listen('MDCSnackbar:closed', () => $(el).remove());
            $('body').prepend(el);
            snackbar.open();
        };
        const c = () => {
            $('.mdc-snackbar--open') // 1) Animate open snackbars closed
                .removeClass('mdc-snackbar--open')
                .addClass('mdc-snackbar--closing');
        };
        const r = () => {
            $('.mdc-snackbar').remove(); // 2) Remove all closed snackbars
        };
        if ($('.mdc-snackbar--opening').length) {
            setTimeout(c, 100);
            setTimeout(r, 200);
            setTimeout(v, 250); // 3) Show new snackbar

        } else if ($('.mdc-snackbar--open').length) {
            c();
            setTimeout(r, 100);
            setTimeout(v, 150); // 3) Show new snackbar
        } else {
            v();
        }
    }

    close() {
        this.snackbar.close();
    }
};

module.exports = Snackbar;