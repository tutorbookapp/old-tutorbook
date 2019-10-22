const Data = require('data');


// Class that provides the settings screen and header and manages all data flow
// relating to the user's config and settings objects.
class Settings {

    constructor() {
        this.render = window.app.render;
        this.renderSelf();
    }

    view() {
        window.app.intercom.view(true);
        window.app.view(this.header, this.main, '/app/settings');
        this.manage();
    }

    manage() {
        this.switches = {
            showWelcome: new MDCSwitch($(this.main).find('[id="Show welcome messages"]')[0]),
        };
        Object.entries(this.switches).forEach((entry) => {
            const key = entry[0];
            const swtch = entry[1];
            swtch.listen('MDCSwitch:change', () => {});
        });
    }
};


module.exports = Settings;