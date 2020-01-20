import {
    MDCSnackbar
} from "@material/snackbar/index";

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
            var snackbar = new MDCSnackbar(el);
            snackbar.labelText = message;
            snackbar.timeoutMs = message.endsWith('...') ? -1 : 4000;
            snackbar.listen('MDCSnackbar:closed', () => {
                $(el).remove();
            });
            $('body').prepend(el);
            return snackbar.open();
        };
        if ($('.mdc-snackbar--open').length) {
            $('.mdc-snackbar--open') // 1) Animate open snackbars closed
                .removeClass('mdc-snackbar--open')
                .addClass('mdc-snackbar--closing');
            const r = () => {
                $('.mdc-snackbar').remove(); // 2) Remove all closed snackbars
            };
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