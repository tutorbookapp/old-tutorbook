/**
 * Package that contains a wrapper for Tutorbook's use of 
 * [Google Analytics for Firebase]{@link https://firebase.google.com/docs/analytics}.
 * @module @tutorbook/analytics
 * @see {@link https://npmjs.com/package/@tutorbook/analytics}
 *
 * @license
 * Copyright (C) 2020 Tutorbook
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS 
 * FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more 
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see {@link https://www.gnu.org/licenses/}.
 */

/**
 * Wrapper class around Google Analytics for Firebase.
 * @see {@link https://firebase.google.com/docs/analytics/get-started?platform=web}
 */
class Analytics {
    /**
     * Creates a new Google Analytics for Firebase object and stores it in 
     * `this.analytics`. If Google Analytics for Firebase was not enabled 
     * correctly, this will log a warning.
     */
    constructor() {
        if (!firebase.analytics) console.warn('[WARNING] Google Analytics for' +
            ' Firebase was not enabled.');
        this.analytics = firebase.analytics ? firebase.analytics() : undefined;
    }

    /**
     * Logs the given `eventName` on Google Analytics. Logs a warning if Google 
     * Analytics was not enabled correctly.
     * @param {string} eventName - The name of the event to log.
     */
    log(eventName) {
        if (!this.analytics) return console.warn('[WARNING] Google Analytics ' +
            'for Firebase was not enabled.');
        return this.analytics.logEvent(eventName);
    }
}

module.exports = Analytics;