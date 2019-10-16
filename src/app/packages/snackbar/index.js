import {
    MDCSnackbar
} from "@material/snackbar/index";

import $ from 'jquery';

// Class that manages snackbars
class Snackbar {

    constructor(app) {
        var el = document.getElementById('snackbar');
        this.render = (window.app) ? window.app.render : app.render;
        this.snackbar = new MDCSnackbar(el);
        this.snackbar.timeoutMs = 4000;
    }

    view(message, label, action) {
        if (!label || !action) {
            this.snackbar.labelText = message;
            return this.snackbar.open();
        }
        var el = this.render.snackbar(label, action, true);
        var snackbar = new MDCSnackbar(el);
        snackbar.labelText = message;
        snackbar.timeoutMs = 4000;
        snackbar.listen('MDCSnackbar:closed', () => {
            window.setTimeout(() => {
                $(el).remove();
            }, 100); // Wait for animation
        });
        $('body').prepend(el);
        return snackbar.open();
    }

    close() {
        this.snackbar.close();
    }
};

module.exports = Snackbar;