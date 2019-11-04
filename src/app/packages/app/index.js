// Dependencies
import $ from 'jquery';
import to from 'await-to-js';

// App packages
const Dashboard = require('dashboard').default;
const SupervisorDashboard = require('dashboard').supervisor;
const Search = require('search');
const Profile = require('profile').default;
const PaidProfile = require('profile').paid;
const TutorProfile = require('profile').tutor;
const Schedule = require('schedule').default;
const Chats = require('chats').default;
const SupervisorSchedule = require('schedule').supervisor;
const Payments = require('payments');
const Feedback = require('feedback');
const Notify = require('notify');
const Snackbar = require('snackbar');
const Navigation = require('navigation');
const Help = require('intercom');
const Listener = require('listener');
const Login = require('login');
const Matching = require('matching').default;
const MatchingDialog = require('matching').dialog;

// Dependency cycle workarounds
const EditProfile = require('profile').edit;
const NotificationDialog = require('dialogs').notify;

// Helper packages
const Utils = require('utils');
const Render = require('render');
const Data = require('data');

class Tutorbook {

    constructor() {
        this.logJobPost();
        this.version = '0.0.1';
        this.location = {
            name: 'Any',
        };
        this.functionsURL = 'https://us-central1-tutorbook-779d8.' + // Live
            'cloudfunctions.net';
        //this.functionsURL = 'http://localhost:5001/tutorbook-779d8/us-central1';

        // Helper packages
        this.render = new Render();
        this.data = new Data();
        this.utils = new Utils();
        this.snackbar = new Snackbar(this.render);
        this.initOnMobile();

        // Dependency cycle workarounds
        this.EditProfile = EditProfile;
        this.NotificationDialog = NotificationDialog;
        this.MatchingDialog = MatchingDialog;

        // App packages
        this.init = async () => {
            this.notify = new Notify();
            this.intercom = new Help(this.user);
            this.cards = { // Store card actions & dialogs
                requestsOut: {},
                approvedRequestsOut: {},
                rejectedRequestsOut: {},
            };
            this.nav = new Navigation();
            this.listener = new Listener();
            this.search = new Search(this);
            if (this.user.payments.type === 'Paid') {
                this.profile = new PaidProfile(this.user);
            } else if (this.user.type === 'Tutor') {
                this.profile = new TutorProfile(this.user);
            } else {
                this.profile = new Profile(this.user);
            }
            if (this.user.type === 'Supervisor') {
                this.schedule = new SupervisorSchedule();
                this.dashboard = new SupervisorDashboard();
            } else {
                this.schedule = new Schedule();
                this.dashboard = new Dashboard();
            }
            this.chats = new Chats(this);
            this.payments = new Payments();
            this.feedback = new Feedback(this);
            this.matching = new Matching();
        };

        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                await this.initUser();
                Utils.urlData();
                if (this.user.authenticated) {
                    this.init();
                    this.nav.start();
                } else {
                    Login.codeSignIn();
                }
            } else {
                this.loader(false);
                this.login();
            }
        });
    }

    view(header, main, url) {
        (!!this.nav) ? this.nav.update(): null; // We can view without init();
        $('.header').empty().append(header);
        $('.main').empty().append(main);
        $('[data-fir-click="navigation"]').click(() => {
            this.nav.viewDrawer();
        });
        $('[data-fir-click="menu"]').click(() => {
            this.nav.viewMenu();
        });

        window.scrollTo(0, 0);
        (!!url) ? Utils.url(url): null;
    }

    async initUser() {
        const user = firebase.auth().currentUser;
        var profile;
        var err;
        [err, profile] = await to(Data.getUser(user.email));
        if (err) {
            // No user doc, create new user doc
            await Data.createUser(Utils.filterProfile(user));
            await window.app.initUser();
        } else {
            this.user = Utils.filterProfile(profile);
            this.conciseUser = Utils.filterRequestUserData(profile);
        }
    }

    updateUser(user) {
        if (!user) {
            return firebase.firestore().collection('users').doc(this.user.id)
                .update(this.user);
        }
        return firebase.firestore().collection('users').doc(user.id)
            .update(user);
    }

    signOut() {
        return firebase.auth().signOut();
    }

    loader(show) {
        const loaderEl = $('#loader');
        if (show) {
            $('.main').empty().append(loaderEl);
            $('.header').empty();
        } else {
            loaderEl.hide();
        }
    }

    logJobPost() { // Logs message to users peeking under the hood
        console.log('Welcome to...');
        console.log('===============================================');
        console.log('╔════╗╔╗─╔╗╔════╗╔═══╗╔═══╗╔══╗─╔═══╗╔═══╗╔╗╔═╗');
        console.log('║╔╗╔╗║║║─║║║╔╗╔╗║║╔═╗║║╔═╗║║╔╗║─║╔═╗║║╔═╗║║║║╔╝');
        console.log('╚╝║║╚╝║║─║║╚╝║║╚╝║║─║║║╚═╝║║╚╝╚╗║║─║║║║─║║║╚╝╝─');
        console.log('──║║──║║─║║──║║──║║─║║║╔╗╔╝║╔═╗║║║─║║║║─║║║╔╗║─');
        console.log('──║║──║╚═╝║──║║──║╚═╝║║║║╚╗║╚═╝║║╚═╝║║╚═╝║║║║╚╗');
        console.log('──╚╝──╚═══╝──╚╝──╚═══╝╚╝╚═╝╚═══╝╚═══╝╚═══╝╚╝╚═╝');
        console.log('===============================================');
        console.log('Taking a look under the hood? We\'d love to have you on ' +
            'the team. Email hiring@tutorbook.app for more info.');
    }

    print() {
        $('.header').hide();
        $('.mdc-fab').hide();
        print();
        $('.header').show();
        $('.mdc-fab').show();
    }

    login() {
        this.login = new Login();
        this.login.view();
    }

    initOnMobile() {
        // See: https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser
        var userAgentCheck = false;
        (function(a) {
            if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) userAgentCheck = true;
        })(navigator.userAgent || navigator.vendor || window.opera);

        // Now, use display size to check (NOTE: We use an || operator instead of &&
        // because we don't really care if they actually are on mobile but rather
        // care that our displays look good for their screen size)
        var screenSizeCheck = false;
        if (window.innerWidth <= 800 || window.innerHeight <= 600) {
            screenSizeCheck = true;
        }

        // If either return true, we assume the user is on mobile
        this.onMobile = userAgentCheck || screenSizeCheck;
    }
};

window.onload = () => {
    window.app = new Tutorbook();
};

module.exports = Tutorbook;