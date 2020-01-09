// Class that inits and manages our Intercom integration
class Help {

    constructor(user) {
        return console.warn('Intercom inbox subscription has been paused.');
        window.intercomSettings = {
            app_id: "faz7lcyb",
            name: user.name, // Full name
            email: user.email, // Email address
            created_at: user.timestamp, // Signup date as a Unix timestamp
            phone: user.phone,
            Type: user.type,
            Grade: user.grade,
            Gender: user.gender,
            Authenticated: user.authenticated,
            Subjects: user.subjects,
            'Business Type': user.payments.type,
            'Hourly Rate': user.payments.hourlyChargeString,
            'Current Balance': user.payments.currentBalanceString,
            'Total Charged': user.payments.totalChargedString,
        };
        return (function() {
            var w = window;
            var ic = w.Intercom;
            if (typeof ic === "function") {
                ic('reattach_activator');
                ic('update', w.intercomSettings);
            } else {
                var d = document;
                var i = function() {
                    i.c(arguments);
                };
                i.q = [];
                i.c = function(args) {
                    i.q.push(args);
                };
                w.Intercom = i;
                var l = function() {
                    var s = d.createElement('script');
                    s.type = 'text/javascript';
                    s.async = true;
                    s.src = 'https://widget.intercom.io/widget/faz7lcyb';
                    var x = d.getElementsByTagName('script')[0];
                    x.parentNode.insertBefore(s, x);
                };
                if (w.attachEvent) {
                    w.attachEvent('onload', l);
                } else {
                    w.addEventListener('load', l, false);
                }
            }
        })();
    }

    view(show) {
        return console.warn('Intercom inbox subscription has been paused.');
        window.intercomSettings.hide_default_launcher = !show;
        return window.Intercom('boot');
    }

    logout() {
        return console.warn('Intercom inbox subscription has been paused.');
        return window.Intercom('shutdown');
    }
};

module.exports = Help;