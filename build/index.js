window.onload = function() {
    if (window.location.toString().split('/').indexOf('login') >= 0) {
        return window.location.replace('/app');
    }
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // If there is a user, redirect to the app or whatever page within
            // the app we're pointed to. NOTE: We have to use URL parameters as
            // we haven't initialized the router yet.
            const splitLocation = window.location.toString().split('/');
            if (splitLocation.indexOf('app') < 0) {
                // URL does not point to a location within the app.
                window.location.replace('/app');
            } else {
                // Send URL location to app via URL parameters.
                var locationParameter = "/app/?redirect=";
                splitLocation.forEach((str) => {
                    if (splitLocation.indexOf(str) > splitLocation.indexOf('app')) {
                        locationParameter += str + '/';
                    }
                });
                window.location.replace(locationParameter);
            }
        } else {
            // If not, show the website.
            window.location.replace('/site');
        }
    });
};