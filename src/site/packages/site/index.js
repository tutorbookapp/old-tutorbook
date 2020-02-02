class Site {
    constructor() {
        this.redirect();
    }

    redirect() {
        const splitLocation = window.location.toString().split('/');
        if (splitLocation.indexOf('app') < 0) {
            // URL does not point to a location within the app.
            firebase.auth().onAuthStateChanged((user) => {
                if (user) {
                    // TODO: Replace 'Get Started' with 'Start App' button. 
                }
            });
        } else {
            // Send URL location to app via URL parameters.
            var locationParameter = "/app/?redirect=";
            splitLocation.forEach((str) => {
                if (splitLocation.indexOf(str) > splitLocation.indexOf('app'))
                    locationParameter += str + '/';
            });
            window.location.replace(locationParameter);
        }
    }
}

window.onload = () => window.site = new Site();

module.exports = Site;