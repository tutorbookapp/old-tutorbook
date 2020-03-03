import {
    MDCSnackbar
} from "@material/snackbar/index";
import {
    MDCRipple
} from "@material/ripple/index";

import $ from 'jquery';

const Render = require('@tutorbook/render');

/**
 * Class that manages all of the app's snackbars.
 * @see {@link https://material.io/develop/web/components/snackbars/}
 */
class Snackbar {
    /**
     * Creates a new snackbar management class with the given 
     * [Render]{@link Render} object.
     * @param {Render} render - The render to use when creating snackbars (this 
     * is so that we can create snackbars before initializing the entirety of 
     * the app).
     */
    constructor(render) {
        this.render = render || new Render();
    }

    /**
     * Create and view a new snackbar by:
     * 1. Animating all (currently) open snackbars closed.
     * 2. Removing all (of the now) closed snackbars.
     * 3. Showing the new snackbar. 
     * @param {string} message - The snackbar's message (end with `...` if
     * you want to keep the snackbar visible indefinitely).
     * @param {string} [label] - The label for the snackbar's action button.
     * @param {actionCallback} action - What to do when the snackbar's action
     * button is clicked.
     * @param {bool} showClose - Whether or not to show the `X` closing
     * button.
     * @param {int} [timeout=5000] - The timeout (in milliseconds) for when the
     * snackbar should close automatically (must be between 4000 and 10000 or -1
     * to disable the timeout completely).
     * @example
     * // This snackbar has an action that cancels the request you just sent.
     * window.app.snackbar.view(
     *   'Sent lesson request to Nicholas Chiang.',
     *   'Cancel',
     *   () => Data.cancelRequest(this.request, this.id),
     * );
     * @example
     * // This snackbar (because it ends with `...`) stays open forever.
     * window.app.snackbar.view('Sending clock-in request...');
     * const [err, res] = await to(Data.clockIn(this.appt, this.id));
     * // This snackbar times out after the default 5 secs (5000 milliseconds).
     * if (err) return window.app.snackbar.view('Could not send clock-in.');
     */
    view(message, label, action, showClose, timeout = 5000) {
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
            snackbar.timeoutMs = message.endsWith('...') ? -1 : timeout;
            snackbar.listen('MDCSnackbar:closed', () => $(el).remove());
            $('body #snackbars').prepend(el);
            snackbar.open();
        };
        const c = () => {
            $('.mdc-snackbar--open') // 1) Animate open snackbars closed
                .removeClass('mdc-snackbar--open')
                .addClass('mdc-snackbar--closing');
        };
        const r = () => {
            $('body #snackbars').empty(); // 2) Remove all closed snackbars
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
};

module.exports = Snackbar;