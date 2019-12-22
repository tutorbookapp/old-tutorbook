// This is the cleaned, cleaned up version of the main app driver script. I 
// essientially wanted to scrap anything that wasn't being used as part of the
// current MVP (so that I don't have to look at so much code every time I have
// to debug something), but didn't want to get rid of it completely in case any
// of that codebase became useful again (e.g. I try to implement payments).
//
// TODO: Function requirements:
// - Only one view function for every view that the user sees (i.e. only
// viewSearch, viewDashboard, viewSchedule, viewProfile, viewSettings, viewHelp,
// and viewLocations for supervisors).
// - Only one global variable for the current data being edited/viewed/etc (i.e.
// only currentRequest, currentAppt, currentActiveAppt, currentPastAppt, and
// currentUser). Other than that, STRICTLY NO MORE GLOBALS.
//
// Function types:
// - Data flow functions (change database directly w/ Firestore API and log info)
// - Data action functions (call data flow functions to perform callable actions
// and show the user a snackbar)
// - View functions (take and return inputs as needed, these functions replace
// the user's view with the appropriate displays)
// - Render functions (take inputs as needed, these functions return HTML
// elements populated with their input values)
// - Init functions (in theory only called once when the app starts, these
// functions work to setup app infrastructure, displays, data flow, auth, etc.)
// - Helper functions (to do stupid tasks over and over again) 
//
// Code requirements:
// - Each function is less than 20 lines of code
// - Variable names are representative of their value

import {
    MDCNotchedOutline
} from '@material/notched-outline/index';
import {
    MDCMenu
} from '@material/menu/index';
import {
    MDCTextField
} from '@material/textfield/index';
import {
    MDCSelect
} from '@material/select/index';
import {
    MDCDrawer
} from '@material/drawer/index';
import {
    MDCRipple
} from '@material/ripple/index';
import {
    MDCTopAppBar
} from '@material/top-app-bar/index';
import {
    MDCDialog
} from '@material/dialog/index';
import {
    MDCSnackbar
} from "@material/snackbar/index";
import {
    MDCSwitch
} from "@material/switch/index";

import $ from 'jquery';
import to from 'await-to-js';
// More on 'await-to-js' at: https://blog.grossman.io/how-to-write-async-await
// -without-try-catch-blocks-in-javascript/

// For some reason, "import" doesn't work for Navigo
// See: https://stackoverflow.com/questions/54314816/i-cant-use-or-import-
// navigo-in-typescript
const Navigo = require('navigo');


// Init function that launches the app
function Tutorbook(launch) {
    if (launch) {
        // TODO: We probs want to hang off on some of these until the user sees
        // their dashboard screen.
        this.loggingOn = true;
        this.initTemplates();
        this.initDisplayPreferences();
        this.initRecyclers();
        this.initTimeStrings();
        this.initHourlyChargeStrings();
        this.initNotificationsKey();
        this.initSnackbars();

        this.init = async () => {
            that.initIntercom();
            that.initDismissedCards();
            that.initWelcomeMessage(); // Welcome message is customized to
            // each user.
            that.initLastView();
            // NOTE: We can't initUserViews or the nav-drawer-list without 
            // a valid firebase.auth().currentUser
            that.initFilters(); // We use this.user.subjects to customize 
            // filters and thus cannot initFilters() without user data.
            that.initNavDrawer(); // Certain items are hidden based on user
            // type.
            await that.initChildren(); // Adds child data to currentUser
            that.initRouter(); // Redirects to the correct screen that (most
            that.initLocationData();
            that.initClocking(); // Adds clockIn and clockOut listeners
            // likely) needs to have Firestore permissions.
            that.initNotifications(); // TODO: Only show the notification
            // prompt when the user submits a newRequest or clicks on the
            // setup notifications card/dialog.
            that.initUserViews(); // Needs Firestore permissions
        };

        var that = this;
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                // User is signed in, show app home screen.
                that.initUser(true).then(() => {
                    that.initURLData();
                    if (that.user.authenticated) {
                        that.init();
                    } else {
                        that.viewCodeSignInDialog();
                    }
                });
            } else {
                that.viewLoader(false);
                that.viewLogin();
            }
        });
    }
};




// ============================================================================
// GENERAL INIT FUNCTIONS
// ============================================================================


// Init function that sets this.data.payments.hourlyChargeStrings to $ amounts from
// 5 to 100 in intervals of 5.
Tutorbook.prototype.initHourlyChargeStrings = function() {
    for (var i = 5; i <= 100; i += 5) {
        var chargeString = '$' + i + '.00';
        this.data.payments.hourlyChargeStrings.push(chargeString);
        this.data.payments.hourlyChargesMap[chargeString] = i;
    }
};


// Helper function that gets all of the location documents and stores them in
// this.data.locations
Tutorbook.prototype.initLocationData = function() {
    var that = this;
    that.data.locations = [];
    return firebase.firestore().collection('locations').get().then((snapshot) => {
        snapshot.forEach((doc) => {
            that.data.locations.push(doc.data().name);
        });
    }).catch((err) => {
        console.error('Error while initializing location data:', err);
        that.data.locations = ['Gunn Academic Center'];
    });
};


// Helper function that starts an onSnapshot for clockIn and clockOut cards
Tutorbook.prototype.initClocking = function() {
    if (this.user.type === 'Supervisor') {
        this.viewDashboardCards();
    }
};


// Init function that sets this.data.payments.hourlyChargeStrings to $ amounts from
// 5 to 100 in intervals of 5.
Tutorbook.prototype.initHourlyChargeStrings = function() {
    for (var i = 5; i <= 100; i += 5) {
        var chargeString = '$' + i + '.00';
        this.data.payments.hourlyChargeStrings.push(chargeString);
        this.data.payments.hourlyChargesMap[chargeString] = i;
    }
};


// Helper function to generate an array of all possible timeStrings within a day
// (NOTE: These are formatted w/ AM and PM as such: '11:31 AM', or '2:00 PM')
Tutorbook.prototype.initTimeStrings = function() {
    // First, iterate over 'AM' vs 'PM'
    this.data.timeStrings = [];
    ['AM', 'PM'].forEach((suffix) => {
        // NOTE: 12:00 AM and 12:00 PM are wierd (as they occur after the
        // opposite suffix) so we have to append them differently
        for (var min = 0; min < 60; min++) {
            // Add an extra zero for values less then 10
            if (min < 10) {
                var minString = '0' + min.toString();
            } else {
                var minString = min.toString();
            }
            this.data.timeStrings.push('12:' + minString + ' ' + suffix);
        }

        // Next, iterate over every hour value in a 12 hour period
        for (var hour = 1; hour < 12; hour++) {
            // Finally, iterate over every minute value in an hour
            for (var min = 0; min < 60; min++) {
                // Add an extra zero for values less then 10
                if (min < 10) {
                    var minString = '0' + min.toString();
                } else {
                    var minString = min.toString();
                }
                this.data.timeStrings.push(hour + ':' + minString + ' ' + suffix);
            }
        }
    });
    return this.data.timeStrings;
};


// Init function that renders the navigation drawer
Tutorbook.prototype.initNavDrawer = function() {
    var that = this;
    const destinations = {
        showSearch: function() {
            that.viewSearch();
        },
        showTutors: function() {
            that.filters.type = 'Tutor';
            that.viewSearch();
        },
        showPupils: function() {
            that.filters.type = 'Pupil';
            that.viewSearch();
        },
        showHome: function() {
            // For now, the Intercom chat button is only available in the 
            // dashboard
            that.viewDashboard();
        },
        showSchedule: function() {
            that.viewSchedule();
        },
        profile: that.user.type === 'Tutor' || that.user.type === 'Pupil',
        showProfile: function() {
            that.viewProfile();
        },
        showChats: function() {
            that.viewChats();
        },
        /*
         *showSettings: function() {
         *    that.initUser().then(() => {
         *        that.viewSettings();
         *    });
         *},
         */
        payments: this.user.config.showPayments || false,
        showPayments: () => {
            that.viewPayments();
        },
        showHelp: function() {
            that.viewFeedback();
        },
        supervisor: this.user.type === 'Supervisor',
        showLocations: () => {
            that.viewLocationManager();
        },
        showAccounts: () => {
            that.viewAccountManager();
        },
    }

    var drawerEl = document.querySelector('#nav-drawer');
    var navListEl = that.renderTemplate('nav-drawer-list', destinations);
    var navList = navListEl.querySelector('.mdc-list');

    $('#nav-drawer .mdc-drawer__content').empty().append(navList);

    var drawer = MDCDrawer.attachTo(drawerEl);
    drawerEl.querySelectorAll('.mdc-list-item').forEach((el) => {
        MDCRipple.attachTo(el);
        el.addEventListener('click', () => {
            drawer.open = false;
        });
    });

};


// Init function to generate a map of templates
Tutorbook.prototype.initTemplates = function() {
    this.templates = {};

    var that = this;
    document.querySelectorAll('.template').forEach(function(el) {
        that.templates[el.getAttribute('id')] = el;
    });
};


// Init function to userAgentCheck if user is viewing on mobile
Tutorbook.prototype.initDisplayPreferences = function() {
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
};


// Init function that sets up the router for the Tutorbook app.
Tutorbook.prototype.initRouter = function() {
    this.router = new Navigo(null, false, '#');

    var that = this;
    this.router
        .on({
            '/app/pupils': function() {
                that.filters.type = 'Pupil';
                that.viewSearch();
            },
            '/app/tutors': function() {
                that.filters.type = 'Tutor';
                that.viewSearch();
            },
            '/app/search': function() {
                that.viewSearch();
            },
            '/app/schedule': function() {
                that.viewSchedule();
            },
            '/app/messages': function() {
                that.viewChats();
            },
            '/app/messages/*': function() {
                var path = that.getCleanPath(document.location.pathname);
                var id = path.split('/')[3];
                that.getChat(id).then((doc) => {
                    that.currentChat = that.combineMaps(doc.data(), {
                        id: doc.id,
                    });
                    that.viewChat(doc.id, doc.data());
                });
            },
            '/app/calendar': function() {
                that.viewSchedule();
            },
            /*
             *'/app/settings': function() {
             *    that.initUser().then(() => {
             *        that.viewSettings();
             *    });
             *},
             */
            '/app/payments/': () => {
                // Remove this for production
                that.viewPayments();
            },
            '/app/users/*': function() {
                var path = that.getCleanPath(document.location.pathname);
                var id = path.split('/')[3];
                that.viewUser(id);
            },
            '/app/users/': function() {
                that.viewSearch();
            },
            '/app/profile': function() {
                that.viewProfile();
            },
            '/app/locations': function() {
                if (that.user.type === 'Supervisor') {
                    that.viewLocationManager();
                } else {
                    that.router.navigate('/app/home');
                }
            },
            '/app/accounts': function() {
                if (that.user.type === 'Supervisor') {
                    that.viewAccountManager();
                } else {
                    that.router.navigate('/app/home');
                }
            },
            '/app/dashboard': function() {
                that.viewDashboard();
            },
            '/app/home': function() {
                that.viewDashboard();
            },
            '/app/feedback': function() {
                that.viewFeedback();
            },
            '/app/help': function() {
                that.viewFeedback();
            },
            '/app': function() {
                that.viewDashboard();
            },
            '/app/*': function() {
                that.viewDashboard();
            },
        }); // NOTE: Do not add the .resolve() as it will automatically redirect

    // No redirect, show home
    if (window.location.toString().indexOf('redirect') < 0) {
        that.router.navigate('/app/home');
        that.viewLoader(false);
    }

    const data = window.location.toString().split('?');
    data.forEach((pairs) => {
        var key = pairs.split('=')[0];
        var val = pairs.split('=')[1];
        if (key === 'redirect') {
            that.router.navigate('/app/' + val);
            that.viewLoader(false);
        }
    });
};


// Init function that updates the app state based on the URL data
Tutorbook.prototype.initURLData = function() {
    var that = this;
    const data = window.location.toString().split('?');
    data.forEach((pairs) => {
        var key = pairs.split('=')[0];
        var val = pairs.split('=')[1];
        switch (key) {
            case 'type':
                try {
                    that.user.type = val.replace('/', '');
                } catch (e) {
                    that.user = {
                        type: val.replace('/', ''),
                    };
                }
                break;
            case 'auth':
                if (val.indexOf('false') >= 0) {
                    try {
                        that.user.authenticated = false;
                    } catch (e) {
                        that.user = {
                            authenticated: false,
                        };
                    }
                } else {
                    try {
                        that.user.authenticated = true;
                    } catch (e) {
                        that.user = {
                            authenticated: true,
                        };
                    }
                }
                that.updateUser();
                break;
            case 'cards':
                ['searchTutors', 'setupNotifications', 'setupProfile', 'setupAvailability', 'addChildren'].forEach((card) => {
                    if (val.indexOf(card) >= 0) {
                        try {
                            that.user.cards[card] = true;
                        } catch (e) {
                            try {
                                that.user.cards = {};
                                that.user.cards[card] = true;
                            } catch (e) {
                                that.user = {};
                                that.user.cards = {};
                                that.user.cards[card] = true;
                            }
                        }
                    }
                });
                that.updateUser();
                break;
        }
    });
};


// Helper function to get rid of the index.html pointer
Tutorbook.prototype.getCleanPath = function(dirtyPath) {
    if (dirtyPath.startsWith('/app/index.html')) {
        const newPath = dirtyPath.split('/').slice(2).join('/');
        return newPath;
    } else {
        return dirtyPath;
    }
};


// Init function that defines all recyclers (I know this is way over the 20 line
// limit, but screw it...)
Tutorbook.prototype.initRecyclers = function() {
    this.cards = {};
    var that = this;
    this.accountRecycler = {
        remove: (doc) => {
            if (that.navSelected === 'Accounts') {
                $('main .account-manager #cards [id="doc-' + doc.id + '"]').remove();
            }
        },
        display: (doc) => {
            if (that.navSelected === 'Accounts') {
                that.viewCard(that.renderAccountCard(doc));
            }
        },
        empty: () => {
            if (that.navSelected === 'Accounts') {
                $('main .account-manager #cards .account-card').remove();
            }
            // TODO: Add a nice, "You have no accounts yet." message
        },
    };

    this.transactionRecycler = {
        remove: (doc, type) => {
            if (that.navSelected === 'Payments') {
                return $('main #doc-' + type + '-' + doc.id).remove();
            }
        },
        display: (doc, type) => {
            switch (type) {
                case 'authPayments':
                    that.cards.noAuthPayments = false;
                    var listItem = that.renderAuthPaymentListItem(doc);
                    break;
                case 'paidPayments':
                    that.cards.noPaidPayments = false;
                    var listItem = that.renderPaidPaymentListItem(doc);
                    break;
                case 'invalidPayments':
                    that.cards.noInvalidPayments = false;
                    var listItem = that.renderInvalidPaymentListItem(doc);
                    break;
                case 'pastPayments':
                    that.cards.noPastPayments = false;
                    var listItem = that.renderPastPaymentListItem(doc);
                    break;
                case 'approvedPayments':
                    that.cards.noApprovedPayments = false;
                    var listItem = that.renderApprovedPaymentListItem(doc);
                    break;
                case 'deniedPayments':
                    that.cards.noDeniedPayments = false;
                    var listItem = that.renderDeniedPaymentListItem(doc);
                    break;
            };
            if (that.navSelected === 'Payments') {
                // Remove the no-transactions card
                $('main .payments #history ul .past-payment').remove();
                return that.viewCard(
                    listItem,
                    document.querySelector('main .payments #history ul')
                );
            }
        },
        empty: (type) => {
            switch (type) {
                case 'authPayments':
                    that.cards.noAuthPayments = true;
                    $('main .payments #history ul .auth-payment').remove();
                    break;
                case 'pastPayments':
                    that.cards.noPastPayments = true;
                    $('main .payments #history ul .past-payment').remove();
                    break;
                case 'invalidPayments':
                    that.cards.noInvalidPayments = true;
                    $('main .payments #history ul .invalid-payment').remove();
                    break;
                case 'paidPayments':
                    that.cards.noPaidPayments = true;
                    $('main .payments #history ul .paid-payment').remove();
                    break;
                case 'approvedPayments':
                    that.cards.noApprovedPayments = true;
                    $('main .payments #history ul .approved-payment').remove();
                    break;
                case 'deniedPayments':
                    that.cards.noDeniedPayments = true;
                    $('main .payments #history ul .denied-payment').remove();
                    break;
            };
            if (that.cards.noAuthPayments &&
                that.cards.noPastPayments &&
                that.cards.noPaidPayments &&
                that.cards.noInvalidPayments &&
                that.cards.noApprovedPayments &&
                that.cards.noDeniedPayments) {
                $('main .payments #history ul').empty().append(
                    that.renderEmptyTransactionsListItem()
                );
                that.log('No transactions.');
            }
        },
    };

    this.locationRecycler = {
        remove: (doc) => {
            if (that.navSelected === 'Locations') {
                $('main .location-manager #cards #doc-' + doc.id).remove();
            }
        },
        display: (doc) => {
            if (that.navSelected === 'Locations') {
                that.viewCard(that.renderLocationCard(doc));
            }
        },
        empty: () => {
            if (that.navSelected === 'Locations') {
                $('main .location-manager #cards .location-card').remove();
            }
            // TODO: Add a nice, "You have no locations yet." message
        },
    };

    this.userViewRecycler = {
        remove: (doc) => {
            delete that.userViews[doc.id];
        },
        display: (doc) => {
            that.userViews[doc.id] = that.renderUserView(doc);
        },
        empty: () => {
            that.userViews = {};
        },
    };

    this.messagesRecycler = {
        remove: (doc) => {
            if (that.navSelected === 'Messages') {
                return $(".main .chat #messages [id='doc-" + doc.id + "']").remove();
            }
        },
        display: (doc) => {
            // We don't want to display user's that do not have a valid profile
            if (that.navSelected === 'Messages') {
                $('.main .chat .centered-text').remove();
                var message = that.renderMessage(doc);
                that.viewMessage(message);
            }
        },
        empty: () => {
            if (that.navSelected === 'Messages') {
                $('.main .chat #messages').empty();
                return $('.main .chat').prepend(that.renderEmptyMessages());
            }
        },
    };

    this.chatsRecycler = {
        remove: (doc) => {
            if (that.navSelected === 'Messages') {
                return $(".main #chats [id='doc-" + doc.id + "']").remove();
            }
        },
        display: (doc) => {
            // We don't want to display user's that do not have a valid profile
            if (that.navSelected === 'Messages') {
                var listItem = that.renderChatItem(doc);
                return that.viewCard(listItem, $('.main #chats')[0]);
            }
        },
        empty: () => {
            if (that.navSelected === 'Messages') {
                return $('.main #chats').empty().append(that.renderEmptyChats());
            }
        },
    };

    this.searchRecycler = {
        remove: (doc) => {
            if (that.navSelected === 'Search' || that.navSelected === 'Tutors' ||
                that.navSelected === 'Pupils') {
                return $(".main #results [id='doc-" + doc.id + "']").remove();
            }
        },
        display: (doc) => {
            // We don't want to display user's that do not have a valid profile
            if (that.navSelected === 'Search' || that.navSelected === 'Tutors' ||
                that.navSelected === 'Pupils') {
                if (this.validProfile(doc.data()) && this.user.email !== doc.data().email) {
                    var listItem = that.renderUserListItem(doc);
                    return that.viewSearchListItem(listItem);
                }
            }
        },
        empty: () => {
            if (that.navSelected === 'Search' || that.navSelected === 'Tutors' ||
                that.navSelected === 'Pupils') {
                return $('.main #results').empty().append(that.renderEmptySearch());
            }
        },
    };

    this.scheduleRecycler = {
        // NOTE: LocationID is passed here as a way to uniquely identify every
        // single query that is merged here when we get a supervisor's schedule
        // data. This way, the scheduleEl is only emptied when it really IS
        // empty.
        remove: (doc, type, locationID) => {
            that.log('[REMOVING] ' + locationID + ' event: #doc-' + type + '-' + doc.id + '...');
            if (that.navSelected === 'Schedule') {
                $('main .schedule ul #doc-' + type + '-' + doc.id).remove();
                that.refreshSchedule();
            }
        },
        display: (doc, type, locationID) => {
            that.log('[DISPLAYING] ' + locationID + ' event: #doc-' + type + '-' + doc.id + '...');
            switch (type) {
                case 'appointments':
                    that.cards.noAppointments = false;
                    var listItem = that.renderApptListItem(doc, locationID);
                    break;
                case 'pastAppointments':
                    that.cards.noPastAppointments = false;
                    var listItem = that.renderPastApptListItem(doc, locationID);
                    break;
                case 'activeAppointments':
                    that.cards.noActiveAppointments = false;
                    var listItem = that.renderActiveApptListItem(doc, locationID);
                    break;
                case 'modifiedAppointments':
                    that.cards.noActiveAppointments = false;
                    var listItem = that.renderModifiedApptListItem(doc, locationID);
                    break;
                case 'canceledAppointments':
                    that.cards.noActiveAppointments = false;
                    var listItem = that.renderCanceledApptListItem(doc, locationID);
                    break;
            };
            if (that.navSelected === 'Schedule') {
                return that.viewScheduleListItem(listItem);
            }
        },
        empty: (type, locationID) => {
            that.log('[EMPTYING] ' + locationID + ' events: .event-' + type + '-' + locationID + '...');
            if (!!locationID) {
                switch (type) {
                    case 'appointments':
                        that.cards['noAppointmentsFor' + locationID] = true;
                        $('main .mdc-list .event-appt-' + locationID).remove();
                        break;
                    case 'pastAppointments':
                        that.cards['noPastAppointmentsFor' + locationID] = true;
                        $('main .mdc-list .event-pastAppt-' + locationID).remove();
                        break;
                    case 'activeAppointments':
                        that.cards['noActiveAppointmentsFor' + locationID] = true;
                        $('main .mdc-list .event-activeAppt-' + locationID).remove();
                        break;
                };
                var empty = true;
                Object.entries(that.cards).forEach((entry) => {
                    var key = entry[0];
                    var val = entry[1];
                    [
                        'noAppointmentsFor',
                        'noPastAppointmentsFor',
                        'noActiveAppointmentsFor'
                    ].forEach((type) => {
                        if (key.startsWith(type) && val) {
                            empty = false;
                        }
                    });
                });
                if (empty) {
                    console.warn('Emptying schedule...');
                    // TODO: Figure out Pam's bug here.
                    /*
                     *$('main .schedule .mdc-list').empty();
                     *$('main').append(that.renderEmptySchedule());
                     */
                }
            } else {
                switch (type) {
                    case 'appointments':
                        that.cards.noAppointments = true;
                        $('main .mdc-list .event-appt').remove();
                        break;
                    case 'pastAppointments':
                        that.cards.noPastAppointments = true;
                        $('main .mdc-list .event-pastAppt').remove();
                        break;
                    case 'activeAppointments':
                        that.cards.noActiveAppointments = true;
                        $('main .mdc-list .event-activeAppt').remove();
                        break;
                };
                // TODO: Figure out the bug here with Pam's schedule
                if (that.cards.noAppointments && that.cards.noPastAppointments &&
                    that.cards.noActiveAppointments && that.user.type !== 'Supervisor') {
                    console.warn('Emptying schedule...');
                    /*
                     *$('main .schedule .mdc-list').empty();
                     *$('main').append(that.renderEmptySchedule());
                     */
                }
            }
            that.refreshSchedule();
        },
    };

    /*
     *    this.supervisorDashboardRecycler = {
     *        remove: function(doc, type) {
     *            if (that.navSelected === 'Home' || that.navSelected === 'Tutorbook') {
     *                // TODO: Update the number of that cards in the card for that type
     *            }
     *        },
     *        display: function(doc, type) {
     *            if (that.dismissedCards.indexOf(type + '-' + doc.id) >= 0) {
     *                // TODO: Add dismissedCards to a "Dismissed Cards" div
     *                that.log('Skipping dismissed card:', type + '-' + doc.id);
     *                return;
     *            }
     *            switch (type) {
     *                // TUTOR/PUPIL/PARENT CARDS
     *                case 'requestsIn':
     *                    that.cards.noRequestsIn = false;
     *                    var card = that.renderRequestInCard(doc);
     *                    that.cards.requestsIn++;
     *                    break;
     *                case 'modifiedRequestsIn':
     *                    that.cards.noModifiedRequestsIn = false;
     *                    var card = that.renderModifiedRequestInCard(doc);
     *                    that.cards.modifiedRequestsIn++;
     *                    break;
     *                case 'canceledRequestsIn':
     *                    that.cards.noCanceledRequestsIn = false;
     *                    var card = that.renderCanceledRequestInCard(doc);
     *                    that.cards.canceledRequestsIn++;
     *                    break;
     *                case 'requestsOut':
     *                    that.cards.noRequestsOut = false;
     *                    var card = that.renderRequestOutCard(doc);
     *                    that.cards.requestsOut++;
     *                    break;
     *                case 'modifiedRequestsOut':
     *                    that.cards.noModifiedRequestsOut = false;
     *                    var card = that.renderModifiedRequestOutCard(doc);
     *                    that.cards.modifiedRequestsOut++;
     *                    break;
     *                case 'rejectedRequestsOut':
     *                    that.cards.noRejectedRequestsOut = false;
     *                    var card = that.renderRejectedRequestOutCard(doc);
     *                    that.cards.rejectedRequestsOut++;
     *                    break;
     *                case 'approvedRequestsOut':
     *                    that.cards.noApprovedRequestsOut = false;
     *                    var card = that.renderApprovedRequestOutCard(doc);
     *                    that.cards.approvedRequestsOut++;
     *                    break;
     *                case 'appointments':
     *                    that.cards.noAppointments = false;
     *                    var card = that.renderApptCard(doc);
     *                    that.cards.appts++;
     *                    break;
     *                case 'modifiedAppointments':
     *                    that.cards.noModifiedAppointments = false;
     *                    var card = that.renderModifiedApptCard(doc);
     *                    that.cards.modifiedAppts++;
     *                    break;
     *                case 'canceledAppointments':
     *                    that.cards.noCanceledAppointments = false;
     *                    var card = that.renderCanceledApptCard(doc);
     *                    that.cards.canceledAppts++;
     *                    break;
     *
     *                    // SUPERVISOR CARDS
     *                case 'clockIns':
     *                    that.cards.noClockIns = false;
     *                    var card = that.renderClockInCard(doc);
     *                    that.cards.clockOuts++;
     *                    break;
     *                case 'clockOuts':
     *                    that.cards.noClockOuts = false;
     *                    var card = that.renderClockOutCard(doc);
     *                    that.cards.clockOuts++;
     *                    break;
     *                case 'approvedClockIns':
     *                    that.cards.noApprovedClockIns = false;
     *                    var card = that.renderApprovedClockInCard(doc);
     *                    break;
     *                case 'approvedClockOuts':
     *                    that.cards.noApprovedClockOuts = false;
     *                    var card = that.renderApprovedClockOutCard(doc);
     *                    break;
     *
     *                    // NOTE: Cards that have pre-filled content (i.e. setup cards)
     *                    // just appear as true/false in the that.user.cards map
     *                case 'welcomeMessage':
     *                    if (that.onMobile && !!doc) {
     *                        var card = that.renderWelcomeCard(doc);
     *                    }
     *                    break;
     *                case 'searchTutors':
     *                    if (doc) {
     *                        var card = that.renderSearchTutorsCard();
     *                    }
     *                    break;
     *                case 'setupProfile':
     *                    if (doc) {
     *                        var card = that.renderSetupProfileCard();
     *                    }
     *                    break;
     *                case 'setupAvailability':
     *                    if (doc) {
     *                        var card = that.renderSetupAvailabilityCard();
     *                    }
     *                    break;
     *                case 'setupPayment':
     *                    if (doc) {
     *                        var card = that.renderSetupPaymentCard();
     *                    }
     *                    break;
     *                case 'setupCalendar':
     *                    if (doc) {
     *                        var card = that.renderSetupCalendarCard();
     *                    }
     *                    break;
     *                case 'setupDeposit':
     *                    if (doc) {
     *                        var card = that.renderSetupDepositCard();
     *                    }
     *                    break;
     *                case 'setupLocation':
     *                    if (doc) {
     *                        var card = that.renderSetupLocationCard();
     *                    }
     *                    break;
     *                case 'setupChildren':
     *                    if (doc) {
     *                        var card = that.renderSetupChildrenCard();
     *                    }
     *                    break;
     *                case 'setupNotifications':
     *                    if (doc) {
     *                        var card = that.renderSetupNotificationsCard();
     *                    }
     *                    break;
     *                case 'setupRestrictions':
     *                    if (doc) {
     *                        var card = that.renderSetupRestrictionsCard();
     *                    }
     *                    break;
     *                    // TODO: Add other cases
     *                default:
     *                    console.warn('Unsupported card subcollection:', type);
     *                    break;
     *            };
     *            if (that.navSelected === 'Home' || that.navSelected === 'Tutorbook') {
     *                that.viewCard(card);
     *            }
     *        },
     *        empty: function(type) {
     *            if (that.navSelected === 'Home' || that.navSelected === 'Tutorbook') {
     *                // TODO: Make this render a unique "no upcoming" el like GMail does
     *                switch (type) {
     *
     *                    // TUTOR/PUPIL/PARENT CARDS
     *                    case 'requestsIn':
     *                        that.cards.noRequestsIn = true;
     *                        $('main #cards .card-requestsIn').remove();
     *                        break;
     *                    case 'modifiedRequestsIn':
     *                        that.cards.noModifiedRequestsIn = true;
     *                        $('main #cards .card-modifiedRequestsIn').remove();
     *                        break;
     *                    case 'canceledRequestsIn':
     *                        that.cards.noCanceledRequestsIn = true;
     *                        $('main #cards .card-canceledRequestsIn').remove();
     *                        break;
     *                    case 'requestsOut':
     *                        that.cards.noRequestsOut = true;
     *                        $('main #cards .card-requestsOut').remove();
     *                        break;
     *                    case 'modifiedRequestsOut':
     *                        that.cards.noModifiedRequestsOut = true;
     *                        $('main #cards .card-modifiedRequestsOut').remove();
     *                        break;
     *                    case 'rejectedRequestsOut':
     *                        that.cards.noRejectedRequestsOut = true;
     *                        $('main #cards .card-rejectedRequestsOut').remove();
     *                        break;
     *                    case 'approvedRequestsOut':
     *                        that.cards.noApprovedRequestsOut = true;
     *                        $('main #cards .card-approvedRequestsOut').remove();
     *                        break;
     *                    case 'appointments':
     *                        that.cards.noAppointments = true;
     *                        $('main #cards .card-appointments').remove();
     *                        break;
     *                    case 'modifiedAppointments':
     *                        that.cards.noModifiedAppointments = true;
     *                        $('main #cards .card-modifiedAppointments').remove();
     *                        break;
     *                    case 'canceledAppointments':
     *                        that.cards.noCanceledAppointments = true;
     *                        $('main #cards .card-canceledAppointments').remove();
     *                        break;
     *
     *                        // SUPERVISOR CARDS
     *                    case 'clockIns':
     *                        that.cards.noClockIns = true;
     *                        $('main #cards .card-clockIns').remove();
     *                        break;
     *                    case 'clockOuts':
     *                        that.cards.noClockOuts = true;
     *                        $('main #cards .card-clockOuts').remove();
     *                        break;
     *                    case 'approvedClockIns':
     *                        that.cards.noApprovedClockIns = true;
     *                        $('main #cards .card-approvedClockIns').remove();
     *                        break;
     *                    case 'approvedClockOuts':
     *                        that.cards.noApprovedClockOuts = true;
     *                        $('main #cards .card-approvedClockOuts').remove();
     *                        break;
     *
     *                    default:
     *                        console.warn("Invalid type passed to dashboardRenderer " +
     *                            "empty:", type);
     *                        break;
     *                };
     *
     *                // Helper function to check if this.user.cards is empty from cards
     *                // that need to be rendered in the dashboard display
     *                function emptySetupCards() {
     *                    const cards = that.user.cards;
     *                    var empty = true;
     *                    ['setupPayment', 'setupCalendar', 'setupProfile', 'searchTutors',
     *                        'setupLocation', 'setupNotifications', 'welcomeMessage',
     *                    ].forEach((card) => {
     *                        if (!!that.user.cards[card]) {
     *                            empty = false;
     *                        }
     *                    });
     *                    return empty;
     *                };
     *
     *                // Only show empty screen when all card types show up empty
     *                if (emptySetupCards() && that.cards.noRequestsIn && that.cards.noRequestsOut && that.cards.noAppointments) {
     *                    $('.main #cards').empty();
     *                }
     *            }
     *        }
     *    };
     */

    this.dashboardRecycler = {
        remove: function(doc, type) {
            if (that.navSelected === 'Home' || that.navSelected === 'Tutorbook') {
                // NOTE: Type is the subcollection first combined with any other
                // identifiers needed. (e.g. requestsIn-locationID or requestsIn-childEmail)
                that.log('Removing card:', type);
                that.log('With id:', 'card-' + type + '-' + doc.id);
                return $('main #card-' + type + '-' + doc.id).remove();
            }
        },
        display: function(doc, type) {
            // NOTE: Type is the subcollection first combined with any other
            // identifiers needed. (e.g. requestsIn-locationID or requestsIn-childEmail)
            const subcollection = type.split('-')[0];
            that.log('Recycling card:', type);
            that.log('With subcollection:', subcollection);
            if (that.dismissedCards.indexOf(subcollection + '-' + doc.id) >= 0) {
                return;
            }
            switch (subcollection) {
                // PARENT CARDS
                case 'children':
                    that.cards.noChildren = false;
                    var card = that.renderChildCard(doc);
                    break;

                    // TUTOR/PUPIL/PARENT CARDS
                case 'requestsIn':
                    that.cards.noRequestsIn = false;
                    var card = that.renderRequestInCard(doc);
                    break;
                case 'modifiedRequestsIn':
                    that.cards.noModifiedRequestsIn = false;
                    var card = that.renderModifiedRequestInCard(doc);
                    break;
                case 'canceledRequestsIn':
                    that.cards.noCanceledRequestsIn = false;
                    var card = that.renderCanceledRequestInCard(doc);
                    break;
                case 'requestsOut':
                    that.cards.noRequestsOut = false;
                    var card = that.renderRequestOutCard(doc);
                    break;
                case 'modifiedRequestsOut':
                    that.cards.noModifiedRequestsOut = false;
                    var card = that.renderModifiedRequestOutCard(doc);
                    break;
                case 'rejectedRequestsOut':
                    that.cards.noRejectedRequestsOut = false;
                    var card = that.renderRejectedRequestOutCard(doc);
                    break;
                case 'approvedRequestsOut':
                    that.cards.noApprovedRequestsOut = false;
                    var card = that.renderApprovedRequestOutCard(doc);
                    break;
                case 'appointments':
                    that.cards.noAppointments = false;
                    var card = that.renderApptCard(doc);
                    break;
                case 'activeAppointments':
                    that.cards.noActiveAppointments = false;
                    var card = that.renderActiveApptCard(doc);
                    break;
                case 'modifiedAppointments':
                    that.cards.noModifiedAppointments = false;
                    var card = that.renderModifiedApptCard(doc);
                    break;
                case 'canceledAppointments':
                    that.cards.noCanceledAppointments = false;
                    var card = that.renderCanceledApptCard(doc);
                    break;
                case 'needApprovalPayments':
                    that.cards.noNeedApprovalPayments = false;
                    var card = that.renderNeedApprovalPaymentCard(doc);
                    break;

                    // SUPERVISOR CARDS
                case 'clockIns':
                    that.cards.noClockIns = false;
                    var card = that.renderClockInCard(doc);
                    break;
                case 'clockOuts':
                    that.cards.noClockOuts = false;
                    var card = that.renderClockOutCard(doc);
                    break;
                case 'approvedClockIns':
                    that.cards.noApprovedClockIns = false;
                    /*
                     *var card = that.renderApprovedClockInCard(doc);
                     */
                    break;
                case 'approvedClockOuts':
                    that.cards.noApprovedClockOuts = false;
                    /*
                     *var card = that.renderApprovedClockOutCard(doc);
                     */
                    break;

                    // NOTE: Cards that have pre-filled content (i.e. setup cards)
                    // just appear as true/false in the that.user.cards map
                case 'welcomeMessage':
                    if (that.onMobile && !!doc) {
                        var card = that.renderWelcomeCard(doc);
                    }
                    break;
                case 'searchTutors':
                    if (doc) {
                        var card = that.renderSearchTutorsCard();
                    }
                    break;
                case 'setupProfile':
                    if (doc) {
                        var card = that.renderSetupProfileCard();
                    }
                    break;
                case 'setupAvailability':
                    if (doc) {
                        var card = that.renderSetupAvailabilityCard();
                    }
                    break;
                case 'setupPayment':
                    if (doc) {
                        var card = that.renderSetupPaymentCard();
                    }
                    break;
                case 'setupCalendar':
                    if (doc) {
                        var card = that.renderSetupCalendarCard();
                    }
                    break;
                case 'setupDeposit':
                    if (doc) {
                        var card = that.renderSetupDepositCard();
                    }
                    break;
                case 'setupLocation':
                    if (doc) {
                        var card = that.renderSetupLocationCard();
                    }
                    break;
                case 'addChildren':
                    if (doc) {
                        var card = that.renderAddChildrenCard();
                    }
                    break;
                case 'setupNotifications':
                    if (doc) {
                        var card = that.renderSetupNotificationsCard();
                    }
                    break;
                case 'setupRestrictions':
                    if (doc) {
                        var card = that.renderSetupRestrictionsCard();
                    }
                    break;
                    // TODO: Add other cases
                default:
                    console.warn('Unsupported card subcollection:', type);
                    break;
            };
            if ((that.navSelected === 'Home' || that.navSelected === 'Tutorbook') &&
                !!card) {
                card.setAttribute('class', card.getAttribute('class') + ' card-' + type);
                card.setAttribute('id', 'card-' + type + '-' + doc.id);
                that.viewCard(card);
            }
        },
        empty: function(type) {
            if (that.navSelected === 'Home' || that.navSelected === 'Tutorbook') {
                // NOTE: Type is the subcollection first combined with any other
                // identifiers needed. (e.g. requestsIn-locationID or requestsIn-childEmail)
                const subcollection = type.split('-')[0];
                that.log('Emptying card type:', type);
                that.log('With subcollection:', subcollection);
                switch (subcollection) {

                    // PARENT CARDS
                    case 'children':
                        that.cards.noChildren = true;
                        break;

                        // TUTOR/PUPIL/PARENT CARDS
                    case 'requestsIn':
                        that.cards.noRequestsIn = true;
                        break;
                    case 'modifiedRequestsIn':
                        that.cards.noModifiedRequestsIn = true;
                        break;
                    case 'canceledRequestsIn':
                        that.cards.noCanceledRequestsIn = true;
                        break;
                    case 'requestsOut':
                        that.cards.noRequestsOut = true;
                        break;
                    case 'modifiedRequestsOut':
                        that.cards.noModifiedRequestsOut = true;
                        break;
                    case 'rejectedRequestsOut':
                        that.cards.noRejectedRequestsOut = true;
                        break;
                    case 'approvedRequestsOut':
                        that.cards.noApprovedRequestsOut = true;
                        break;
                    case 'appointments':
                        that.cards.noAppointments = true;
                        break;
                    case 'activeAppointments':
                        that.cards.noActiveAppointments = true;
                        break;
                    case 'modifiedAppointments':
                        that.cards.noModifiedAppointments = true;
                        break;
                    case 'canceledAppointments':
                        that.cards.noCanceledAppointments = true;
                        break;
                    case 'needApprovalPayments':
                        that.cards.noNeedApprovalPayments = true;
                        break;


                        // SUPERVISOR CARDS
                    case 'clockIns':
                        that.cards.noClockIns = true;
                        break;
                    case 'clockOuts':
                        that.cards.noClockOuts = true;
                        break;
                    case 'approvedClockIns':
                        that.cards.noApprovedClockIns = true;
                        break;
                    case 'approvedClockOuts':
                        that.cards.noApprovedClockOuts = true;
                        break;

                    default:
                        console.warn("Invalid type passed to dashboardRenderer " +
                            "empty:", type);
                        break;
                };

                $('main #cards .card-' + type).remove();
            }
        }
    };
};




// ============================================================================
// GENERAL HELPER FUNCTIONS
// ============================================================================


// Helper function that returns a duration string (hrs:min:sec) given two Date
// objects.
Tutorbook.prototype.getDurationStringFromDates = function(start, end) {
    const secs = (end.getTime() - start.getTime()) / 1000;
    const string = this.getDurationStringFromSecs(secs);
    return string + '.00'; // For clockIn timers
};


// Helper function that returns a duration string (hrs:min:sec) given seconds
// tutored
Tutorbook.prototype.getDurationStringFromSecs = function(secs) {
    // See: https://www.codespeedy.com/convert-seconds-to-hh-mm-ss-format-
    // in-javascript/
    const time = new Date(null);
    time.setSeconds(secs);
    return time.toISOString().substr(11, 8);
};


// Logging that can be turned off and on
Tutorbook.prototype.log = function(message, item) {
    if (this.loggingOn) {
        (!!item) ? console.log(message, item): console.log(message);
    }
};


// Helper function that returns the otherUser given two user maps
Tutorbook.prototype.findOtherUser = function(usera, userb) {
    if (usera.email !== this.user.email) {
        return usera;
    } else if (userb.email !== this.user.email) {
        return userb;
    }
    console.warn('findOtherUser was passed two instances of the currentUser:', this.user);
    return this.user;
};


// Helper function that concats the two arrays but get rids of doubles 
Tutorbook.prototype.concatArr = function(arrA, arrB) {
    var result = [];
    arrA.forEach((item) => {
        if (result.indexOf(item) < 0) {
            result.push(item);
        }
    });
    arrB.forEach((item) => {
        if (result.indexOf(item) < 0) {
            result.push(item);
        }
    });
    return result;
};


// Helper function to replace one HTML Node with another
Tutorbook.prototype.replaceElement = function(parent, content) {
    parent.innerHTML = '';
    parent.append(content);
};


// Helper function to return the otherUser (i.e. the user who is not currently
// logged in).
Tutorbook.prototype.getOtherUser = function(userA, userB) {
    if (userA.email === this.user.email) {
        return userB;
    }
    return userA;
};


// Helper function that opens a new print-friendly window for printing an appt
// or request (uses the current mainView and just gets rid of the top app bar
// and any floating action buttons).
Tutorbook.prototype.printPage = function() {
    $('.header').hide();
    $('.mdc-fab').hide();
    window.print();
    $('.header').show();
    $('.mdc-fab').show();
};


// Helper function that returns the correct subject array from Firestore user
// data
Tutorbook.prototype.getUserSubjects = function(userData) {
    // If they already have the updated subject array, just use that
    if (userData === undefined) {
        return [];
    }
    if (!!userData.subjects && userData.subjects !== []) {
        return userData.subjects;
        // Otherwise, check if they're a tutor or a pupil
    } else if (userData.type === 'Tutor') {
        return userData.proficientStudies;
    } else if (userData.type === 'Pupil') {
        return userData.neededStudies;
    }
    return [];
};


// Helper function to capitalize the first letter of any given string
Tutorbook.prototype.capitalizeFirstLetter = function(string) {
    if (typeof string == undefined) return;
    var firstLetter = string[0] || string.charAt(0);
    return firstLetter ? firstLetter.toUpperCase() + string.substr(1) : '';
};


// Helper function to clone maps
Tutorbook.prototype.cloneMap = function(map) {
    var clone = {};
    for (var i in map) {
        clone[i] = map[i];
    }
    return clone;
};


// Helper function to combine two maps
Tutorbook.prototype.combineMaps = function(mapA, mapB) {
    // NOTE: This function gives priority to mapB over mapA
    var result = {};
    for (var i in mapA) {
        result[i] = mapA[i];
    }
    for (var i in mapB) {
        result[i] = mapB[i];
    }
    return result;
};


// Helper function to return the correct gender pronoun given a gender string
Tutorbook.prototype.getGenderPronoun = function(gender) {
    switch (gender) {
        case 'Male':
            return 'his';
        case 'Female':
            return 'her';
        case 'Other':
            return 'their';
        default:
            return 'their';
    };
};


// Helper function that returns the other user than the one that matches the 
// given user from the given array of users.
Tutorbook.prototype.getOtherAttendee = function(notThisUser, attendees) {
    if (attendees[0].email === notThisUser.email) {
        return attendees[1];
    }
    return attendees[0];
};


// Helper function to return a locale date string that actually makes sense
Tutorbook.prototype.getDateString = function(timestamp) {
    return timestamp.toDate().toLocaleDateString();
};


// Helper function to return a locale time string that makes sense
Tutorbook.prototype.getTimeString = function(timestamp) {
    // NOTE: Although we create timestamp objects here as new Date() objects,
    // Firestore converts them to Google's native Timestamp() objects and thus
    // we must call toDate() to access any Date() methods.
    var timeString = timestamp.toDate().toLocaleTimeString();
    var timeStringSplit = timeString.split(':');
    var hour = timeStringSplit[0];
    var min = timeStringSplit[1];
    var ampm = timeStringSplit[2].split(' ')[1];
    return hour + ':' + min + ' ' + ampm;
};




// ============================================================================
// GENERAL VIEW & RENDER FUNCTIONS
// ============================================================================


// Helper function to essientially reload the current view/page
Tutorbook.prototype.rerender = function() {
    this.router.navigate(document.location.pathname + '?' + new Date().getTime());
};


// Render function that returns a fab based on the given type
Tutorbook.prototype.renderFab = function(type) {
    switch (type) {
        case 'clockIn':
            return this.renderTemplate('fab-labeled', {
                id: 'clockInButton',
                icon: 'timer',
                label: 'Clock In',
            });
        case 'withdraw':
            return this.renderTemplate('fab-labeled', {
                id: 'withdrawButton',
                icon: 'account_balance_wallet',
                label: 'Pay Me',
            });
        case 'scrollToUpcoming':
            return this.renderTemplate('fab-labeled', {
                id: 'scrollButton',
                icon: 'arrow_downward',
                label: 'Past',
            });
        case 'scrollToLatest':
            return this.renderTemplate('fab-labeled', {
                id: 'scrollButton',
                icon: 'arrow_downward',
                label: 'Recent',
            });
        case 'sendMessage':
            return this.renderTemplate('fab-labeled', {
                id: 'sendMessage',
                icon: 'send',
                label: 'Send Feedback',
            });
    };
};


// Helper function that proxies to viewLastView
Tutorbook.prototype.back = function() {
    return this.viewLastView();
};


// View function that views the lastView
Tutorbook.prototype.viewLastView = function() {
    // NOTE: We have to have this wierd logic in order to provide proper
    // back navigation across three screens (i.e. dashboard > viewRequest >
    // editRequest). TODO: To add more nav support, we would probs want to 
    // convert lastViews into an array and use this logic to manipulate the
    // indexes within that array.
    const lastView = this.lastLastView;
    history.pushState({}, null, this.lastView.url);
    this.view(this.lastView.header, this.lastView.main);
    window.scrollTo(this.lastView.scroll, this.lastView.scroll);

    // If we are viewing anything that needs a recycler or a data manager, make
    // sure to rerender those items.
    const headerTitle = this.currentView.header
        .querySelector('.mdc-top-app-bar__title').innerText;
    this.navSelected = headerTitle;
    switch (headerTitle) {
        case 'Tutorbook':
            this.viewDashboardCards();
            this.viewIntercom(true);
            break;
        case 'Schedule':
            this.viewScheduleEvents();
            this.viewIntercom(false);
            break;
        case 'Search':
            this.viewSearchResults();
            this.viewIntercom(true);
            break;
        case 'Messages':
            this.viewChatResults();
            this.viewIntercom(true);
            break;
        case 'Payments':
            this.addPaymentsManager();
            this.viewTransactionHistory();
            if (this.user.type === 'Tutor') {
                this.viewIntercom(false);
            } else {
                this.viewIntercom(true);
            }
            break;
        case 'Profile':
            this.addProfileManager(this.currentView.main);
            this.viewIntercom(true);
            break;
        case 'View Request':
            this.addViewRequestDataManager();
            this.viewIntercom(false);
            break;
        case 'Edit Request':
            this.addUpdateRequestDataManager();
            this.viewIntercom(false);
            break;
        case 'New Request':
            this.addNewRequestManager();
            this.viewIntercom(false);
            break;
        case 'View Appointment':
            this.addViewRequestDataManager();
            this.viewIntercom(false);
            break;
        case 'Edit Appointment':
            this.addUpdateApptDataManager();
            this.viewIntercom(false);
            break;
    };

    this.lastView = lastView;
};


// Init function that updates the lastView based on the currentView
Tutorbook.prototype.initLastView = function() {
    // NOTE: We can't just use HTML elements here (as they don't come with the
    // associated JS), so this should be only called when JS isn't necessary
    // (i.e. when all we're seeing is a loader screen).
    // NOTE: We go back two lastViews so as to allow for the edit and view
    // dialogs navigation to function correctly.
    this.lastLastView = {
        header: this.renderHeader('header-main', {
            title: 'Tutorbook'
        }),
        main: this.renderTemplate('dashboard', {
            // If the user is viewing on mobile, we don't
            // want to show the welcome message in huge text.
            welcome: !this.onMobile,
            title: this.user.cards.welcomeMessage.title || "Welcome to Tutorbook",
            subtitle: this.user.cards.welcomeMessage.summary || "We're glad you're here. Below are some friendly suggestions for what to do next.",
        }),
        url: '/app/home',
        scroll: 0,
    };
    this.lastView = {
        header: this.renderHeader('header-main', {
            title: 'Tutorbook'
        }),
        main: this.renderTemplate('dashboard'),
        url: '/app/home',
        scroll: 0,
    };
    // NOTE: This is also the only time when the currentView and the lastView
    // will be the same (as we've only yet seen one screen).
    this.currentView = {
        header: this.renderHeader('header-main', {
            title: 'Tutorbook'
        }),
        main: this.renderTemplate('dashboard', {
            // If the user is viewing on mobile, we don't
            // want to show the welcome message in huge text.
            welcome: !this.onMobile,
            title: this.user.cards.welcomeMessage.title || "Welcome to Tutorbook",
            subtitle: this.user.cards.welcomeMessage.summary || "We're glad you're here. Below are some friendly suggestions for what to do next.",
        }),
        url: '/app/home',
        scroll: 0,
    };
};


// View function that views the given headerEl and mainEl
Tutorbook.prototype.view = function(headerEl, mainEl) {
    // Set the currentView to the view we're about to show and set the lastView
    // to the old currentView.
    // NOTE: We go back two lastViews so as to allow for the edit and view
    // dialogs navigation to function correctly.
    this.lastLastView = this.lastView;
    this.lastView = this.currentView;
    this.currentView = {
        main: mainEl,
        header: headerEl,
        scroll: $(document).scrollTop(),
        url: this.getCleanPath(document.location.pathname)
    };
    $('.main').empty().append(mainEl);
    $('.header').empty().append(headerEl);
    window.scrollTo(0, 0);
};


// View function that shows navigation drawer
Tutorbook.prototype.viewNavDrawer = function() {
    $('#nav-drawer .mdc-list-item--activated').attr('class', 'mdc-list-item');
    switch (this.navSelected) {
        case 'Tutorbook': // Home is selected
            $('#nav-drawer .mdc-list #home').attr('class', 'mdc-list-item mdc-list-item--activated');
            break;
        case 'Home':
            $('#nav-drawer .mdc-list #home').attr('class', 'mdc-list-item mdc-list-item--activated');
            break;
        case 'Schedule':
            $('#nav-drawer .mdc-list #schedule').attr('class', 'mdc-list-item mdc-list-item--activated');
            break;
        case 'Messages':
            $('#nav-drawer .mdc-list #chats').attr('class', 'mdc-list-item mdc-list-item--activated');
            break;
        case 'Accounts':
            $('#nav-drawer .mdc-list #accounts').attr('class', 'mdc-list-item mdc-list-item--activated');
            break;
        case 'Locations':
            $('#nav-drawer .mdc-list #locations').attr('class', 'mdc-list-item mdc-list-item--activated');
            break;
        case 'History':
            $('#nav-drawer .mdc-list #history').attr('class', 'mdc-list-item mdc-list-item--activated');
            break;
        case 'Payments':
            $('#nav-drawer .mdc-list #payments').attr('class', 'mdc-list-item mdc-list-item--activated');
            break;
        case 'Search':
            $('#nav-drawer .mdc-list #search').attr('class', 'mdc-list-item mdc-list-item--activated');
            break;
        case 'Settings':
            $('#nav-drawer .mdc-list #settings').attr('class', 'mdc-list-item mdc-list-item--activated');
            break;
        case 'Tutors':
            $('#nav-drawer .mdc-list #tutors').attr('class', 'mdc-list-item mdc-list-item--activated');
            break;
        case 'Pupils':
            $('#nav-drawer .mdc-list #pupils').attr('class', 'mdc-list-item mdc-list-item--activated');
            break;
        case 'Profile':
            $('#nav-drawer .mdc-list #profile').attr('class', 'mdc-list-item mdc-list-item--activated');
            break;
        case 'Help & Feedback':
            $('#nav-drawer .mdc-list #feedback').attr('class', 'mdc-list-item mdc-list-item--activated');
            break;
        default:
            $('#nav-drawer .mdc-list #home').attr('class', 'mdc-list-item mdc-list-item--activated');
    };
    document.querySelectorAll('#nav-drawer .mdc-list-item').forEach((el) => {
        MDCRipple.attachTo(el);
    });
    return MDCDrawer.attachTo(document.querySelector('#nav-drawer')).open = true;
};


// View function that shows overflow menu
Tutorbook.prototype.viewMenu = function() {
    document.querySelectorAll('.header .mdc-menu .mdc-list-item').forEach((el) => {
        MDCRipple.attachTo(el);
    });
    return MDCMenu.attachTo(document.querySelector('.header .mdc-menu')).open = true;
};


// Render function that returns a welcome card with the given title and summary
Tutorbook.prototype.renderWelcomeCard = function(options) {
    const card = this.renderTemplate('card-empty', {
        id: 'card-welcome',
        title: options.title,
        subtitle: options.subtitle,
        summary: options.summary,
        dismiss: () => {
            $('main #welcome-card').remove();
            this.user.cards.welcomeMessage = false;
        },
        timestamp: new Date(),
    });
    card
        .querySelectorAll('.mdc-button, .mdc-card__primary-action, .mdc-icon-button')
        .forEach((el) => {
            MDCRipple.attachTo(el);
        });
    // We set the id so that we can ensure not to append any cards in 
    // front of this one
    card.setAttribute('id', 'welcome-card');
    return card;
};


// View function that hides or shows loader icon
Tutorbook.prototype.viewLoader = function(show) {
    const loaderEl = $('#loader');
    if (show) {
        $('.main').empty().append(loaderEl);
        $('.header').empty();
    } else {
        loaderEl.hide();
    }
};


// Render function that returns the right headerEl based on inputs
Tutorbook.prototype.renderHeader = function(id, data) {
    var that = this;
    var headerEl = this.renderTemplate(id,
        this.combineMaps(data, {
            'back': () => {
                that.back();
            },
            'navigation': () => {
                that.viewNavDrawer();
            },
            'menu': () => {
                that.viewMenu();
            },
            'sign_out': () => {
                that.signOut();
            },
            'payments': () => {
                that.user.config.showPayments = true;
                that.initNavDrawer();
                that.updateUser();
                that.viewPayments();
            },
            /*
             *'settings': () => {
             *    that.router.navigate('/app/settings');
             *},
             */

        }));
    MDCTopAppBar.attachTo(headerEl);
    headerEl.querySelectorAll('.mdc-button').forEach((el) => {
        MDCRipple.attachTo(el);
    });
    return headerEl;
};


// Render function that returns rendered template without the hidden template
// wrapper.
Tutorbook.prototype.renderTemplate = function(id, data) {
    var template = this.templates[id];
    var el = template.cloneNode(true);
    this.render(el, data);
    return el.firstElementChild;
};


// Render function that applies modifiers to el
Tutorbook.prototype.render = function(el, data) {
    if (!data) {
        return;
    }

    var that = this;
    var modifiers = {
        'data-fir-copies': function(tel) {
            var field = tel.getAttribute('data-fir-copies');
            var value = that.getDeepItem(data, field);
            // Only perform the copying once
            tel.removeAttribute('data-fir-copies');
            for (var i = 1; i < value; i++) { // i cannot equal numCopies because there is already one el there (the original)
                // Append as value number of copies of target el
                tel.parentNode.append(tel.cloneNode(true));
            }
        },
        'data-fir-foreach': function(tel) {
            var field = tel.getAttribute('data-fir-foreach');
            var values = that.getDeepItem(data, field);

            values.forEach(function(value, index) {
                var cloneTel = tel.cloneNode(true);
                tel.parentNode.append(cloneTel);

                Object.keys(modifiers).forEach(function(selector) {
                    var children = Array.prototype.slice.call(
                        cloneTel.querySelectorAll('[' + selector + ']')
                    );
                    children.push(cloneTel);
                    children.forEach(function(childEl) {
                        var currentVal = childEl.getAttribute(selector);

                        if (!currentVal) {
                            return;
                        }
                        childEl.setAttribute(
                            selector,
                            currentVal.replace('~', field + '/' + index)
                        );
                    });
                });
            });

            tel.parentNode.removeChild(tel);
        },
        'data-fir-content': function(tel) {
            var field = tel.getAttribute('data-fir-content');
            tel.innerText = that.getDeepItem(data, field);
        },
        'data-fir-click': function(tel) {
            tel.addEventListener('click', function() {
                var field = tel.getAttribute('data-fir-click');
                that.getDeepItem(data, field)();
            });
        },
        'data-fir-if': function(tel) {
            var field = tel.getAttribute('data-fir-if');
            // Triple not because we want to consider it even if it's undefined
            if (!!!that.getDeepItem(data, field)) {
                tel.style.display = 'none';
            }
        },
        'data-fir-if-not': function(tel) {
            var field = tel.getAttribute('data-fir-if-not');
            if (that.getDeepItem(data, field)) {
                tel.style.display = 'none';
            }
        },
        'data-fir-id': function(tel) {
            var field = tel.getAttribute('data-fir-id');
            tel.setAttribute('id', that.getDeepItem(data, field));
        },
        'data-fir-attr': function(tel) {
            var chunks = tel.getAttribute('data-fir-attr').split(':');
            var attr = chunks[0];
            var field = chunks[1];
            tel.setAttribute(attr, that.getDeepItem(data, field));
        },
        'data-fir-style': function(tel) {
            var chunks = tel.getAttribute('data-fir-style').split(':');
            var attr = chunks[0];
            var field = chunks[1];
            var value = that.getDeepItem(data, field);

            if (attr.toLowerCase() === 'backgroundimage') {
                value = 'url(' + value + ')';
            }
            tel.style[attr] = value;
        }
    };

    var preModifiers = ['data-fir-copies', 'data-fir-foreach'];

    preModifiers.forEach(function(selector) {
        var modifier = modifiers[selector];
        that.useModifier(el, selector, modifier);
    });

    Object.keys(modifiers).forEach(function(selector) {
        if (preModifiers.indexOf(selector) !== -1) {
            return;
        }

        var modifier = modifiers[selector];
        that.useModifier(el, selector, modifier);
    });
};


// Helper function that uses modifiers on a specific el
Tutorbook.prototype.useModifier = function(el, selector, modifier) {
    el.querySelectorAll('[' + selector + ']').forEach(modifier);
};


// Helper function that helps return items in a map
Tutorbook.prototype.getDeepItem = function(obj, path) {
    path.split('/').forEach(function(chunk) {
        obj = obj[chunk];
    });
    return obj;
};




// ============================================================================
// SCHEDULE VIEW
// ============================================================================


// Render functiont that returns an empty message screen
Tutorbook.prototype.renderEmptySchedule = function() {
    return this.renderTemplate('centered-text', {
        text: 'No events.'
    });
};


// View function that opens a schedule list all of all of the currentUser's
// pastAppts, activeAppts, and upcoming appts.
Tutorbook.prototype.viewSchedule = function() {
    const scheduleView = this.renderSchedule();
    const scheduleHeader = this.renderHeader('header-main', {
        title: 'Schedule'
    });

    this.viewIntercom(false);
    history.pushState({}, null, '/app/schedule');
    this.navSelected = 'Schedule';
    this.view(scheduleHeader, scheduleView);

    this.viewScheduleEvents();
};


// Helper function that returns the earliest date on the given day
Tutorbook.prototype.getEarliestDateWithDay = function(date) {
    return new Date(date.getFullYear(), date.getMonth(),
        date.getDate(), 0, 0, 0, 0);
};


// View function that removes old date-list-dividers
Tutorbook.prototype.refreshSchedule = function() {
    var dates = [];
    var that = this;
    // NOTE: We can't use shorthand function definition here or the `this`
    // object gets messed up.
    $('.main .appt-list-item').each(function(i) {
        var date = new Date($(this).attr('timestamp'));
        dates.push(that.getEarliestDateWithDay(date).getTime());
    });
    $('.main .date-list-divider').each(function(i) {
        var date = new Date($(this).attr('timestamp'));
        if (dates.indexOf(date.getTime()) < 0) {
            // Date is no longer needed
            $(this).remove();
        }
    });
};


// View function that appends the schedule events as they are created and
// changed.
Tutorbook.prototype.viewScheduleEvents = function() {
    var that = this;
    const apptTypes = [
        'appointments',
        'pastAppointments',
        'activeAppointments',
        'modifiedAppointments',
        'canceledAppointments',
    ];

    if (this.user.type === 'Supervisor') {
        apptTypes.forEach((subcollection) => {
            // NOTE: getSupervisorScheduleQueries returns a map of collectionGroup
            // queries for every location that this user is a supervisor for. 
            this.getSupervisorScheduleQueries(subcollection).then((queries) => {
                Object.entries(queries).forEach((entry) => {
                    var locationID = entry[0];
                    var query = entry[1];
                    query.onSnapshot((snapshot) => {
                        if (!snapshot.size) {
                            return that.scheduleRecycler.empty(subcollection, locationID);
                        }

                        snapshot.docChanges().forEach((change) => {
                            if (change.type === 'removed') {
                                that.scheduleRecycler
                                    .remove(change.doc, subcollection, locationID);
                            } else {
                                that.scheduleRecycler
                                    .display(change.doc, subcollection, locationID);
                            }
                        });
                    });
                });
            });
        });
    } else {
        apptTypes.forEach((subcollection) => {
            this.getSubcollectionData(subcollection).onSnapshot((snapshot) => {
                if (!snapshot.size) {
                    return that.scheduleRecycler.empty(subcollection);
                }

                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'removed') {
                        that.scheduleRecycler.remove(change.doc, subcollection);
                    } else {
                        that.scheduleRecycler.display(change.doc, subcollection);
                    }
                });
            });
        });
    }
};


Tutorbook.prototype.getSupervisorLocationIDs = function() {
    var that = this;
    return firebase.auth().currentUser.getIdTokenResult().then((token) => {
        const locations = token.claims.locations || [];
        that.log('Got supervisorLocationIDs:', locations);
        that.user.locations = locations;
        that.updateUser();
        return locations;
    }).catch((err) => {
        console.error('Error while getting supervisorLocationIDs:', err);
    });
};


// Data flow function that returns a query for a certain user subcollection
Tutorbook.prototype.getSupervisorScheduleQueries = function(subcollection) {
    return this.getSupervisorLocationIDs().then((locationIDs) => {
        var queries = {};
        locationIDs.forEach((locationID) => {
            queries[locationID] = firebase.firestore().collection('locations')
                .doc(locationID).collection(subcollection);
        });
        return queries;
    }).catch((err) => {
        console.error('Error while getting Firestore queries for ' +
            this.user.name + '\'s supervisor ' + subcollection + ':', err);
    });
};


// Data flow function that returns a query for a certain user subcollection
Tutorbook.prototype.getAllSupervisorScheduleQueries = function(subcollection) {
    return this.getSupervisorLocationIDs().then((locationIDs) => {
        var queries = {};
        locationIDs.forEach((locationID) => {
            const db = firebase.firestore().collectionGroup(subcollection);
            queries[locationID] = db.where('location.id', '==', locationID);
        });
        return queries;
    }).catch((err) => {
        console.error('Error while getting Firestore queries for ' +
            this.user.name + '\'s supervisor ' + subcollection + ':', err);
    });
};


// Data flow function that returns a query for a certain user subcollection
Tutorbook.prototype.getSubcollectionData = function(subcollection) {
    return firebase.firestore()
        .collection('usersByEmail')
        .doc(this.user.id)
        .collection(subcollection)
        .limit(30);
};


// View function that appends the given event/appt object into the correct
// location in the schedule list view (and adjusts the MDC List Dividers as
// necessary).
Tutorbook.prototype.viewScheduleListItem = function(listItem) {
    if (!listItem) {
        return console
            .warn('Invalid card passed to viewScheduleListItem:', listItem);
    }

    const scheduleEl = $('main .schedule .mdc-list')[0];
    const timestamp = new Date($(listItem).attr('timestamp'));
    const id = $(listItem).attr('id');

    if ($('#' + id).length) {
        // modify
        $('#' + id).replaceWith(listItem);
        return MDCRipple.attachTo(listItem);
    }
    // add
    // Find the first child that occured later than the child we're
    // trying to insert. Then insert this child right above it.
    for (var i = 0; i < scheduleEl.children.length; i++) {
        var child = scheduleEl.children[i];
        var time = new Date($(child).attr('timestamp'));

        // If we've found a child that occurred later, break and insert.
        if (time && time < timestamp) {
            break;
        }
    }
    if ($(child).length) {
        // If the child already has the same date as this new listItem, we
        // know that there is already a list divider label there.
        // NOTE: This checks both the above and below elements to see if 
        // there is already a date label inserted.
        if ((child.previousElementSibling &&
                new Date(
                    child.previousElementSibling.getAttribute('timestamp')
                ).getDate() === timestamp.getDate()
            ) ||
            new Date(child.getAttribute('timestamp'))
            .getDate() === timestamp.getDate()
        ) {
            $(listItem).insertAfter(child);
        } else {
            // Add a list divider with the correct label above the listItem
            // we just inserted
            $(listItem).insertAfter(child);
            var listDivider = this.renderDateDivider(timestamp);
            $(listDivider).insertBefore(listItem);
        }
    } else {
        $(scheduleEl).prepend(listItem);
        var listDivider = this.renderDateDivider(timestamp);
        $(listDivider).insertBefore(listItem);
    }
};


// Helper function that returns the next date with the given day from the given 
// Date() and day
Tutorbook.prototype.getNextDateWithDay = function(date, day) {
    var count = 0;
    // Added counter just in case we get something that goes on forever
    while (this.data.days[date.getDay()] !== day && count <= 256) {
        date.setDate(date.getDate() + 1);
        count++;
    }
    return date;
};


// Render function that returns an MDC List Item for the schedule view populated
// with the given documents appt data.
Tutorbook.prototype.renderApptListItem = function(doc, locationID) {
    try {
        const appt = doc.data();
        const otherUser = this.getOtherUser(appt.attendees[0], appt.attendees[1]);
        if (this.user.type === 'Supervisor') {
            var title = "Upcoming Appointment between " + appt.attendees[0].name +
                " and " + appt.attendees[1].name;
        } else {
            var title = "Upcoming Appointment with " + this.getOtherUser(
                appt.attendees[0],
                appt.attendees[1]).name;
        }
        const subtitle = "Tutoring session for " + appt.for.subject + " at the " +
            appt.location.name + ".";
        const time = this.getNextDateWithDay(new Date(), appt.time.day);

        var that = this;
        if (this.user.type === 'Supervisor') {
            var listItem = this.renderTemplate('supervisor-appt-list-item', {
                photoA: appt.attendees[0].photo,
                viewUserA: () => {
                    that.viewUser(appt.attendees[0].email);
                },
                photoB: appt.attendees[1].photo,
                viewUserB: () => {
                    that.viewUser(appt.attendees[1].email);
                },
                id: 'doc-appointments-' + doc.id,
                title: title,
                subtitle: subtitle,
                timestamp: time,
                go_to_appt: () => {
                    that.viewUpcomingApptDialog(that.combineMaps(appt, {
                        id: doc.id
                    }));
                },
                showAction: true,
                actionLabel: 'Cancel',
                action: () => {
                    // Cancel the appointment
                    return that.viewConfirmationDialog('Cancel Appointment?',
                            'Cancel tutoring sessions between ' + appt.attendees[0].name +
                            ' and ' + appt.attendees[1].name + ' for ' + appt.for.subject + ' at ' +
                            appt.time.from + ' at the ' +
                            appt.location.name + '.')
                        .listen('MDCDialog:closing', async (event) => {
                            if (event.detail.action === 'yes') {
                                $('#doc-appointments-' + doc.id).remove();
                                that.refreshSchedule();
                                [err, res] = await to(that.cancelAppt(appt, doc.id));
                                if (err) return that.viewSnackbar('Could not cancel appointment.');
                                that.viewSnackbar('Canceled appointment.');
                            }
                        });
                },
            });
        } else {
            var listItem = this.renderTemplate('appt-list-item', {
                photo: otherUser.photo,
                viewUser: () => {
                    that.viewUser(otherUser.email);
                },
                id: 'doc-appointments-' + doc.id,
                title: title,
                subtitle: subtitle,
                timestamp: time,
                go_to_appt: () => {
                    that.viewUpcomingApptDialog(that.combineMaps(appt, {
                        id: doc.id
                    }));
                },
                showAction: true,
                actionLabel: 'Cancel',
                action: () => {
                    // Cancel the appointment
                    return that.viewConfirmationDialog('Cancel Appointment?',
                            'Cancel tutoring sessions with ' + otherUser.name +
                            ' for ' + appt.for.subject + ' at ' +
                            appt.time.from + ' at the ' +
                            appt.location.name + '.')
                        .listen('MDCDialog:closing', async (event) => {
                            if (event.detail.action === 'yes') {
                                $('#doc-appointments-' + doc.id).remove();
                                that.refreshSchedule();
                                [err, res] = await to(that.cancelAppt(appt, doc.id));
                                if (err) return that.viewSnackbar('Could not cancel appointment.');
                                that.viewSnackbar('Canceled appointment with ' + otherUser.email + '.');
                            }
                        });
                },
            });
        }
        // NOTE: Setting class like this enables the scheduleRecycler to remove
        // all of the listItems that could've come from the same query (when the
        // query returns empty).
        if (!!locationID) {
            listItem.setAttribute('class', 'event-appt-' + locationID + ' ' + listItem.getAttribute('class'));
        } else {
            listItem.setAttribute('class', 'event-appt ' + listItem.getAttribute('class'));
        }
        return listItem;
    } catch (e) {
        console.error('Error while rendering appt listItem, skipping:', e);
        return;
    }
};


// Render function that returns an MDC List Item for the schedule view populated
// with the given documents canceledAppt.for data.
Tutorbook.prototype.renderCanceledApptListItem = function(doc, locationID) {
    const canceledAppt = doc.data();
    const otherUser = this.getOtherUser(canceledAppt.for.attendees[0], canceledAppt.for.attendees[1]);
    if (this.user.type === 'Supervisor') {
        var title = "Canceled Appointment between " + canceledAppt.for.attendees[0].name +
            " and " + canceledAppt.for.attendees[1].name;
    } else {
        var title = "Canceled Appointment with " + this.getOtherUser(
            canceledAppt.for.attendees[0],
            canceledAppt.for.attendees[1]).name;
    }
    const subtitle = canceledAppt.canceledBy.name + " canceled this upcoming " +
        "appointment. Please ensure to address these changes.";
    const time = this.getNextDateWithDay(new Date(), canceledAppt.for.time.day);

    var that = this;
    if (this.user.type === 'Supervisor') {
        var listItem = this.renderTemplate('supervisor-appt-list-item', {
            photoA: canceledAppt.for.attendees[0].photo,
            photoB: canceledAppt.for.attendees[1].photo,
            viewUserA: () => {
                that.viewUser(canceledAppt.attendees[0].email);
            },
            viewUserB: () => {
                that.viewUser(canceledAppt.attendees[1].email);
            },
            id: 'doc-canceledAppointments-' + doc.id,
            title: title,
            subtitle: subtitle,
            timestamp: time,
            go_to_appt: () => {
                that.viewCanceledApptDialog(canceledAppt.for, doc.id);
            },
            showAction: true,
            actionLabel: 'Dismiss',
            action: async () => {
                $('#doc-canceledAppointments-' + doc.id).remove();
                that.refreshSchedule();
                await firebase.firestore().collection('locations')
                    .doc(canceledAppt.for.location.id)
                    .collection('canceledAppointments')
                    .doc(doc.id).delete();
            },
        });
    } else {
        var listItem = this.renderTemplate('appt-list-item', {
            photo: otherUser.photo,
            viewUser: () => {
                that.viewUser(otherUser.email);
            },
            id: 'doc-canceledAppointments-' + doc.id,
            title: title,
            subtitle: subtitle,
            timestamp: time,
            go_to_appt: () => {
                that.viewCanceledApptDialog(canceledAppt.for, doc.id);
            },
            showAction: true,
            actionLabel: 'Dismiss',
            action: async () => {
                $('#doc-canceledAppointments-' + doc.id).remove();
                that.refreshSchedule();
                await firebase.firestore().collection('usersByEmail')
                    .doc(that.user.email)
                    .collection('canceledAppointments')
                    .doc(doc.id).delete();
            },
        });
    }
    // NOTE: Setting class like this enables the scheduleRecycler to remove
    // all of the listItems that could've come from the same query (when the
    // query returns empty).
    if (!!locationID) {
        listItem.setAttribute('class', 'event-canceledAppt.for-' + locationID + ' ' + listItem.getAttribute('class'));
    } else {
        listItem.setAttribute('class', 'event-canceledAppt.for ' + listItem.getAttribute('class'));
    }
    return listItem;
};


// Render function that returns an MDC List Item for the schedule view populated
// with the given documents modifiedAppt.for data.
Tutorbook.prototype.renderModifiedApptListItem = function(doc, locationID) {
    const modifiedAppt = doc.data();
    const otherUser = this.getOtherUser(modifiedAppt.for.attendees[0], modifiedAppt.for.attendees[1]);
    if (this.user.type === 'Supervisor') {
        var title = "Modified Appointment between " + modifiedAppt.for.attendees[0].name +
            " and " + modifiedAppt.for.attendees[1].name;
    } else {
        var title = "Modified Appointment with " + this.getOtherUser(
            modifiedAppt.for.attendees[0],
            modifiedAppt.for.attendees[1]).name;
    }
    const subtitle = modifiedAppt.modifiedBy.name + " modified this upcoming " +
        "appointment. Please ensure to address these changes.";
    const time = this.getNextDateWithDay(new Date(), modifiedAppt.for.time.day);

    var that = this;
    if (this.user.type === 'Supervisor') {
        var listItem = this.renderTemplate('supervisor-appt-list-item', {
            photoA: modifiedAppt.for.attendees[0].photo,
            photoB: modifiedAppt.for.attendees[1].photo,
            viewUserA: () => {
                that.viewUser(modifiedAppt.attendees[0].email);
            },
            viewUserB: () => {
                that.viewUser(modifiedAppt.attendees[1].email);
            },
            id: 'doc-modifiedAppointments-' + doc.id,
            title: title,
            subtitle: subtitle,
            timestamp: time,
            go_to_appt: () => {
                that.viewUpcomingApptDialog(that.combineMaps(modifiedAppt.for, {
                    id: doc.id
                }));
            },
            showAction: true,
            actionLabel: 'Dismiss',
            action: async () => {
                $('#doc-modifiedAppointments-' + doc.id).remove();
                that.refreshSchedule();
                await firebase.firestore().collection('locations')
                    .doc(modifiedAppt.for.location.id)
                    .collection('modifiedAppointments')
                    .doc(doc.id).delete();
            },
        });
    } else {
        var listItem = this.renderTemplate('appt-list-item', {
            photo: otherUser.photo,
            viewUser: () => {
                that.viewUser(otherUser.email);
            },
            id: 'doc-modifiedAppointments-' + doc.id,
            title: title,
            subtitle: subtitle,
            timestamp: time,
            go_to_appt: () => {
                that.viewUpcomingApptDialog(that.combineMaps(modifiedAppt.for, {
                    id: doc.id
                }));
            },
            showAction: true,
            actionLabel: 'Dismiss',
            action: async () => {
                $('#doc-modifiedAppointments-' + doc.id).remove();
                that.refreshSchedule();
                await firebase.firestore().collection('usersByEmail')
                    .doc(that.user.email)
                    .collection('modifiedAppointments')
                    .doc(doc.id).delete();
            },
        });
    }
    // NOTE: Setting class like this enables the scheduleRecycler to remove
    // all of the listItems that could've come from the same query (when the
    // query returns empty).
    if (!!locationID) {
        listItem.setAttribute('class', 'event-modifiedAppt.for-' + locationID + ' ' + listItem.getAttribute('class'));
    } else {
        listItem.setAttribute('class', 'event-modifiedAppt.for ' + listItem.getAttribute('class'));
    }
    return listItem;
};


// Render function that returns an MDC List Item for the schedule view populated
// with the given documents activeAppt data.
Tutorbook.prototype.renderActiveApptListItem = function(doc, locationID) {
    const activeAppt = doc.data();
    const otherUser = this.getOtherUser(activeAppt.attendees[0], activeAppt.attendees[1]);
    if (this.user.type === 'Supervisor') {
        var title = "Active Appointment between " + activeAppt.attendees[0].name +
            " and " + activeAppt.attendees[1].name;
    } else {
        var title = "Active Appointment with " + this.getOtherUser(
            activeAppt.attendees[0],
            activeAppt.attendees[1]).name;
    }
    const subtitle = "Tutoring session right now for " + activeAppt.for.subject +
        " at the " + activeAppt.location.name + ".";

    var that = this;
    if (this.user.type === 'Supervisor') {
        var listItem = this.renderTemplate('supervisor-appt-list-item', {
            photoA: activeAppt.attendees[0].photo,
            photoB: activeAppt.attendees[1].photo,
            viewUserA: () => {
                that.viewUser(activeAppt.attendees[0].email);
            },
            viewUserB: () => {
                that.viewUser(activeAppt.attendees[1].email);
            },
            id: 'doc-activeAppointments-' + doc.id,
            title: title,
            subtitle: subtitle,
            timestamp: activeAppt.clockIn.sentTimestamp.toDate(),
            go_to_appt: () => {
                that.viewActiveApptDialog(activeAppt, doc.id);
            },
            showAction: true,
            actionLabel: 'ClockOut',
            action: async () => {
                that.currentAppt = that.combineMaps(activeAppt, {
                    id: doc.id,
                });
                await that.clockOut();
                that.refreshSchedule();
            },
        });
    } else if (this.user.type === 'Tutor') {
        var listItem = this.renderTemplate('appt-list-item', {
            photo: otherUser.photo,
            viewUser: () => {
                that.viewUser(otherUser.email);
            },
            id: 'doc-activeAppointments-' + doc.id,
            title: title,
            subtitle: subtitle,
            timestamp: activeAppt.clockIn.sentTimestamp.toDate(),
            go_to_appt: () => {
                that.viewActiveApptDialog(activeAppt, doc.id);
            },
            showAction: true,
            actionLabel: 'ClockOut',
            action: async () => {
                that.currentAppt = that.combineMaps(activeAppt, {
                    id: doc.id,
                });
                await that.clockOut();
                that.refreshSchedule();
            },
        });
    } else {
        var listItem = this.renderTemplate('appt-list-item', {
            photo: otherUser.photo,
            viewUser: () => {
                that.viewUser(otherUser.email);
            },
            id: 'doc-activeAppointments-' + doc.id,
            title: title,
            subtitle: subtitle,
            timestamp: activeAppt.clockIn.sentTimestamp.toDate(),
            go_to_appt: () => {
                that.viewActiveApptDialog(activeAppt, doc.id);
            },
            showAction: false,
        });
    }
    // NOTE: Setting class like this enables the scheduleRecycler to remove
    // all of the listItems that could've come from the same query (when the
    // query returns empty).
    if (!!locationID) {
        listItem.setAttribute('class', 'event-activeAppt-' + locationID + ' ' + listItem.getAttribute('class'));
    } else {
        listItem.setAttribute('class', 'event-activeAppt ' + listItem.getAttribute('class'));
    }
    return listItem;
};


// Render function that returns an MDC List Item for the schedule view populated
// with the given documents pastAppt data.
Tutorbook.prototype.renderPastApptListItem = function(doc, locationID) {
    const pastAppt = doc.data();
    const otherUser = this.getOtherUser(pastAppt.attendees[0], pastAppt.attendees[1]);
    if (this.user.type === 'Supervisor') {
        var title = "Past Appointment between " + pastAppt.attendees[0].name +
            " and " + pastAppt.attendees[1].name;
    } else {
        var title = "Past Appointment with " + this.getOtherUser(
            pastAppt.attendees[0],
            pastAppt.attendees[1]).name;
    }
    const subtitle = "Tutoring session for " + pastAppt.for.subject + " at the " +
        pastAppt.location.name + ".";

    var that = this;
    if (this.user.type === 'Supervisor') {
        var listItem = this.renderTemplate('supervisor-appt-list-item', {
            photoA: pastAppt.attendees[0].photo,
            photoB: pastAppt.attendees[1].photo,
            viewUserA: () => {
                that.viewUser(appt.attendees[0].email);
            },
            viewUserB: () => {
                that.viewUser(appt.attendees[1].email);
            },
            id: 'doc-pastAppointments-' + doc.id,
            title: title,
            subtitle: subtitle,
            timestamp: pastAppt.clockIn.sentTimestamp.toDate(),
            go_to_appt: () => {
                that.viewPastApptDialog(pastAppt, doc.id);
            },
            showAction: true,
            actionLabel: 'Delete',
            action: () => {
                return that.viewConfirmationDialog('Delete Past Appointment?', 'Are you sure you want to permanently delete this ' +
                        'past appointment between ' + pastAppt.attendees[0].name +
                        ' and ' + pastAppt.attendees[1].name + '? This action cannot be undone.')
                    .listen('MDCDialog:closing', async (event) => {
                        if (event.detail.action === 'yes') {
                            $('#doc-pastAppointments-' + doc.id).remove();
                            that.refreshSchedule();
                            await that.deletePastAppt(pastAppt, doc.id);
                        }
                    });
            },
        });
    } else {
        var listItem = this.renderTemplate('appt-list-item', {
            photo: otherUser.photo,
            viewUser: () => {
                that.viewUser(otherUser.email);
            },
            id: 'doc-pastAppointments-' + doc.id,
            title: title,
            subtitle: subtitle,
            timestamp: pastAppt.clockIn.sentTimestamp.toDate(),
            go_to_appt: () => {
                that.viewPastApptDialog(pastAppt, doc.id);
            },
            showAction: true,
            actionLabel: 'Delete',
            action: () => {
                return that.viewConfirmationDialog('Delete Past Appointment?', 'Are you sure you want to permanently delete this ' +
                        'past appointment with ' + otherUser.name +
                        '? This action cannot be undone.')
                    .listen('MDCDialog:closing', async (event) => {
                        if (event.detail.action === 'yes') {
                            $('#doc-pastAppointments-' + doc.id).remove();
                            that.refreshSchedule();
                            await that.deletePastAppt(pastAppt, doc.id);
                        }
                    });
            },
        });
    }
    // NOTE: Setting class like this enables the scheduleRecycler to remove
    // all of the listItems that could've come from the same query (when the
    // query returns empty).
    if (!!locationID) {
        listItem.setAttribute('class', 'event-pastAppt-' + locationID + ' ' + listItem.getAttribute('class'));
    } else {
        listItem.setAttribute('class', 'event-pastAppt ' + listItem.getAttribute('class'));
    }
    return listItem;
};


// Render function that returns a date label with an MDC List Divider
Tutorbook.prototype.renderDateDivider = function(date) {
    const dateString = this.getDayAndDateString(date);
    // NOTE: The dateDividers have to have the earliest possible timestamp
    // on a given date so that when we're inserting events in the calendar,
    // they always divide at the correct location.
    const earliestDateOnDate = new Date(date.getFullYear(), date.getMonth(),
        date.getDate(), 0, 0, 0, 0);
    const divider = this.renderTemplate('date-list-divider', {
        date: dateString,
        timestamp: earliestDateOnDate,
    });
    return divider;
};


// Helper function that returns a string (e.g. Mon, 7/23) given an Date() object
Tutorbook.prototype.getDayAndDateString = function(date) {
    const abbr = ['Sun', 'Mon', 'Tues', 'Wed', 'Thur', 'Fri', 'Sat'];
    // NOTE: Date().getMonth() returns a 0 based integer (i.e. 0 = Jan)
    return abbr[date.getDay()] + ', ' +
        (date.getMonth() + 1) + '/' + date.getDate();
};


// Render function that renders a Google Cal-like schedule view using customized
// MDC List Items, Dividers, and Typography.
Tutorbook.prototype.renderSchedule = function() {
    const scheduleEl = this.renderTemplate('schedule', {
        welcome: !this.onMobile,
        summary: (this.user.type === 'Supervisor' ? 'View all past, ' +
            'upcoming, and active tutoring appointments at the locations ' +
            'you supervise.' : 'View past tutoring sessions, clock ' +
            'out of active meetings and edit upcoming appointments.'),
    });
    if (this.onMobile) {
        // TODO: Render and append a welcome card that spans the whole top
        const welcomeCard = this.renderWelcomeCard({
            title: 'Appointments',
            // TODO: Actually sync appointments and show the correct status
            // message here.
            summary: (this.user.type === 'Supervisor' ? 'View all past, ' +
                'upcoming, and active tutoring appointments at the locations ' +
                'you supervise.' : 'View past tutoring sessions, clock ' +
                'out of active meetings and edit upcoming appointments.'),
            subtitle: 'View and manage your lessons',
        });
        welcomeCard.setAttribute('style', 'margin: 16px;');
        scheduleEl.insertBefore(welcomeCard, scheduleEl.firstElementChild);
    }

    // TODO: Add recycler to view schedule events as they change in our
    // Firestore database.
    const scrollButton = this.renderFab('scrollToUpcoming');
    scheduleEl.appendChild(scrollButton);
    MDCRipple.attachTo(scrollButton);
    scrollButton.addEventListener('click', () => {
        // We want to show the user the latest/upcoming appointments
        scheduleEl.querySelector('ul').lastElementChild.scrollIntoView({
            behavior: 'smooth'
        });
    });
    return scheduleEl;
};




// ============================================================================
// WEBPUSH NOTIFICATIONS
// ============================================================================


// Init function that bypasses an error we were getting when signing out and
// logging back in (we can only call this once).
Tutorbook.prototype.initNotificationsKey = function() {
    try {
        firebase.messaging().usePublicVapidKey(
            "BIEVpGqO_n9HSS_sGWdfXoOUpv3dWwB5P2-zRkUBUZH" +
            "OzvAvJ09nUL68hc5XpTjKZxb74_5DJlSs4oRdnJj8R4w"
        );
    } catch (e) {
        console.error('Error while initializing Firebase messaging token to ' +
            'manage webpush notifications:', e);
    }
};


// View function this shows a welcome message notification
Tutorbook.prototype.viewWelcomeNotification = function() {
    const welcome = new Notification('Welcome, ' + this.user.name, {
        body: "This is how we'll notify you of important app " +
            'activity.',
        icon: 'https://tutorbook-779d8.firebaseapp.com/favic' +
            'on/logo.svg',
        badge: 'https://tutorbook-779d8.firebaseapp.com/favic' +
            'on/notification-badge.svg',
    });
};


// Helper function that asks the user for permission to show push notifications
// and then sends them a notification when they do.
Tutorbook.prototype.getNotificationPermission = function() {
    // TODO: Implement notification explanation view or dialog.
    var that = this;
    Notification.requestPermission().then(function(result) {

        if (result === 'denied') {
            that.log('Permission wasn\'t granted. Allow a retry.');
            return;
        }
        if (result === 'default') {
            that.log('The permission request was dismissed.');
            return;
        }

        that.log('Notification permission granted.');
        firebase.messaging().getToken().then(function(token) {
            that.sendNotificationTokenToServer(token);
            that.viewWelcomeNotification();
        });
        // Remove the setup notification card if there is one
        if (!!document.querySelector('main #cards #setup-notifications-card')) {
            $('main #cards #setup-notifications-card').remove();
        }

    }).catch(function(err) {
        that.log('Error while getting webpush notification permission:',
            err);
    });
};


// Data flow function that updates the current user's notification token
Tutorbook.prototype.sendNotificationTokenToServer = function(token) {
    // Right now, tokens are stored in the currentUser's Firestore document
    this.user.notificationToken = token;
    this.updateUser().catch((err) => {
        console.error('Error while sending notificationToken ' +
            token + ' to Firestore Database:', err);
    });
};


// Init function that gets permission to show push notifications and sends the
// token to our Firestore server. We then use firebase messaging to watch and
// respond to webpush notifications (firebase-messaging-sw.js is our service
// worker).
Tutorbook.prototype.initNotifications = function() {
    try {
        var that = this;

        const messaging = firebase.messaging();

        // Get Instance ID token. Initially this makes a network call, once retrieved
        // subsequent calls to getToken will return from cache.
        messaging.getToken().then(function(token) {
            if (token) {
                // Tokens are stored in the users Firestore document
                that.notificationsEnabled = true;
                that.user.cards.setupNotifications = false;
                that.updateUser();
                that.sendNotificationTokenToServer(token);
            } else {
                // Show permission request.
                that.log('No Instance ID token available. Requesting ' +
                    'permission to generate one.');
                // Show permission UI.
                that.notificationsEnabled = false;
                that.user.cards.setupNotifications = true;
                that.updateUser();
            }
        }).catch(function(err) {
            that.log('An error occurred while retrieving token:', err);
        });

        // Callback fired if Instance ID token is updated.
        messaging.onTokenRefresh(function() {
            messaging.getToken().then(function(refreshedToken) {
                that.log('Token refreshed.');
                // Send Instance ID token to app server.
                // Right now, tokens are stored in the currentUser's Firestore document
                that.sendNotificationTokenToServer(refreshedToken);
                // ...
            }).catch(function(err) {
                that.log('Unable to retrieve refreshed token ', err);
            });
        });

        messaging.onMessage(function(payload) {
            that.log('[bundle.min.js] Received message ', payload);
            if (payload.notification.body === 'Authenticated account.') {
                return firebase.auth().currentUser.getIdToken(true);
            }
            that.viewSnackbar(payload.notification.body);
        });
    } catch (e) {
        console.error('Error while initializing Firebase messaging token to ' +
            'manage webpush notifications:', e);
    }
};




// ============================================================================
// ALERT DIALOGS & SNACKBARS
// ============================================================================


// View function that shows a confirmation dialog with the given title and summary
Tutorbook.prototype.viewConfirmationDialog = function(title, summary) {
    // By doing this instead of using a template, we no longer get stacked
    // dialogs from multiple invocations of the same function.
    $('#dialog-confirmation .mdc-dialog__title').text(title);
    $('#dialog-confirmation .mdc-dialog__content').text(summary);
    const dialogEl = document.getElementById('dialog-confirmation');

    this.viewDialog(dialogEl);
    const dialog = MDCDialog.attachTo(dialogEl);
    dialog.open();
    return dialog;
};


// View function that opens a notification dialog with the given title and
// summary
Tutorbook.prototype.viewNotificationDialog = function(title, summary) {
    $('#dialog-notification .mdc-dialog__title').text(title);
    $('#dialog-notification .mdc-dialog__content').text(summary);
    const dialogEl = document.getElementById('dialog-notification');

    this.viewDialog(dialogEl);
    const dialog = MDCDialog.attachTo(dialogEl);
    dialog.open();
    return dialog;
};


// View function that appends the given dialog to the dialogs div
Tutorbook.prototype.viewDialog = function(dialog) {
    return document.querySelector('.dialogs').appendChild(dialog);
};


// Init function that starts the snackbar
Tutorbook.prototype.initSnackbars = function() {
    var el = document.getElementById('snackbar');
    this.snackbar = MDCSnackbar.attachTo(el);
    this.snackbar.timeoutMs = 4000;
};


// View function that opens the this.snackbar
Tutorbook.prototype.viewSnackbar = function(message) {
    // TODO: Make the snackbar flashes go away.
    this.snackbar.labelText = message;
    this.snackbar.open();
};


// View function to show the undo snackbar with given message and undo function
Tutorbook.prototype.viewUndoSnackbar = function(message, undo) {
    var el = document.getElementById('snackbar-undo');
    var snackbar = MDCSnackbar.attachTo(el);
    snackbar.timeoutMs = 4000;
    snackbar.labelText = message;
    $('#snackbar-undo #undo').click(undo);
    snackbar.open();
};


// Helper function to close the given snackbar
Tutorbook.prototype.closeSnackbar = function(id) {
    switch (id) {
        case 'snackbar-undo':
            var el = document.getElementById(id);
            var snackbar = MDCSnackbar.attachTo(el);
            // NOTE: Just calling close() won't work because we're not operating on the 
            // same snackbar instance that was created when the snackbar opened.
            snackbar.open();
            snackbar.close();
        default:
            this.snackbar.close();
    }
};




// ============================================================================
// LOGIN & SIGNUP VIEWS
// ============================================================================


// Helper function to sign the user out
Tutorbook.prototype.signOut = function() {
    firebase.auth().signOut();
    this.router.navigate('/');
};


// View function that shows a sign-in/setup screen
Tutorbook.prototype.viewLogin = function() {
    // Define an empty user map so we don't get an undefined error if the user
    // wants to sign-up.
    this.user = {};
    const loginView = this.renderLogin();
    const loginHeader = this.renderHeader('header-login', {});
    this.view(loginHeader, loginView);
    this.addLoginDataManager();
};


// Helper function to initialize MDC Components and listeners for the login
// screen.
Tutorbook.prototype.addLoginDataManager = function() {
    const loginView = document.querySelector('.main .login');
    ['.mdc-button', '.mdc-icon-button', '.mdc-fab'].forEach((component) => {
        loginView.querySelectorAll(component).forEach((el) => {
            MDCRipple.attachTo(el);
        });
    });
};


// Helper function to set the dashboard welcome message based on user type
Tutorbook.prototype.initWelcomeMessage = function() {
    this.user.cards.welcomeMessage = {
        title: 'Welcome, ' + this.user.name.split(' ')[0],
        subtitle: "We're glad you're here",
        summary: "We noticed that you were a new " +
            this.user.type.toLowerCase() + " here, so we went ahead and put " +
            'together some friendly suggestions for what to do next.'
    };
    return this.user.cards.welcomeMessage;
};


// Render function for the signup and login screens
Tutorbook.prototype.renderLogin = function() {
    var that = this;

    const mainEl = this.renderTemplate('login', {
        login: () => {
            this.viewGoogleSignIn();
        },
        signup: () => {
            displaySection('page-signup');
            this.user.cards = {};
        },
        expand: () => {
            // TODO: Add animations to scroll these els in and out
            mainEl.querySelector('#expand-button').style.display = 'none';
            mainEl.querySelector('#expand').style.display = 'inherit';
        },
        collapse: () => {
            mainEl.querySelector('#expand').style.display = 'none';
            // NOTE: Settings display to inline-block centers the button el
            mainEl.querySelector('#expand-button').style.display = 'inline-block';
        },
        pupil: () => {
            this.user.type = 'Pupil';
            // Show setup cards in the dashboard for:
            // 1) Their profile (i.e. subjects, availability, locations)
            // 2) Linking Google Calendar or iCal to their account
            // 3) Setting up their first payment method
            this.user.cards.searchTutors = true;
            this.user.cards.setupNotifications = true;
            // We want them to set availability so that tutors can edit their
            // requests as needed.
            this.user.cards.setupAvailability = true;
            this.user.authenticated = true;
            history.pushState({}, null, '/app/home?cards=searchTutors+setupNotifications+setupAvailability?auth=true?type=Pupil');
            this.viewGoogleSignIn();
        },
        tutor: () => {
            this.user.type = 'Tutor';
            // Show setup cards in the dashboard for:
            // 1) Their profile (i.e. subjects, availability, locations)
            // 2) Linking Google Calendar or iCal to their account
            // 3) Setting up their first deposit/payment method
            this.user.cards.setupProfile = true;
            this.user.cards.setupNotifications = true;
            this.user.authenticated = true;
            history.pushState({}, null, '/app/home?cards=setupProfile+setupNotifications?auth=true?type=Tutor');
            this.viewGoogleSignIn();
        },
        parent: () => {
            this.user.type = 'Parent';
            // Show setup cards in the dashboard for:
            // 1) Creating children accounts
            // 2) Searching for a tutor
            // 3) Enabling notifications (i.e. adding phone #, etc.)
            this.user.cards.searchTutors = true;
            this.user.cards.addChildren = true;
            this.user.cards.setupNotifications = true;
            history.pushState({}, null, '/app/home?cards=searchTutors+addChildren+setupNotifications?auth=true?type=Parent');
            this.viewGoogleSignIn();
        },
        supervisor: () => {
            this.user.type = 'Supervisor';
            // Show setup cards in the dashboard for:
            // 1) Their profile (i.e. subjects, availability, locations)
            // 2) Linking Google Calendar or iCal to their account
            // 3) Setting up their first location or applying to be a supervisor
            // for an existing location
            this.user.cards.setupNotifications = true;
            this.user.cards.setupProfile = true;
            this.user.authenticated = false;
            history.pushState({}, null, '/app/home?cards=setupProfile+setupNotifications?auth=false?type=Supervisor');
            this.viewGoogleSignIn();
        },
    });
    const pages = mainEl.querySelectorAll('.page');

    function displaySection(id) {
        pages.forEach(function(sel) {
            if (sel.id === id) {
                sel.style.display = 'inherit';
            } else {
                sel.style.display = 'none';
            }
        });
    };

    displaySection('page-login');

    return mainEl;
};


// Helper function that retrieves the supervisor auth codes from the Firestore
// database (NOTE: Every code is unique to one email address and thus you have
// to be signing in with the right address to be able to use the code)
Tutorbook.prototype.getSupervisorCodes = function() {
    var that = this;
    return firebase.firestore().collection('auth').doc('supervisors').get().catch((err) => {
        that.log('Error while getting supervisor codes:', err);
        that.viewSnackbar('Could not fetch verification codes.');
    });
};


// View function that shows a dialog asking for their supervisor code
Tutorbook.prototype.viewCodeSignInDialog = function() {
    // First, we check if they have a valid supervisor code.
    const codes = this.getSupervisorCodes();

    codes.then((doc) => {
        const codes = doc.data();
        const dialogEl = document.querySelector('#dialog-code-signup');
        const dialog = MDCDialog.attachTo(dialogEl);

        const codeEl = dialogEl.querySelector('#code-input');
        const codeTextField = MDCTextField.attachTo(codeEl);

        $('#dialog-code-signup #description').text('To ensure that you are ' +
            'an authenticated ' + this.user.type.toLowerCase() + ', please' +
            ' enter the verification code that you were assigned after ' +
            'your application was processed.');

        dialog.autoStackButtons = false;
        dialog.scrimClickAction = '';
        dialog.escapeKeyAction = '';
        dialog.open();

        // Then, we check if the email that they're trying to sign into is
        // associated with that code.
        var that = this;
        const confirmButton = dialogEl.querySelector('#confirm-button');
        confirmButton.addEventListener('click', () => {
            try {
                if (codes[codeTextField.value] === firebase.auth().currentUser.email) {
                    dialog.close();
                    that.user.authenticated = true;
                    that.updateUser();
                    that.viewSnackbar('Code authenticated. Successfuly created ' +
                        that.user.type.toLowerCase() + ' account.');
                    that.init();
                } else {
                    that.viewSnackbar('Invalid code. Please try again.');
                    codeTextField.valid = false;
                    codeTextField.required = true;
                }
            } catch (e) {
                that.log('Error while authenticating verification code:', e);
                codeTextField.valid = false;
                codeTextField.required = true;
            }
        });

        dialog.listen('MDCDialog:closing', (event) => {
            if (event.detail.action === 'close') {
                that.viewSnackbar('Could not verify account. Logged out.');
                return firebase.auth().signOut();
            }
        });
    });

};


// View function that shows a Google Sign-In Popup
Tutorbook.prototype.viewGoogleSignIn = function() {
    var that = this;
    this.log('Signing in with user:', this.user);
    const provider = new firebase.auth.GoogleAuthProvider();
    return firebase.auth().signInWithRedirect(provider).then((result) => {
        // Show loader again
        that.viewSnackbar('Sign in successful.');
        var token = result.credential.accessToken;
        var user = result.user;
        that.log("Signed in with user:", user);
        that.log("Signed in with userData:", that.user);
    }).catch((error) => {
        var errorCode = error.code;
        var errorMessage = error.message;
        var email = error.email;
        that.viewSnackbar(error.message);
        console.error("Error while signing in with Google Popup:", error);
    });
};




// ============================================================================
// SETUP CARDS
// ============================================================================


// Render function that returns a MDC Card that shows a setup location dialog
// showing a list of existing locations and the option to create a new location.
Tutorbook.prototype.renderSetupLocationCard = function() {
    var that = this;
    const card = this.renderTemplate('setup-location-card', {
        open_dialog: () => {
            that.log('TODO: Implement location setup dialog');
        },
        search: () => {
            that.log('TODO: Implement existing locations dialog');
        },
        create: () => {
            that.log('TODO: Implement new location dialog');
        },
        dismiss: () => {
            this.user.cards.setupLocation = false;
            this.updateUser();
            $('main #cards #setup-location-card').remove();
        }
    });

    // Setting the id allows to locating the individual user card
    card.setAttribute('id', 'setup-location-card');
    card.setAttribute('timestamp', new Date());
    card
        .querySelectorAll('.mdc-button, .mdc-card__primary-action, .mdc-icon-button')
        .forEach((el) => {
            MDCRipple.attachTo(el);
        });

    return card;
};


// Render function that returns a MDC Card that enables parents to edit their
// children's profiles
Tutorbook.prototype.renderChildCard = function(doc) {
    var that = this;
    const child = doc.data();
    const card = this.renderCard(
        'child-card', {}, 'child-card',
        child.name, 'Child account linked to you',
        'Use this child account to send requests to, message, and setup ' +
        'appointments with tutors.', {
            primary: () => {
                that.editChild(doc);
            },
            delete: () => {
                that.deleteChild(doc);
            },
            edit: () => {
                that.editChild(doc);
            },
        });
    // We have to do this b/c renderCard assumes that you want to have your
    // card id in format of ('doc-' + type + '-' + doc.id) but we don't want
    // that for setup cards.
    card.setAttribute('id', 'doc-children-' + doc.id);
    $(card.querySelector('[data-fir-click="dismiss"]')).remove();

    return card;
};


// Render function that returns a MDC Card that asks parents to create profiles
// for their children.
Tutorbook.prototype.renderAddChildrenCard = function() {
    var that = this;
    const card = this.renderCard(
        'add-children-card', {}, 'add-children-card',
        'Add Children', 'Create profiles for your children',
        'To message and send tutor\'s lesson requests, you must first add a ' +
        'child to your account. You will then be able to request tutors for that child.', {
            //  After you create your child\'s profile, you will ' +
            // 'be able to setup tutoring appointments, message tutors, and manage ' +
            // 'payments for that child.
            primary: () => {
                that.addChild();
            },
            'Add Child': () => {
                that.addChild();
            },
        });
    // We have to do this b/c renderCard assumes that you want to have your
    // card id in format of ('doc-' + type + '-' + doc.id) but we don't want
    // that for setup cards.
    card.setAttribute('id', 'add-children-card');
    $(card.querySelector('[data-fir-click="dismiss"]')).remove();

    return card;
};


// Render function that returns a MDC Card that shows a notification request
// prompt when clicked.
Tutorbook.prototype.renderSetupNotificationsCard = function() {
    var that = this;
    const card = this.renderCard(
        'setup-notifications-card', {}, 'setup-notifications-card',
        'Enable Notifications', 'Enable push notifications',
        (this.user.type === 'Tutor') ? 'Enable push notifications to be ' +
        'notified when you recieve a new lesson request and authorized ' +
        'payment, when a pupil modifies their request, or when a pupil ' +
        'cancels their request.' : (this.user.type === 'Pupil') ? 'Enable' +
        ' push notifications to be notified when a tutor approves, rejects' +
        ', or modifies your request.' : 'Enable push notifications to be ' +
        'notified about important app activity.', {
            primary: () => {
                that.getNotificationPermission();
            },
            enable: () => {
                that.getNotificationPermission();
            },
        });
    // We have to do this b/c renderCard assumes that you want to have your
    // card id in format of ('doc-' + type + '-' + doc.id) but we don't want
    // that for setup cards.
    card.setAttribute('id', 'setup-notifications-card');
    card.querySelector('[data-fir-click="dismiss"]').addEventListener('click', () => {
        that.user.cards.setupNotifications = false;
        that.updateUser();
        $('#setup-notifications-card').remove();
    });

    return card;
};


// Render function that returns a card that makes it really easy for a new pupil
// without any tech experience to see the search view.
Tutorbook.prototype.renderSearchTutorsCard = function() {
    const card = this.renderTemplate('search-tutors-card', {
        search: () => {
            this.filters.type = 'Tutor';
            this.viewSearch();
        },
        dismiss: async () => {
            this.user.cards.searchTutors = false;
            await this.updateUser();
            $('main #cards #setup-tutors-card').remove();
        },
        subtitle: 'Search for your perfect tutor',
        summary: 'Filter by subject, grade, gender, rating, and reviews. ' +
            'Find your perfect mentor from our plethora of qualified student tutors.'
    });

    // Setting the id allows to locating the individual user card
    card.setAttribute('id', 'setup-tutors-card');
    card.setAttribute('timestamp', new Date());
    card
        .querySelectorAll('.mdc-button, .mdc-card__primary-action, .mdc-icon-button')
        .forEach((el) => {
            MDCRipple.attachTo(el);
        });

    return card;
};


// Render function that returns a card that asks pupil's to set their availability
// in case a tutor has to edit their request or appointment.
Tutorbook.prototype.renderSetupAvailabilityCard = function(subtitle, summary) {
    var that = this;
    const card = this.renderCard(
        'setup-availability-card', {}, 'setup-availability-card',
        'Set Availability', 'Enable tutors to modify your requests',
        'Setting your availability allows tutors to modify your requests ' +
        'to best fit within their schedule and yours. Once you setup availability,' +
        ' you\'ll never have to worry about an appointment not fitting into' +
        ' your day.', {
            primary: () => {
                that.viewProfile();
                document.querySelector('.profile #Availability').scrollIntoView({
                    behavior: 'smooth'
                });
            },
            setup: () => {
                that.viewProfile();
                document.querySelector('.profile #Availability').scrollIntoView({
                    behavior: 'smooth'
                });
            },
        });
    // We have to do this b/c renderCard assumes that you want to have your
    // card id in format of ('doc-' + type + '-' + doc.id) but we don't want
    // that for setup cards.
    card.setAttribute('id', 'setup-availability-card');
    card.querySelector('[data-fir-click="dismiss"]').addEventListener('click', () => {
        that.user.cards.setupAvailability = false;
        that.updateUser();
        $('#setup-availability-card').remove();
    });

    return card;
};


// Render function that returns a MDC Card that shows a profile setup dialog (i.e.
// the profile view but with select helper text and the header-action headerEl)
Tutorbook.prototype.renderSetupProfileCard = function(subtitle, summary) {
    const card = this.renderTemplate('setup-profile-card', {
        open_dialog: () => {
            this.initUser().then(() => {
                this.viewProfile();
            });
        },
        dismiss: () => {
            this.user.cards.setupProfile = false;
            this.updateUser();
            $('main #cards .setup-profile-card').remove();
        },
        subtitle: subtitle || 'Help us find the right people for you',
        summary: summary || 'Customize your profile to help ' +
            'others find, message, and request you as their tutor or pupil.'
    });

    // Setting the id allows to locating the individual user card
    card.setAttribute('id', 'setup-profile-card');
    card.setAttribute('timestamp', new Date());
    card
        .querySelectorAll('.mdc-button, .mdc-card__primary-action, .mdc-icon-button')
        .forEach((el) => {
            MDCRipple.attachTo(el);
        });

    return card;
};




// ============================================================================
// PAYMENTS VIEW
// ============================================================================


// Render function that returns a needed payment card (asking the pupil to setup
// recurring PayPal subscription payments).
Tutorbook.prototype.renderNeededPaymentCard = function(doc) {
    const payment = doc.data();
    const title = 'Approve Payment';
    const subtitle = 'Send $' + payment.amount + ' to ' +
        payment.to.name + '.';
    const summary = 'Approve and send payment ($' + payment.amount +
        ') to ' + payment.to.name.split(' ')[0] +
        ' for your tutoring lesson on ' +
        payment.appt.time.day + '. If you were not satisfied, do not click approve.';
    var that = this;
    const actions = {
        deny: () => {
            return that.viewConfirmationDialog('Deny Payment?',
                    'Only deny payment to your tutor if they did not provide ' +
                    'you with a satisfactory lesson. By denying payment, you ' +
                    'will cancel all upcoming appointments with ' +
                    payment.to.name + '. Still sure you want ' +
                    'to deny payment and cancel those appointments?')
                .listen('MDCDialog:closing', (event) => {
                    if (event.detail.action === 'yes') {
                        $('#doc-needApprovalPayments-' + doc.id).remove();
                        that.denyPayment(payment, doc.id);
                    }
                });
        },
        approve: () => {
            $('#doc-needApprovalPayments-' + doc.id).remove();
            that.approvePayment(payment, doc.id);
        },
    };
    const card = this.renderCard(doc.id, payment, 'needApprovalPayments', title,
        subtitle, summary, actions);
    $(card.querySelector('[data-fir-click="dismiss"]')).remove();
    return card;
};


// Render function that returns a needed approval payment card (asking the pupil
// to approve a payment to a tutor).
Tutorbook.prototype.renderNeedApprovalPaymentCard = function(doc) {
    const payment = doc.data();
    const title = 'Approve Payment';
    const subtitle = 'Send $' + payment.amount.toFixed(2) + ' to ' +
        payment.to.name + '.';
    const summary = 'Approve and send payment ($' + payment.amount.toFixed(2) +
        ') to ' + payment.to.name.split(' ')[0] +
        ' for your tutoring lesson on ' +
        payment.appt.time.day + '. If you were not satisfied, do not click approve.';
    var that = this;
    const actions = {
        /*
         *deny: () => {
         *    return that.viewConfirmationDialog('Deny Payment?',
         *            'Only deny payment to your tutor if they did not provide ' +
         *            'you with a satisfactory lesson. By denying payment, you ' +
         *            'will cancel all upcoming appointments with ' +
         *            payment.to.name + '. Still sure you want ' +
         *            'to deny payment and cancel those appointments?')
         *        .listen('MDCDialog:closing', (event) => {
         *            if (event.detail.action === 'yes') {
         *                $('#doc-needApprovalPayments-' + doc.id).remove();
         *                that.denyPayment(payment, doc.id);
         *            }
         *        });
         *},
         */
        approve: () => {
            $('#doc-needApprovalPayments-' + doc.id).remove();
            that.approvePayment(payment, doc.id);
        },
        primary: () => {
            that.viewPastApptDialog(that.combineMaps(payment.appt, {
                id: payment.id
            }));
        },
    };
    const card = this.renderCard(doc.id, payment, 'needApprovalPayments', title,
        subtitle, summary, actions);
    $(card.querySelector('[data-fir-click="dismiss"]')).remove();
    return card;
};


// Deletes the needApprovalPayment doc and creates approvedPayment docs (telling 
// user's that the payment has been made and is being processed).
Tutorbook.prototype.approvePayment = async function(approvedPayment, id) {
    const db = firebase.firestore();
    const that = this;
    const payments = [
        db.collection('usersByEmail').doc(approvedPayment.appt.attendees[0].email)
        .collection('approvedPayments').doc(id),
        db.collection('usersByEmail').doc(approvedPayment.appt.attendees[1].email)
        .collection('approvedPayments').doc(id),
    ];
    const approvedPaymentRef = db.collection('usersByEmail').doc(this.user.email)
        .collection('needApprovalPayments').doc(id);
    await approvedPaymentRef.delete();
    payments.forEach(async (payment) => {
        await payment.set({
            for: approvedPayment,
            approvedBy: that.conciseUser,
            approvedTimestamp: new Date(),
        });
    });
    this.viewSnackbar('Approved payment to ' + approvedPayment.to.email + '.');
};


// Deletes the needApprovalPayment doc and creates deniedPayment docs (telling
// user's that the payment has been denied).
Tutorbook.prototype.denyPayment = async function(deniedPayment, id) {
    const db = firebase.firestore();
    const that = this;
    const payments = [
        db.collection('usersByEmail').doc(approvedPayment.appt.attendees[0].email)
        .collection('deniedPayments').doc(id),
        db.collection('usersByEmail').doc(approvedPayment.appt.attendees[1].email)
        .collection('deniedPayments').doc(id),
    ];
    const approvedPaymentRef = db.collection('usersByEmail').doc(this.user.email)
        .collection('needApprovalPayments').doc(id);
    await approvedPaymentRef.delete();
    payments.forEach(async (payment) => {
        await payment.set({
            for: deniedPayment,
            deniedBy: that.conciseUser,
            deniedTimestamp: new Date(),
        });
    });
    this.viewSnackbar('Denied payment to ' + approvedPayment.to.email + '.');
};


// Helper function that refreshed the payment amounts
Tutorbook.prototype.refreshPaymentAmount = function() {
    const request = this.currentRequest;
    var that = this;

    function getPaymentAmount() {
        // Get the duration between the the from and to times
        const hours = that.getHoursFromStrings(request.time.from, request.time.to);
        // And multiply it by the hourly charge
        const charge = request.toUser.hourlyCharge * hours;
        that.log('Charge:', charge);
        return charge;
    };

    this.log('Refreshing payment value...');
    if (request.payment.type === 'Paid') {
        this.currentPayment.amount = getPaymentAmount();
        $('main .dialog-input #Amount input')
            .attr('value', '$' + this.currentPayment.amount.toFixed(2));
    }
};


// Render function that returns a payment list item for the new request dialog
// (i.e. paypal buttons to authorize payment).
Tutorbook.prototype.renderNewRequestPaymentsItem = function() {
    const div = this.renderTemplate('input-wrapper');
    div.appendChild(this.renderListDivider('Payment'));
    div.appendChild(this.renderTextFieldItem('Amount', '$0.00'));
    div.appendChild(this.renderPayPalButtonsItem());
    return div;
};


// Render function that returns a paypal button div for the newRequest dialog
Tutorbook.prototype.renderPayPalButtonsItem = function() {
    if (this.onMobile) {
        const buttons = this.renderTemplate('input-list-item');
        buttons.setAttribute('id', 'paypal-buttons');
        buttons.setAttribute('style', 'height:auto!important;margin-top:10px;');
        return buttons;
    }
    const buttons = this.renderTemplate('wrapper');
    buttons.setAttribute('id', 'paypal-buttons');
    const description = this.renderTextArea('Authorize payment', 'Sending' +
        ' lesson requests is free, but we need to ensure that your' +
        ' prospective tutor will be paid. Please note that we are not charging' +
        ' you and will not charge you until after you are completely ' +
        'satisfied with your tutoring lesson. Still need help? Go to your ' +
        'dashboard and click on the chat icon to open a chat with us.');
    const listEl = this.renderSplitListItem(buttons, description);
    listEl.setAttribute('style', 'min-height:290px;');
    buttons.setAttribute('style',
        'width:50%!important;margin: -20px 20px 0 0 !important;height:auto!important;'
    );
    description.setAttribute('style', 'width:50%!important;');
    this.log('PayPal buttons item:', listEl.innerHTML);
    return listEl;
};


Tutorbook.prototype.addNewRequestPaymentManager = function() {
    this.log('Adding newRequestPaymentManager...');
    // PAYMENT
    // 1) We process and authorize payment but we do not capture the funds yet
    // Instead, we add an authorizedPayment doc to this user's Firestore
    // data w/ all the data needed to capture the payment. 
    // 
    // 2) We will the capture the payment once the tutor successfully 
    // clocksOut (i.e. on clockOutApproval) and deposit it into our business 
    // account until the tutor requests a payout (or every two weeks). 
    // 
    // 3) When the tutor requests a payout, we remove the pendingPayment 
    // doc (that was created when the tutor successfully clockedOut), 
    // process the payout, and create a pastPayment doc.
    const request = this.currentRequest;
    const that = this;

    function getPaymentAmount() {
        // Get the duration between the the from and to times
        const hours = that.getHoursFromStrings(request.time.from, request.time.to);
        // And multiply it by the hourly charge
        const charge = request.toUser.hourlyCharge * hours;
        that.log('Charge:', charge);
        return charge;
    };

    this.currentPayment = {
        to: request.toUser,
        from: request.fromUser,
        amount: getPaymentAmount(),
        timestamp: new Date(),
        for: request,
        id: request.id || '',
    };

    const amountEl = document.querySelector('main .dialog-input #Amount');
    const amountTextField = MDCTextField.attachTo(amountEl);
    amountEl.querySelector('input').setAttribute('disabled', 'true');

    if (!this.onMobile) {
        const descriptionEl = $('main .dialog-input [id="Authorize payment"]')[0];
        const descriptionTextArea = MDCTextField.attachTo(descriptionEl);
        descriptionEl.querySelector('textarea').setAttribute('disabled', 'true');
    }

    paypal.Buttons({
        createOrder: (data, actions) => {
            // Set up the transaction
            return actions.order.create({
                purchase_units: [{
                    amount: {
                        // TODO: Right now, we're only going to authorize for
                        // one, one hour lesson and then show another prompt once
                        // the tutor clocksOut asking if they want another.
                        value: that.currentPayment.amount
                    }
                }]
            });
        },
        onApprove: (data, actions) => {
            return actions.order.authorize().then((auth) => {
                // NOTE: All we need to be able to capture this auth later
                // is this id. Also note that this auth period is only 29
                // days.
                that.log('Order was authorized:', auth);
                var authID = auth.purchase_units[0].payments.authorizations[0].id;
                that.currentPayment.transaction = auth;
                that.currentPayment.authID = authID;
                that.log('Order was authorized w/ id:', authID);
                that.viewSnackbar('Added payment method.')
                // Call your server to save the transaction
                // We'll use Firestore here to process the transaction
                // by adding a payment document in this user's
                // subcollections.
            });
        },
    }).render('#paypal-buttons');
};


// View function that shows:
// 1) A large welcome message or a full-length MDC Card welcome message if the
// user is on a mobile device
// 2) An input dialog that allows tutors to set their hourly fee (or track
// service hours), see stats on how many they've tutored, how much money they've
// made, etc.
// 3) A MDC Layout Grid card system for editing and adding payment methods
// 4) A MDC List (like the search view) that shows all past transactions and 
// payments made within the app.
Tutorbook.prototype.viewPayments = function() {
    history.pushState({}, null, '/app/payments');
    this.navSelected = 'Payments';
    if (this.user.type === 'Tutor') {
        this.viewIntercom(false);
    } else {
        this.viewIntercom(true);
    }
    var that = this;
    const paymentsHeader = this.renderHeader('header-main', {
        title: 'Payments'
    });
    const paymentsView = this.renderPayments();

    this.view(paymentsHeader, paymentsView);
    this.viewTransactionHistory();
    this.addPaymentsManager();
};


// View function that opens a "Get Paid" dialog where the tutor can connect a
// PayPal account (if they haven't already) and register for payouts every week
Tutorbook.prototype.viewGetPaidDialog = function() {
    const dialogEl = document.querySelector('#dialog-get-paid');
    dialogEl.querySelector('.mdc-dialog__title').innerText = "Pay Me " + this.user.payments.currentBalanceString;
    const dialog = MDCDialog.attachTo(dialogEl);
    var that = this;
    dialog.listen('MDCDialog:closing', (event) => {
        if (event.detail.action === 'accept') {
            // All of this is done server side, so all we have to do is create
            // a processingPayment document (with this user's email as the id)
            // with a timestamp.
            return firebase.firestore().collection('payouts')
                .doc(that.user.email)
                .set({
                    timestamp: new Date()
                }).then(() => {
                    that.viewSnackbar('Sent payment request. Your funds are being processed.');
                }).catch((err) => {
                    console.error('Error while adding payout doc:', err);
                    that.viewSnackbar('Could not open payment request. Note ' +
                        'that we can only process one request at a time.');
                });
        }
    });
    return dialog.open();
};


// Data manager function that manages the payments view
Tutorbook.prototype.addPaymentsManager = function() {
    const view = document.querySelector('main .payments');

    // MY BUSINESS
    var that = this;
    if (this.user.type === 'Tutor') {
        this.log('Managing settings view...');
        const settingsEl = view.querySelector('#settings');

        const typeEl = view.querySelector('#Type');
        const typeSelect = this.attachSelect(typeEl);
        typeSelect.listen('MDCSelect:change', function() {
            that.user.payments.type = typeSelect.value;
            that.updateUser();
            that.viewSnackbar('Business type updated.');

            // Disable the inputs and hide the payment methods category
            wageSelect.disabled = that.user.payments.type === 'Free';
        });

        // TODO: Make this a textField that only allows certain kinds of
        // input.
        const wageEl = settingsEl.querySelector('[id="Hourly charge"]');
        const wageSelect = this.attachSelect(wageEl);
        wageSelect.listen('MDCSelect:change', function() {
            that.user.payments.hourlyChargeString = wageSelect.value;
            that.user.payments.hourlyCharge = that.data.payments.hourlyChargesMap[wageSelect.value];
            that.updateUser();
            that.viewSnackbar('Hourly charge updated.');
        });

        const totalEl = settingsEl.querySelector('[id="Current balance"]');
        const totalTextField = MDCTextField.attachTo(totalEl);
        totalEl.querySelector('input').setAttribute('disabled', 'true');

        const totalHoursEl = settingsEl.querySelector('[id="Total hours worked"]');
        const totalHoursTextField = MDCTextField.attachTo(totalHoursEl);
        totalHoursEl.querySelector('input').setAttribute('disabled', 'true');

        const policyEl = settingsEl.querySelector('[id="Payment policy"]');
        const policyTextArea = MDCTextField.attachTo(policyEl);
        $('header .material-icons').click(() => {
            const policy = policyTextArea.value;
            that.user.payments.policy = policy;
            that.updateUser();
        });

        // Disable the inputs and hide the payment methods category
        wageSelect.disabled = that.user.payments.type === 'Free';
        this.log('Managed settings view.');

        // GET PAID BUTTON and DIALOG
        const withdrawButton = view.querySelector('#withdrawButton');
        MDCRipple.attachTo(withdrawButton);
        withdrawButton.addEventListener('click', () => {
            that.viewGetPaidDialog();
        });
    }

    // TRANSACTION HISTORY
    view.querySelectorAll('.mdc-list-item').forEach((el) => {
        MDCRipple.attachTo(el);
    });
    // TODO: Add latest button in the mdc-list-divider
    /*
     *const scrollButton = this.renderFab('scrollToLatest');
     *view.appendChild(scrollButton);
     *MDCRipple.attachTo(scrollButton);
     *scrollButton.addEventListener('click', () => {
     *    view.querySelector('.mdc-list').lastElementChild.scrollIntoView({
     *        behavior: 'smooth'
     *    });
     *});
     */
};




// View function that appends transactions to the transactions section of the
// payments view
Tutorbook.prototype.viewTransactionHistory = function() {
    var that = this;
    this.emptyTransactions();

    // Then, read the Firestore database for relevant cardData
    this.getTransactionSubcollections().forEach((subcollection) => {
        this.getSubcollectionData(subcollection).onSnapshot((snapshot) => {
            if (!snapshot.size) {
                return that.transactionRecycler.empty(subcollection);
            }

            snapshot.docChanges().forEach((change) => {
                if (change.type === 'removed') {
                    that.transactionRecycler.remove(change.doc, subcollection);
                } else {
                    that.transactionRecycler.display(change.doc, subcollection);
                }
            });
        });
    });
};


// Helper function to return the subcollections to be rendered in the transactions
// view in the payments view
Tutorbook.prototype.getTransactionSubcollections = function() {
    return [
        'authPayments',
        'approvedPayments',
        'deniedPayments',
        'pastPayments',
        'invalidPayments',
    ];
};


// Helper function that empties the current transactions to display new ones
Tutorbook.prototype.emptyTransactions = function() {
    return $('main .payments #history ul').empty();
};


// Render function that returns the payments view that shows:
// 1) A large welcome message or a full-length MDC Card welcome message if the
// user is on a mobile device
// 2) An input dialog that allows tutors to set their hourly fee (or track
// service hours), see stats on how many they've tutored, how much money they've
// made, etc.
// 3) A MDC Layout Grid card system for editing and adding payment methods
// 4) A MDC List (like the search view) that shows all past transactions and 
// payments made within the app.
Tutorbook.prototype.renderPayments = function() {
    const paymentsEl = this.renderTemplate('payments', {
        welcomeTitle: 'Payments',
        welcomeSubtitle: (this.user.type === 'Tutor') ? 'Manage your payment ' +
            'methods, business preferences, and history all in one place.' : '' +
            'Manage your payment methods and view your transaction history ' +
            'all in one place.',
        showWelcome: !this.onMobile,
        showSettings: this.user.type === 'Tutor',
        showMethods: true,
        showHistory: true,
    });

    // WELCOME CARD/MESSAGE
    if (this.onMobile) {
        // TODO: Render and append a welcome card that spans the whole top
        const welcomeCard = this.renderWelcomeCard({
            title: 'Welcome to Payments',
            // TODO: Actually sync appointments and show the correct status
            // message here.
            summary: (this.user.type === 'Tutor') ? 'Manage your payment ' +
                'methods, business preferences, and history all in one place.' : '' +
                'Manage your payment methods and view your transaction history ' +
                'all in one place.',
            subtitle: 'Manage payment methods, settings, and history',
        });
        welcomeCard.setAttribute('style', 'margin: 16px;');
        paymentsEl.insertBefore(welcomeCard, paymentsEl.firstElementChild);
    }

    // PREFERENCES/TUTOR BUSINESS
    if (this.user.type === 'Tutor') {
        this.log('Appending settings view...');
        paymentsEl.insertBefore(
            this.renderListDivider('My business'),
            paymentsEl.querySelector('#settings')
        );
        const settingsEl = this.renderBusinessSettings();
        paymentsEl.querySelector('#settings').appendChild(settingsEl);
        this.log('Appended settings view:', settingsEl);
    }

    // PAYMENT METHODS
    /*
     *paymentsEl.insertBefore(
     *    this.renderListDivider('Payment methods'),
     *    paymentsEl.querySelector('#methods')
     *);
     *const methodCards = paymentsEl.querySelector('#methods #cards');
     *methodCards.appendChild(this.renderAddPaymentMethodCard());
     */

    // TRANSACTION HISTORY
    paymentsEl.insertBefore(
        this.renderListDivider('Transaction history'),
        paymentsEl.querySelector('#history')
    );
    const historyList = paymentsEl.querySelector('#history ul');

    // Only show the deposit button if the user is a tutor
    if (this.user.type === 'Tutor') {
        paymentsEl.appendChild(this.renderFab('withdraw'));
    }

    return paymentsEl;
};


// Render function that returns the tutor business management view
Tutorbook.prototype.renderBusinessSettings = function() {
    const view = this.renderTemplate('dialog-input');
    view.appendChild(this.renderSelectItem('Type',
        this.user.payments.type || '', this.data.payments.types
    ));
    view.appendChild(this.renderSplitListItem(
        this.renderSelect('Hourly charge', this.user.payments.hourlyChargeString,
            this.data.payments.hourlyChargeStrings),
        this.renderTextField('Current balance', this.user.payments.currentBalanceString),
    ));
    view.appendChild(this.renderTextFieldItem('Total hours worked',
        this.getDurationStringFromSecs(this.user.secondsTutored || 0)
    ));
    view.appendChild(this.renderTextAreaItem('Payment policy',
        this.user.payments.policy
    ));
    return view;
};


// Render function that returns an MDC List Item for the transaction history view 
// populated with the given documents transaction data.
Tutorbook.prototype.renderPastPaymentListItem = function(doc) {
    const payment = doc.data();
    const time = payment.timestamp.toDate();
    const title = 'Completed Payment';
    if (this.user.email === payment.from.email) {
        var subtitle = 'You paid ' + payment.to.name + ' $' + payment.amount.toFixed(2) +
            ' for a ' + this.getDurationStringFromDates(
                payment.for.clockIn.sentTimestamp.toDate(),
                payment.for.clockOut.sentTimestamp.toDate()
            ) + ' long lesson on ' + payment.for.for.subject + '.';
    } else if (this.user.email === payment.to.email) {
        var subtitle = payment.from.name + ' paid you $' + payment.amount.toFixed(2) +
            ' for a ' + this.getDurationStringFromDates(
                payment.for.clockIn.sentTimestamp.toDate(),
                payment.for.clockOut.sentTimestamp.toDate()
            ) + ' long lesson on ' + payment.for.for.subject + '.';
    } else {
        var subtitle = payment.from.name + ' paid ' + payment.to.name + ' $' + payment.amount.toFixed(2) +
            ' for a ' + this.getDurationStringFromDates(
                payment.for.clockIn.sentTimestamp.toDate(),
                payment.for.clockOut.sentTimestamp.toDate()
            ) + ' long lesson on ' + payment.for.for.subject + '.';
    }
    const meta_title = '$' + payment.amount.toFixed(2);
    const meta_subtitle = this.getDayAndDateString(time);
    const photo = payment.to.photo;

    var that = this;
    const listItem = this.renderTemplate('transaction-list-item', {
        photo: photo,
        title: title,
        subtitle: subtitle,
        meta_title: meta_title,
        meta_subtitle: meta_subtitle,
        timestamp: time,
        go_to_transaction: () => {
            that.viewPastApptDialog(that.combineMaps(payment.appt, {
                id: doc.id
            }));
        },
    });
    listItem.setAttribute('class', listItem.getAttribute('class') + ' past-payment');
    return listItem;
};


// Render function that returns an MDC List Item for the transaction history view 
// populated with the given documents transaction data.
Tutorbook.prototype.renderDeniedPaymentListItem = function(doc) {
    const payment = doc.data();
    const time = payment.deniedTimestamp.toDate();
    const title = 'Denied Payment';
    if (this.user.email === payment.for.from.email) {
        var subtitle = 'You denied a payment to ' + payment.for.to.name + '.' +
            " We are currently processing your refund. Your funds should be " +
            'available shortly.';
    } else if (this.user.email === payment.for.to.email) {
        var subtitle = payment.for.from.name + ' denied a payment.for.to you due to ' +
            'an unsatisfactory experience. See your reviews for more detail.';
    } else {
        var subtitle = payment.for.from.name + ' denied a payment.for.to ' +
            payment.for.to.name + '. We are currently processing this refund.' +
            ' Funds should be transferred shortly.';
    }
    const meta_title = '$' + payment.for.amount.toFixed(2);
    const meta_subtitle = this.getDayAndDateString(time);
    const photo = payment.for.to.photo;

    var that = this;
    const listItem = this.renderTemplate('transaction-list-item', {
        photo: photo,
        title: title,
        subtitle: subtitle,
        meta_title: meta_title,
        meta_subtitle: meta_subtitle,
        timestamp: time,
        go_to_transaction: () => {
            that.viewPastApptDialog(that.combineMaps(payment.appt, {
                id: doc.id
            }));
        },
    });
    listItem.setAttribute('class', listItem.getAttribute('class') + ' denied-payment');
    return listItem;
};


// Render function that returns an MDC List Item for the transaction history view 
// populated with the given documents transaction data.
Tutorbook.prototype.renderApprovedPaymentListItem = function(doc) {
    const payment = doc.data();
    const time = payment.approvedTimestamp.toDate();
    const title = 'Approved Payment';
    if (this.user.email === payment.for.from.email) {
        var subtitle = 'You approved a payment to ' + payment.for.to.name + '.' +
            ' We are currently processing this payment. Funds should be ' +
            'transferred shortly.';
    } else if (this.user.email === payment.for.to.email) {
        var subtitle = payment.for.from.name + ' approved a payment to you.' +
            " We are currently processing this payment. Your funds should be " +
            'available shorty.';
    } else {
        var subtitle = payment.for.from.name + ' approved a payment.for.to ' +
            payment.for.to.name + '. We are currently processing this payment.' +
            ' Funds should be transferred shortly.';
    }
    const meta_title = '$' + payment.for.amount.toFixed(2);
    const meta_subtitle = this.getDayAndDateString(time);
    const photo = payment.for.to.photo;

    var that = this;
    const listItem = this.renderTemplate('transaction-list-item', {
        photo: photo,
        title: title,
        subtitle: subtitle,
        meta_title: meta_title,
        meta_subtitle: meta_subtitle,
        timestamp: time,
        go_to_transaction: () => {
            that.viewPastApptDialog(that.combineMaps(payment.appt, {
                id: doc.id
            }));
        },
    });
    listItem.setAttribute('class', listItem.getAttribute('class') + ' approved-payment');
    return listItem;
};


// Render function that returns an MDC List Item for the transaction history view 
// populated with the given documents transaction data.
Tutorbook.prototype.renderInvalidPaymentListItem = function(doc) {
    const invalid = doc.data();
    const payment = invalid.for;
    const time = invalid.invalidTimestamp.toDate();
    const title = 'Invalid Payment';
    if (this.user.email === payment.from.email) {
        var subtitle = 'The payment you authorized to ' + payment.to.name +
            ' was invalid. Please reauthorize this payment within 24 hours or your ' +
            'tutoring lesson(s) will be canceled.';
    } else if (this.user.email === payment.to.email) {
        var subtitle = payment.from.name + '\'s payment to you was invalid.' +
            ' Your appointment(s) will be canceled in 24 hours unless ' +
            payment.from.name.split(' ')[0] + ' adds a valid payment method.';
    } else {
        var subtitle = payment.from.name + '\'s payment to ' +
            payment.to.name + ' was invalid. Their appointment(s) will be ' +
            'canceled in 24 hours unless ' + payment.from.name.split(' ')[0] +
            ' adds a valid payment method.';
    }
    const meta_title = '$' + payment.amount.toFixed(2);
    const meta_subtitle = this.getDayAndDateString(time);
    const photo = payment.to.photo;

    var that = this;
    const listItem = this.renderTemplate('transaction-list-item', {
        photo: photo,
        title: title,
        subtitle: subtitle,
        meta_title: meta_title,
        meta_subtitle: meta_subtitle,
        timestamp: time,
        go_to_transaction: () => {
            that.log('TODO: Implement viewTransaction dialog');
        },
    });
    listItem.setAttribute('class', listItem.getAttribute('class') + ' invalid-payment');
    return listItem;
};


// Render function that returns an MDC List Item for the transaction history view 
// populated with the given documents transaction data.
Tutorbook.prototype.renderAuthPaymentListItem = function(doc) {
    const payment = doc.data();
    const time = payment.timestamp.toDate();
    const title = 'Authorized Payment';
    if (this.user.email === payment.from.email) {
        var subtitle = 'You authorized a payment to ' + payment.to.name + '.' +
            " We won't process any money until after you're satisfied with " +
            this.getGenderPronoun(payment.to.gender) + ' lesson.';
    } else if (this.user.email === payment.to.email) {
        var subtitle = payment.from.name + ' authorized a payment to you.' +
            " Note that you will not recieve this payment until after " +
            this.getGenderPronoun(payment.from.gender) +
            ' is satisfied with your lesson.';
    } else {
        var subtitle = payment.from.name + ' authorized a payment to ' +
            payment.to.name + '. Note that ' + payment.to.name +
            ' will not recieve this payment until after ' +
            payment.from.name + ' is satisfied with ' +
            this.getGenderPronoun(payment.from.gender)
        ' lesson.';
    }
    const meta_title = '$' + payment.amount.toFixed(2);
    const meta_subtitle = this.getDayAndDateString(time);
    const photo = payment.to.photo;

    var that = this;
    const listItem = this.renderTemplate('transaction-list-item', {
        photo: photo,
        title: title,
        subtitle: subtitle,
        meta_title: meta_title,
        meta_subtitle: meta_subtitle,
        timestamp: time,
        go_to_transaction: () => {
            that.log('TODO: Implement viewTransaction dialog');
        },
    });
    listItem.setAttribute('class', listItem.getAttribute('class') + ' auth-payment');
    return listItem;
};


// ============================================================================
// TODO: SETTINGS VIEW
// ============================================================================


// View function that shows the settings screen
Tutorbook.prototype.viewSettings = function() {
    history.pushState({}, null, '/app/settings');
    /*
     *this.navSelected = 'Settings';
     */
    const settingsHeader = this.renderHeader('header-main', {
        title: 'Settings',
    });
    const settingsView = this.renderSettings();
    this.view(settingsHeader, settingsView);
    this.addSettingsDataManager();
};


// Helper function that adds listeners to the settings view and updates the 
// currentUser and his/her profile document as necessary.
Tutorbook.prototype.addSettingsDataManager = function() {
    const list = document.querySelector('.main .settings-view ul');
    const settings = this.user.settings;

    var that = this;

    function get(id) {
        return list.querySelector('[id="' + id + '"]');
    };

    function attch(id, name) {
        var el = get(id);
        that.log('Attaching ' + id + ' switch to:', el);
        const swtch = MDCSwitch.attachTo(el);
        swtch.checked = settings[name] || false;
        swtch.listen('change', () => {
            settings[name] = swtch.checked;
            that.updateUser();
        });
        that.log('Attached switch:', swtch);
    };

    const dashboardSwtchs = {
        showDescription: 'Show description',
        showGender: 'Show gender',
        showPhone: 'Show phone',
        showAppts: 'Upcoming appointments',
        showModifiedAppts: 'Modified appointments',
        showCanceledAppts: 'Canceled appointments',
        showRequestsIn: 'Pending requests',
        showModifiedRequests: 'Modified requests',
        showCanceledRequests: 'Canceled requests',
        showRejectedRequests: 'Rejected requests',
        showApprovedRequests: 'Approved requests',
    };
    Object.entries(dashboardSwtchs).forEach((entry) => {
        attch(entry[0], entry[1]);
    });
};


// Render function that returns an input switch with a title and subtitle
Tutorbook.prototype.renderSwitch = function(title, subtitle) {
    return this.renderTemplate('input-switch', {
        title: title,
        subtitle: subtitle,
        id: title,
    });
};


// Render function that returns an input button with a title, subtitle, and
// action attached when the button is clicked.
Tutorbook.prototype.renderSetButton = function(title, subtitle, action) {
    return this.renderTemplate('input-setting', {
        title: title,
        subtitle: subtitle,
        id: title,
        action: action,
    });
};


// Render function that returns a MDC List Divider formatted with the label
// underneath in the accent color.
Tutorbook.prototype.renderSettingsListDivider = function(label) {
    return this.renderTemplate('settings-list-divider', {
        label: label,
    });
};


// Render function that returns the settings view
Tutorbook.prototype.renderSettings = function() {
    // TODO: Sync user settings with Firestore and show current preferences here:
    var that = this;
    const mainEl = this.renderTemplate('settings-view', {
        welcome: !this.onMobile,
    });
    if (this.onMobile) {
        // TODO: Render and append a welcome card that spans the whole top
        const welcomeCard = this.renderWelcomeCard({
            title: 'App Preferences',
            // TODO: Actually sync appointments and show the correct status
            // message here.
            summary: 'Manage your notification preferences, calendar sync, ' +
                'and profile visibility.',
            subtitle: 'Manage payment methods, settings, and history',
        });
        welcomeCard.setAttribute('style', 'margin: 16px;');
        mainEl.insertBefore(welcomeCard, mainEl.firstElementChild);
    }
    const list = mainEl.querySelector('ul');

    function divider(label) {
        return list.appendChild(
            that.renderSettingsListDivider(label)
        );
    };

    function setButton(title, subtitle, action) {
        return list.appendChild(that.renderSetButton(
            title,
            subtitle,
            action
        ));
    };

    function swtch(title, subtitle) {
        return list.appendChild(that.renderSwitch(
            title,
            subtitle
        ));
    };

    // ACCOUNTS
    divider('Account sync');
    setButton(
        'Connect Google Calendar',
        'Sync tutoring sessions with Google Calendar',
        () => {
            that.log('TODO: Implement Google Calendar sync');
        }
    );
    setButton(
        'Manage accounts',
        'Sign out or delete accounts',
        () => {
            that.log('TODO: Implement delete account dialog');
        }
    );

    // PRIVACY
    divider('Privacy & visibility');
    setButton(
        'Visibility',
        'Manage who can see your profile',
        () => {
            that.log('TODO: Implement manage profile visibility dialog');
        }
    );
    swtch(
        'Show description',
        'Allow others to view your bio'
    );
    swtch(
        'Show gender',
        'Allow others to view your gender',
    );
    swtch(
        'Show phone',
        'Allow others to view your phone number',
    );

    // DASHBOARD
    divider('Dashboard cards');
    swtch(
        'Upcoming appointments',
        'Show cards for upcoming appointments',
    );
    swtch(
        'Modified appointments',
        'Show a card when my appointment is modified',
    );
    swtch(
        'Canceled appointments',
        'Show a card when my appointment is canceled',
    );
    swtch(
        'Pending requests',
        'Show cards for incoming lesson requests',
    );
    swtch(
        'Modified requests',
        'Show a card when my request is modified',
    );
    swtch(
        'Canceled requests',
        'Show a card when my request is canceled',
    );
    swtch(
        'Rejected requests',
        'Show a card when my request is rejected',
    );
    swtch(
        'Approved requests',
        'Show a card when my request is approved',
    );

    mainEl.querySelectorAll('.mdc-icon-button i').forEach((el) => {
        MDCRipple.attachTo(el);
    });
    return mainEl;
};




// ============================================================================
// CHATS
// ============================================================================


// Data function that creates a new chat with the given user and opens it.
Tutorbook.prototype.newChatWith = async function(user) {
    // First, check if the user already has a chat with the given user
    const that = this;
    const db = firebase.firestore();
    const chats = await db.collection('chats')
        .where('chatterEmails', 'array-contains', this.user.email)
        .get();
    const refs = [];
    chats.forEach((chat) => {
        refs.push(chat);
    });
    for (var i = 0; i < refs.length; i++) {
        if (refs[i].data().chatterEmails.indexOf(user.email) >= 0) {
            return this.viewChat(refs[i].id, refs[i].data());
        }
    }

    // If not, create a new chat group.
    const conciseUser = this.filterRequestUserData(user);
    const chat = {
        lastMessage: {
            message: 'No messages so far. Click to send the first one.',
            sentBy: this.conciseUser,
            timestamp: new Date(),
        },
        chatters: [
            this.conciseUser,
            conciseUser,
        ],
        chatterEmails: [
            this.user.email,
            user.email,
        ],
        createdBy: this.conciseUser,
        name: '', // Right now, we just use the chatter's names as the chat name
        photo: '', // Right now, we just use the chatter's photos as the chat photo
    };
    const ref = db.collection('chats').doc();
    await ref.set(chat);
    return this.viewChat(ref.id, chat);
};


// View function that adds the given message to the .main #messages list based on 
// timestamp
Tutorbook.prototype.viewMessage = function(message) {
    this.log('Viewing message:', message);
    if (!!!message) {
        console.warn('Invalid message passed to viewMessage:', message);
        return;
    }

    var mainEl = document.querySelector('.main');
    var mainListEl = $('.main .chat #messages')[0];
    var id = message.getAttribute('id');
    var timestamp = message.getAttribute('timestamp');

    var existingMessage = mainListEl.querySelector('[id="' + id + '"]');
    if (!!existingMessage) {
        // modify
        mainListEl.insertBefore(message, existingMessage);
        mainListEl.removeChild(existingMessage);
    } else {
        // Add by timestamp
        for (var i = 0; i < mainListEl.children.length; i++) {
            var child = mainListEl.children[i];
            var time = child.getAttribute('timestamp');
            // If there is a request that was sent later (more recently)
            // Then this request will appear after that request
            if (time && time > timestamp) {
                this.log('Inserting after child:', child);
                break;
            }
        }
        // Append it normally
        if (!child) {
            $(mainListEl).append(message);
        } else {
            $(message).insertAfter(child);
            $('.main .chat #messages .bubble:last-child')[0].scrollIntoView();
        }
    }
};


// Data flow function that gets the data for a chat
Tutorbook.prototype.getChat = function(id) {
    const db = firebase.firestore();
    return db.collection('chats').doc(id).get();
};


// Render function that returns an empty chats message div
Tutorbook.prototype.renderEmptyMessages = function() {
    return this.renderTemplate('centered-text', {
        text: 'No messages so far.',
    });
};


// Render function that returns an empty chats message div
Tutorbook.prototype.renderEmptyChats = function() {
    return this.renderTemplate('centered-text', {
        text: 'No chats.',
    });
};


// Helper function that empties the current chat list to display new ones
Tutorbook.prototype.emptyMessages = function() {
    return $('main #messages').empty();
};


// Helper function that empties the current chat list to display new ones
Tutorbook.prototype.emptyChatResults = function() {
    return $('main #chats').empty();
};


// Render function that returns a message div with the given message as text
Tutorbook.prototype.renderMessage = function(doc) {
    const el = this.renderTemplate('message', this.combineMaps(doc.data(), {
        id: 'doc-' + doc.id,
        timestamp: doc.data().timestamp.toDate().getTime(),
    }));
    if (doc.data().sentBy.email === this.user.email) {
        el.setAttribute('class', 'bubble me');
    }
    console.log('Rendered message:', el);
    return el;
};


// View function that shows the user a mdc-list of their current chats
Tutorbook.prototype.viewChats = function() {
    history.pushState({}, null, '/app/messages');
    this.viewIntercom(true);
    this.navSelected = 'Messages';

    const chatsHeader = this.renderHeader('header-main', {
        title: 'Messages',
    });
    const chatsView = this.renderChats();
    this.view(chatsHeader, chatsView);

    this.viewChatResults();
};


// Codepen function see: https://codepen.io/Momciloo/pen/bEdbxY
Tutorbook.prototype.addCodepen = function() {
    document.querySelector('.chat[data-chat=person2]').classList.add('active-chat')
    document.querySelector('.person[data-chat=person2]').classList.add('active')

    let friends = {
            list: document.querySelector('ul.people'),
            all: document.querySelectorAll('.left .person'),
            name: ''
        },
        chat = {
            container: document.querySelector('.container .right'),
            current: null,
            person: null,
            name: document.querySelector('.container .right .top .name')
        }

    friends.all.forEach(f => {
        f.addEventListener('mousedown', () => {
            f.classList.contains('active') || setAciveChat(f)
        })
    });

    function setAciveChat(f) {
        friends.list.querySelector('.active').classList.remove('active')
        f.classList.add('active')
        chat.current = chat.container.querySelector('.active-chat')
        chat.person = f.getAttribute('data-chat')
        chat.current.classList.remove('active-chat')
        chat.container.querySelector('[data-chat="' + chat.person + '"]').classList.add('active-chat')
        friends.name = f.querySelector('.name').innerText
        chat.name.innerHTML = friends.name
    }
};


// Render function that returns the chat view
Tutorbook.prototype.renderChats = function() {
    const view = this.renderTemplate('chats', {
        new: () => {
            console.log('TODO: Implement new chat dialog.');
        },
        welcomeTitle: 'Messages',
        welcomeSubtitle: (this.user.type === 'Tutor') ? 'Answer your students\'s ' +
            'questions, market yourself to prospective students, and manage' +
            ' appointments with students all in one place.' : 'Ask your tutor' +
            ' questions, re-schedule appointments, and talk to prospective' +
            ' tutors all in one place.',
        showWelcome: !this.onMobile,
    });

    return view;
};


// Data action function that deletes the chat and TODO: sends out deleted chat
// notifications to the other users on the chat.
Tutorbook.prototype.deleteChat = function(chat, id) {
    const db = firebase.firestore();
    return db.collection('chats').doc(id).delete();
};


// Render function that returns a chat list item
Tutorbook.prototype.renderChatItem = function(doc) {
    const that = this;
    const el = this.renderTemplate('chat-list-item', this.combineMaps(doc.data(), {
        open_chat: () => {
            that.viewChat(doc.id, doc.data());
        },
        id: doc.id,
        photo: that.getOtherAttendee(that.user, doc.data().chatters).photo,
        name: that.getOtherAttendee(that.user, doc.data().chatters).name,
        showAction: false, // TODO: Add delete action for chats.
        actionLabel: 'Delete',
        action: () => {
            return that.viewConfirmationDialog('Delete Chat?', 'Are you sure you want to permanently delete this ' +
                    'chat? Once you do, no one will be able to view their past messages. This action cannot be undone.')
                .listen('MDCDialog:closing', async (event) => {
                    if (event.detail.action === 'yes') {
                        $('main .chats #doc-' + doc.id).remove();
                        [err, res] = await to(that.deleteChat(doc.data(), doc.id));
                        if (err) {
                            console.error('Error while deleting chat:', err);
                            return that.viewSnackbar('Could not delete chat.');
                        }
                        that.viewSnackbar('Deleted chat.');
                    }
                });
        },
    }));
    MDCRipple.attachTo(el);
    return el;
};


// View function that opens up a chat view
Tutorbook.prototype.viewChat = function(id, chat) {
    history.pushState({}, null, '/app/messages/' + id);
    this.viewIntercom(false);
    this.navSelected = 'Messages';

    const chatsHeader = this.renderHeader('header-back', {
        title: 'Chat with ' + this.getOtherAttendee(this.user, chat.chatters).name,
    });
    const chatsView = this.renderChat();
    this.view(chatsHeader, chatsView);

    this.currentChat = this.combineMaps(chat, {
        id: id,
    });
    this.viewMessages();
    this.addChatManager();
};


// Data flow function that sends a message based on the currentChat's id
Tutorbook.prototype.sendMessage = async function(txt) {
    const db = firebase.firestore();
    const message = db.collection('chats').doc(this.currentChat.id)
        .collection('messages').doc();
    await message.set({
        sentBy: this.conciseUser,
        timestamp: new Date(),
        message: txt,
    });
    const chat = db.collection('chats').doc(this.currentChat.id);
    return chat.update({
        lastMessage: {
            sentBy: this.conciseUser,
            timestamp: new Date(),
            message: txt,
        },
    });
};


// Manager function that sends messages
Tutorbook.prototype.addChatManager = function() {
    const that = this;
    $('main .chat .write input').keyup(async function(e) {
        if (e.keyCode == 13) {
            // Enter key hit
            $(this).attr('disabled', 'disabled');
            const message = $(this).val();
            $(this).val('');
            $(this).removeAttr('disabled');
            await that.sendMessage(message);
        }
    });
};


// Data action function that gets the messages for the currentChat.
Tutorbook.prototype.getMessages = function() {
    const id = this.currentChat.id;
    const db = firebase.firestore();
    return db.collection('chats').doc(id).collection('messages')
        .orderBy('timestamp', 'asc')
        .limit(20);
};


// View function that shows the messages of the chat
Tutorbook.prototype.viewMessages = function() {
    var that = this;
    this.getMessages().onSnapshot((snapshot) => {
        if (!snapshot.size) {
            return that.messagesRecycler.empty();
        }

        snapshot.docChanges().forEach((change) => {
            if (change.type === 'removed') {
                that.messagesRecycler.remove(change.doc);
            } else {
                that.messagesRecycler.display(change.doc);
            }
        });
    });
};


// Render function that returns a chat view (that shows messages and enables
// user's to send their own messages).
Tutorbook.prototype.renderChat = function() {
    const that = this;
    return this.renderTemplate('chat', {
        attach: () => {
            console.log('TODO: Implement attaching files');
        },
        emoji: () => {
            console.log('TODO: Implement emoji options');
        },
        send: async () => {
            // Enter key hit
            const input = 'main .chat .write input';
            $(input).attr('disabled', 'disabled');
            const message = $(input).val();
            $(input).val('');
            $(input).removeAttr('disabled');
            await that.sendMessage(message);
        },
    });
};


// View function that shows all the chats that the currentUser is a part of
Tutorbook.prototype.viewChatResults = function() {
    var that = this;
    this.emptyChatResults();
    this.getFilteredChats().onSnapshot((snapshot) => {
        if (!snapshot.size) {
            return that.chatsRecycler.empty();
        }

        snapshot.docChanges().forEach((change) => {
            if (change.type === 'removed') {
                that.chatsRecycler.remove(change.doc);
            } else {
                that.chatsRecycler.display(change.doc);
            }
        });
    });
};


// Function that returns the user's current chats (we will support filtering
// chats in the future).
Tutorbook.prototype.getFilteredChats = function() {
    const db = firebase.firestore();
    return db.collection('chats')
        .where('chatterEmails', 'array-contains', this.user.email);
};


// ============================================================================
// SEARCH, FILTER, & USER VIEWS
// ============================================================================


// View function that shows the search view
Tutorbook.prototype.viewSearch = function() {
    history.pushState({}, null, '/app/search');
    this.viewIntercom(true);
    var that = this;
    this.initFilterDescription();
    this.setSearchNavSelected();

    const search = this.renderSearch();
    this.view(search.header, search.view);

    return this.viewSearchResults();
};


// Render function that returns the searchHeader and searchView in a map (this
// is mostly just for the site to be able to have more manipulation over how
// they are displayed).
Tutorbook.prototype.renderSearch = function() {
    var that = this;
    const searchHeader = this.renderHeader('header-filter', {
        'title': 'Search',
        'show_filter_dialog': () => {
            that.viewFilterDialog();
        },
        'filter_description': that.filterDescription,
        'clear_filters': () => {
            that.filters = {
                grade: 'Any',
                subject: 'Any',
                gender: 'Any',
                availability: {},
                location: 'Any',
                price: 'Any',
                type: 'Any',
                sort: 'Rating'
            };
            // NOTE: For some callback reason, I can't nest viewSearch calls
            window.app.viewSearch();
        },
    });
    const searchView = this.renderTemplate('search');
    return {
        header: searchHeader,
        view: searchView,
    };
};

// Helper function to set the correct nav drawer selected value
Tutorbook.prototype.setSearchNavSelected = function() {
    if (this.filters.type !== 'Any' && this.filters.type !== '') {
        this.navSelected = this.filters.type + 's';
    } else {
        this.navSelected = 'Search';
    }
};


// View function that uses the searchRecycler to add result list-items whenever
// the Firestore database changes.
Tutorbook.prototype.viewSearchResults = function() {
    var that = this;
    this.emptySearchResults();
    this.getFilteredUsers().onSnapshot((snapshot) => {
        if (!snapshot.size) {
            return that.searchRecycler.empty();
        }

        snapshot.docChanges().forEach((change) => {
            if (change.type === 'removed') {
                that.searchRecycler.remove(change.doc);
            } else {
                that.searchRecycler.display(change.doc);
            }
        });
    });
};


// Helper function that checks if the current search is empty
Tutorbook.prototype.emptyFilters = function() {
    var count = 0;
    this.getFilteredUsers().get().then((snapshot) => {
        snapshot.forEach((doc) => {
            count++
        });
    });
    if (count === 0) {
        return true;
    }
    return false;
};


// Helper function that empties the current search results to display new ones
Tutorbook.prototype.emptySearchResults = function() {
    return $('main #results').empty().append(
        this.renderTemplate('search-empty-list-item')
    );
};


// Data action function that gets user's that fit with the current filters in
// the Firestore database
Tutorbook.prototype.getFilteredUsers = function() {
    var query = firebase.firestore().collection('usersByEmail');

    if (this.filters.grade !== 'Any') {
        query = query.where('grade', '==', this.filters.grade);
    }

    if (this.filters.gender !== 'Any') {
        query = query.where('gender', '==', this.filters.gender);
    }

    if (this.filters.type !== 'Any') {
        query = query.where('type', '==', this.filters.type);
    }

    if (Object.keys(this.filters.availability).length !== 0) {
        // NOTE: User availability is stored in the Firestore database as:
        // availability: {
        // 	Gunn Academic Center: {
        //     Friday: [
        //       { open: '10:00 AM', close: '3:00 PM' },
        //       { open: '10:00 AM', close: '3:00 PM' },
        //     ],
        //   },
        //   Paly Tutoring Center: {
        //   ...
        //   },
        // };
        // And it is referenced here in the filters as:
        // availability: {
        //  	location: 'Gunn Academic Center',
        //  	day: 'Monday',
        //  	fromTime: 'A Period',
        //  	toTime: 'B Period',
        // };
        var location = this.filters.availability.location;
        var day = this.filters.availability.day;
        var from = this.filters.availability.fromTime;
        var to = this.filters.availability.toTime;
        // TODO: Make this query accept values that are a larger range than
        // the given value (e.g. user wants a timeslot from 4:00 PM to 4:30 PM
        // but this filters out users with availability from 8:00 AM to 5:00 PM).
        query = query.where(
            'availability.' + location + '.' + day,
            'array-contains', {
                open: from,
                close: to
            }
        );
    }

    switch (this.filters.price) {
        case 'Any':
            break;
        case 'Free':
            query = query.where('payments.type', '==', 'Free');
            break;
        default:
            query = query.where('payments.type', '==', 'Paid');
    };

    if (this.filters.subject !== 'Any' &&
        Object.keys(this.filters.availability).length === 0) {
        // NOTE: We can only include one array-contains statement in any given
        // Firestore query. So, to do this, we check if the users in the 
        // resulting query have this subject (in the searchRecycler).
        query = query
            .where('subjects', 'array-contains', this.filters.subject);
    }

    if (this.filters.sort === 'Rating') {
        query = query.orderBy('avgRating', 'desc');
    } else if (this.filters.sort === 'Reviews') {
        query = query.orderBy('numRatings', 'desc');
    }

    return query.limit(50);
};


// Data action function that gets all of the user's currently in the Firestore
// database
Tutorbook.prototype.getUsers = function() {
    return firebase.firestore()
        .collection('usersByEmail')
        .orderBy('avgRating', 'desc')
        .limit(50)
};


// View function that shows a filter dialog that changes this.filters
Tutorbook.prototype.viewFilterDialog = function() {
    const dialogEl = this.renderFilterDialog();
    const dialog = MDCDialog.attachTo(dialogEl);

    dialog.autoStackButtons = false;
    var that = this;
    dialog.listen('MDCDialog:closing', (event) => {
        if (event.detail.action === 'accept') {
            that.viewSearch();
        }
    });
    dialogEl.querySelectorAll('.mdc-list-item').forEach((el) => {
        MDCRipple.attachTo(el);
    });

    dialog.open();
};


// Manager function that adds listeners to the availability input part of the 
// filter dialog
Tutorbook.prototype.addInputAvailabilityManager = function(dialog) {
    const view = dialog.querySelector('.dialog-form__content');
    var that = this;
    var availableTime = this.cloneMap(this.filters.availability);

    // Show the default values and only rerender once the user chooses
    // a location. NOTE: We also have to rerender the timeSelects when
    // a day is chosen and we have to rerender the fromTimeSelect when
    // the toTimeSelect is chosen (as we don't want to be able to input
    // negative time) and vice versa.

    var daySelect = this.attachSelect(view.querySelector('#Day'));
    daySelect.listen('MDCSelect:change', function() {
        availableTime.day = daySelect.value;
        that.refreshTimeSelects(availableTime);
    });

    var toTimeSelect = this.attachSelect(view.querySelector('#To'));
    toTimeSelect.listen('MDCSelect:change', function() {
        availableTime.toTime = toTimeSelect.value;
    });

    var fromTimeSelect = this.attachSelect(
        view.querySelector('#From')
    );
    fromTimeSelect.listen('MDCSelect:change', function() {
        availableTime.fromTime = fromTimeSelect.value;
    });

    const locationSelect = this.attachSelect(
        view.querySelector('#Location')
    );
    locationSelect.listen('MDCSelect:change', function() {
        availableTime.location = locationSelect.value;
        // Now, contrain the other select menus to values that this location
        // has for available times.
        that.refreshDayAndTimeSelects(availableTime);
    });

    // Check to see if a location was selected. If there is a location
    // selected, make sure to only render those options that it's supervisor has
    // specified in their location management view.
    if (!!availableTime.location && availableTime.location !== '') {
        // Re-render all of the selects to match the selected location
        this.refreshDayAndTimeSelects(availableTime);

        if (!!availableTime.day && availableTime.day !== '') {
            // Re-render all fo the time selects to match the selected day
            this.refreshTimeSelects(availableTime);
        }
    }

    function invalid(select) {
        // TODO: Make the select styling actually work within this dialog
        that.viewSnackbar('Please select a valid availability.');
        select.required = true;
        select.valid = false;
    };

    function validTime(time) {
        console.log('Checking if time is valid:', time);
        var valid = true;
        if (time.location === '') {
            invalid(locationSelect);
            valid = false;
        }
        if (time.day === '') {
            invalid(daySelect);
            valid = false;
        }
        if (time.toTime === '') {
            invalid(toTimeSelect);
            valid = false;
        }
        if (time.fromTime === '') {
            invalid(fromTimeSelect);
            valid = false;
        }
        return valid;
    };

    dialog.querySelector('#ok-button').addEventListener('click', () => {
        if (validTime(availableTime)) {
            // Update the textField value to match the new value
            that.log('Set filter availability to:', availableTime);
            that.filters.availability = availableTime;
            that.viewFilterPage('page-all');
        }
    });

};


// Render function that returns availability setting inputs
Tutorbook.prototype.renderInputAvailability = function() {
    const data = this.cloneMap(this.filters.availability);
    const dayEl = this.renderSelect('Day', data.day || '', this.data.days);
    const locationEl = this.renderSelect(
        'Location',
        data.location || this.data.locations[1] || '',
        this.data.locations
    );
    console.log(locationEl);

    // NOTE: All of this changes once you add the data manager (as we want
    // to only show those times that are specified by the location supervisor)
    const times = this.data.periods.concat(this.data.timeStrings);
    const fromTimeEl = this.renderSelect(
        'From',
        data.fromTime || '',
        [data.fromTime].concat(times)
    );
    const toTimeEl = this.renderSelect(
        'To',
        data.toTime || '',
        [data.toTime].concat(times)
    );

    const content = this.renderTemplate('input-wrapper');
    content.appendChild(this.renderInputListItem(locationEl));
    content.appendChild(this.renderInputListItem(dayEl));
    content.appendChild(this.renderInputListItem(fromTimeEl));
    content.appendChild(this.renderInputListItem(toTimeEl));

    return content;
};


// View function that views a certain page of the filter dialog
Tutorbook.prototype.viewFilterPage = function(id) {
    var that = this;
    const dialog = document.querySelector('#dialog-filter');
    const pages = dialog.querySelectorAll('.page');

    function clearFilters(filters) {
        // Helper function to get rid of the 'Any' selected option for
        // better rendering.
        var result = {};
        for (var filter in filters) {
            if (filters[filter] !== 'Any' && Object.keys(filters[filter]).length !== 0) {
                if (filter === 'availability') {
                    result[filter] = that.getFilterAvailabilityString(filters[filter]);
                } else {
                    result[filter] = filters[filter];
                }
            } else {
                result[filter] = '';
            }
        }
        return result;
    };

    function renderAllList() {
        that.replaceElement(
            dialog.querySelector('#all-filters-list'),
            that.renderTemplate('dialog-filter-list', clearFilters(that.filters))
        );

        dialog.querySelectorAll('#page-all .mdc-list-item').forEach(function(el) {
            el.addEventListener('click', function() {
                var id = el.id.split('-').slice(1).join('-');
                that.viewFilterPage(id);
            });
        });
    };

    pages.forEach(function(sel) {
        if (sel.id === id) {
            sel.style.display = 'inherit';
        } else {
            sel.style.display = 'none';
        }
    });

    if (id === 'page-all') {
        renderAllList();
    } else if (id === 'page-availability') {
        this.replaceElement(
            dialog.querySelector('#availability-list'),
            this.renderInputAvailability()
        );
        this.addInputAvailabilityManager(dialog);
    }
};


// Render function that sets up the filter dialog
Tutorbook.prototype.renderFilterDialog = function() {
    const dialog = document.querySelector('#dialog-filter');
    const pages = dialog.querySelectorAll('.page');

    var that = this;
    dialog.querySelector('#reset-button').addEventListener('click', () => {
        that.filters = {
            grade: 'Any',
            subject: 'Any',
            gender: 'Any',
            type: 'Any',
            price: 'Any',
            availability: {},
            location: 'Any',
            sort: 'Rating'
        };
        that.viewFilterPage('page-all');
    });

    this.replaceElement(
        dialog.querySelector('#availability-list'),
        this.renderInputAvailability()
    );

    this.replaceElement(
        dialog.querySelector('#grade-list'),
        this.renderTemplate('dialog-filter-item-list', {
            items: ['Any'].concat(this.data.grades)
        })
    );

    this.replaceElement(
        dialog.querySelector('#price-list'),
        this.renderTemplate('dialog-filter-item-list', {
            items: ['Any'].concat(this.data.prices)
        })
    );

    this.replaceElement(
        dialog.querySelector('#gender-list'),
        this.renderTemplate('dialog-filter-item-list', {
            items: ['Any'].concat(this.data.genders)
        })
    );

    this.replaceElement(
        dialog.querySelector('#type-list'),
        this.renderTemplate('dialog-filter-item-list', {
            items: ['Any'].concat(this.data.types)
        })
    );

    this.replaceElement(
        dialog.querySelector('#math-list'),
        this.renderTemplate('dialog-filter-item-list', {
            items: this.data.mathSubjects
        })
    );

    this.replaceElement(
        dialog.querySelector('#science-list'),
        this.renderTemplate('dialog-filter-item-list', {
            items: this.data.scienceSubjects
        })
    );

    this.replaceElement(
        dialog.querySelector('#history-list'),
        this.renderTemplate('dialog-filter-item-list', {
            items: this.data.historySubjects
        })
    );

    this.replaceElement(
        dialog.querySelector('#language-list'),
        this.renderTemplate('dialog-filter-item-list', {
            items: this.data.languageSubjects
        })
    );

    this.replaceElement(
        dialog.querySelector('#english-list'),
        this.renderTemplate('dialog-filter-item-list', {
            items: this.data.englishSubjects
        })
    );

    this.replaceElement(
        dialog.querySelector('#life-skills-list'),
        this.renderTemplate('dialog-filter-item-list', {
            items: this.data.lifeSkills
        })
    );

    dialog.querySelectorAll('#page-subject .mdc-list-item').forEach((el) => {
        el.addEventListener('click', () => {
            var id = el.id.split('-').slice(1).join('-');
            if (id === 'page-all') {
                that.filters.subject = 'Any';
            }
            that.viewFilterPage(id);
        });
    });

    pages.forEach(function(sel) {
        var key = sel.id.split('-')[1];
        if (key === 'all' || key === 'subject') {
            return;
        }

        sel.querySelectorAll('.mdc-list-item').forEach(function(el) {
            el.addEventListener('click', function() {
                if (['math', 'science', 'history', 'language', 'english', 'lifeSkills'].indexOf(key) >= 0) {
                    that.filters['subject'] = el.innerText.trim();
                    that.viewFilterPage('page-all');
                } else if ('availability' === key) {
                    return;
                } else {
                    that.filters[key] = el.innerText.trim();
                    that.viewFilterPage('page-all');
                }
            });
        });
    });

    that.viewFilterPage('page-all');
    dialog.querySelectorAll('.back').forEach(function(el) {
        el.addEventListener('click', function() {
            that.viewFilterPage('page-all');
        });
    });
    dialog.querySelectorAll('.back-subjects').forEach(function(el) {
        el.addEventListener('click', function() {
            that.viewFilterPage('page-subject');
        });
    });

    return dialog;
};


// Init function that sets this.filterDescription to match this.this.filters
Tutorbook.prototype.initFilterDescription = function() {
    this.filterDescription = '';

    switch (this.filters.price) {
        case 'Any':
            break;
        case 'Free':
            this.filterDescription += ' free ';
            break;
        default:
            this.filterDescription += ' paid ';
            break;
    };

    if (this.filters.gender !== 'Any') {
        this.filterDescription += this.filters.gender.toLowerCase() + ' ';
    }

    if (this.filters.grade !== 'Any') {
        this.filterDescription += this.filters.grade.toLowerCase();
    }

    if (this.filters.type !== 'Any') {
        this.filterDescription += ' ' + this.filters.type.toLowerCase() + 's';
    } else {
        if (this.filters.grade === 'Any') {
            this.filterDescription += (this.filters.price === 'Any') ? ' all users' : ' users';
        } else if (this.filters.grade !== 'Freshman') {
            // "Freshman" is weird as it is the plural and singular
            this.filterDescription += 's';
        }
    }

    if (this.filters.subject !== 'Any') {
        this.filterDescription += ' for ' + this.filters.subject;
    }

    if (Object.keys(this.filters.availability).length !== 0) {
        this.filterDescription += ' available on ' + this.getAvailabilityString(this.filters.availability);
    }

    if (this.filters.sort === 'Rating') {
        this.filterDescription += ' sorted by rating';
    } else if (this.filters.sort === 'Reviews') {
        this.filterDescription += ' sorted by # of reviews';
    }

    // Make sure to cut off the filter description at a max of 20 characters
    // and less if we're on mobile.
    // TODO: Make these numbers based on the size of the window
    if (this.onMobile) {
        this.filterDescription = this.shortenString(this.filterDescription, 50);
    } else {
        this.filterDescription = this.shortenString(this.filterDescription, 150);
    }

};


// Init function that resets this.filters to the default config
Tutorbook.prototype.initFilters = function() {
    this.filters = {
        grade: 'Any',
        subject: 'Any',
        gender: 'Any',
        availability: {},
        location: 'Any',
        type: 'Any',
        price: 'Any',
        sort: 'Rating'
    };
    // If the user has subjects set in their profile, we want to render the
    // search view with those subjects being filtered for.
    if (!!this.user.subjects && this.user.subjects !== [] &&
        this.user.subjects[0] !== undefined) {
        // TODO: Make the filters in such a way that we're able to show
        // results for multiple subjects all at once.
        this.filters.subject = this.user.subjects[0];
    }
    switch (this.user.type) {
        case 'Pupil':
            this.filters.type = 'Tutor';
            break;
        case 'Tutor':
            this.filters.type = 'Pupil';
            break;
        default:
            this.filters.type = 'Any';
            break;
    };
    // Test filters to ensure that they don't come up empty.
    // If they do, we want to reset them so that they don't.
    if (this.emptyFilters()) {
        this.filters = {
            grade: 'Any',
            subject: 'Any',
            gender: 'Any',
            availability: {},
            location: 'Any',
            type: 'Any',
            price: 'Any',
            sort: 'Rating'
        };
    }

    this.initFilterDescription();
};


// Render function that returns an MDC List Item for a given user document
Tutorbook.prototype.renderUserListItem = function(doc) {
    var that = this;
    const user = doc.data();
    var listItemData = this.cloneMap(user);
    listItemData['id'] = 'doc-' + doc.id;
    listItemData['go_to_user'] = () => {
        that.viewUser(doc.id);
    };

    if (user.payments.type === 'Paid') {
        listItemData.type = 'Tutor';
        listItemData.paid = true;
        listItemData.rate = '$' + user.payments.hourlyCharge.toFixed(0);
        listItemData.paymentType = 'paid';
    } else {
        listItemData.free = true;
        listItemData.paymentType = 'free';
    }

    const el = this.renderTemplate('search-result-user', listItemData);
    this.replaceElement(
        el.querySelector('.rating__meta'),
        that.renderRating(user.avgRating)
    );
    MDCRipple.attachTo(el);
    return el;
};


// View function that shows the given user's profile
Tutorbook.prototype.viewUser = function(id) {
    this.viewIntercom(false);
    const userHeader = this.renderHeader('header-back', {
        'title': 'View User',
    });
    const userView = !!this.userViews ? this.userViews[id] : false;
    if (!!!userView) {
        return this.getUser(id).then((doc) => {
            if (doc.exists) {
                return this.view(userHeader, this.renderUserView(doc));
            } else {
                this.viewSnackbar('The user profile you are trying to view ' +
                    'does not exist.');
                if (location.toString().endsWith(id)) {
                    this.back();
                }
            }
        });
    }
    history.pushState({}, null, '/app/users/' + id);
    return this.view(userHeader, userView);
};


// Init function that renders userViews and appends them to this.userViews
Tutorbook.prototype.initUserViews = function() {
    var that = this;
    this.userViews = {};
    try {
        this.getUsers().onSnapshot((snapshot) => {
            if (!snapshot.size) {
                return that.userViewRecycler.empty();
            }

            snapshot.docChanges().forEach((change) => {
                if (change.type === 'removed') {
                    that.userViewRecycler.remove(change.doc);
                } else {
                    that.userViewRecycler.display(change.doc);
                }
            });
        });
    } catch (e) {
        console.error('Error while initializing user views:', e);
    }
};


// Render function that returns a div of empty and full stars depending on the
// given rating
Tutorbook.prototype.renderRating = function(rating) {
    var el = this.renderTemplate('wrapper');
    for (var r = 0; r < 5; r += 1) {
        var star;
        if (r < Math.floor(rating)) {
            star = this.renderTemplate('star-icon', {});
        } else {
            star = this.renderTemplate('star-border-icon', {});
        }
        el.append(star);
    }
    return el;
};


// View function that appends the given userListItem to the results in the
// correct order
Tutorbook.prototype.viewSearchListItem = function(listItem) {
    this.log('Viewing searchListItem:', listItem);
    const results = document.querySelector('.main .search #results');
    var existingLocationCard = results.querySelector(
        "[id=" + "'" + listItem.getAttribute('id') + "']"
    );
    if (existingLocationCard) {
        this.log('Modified existing listItem:', existingLocationCard);
        // modify
        results.insertBefore(listItem, existingLocationCard);
        results.removeChild(existingLocationCard);
    } else {
        this.log('Adding new listItem:', listItem);
        // We want to add paid tutors to the top of the search results
        if (listItem.getAttribute('type') === 'paid') {
            return $(listItem)
                .insertAfter('main #results .mdc-list-item:first-child');
        }
        // add
        results.append(listItem);
    }
};


// Render function that returns an empty search message list item
Tutorbook.prototype.renderEmptySearch = function() {
    return this.renderTemplate('centered-text', {
        text: 'No results.'
    });
};


// Helper function that checks if the user has a valid profile (i.e. grade and 
// type are must-haves) and that it matches the current search (in the case
// where we have an unsupported search).
Tutorbook.prototype.validProfile = function(profile) {
    if (profile.grade === '' || profile.grade === undefined) {
        console.warn('Skipping user ' + profile.email +
            ' search result without grade:', profile);
        return false;
    } else if (this.getUserSubjects(profile).length === 0) {
        console.warn('Skipping user ' + profile.email +
            ' search result without any subjects:', profile);
        return false;
    } else if (profile.type === '' || profile.type === undefined) {
        console.warn('Skipping user ' + profile.email +
            ' search result without type:', profile);
        return false;
    } else if (Object.keys(this.filters.availability).length !== 0 &&
        this.filters.subject !== 'Any' &&
        profile.subjects.indexOf(this.filters.subject) < 0) {
        console.warn('Skipping user ' + profile.email +
            ' search result that doesn\'t match current search:', profile);
        return false;
    }
    return true;
};


// Render function that returns the userView for a given user Firestore document
Tutorbook.prototype.renderUserView = function(doc) {
    var user = doc.data();
    user.subjects = this.getUserSubjects(user);
    user.availableTimes = this.getAvailabilityStrings(user.availability);
    if (user.payments.type === 'Paid') {
        user.paid = true;
        user.showAbout = true;
    } else {
        user.free = true;
    }

    const userView = this.renderTemplate('user-view', user);

    this.addUserManager(userView, user);
    return userView;
};


// Helper function that adds listeners to the user view (i.e. to open the
// newRequest dialog when the user hits a subject or to open the newReview
// dialog when the user hits that review button).
Tutorbook.prototype.addUserManager = function(userView, user) {
    var that = this;
    // SUBJECTS
    userView.querySelectorAll('#subjects .mdc-list-item').forEach((el) => {
        MDCRipple.attachTo(el);
        el.addEventListener('click', () => {
            switch (this.user.type) {
                case 'Supervisor':
                    return that.viewNewProxyRequestDialog(
                        el.querySelector('.mdc-list-item__text').innerText,
                        user
                    );
                case 'Parent':
                    return that.viewNewChildRequestDialog(
                        el.querySelector('.mdc-list-item__text').innerText,
                        user
                    );
                default:
                    return that.viewNewRequestDialog(
                        el.querySelector('.mdc-list-item__text').innerText,
                        user
                    );
            };
        });
    });

    // MESSAGE FAB
    const fab = userView.querySelector('#message-button');
    MDCRipple.attachTo(fab);
    fab.addEventListener('click', () => {
        return that.newChatWith(user);
    });
};




// ============================================================================
// PROXY ACCOUNT MANAGEMENT VIEW (FOR SUPERVISORS)
// ============================================================================


// View function that enables supervisors to manage accounts they've created.
// This view will show them cards for all of the accounts they've created that
// have not yet been claimed (they are allowed to create user documents and then
// edit those documents until they are claimed by their respective owners).
Tutorbook.prototype.viewAccountManager = function() {
    this.viewIntercom(false);
    history.pushState({}, null, '/app/accounts');
    this.navSelected = 'Accounts';
    var that = this;
    const accountsView = this.renderTemplate('account-manager', {
        welcome: !this.onMobile,
        new: () => {
            that.viewNewAccountDialog();
        },
    });
    const accountsHeader = this.renderHeader('header-main', {
        title: 'Accounts',
    });
    this.view(accountsHeader, accountsView);
    this.viewAccountCards();
    accountsView.querySelectorAll('.mdc-fab').forEach((el) => {
        MDCRipple.attachTo(el);
    });
};


// View function that appends cards for supervisor-made accounts that have not 
// yet been claimed by their owners.
Tutorbook.prototype.viewAccountCards = function() {
    var that = this;
    this.emptyCards();

    this.getAccountData().onSnapshot((snapshot) => {
        if (!snapshot.size) {
            return that.accountRecycler.empty();
        }

        snapshot.docChanges().forEach((change) => {
            if (change.type === 'removed') {
                that.accountRecycler.remove(change.doc);
            } else {
                that.accountRecycler.display(change.doc);
            }
        });
    });

    // Add welcome card if user is onMobile (we don't show a message but rather
    // a card if they are)
    if (this.onMobile) {
        $('main #cards').prepend(this.renderWelcomeCard({
            title: 'Manage Accounts',
            subtitle: 'Create and edit user profiles',
            summary: 'Here, you can create and edit accounts for the tutors' +
                ' and pupils who submit paper application forms.',
        }));
    }
};


// Data flow function that returns an array of the current supervisor's proxy
// user's emails.
Tutorbook.prototype.getProxyUserEmails = function() {
    return firebase.firestore().collection('usersByEmail')
        .where('proxy', 'array-contains', this.user.email)
        .get().then((snapshot) => {
            var proxyEmails = [];
            snapshot.forEach((doc) => {
                proxyEmails.push(doc.id);
            });
            return proxyEmails;
        }).catch((err) => {
            console.error('Error while getting proxyEmails:', err);
            that.viewSnackbar('Could not get proxy user emails.');
        });
};


// Data flow function that returns a query for profile/account documents that 
// this supervisor has created that have not yet been claimed by their users.
Tutorbook.prototype.getAccountData = function() {
    return firebase.firestore().collection('usersByEmail')
        .where('proxy', 'array-contains', this.user.email);
};


// Helper function that shows a confirmation dialog before attempting to delete
// a profile user document.
Tutorbook.prototype.deleteAccount = function(doc) {
    const profile = doc.data();
    var that = this;
    return this.viewConfirmationDialog('Delete Proxy Account?',
            'You are about to permanently delete ' + profile.name +
            '\'s account data. This action cannot be undone. Please ensure ' +
            'to check with your fellow supervisors before continuing.')
        .listen('MDCDialog:closing', (event) => {
            if (event.detail.action === 'yes') {
                return firebase.firestore().collection('usersByEmail').doc(doc.id)
                    .delete().then(() => {
                        that.viewSnackbar('Deleted account.');
                    }).catch((err) => {
                        that.viewSnackbar('Could not delete account.' +
                            ' Please ensure you have proper credentials.');
                        console.error('Error while deleting proxy account:', err);
                    });
            }
        });
};


// Render function that returns an account card with a clickListener that opens
// a profile view for that account and enables the supervisor to edit it.
Tutorbook.prototype.renderAccountCard = function(doc) {
    const profile = doc.data();
    const title = (profile.type === 'Tutor') ? 'Tutor Account' :
        (profile.type === 'Pupil') ? 'Pupil Account' : 'Proxy Account';
    const subtitle = 'Proxy account for ' + profile.name;
    const summary = 'You created a proxy ' +
        (!!profile.type ? profile.type.toLowerCase() : '') +
        ' account for ' + profile.email + '. Tap to view or edit ' +
        this.getGenderPronoun(profile.gender) + ' profile.';
    var that = this;
    const card = this.renderCard(
        doc.id,
        profile,
        'proxyAccount',
        title,
        subtitle,
        summary, {
            delete: () => {
                that.deleteAccount(doc);
            },
            edit: () => {
                that.viewEditAccountDialog(doc);
            },
            primary: () => {
                that.viewEditAccountDialog(doc);
            },
        },
    );

    card.querySelector('.mdc-card__actions').removeChild(
        card.querySelector('.mdc-card__actions [data-fir-click="dismiss"]')
    );
    card.setAttribute('class', 'account-card ' + card.getAttribute('class'));
    card.setAttribute('id', 'doc-' + doc.id);
    card.querySelectorAll('button').forEach((el) => {
        MDCRipple.attachTo(el);
    });
    return card;
};




// ============================================================================
// EDIT/VIEW PROXY ACCOUNT DIALOGS
// ============================================================================


// View function that is essientially the same as the viewEditAccountDialog
// except that we add a slightly different data manager here to actually create
// that account instead of just editing it.
Tutorbook.prototype.viewNewAccountDialog = function() {
    const profile = this.data.emptyProfile;
    try {
        profile.proxy.push(this.user.email);
    } catch (e) {
        profile.proxy = [this.user.email];
    }
    const profileView = this.renderNewAccountDialog(profile);
    const profileHeader = this.renderHeader('header-action', {
        title: 'New Account',
        // Adding an empty ok function ensures that the button shows up in the
        // top app bar and that we don't get a data-fir-click error.
        ok: () => { // The actual clickListener is added with the dataManager.
        },
        cancel: () => {
            this.back();
        },
    });
    this.view(profileHeader, profileView);
    this.currentAccountMap = profile;
    this.addNewAccountManager();
};


// Render function that is almost the same as the renderProfile function except
// that we have inputs for email, name, and photoURL instead of a user header.
Tutorbook.prototype.renderNewAccountDialog = function(profile) {
    const dialog = this.renderProfile(profile);
    const inputs = this.renderTemplate('input-wrapper');
    inputs.appendChild(this.renderListDivider('Basic info'));
    inputs.appendChild(this.renderTextFieldItem('Name', profile.name));

    dialog.replaceChild(
        inputs,
        dialog.querySelector('.profile-header')
    );

    return dialog;
};


// View function that proxies to the renderProfile function but adds a different
// data manager that updates that profile document instead of the currentUser's.
Tutorbook.prototype.viewEditAccountDialog = function(doc) {
    const profile = doc.data();
    const profileView = this.renderProfile(profile);
    const profileHeader = this.renderHeader('header-action', {
        title: 'Edit Account',
        // Adding an empty ok function ensures that the button shows up in the
        // top app bar and that we don't get a data-fir-click error.
        ok: () => { // The actual clickListener is added with the dataManager.
        },
        cancel: () => {
            this.back();
        },
    });
    this.view(profileHeader, profileView);
    this.currentAccountDoc = doc;
    this.addUpdateAccountManager();
};


// Data manager function that adds listeners to all the profile inputs and
// updates the given user document when the user hits the check button.
Tutorbook.prototype.addUpdateAccountManager = function() {
    const doc = this.currentAccountDoc;
    const profile = doc.data();
    const profileView = document.querySelector('main .profile');

    var that = this;

    // ABOUT YOU (bio text field, type select, gender select, grade select)
    const bioEl = profileView.querySelector('#Bio');
    const bioTextField = MDCTextField.attachTo(bioEl);

    const typeEl = profileView.querySelector('#Type');
    if (!!profile.type && profile.type !== '') {
        const typeTextField = MDCTextField.attachTo(typeEl);
        this.disableInput(typeEl);
    } else {
        const typeSelect = this.attachSelect(typeEl);
        typeSelect.listen('MDCSelect:change', function() {
            profile.type = typeSelect.value;
        });
    }

    const genderEl = profileView.querySelector('#Gender');
    const genderSelect = this.attachSelect(genderEl);
    genderSelect.listen('MDCSelect:change', function() {
        profile.gender = genderSelect.value;
    });

    const gradeEl = profileView.querySelector('#Grade');
    const gradeSelect = this.attachSelect(gradeEl);
    gradeSelect.listen('MDCSelect:change', function() {
        profile.grade = gradeSelect.value;
    });

    // CONTACT INFO (phone text field, email text field)
    const phoneEl = profileView.querySelector('#Phone');
    const phoneTextField = MDCTextField.attachTo(phoneEl);

    const emailEl = profileView.querySelector('#Email');
    const emailTextField = MDCTextField.attachTo(emailEl);
    this.disableInput(emailEl);

    // TUTOR/PUPIL FOR (subject selects)
    this.subjectTextFields = [];
    profileView.querySelectorAll('#Subject').forEach((subjectEl) => {
        var subjectTextField = MDCTextField.attachTo(subjectEl);
        subjectEl.addEventListener('click', () => {
            that.viewSubjectSelectDialog(subjectTextField, subjectEl);
        });
        that.subjectTextFields.push(subjectTextField);
    });

    // AVAILABILITY (time, day, and location selects)
    this.availabilityTextFields = [];
    profileView.querySelectorAll('#Available').forEach((el) => {
        // TODO: Disable these text fields in some way so that they don't allow
        // keyboard input.
        const textField = MDCTextField.attachTo(el);
        el.addEventListener('click', () => {
            that.viewEditAvailabilityDialog(textField);
        });
        this.availabilityTextFields.push(textField);
    });


    function updateUser() {
        profile.bio = bioTextField.value || "";
        profile.phone = phoneTextField.value || "";

        // Read in all current subject select values
        profile.subjects = [];
        that.subjectTextFields.forEach((textField) => {
            if (that.data.subjects.indexOf(textField.value) >= 0) {
                profile.subjects.push(textField.value);
            }
        });

        // Update the user's profile to match all existing values
        profile.availability = that.getAvailability();

        // If the profile is populated, dismiss the setupProfileCard
        profile.cards.setupProfile = !that.userProfile(profile);

        return firebase.firestore().collection('usersByEmail').doc(doc.id)
            .update(profile).then(() => {
                that.viewSnackbar('Account updated.');
            }).catch((err) => {
                that.viewSnackbar('Could not update account.' +
                    ' Please ensure you have proper credentials.');
                console.error('Error while updating proxy account:', err);
            });
    };

    // Update user document only when app bar is clicked
    document.querySelector('.header #ok').addEventListener('click', () => {
        that.back();
        updateUser();
    });
};


// Data manager function that adds listeners to all the profile inputs and
// creates the given user document when the user hits the check button.
Tutorbook.prototype.addNewAccountManager = function() {
    const profile = this.cloneMap(this.currentAccountMap);
    const profileView = document.querySelector('main .profile');

    var that = this;

    // BASIC INFO (name and photo)
    const nameEl = profileView.querySelector('#Name');
    const nameTextField = MDCTextField.attachTo(nameEl);

    // ABOUT YOU (bio text field, type select, gender select, grade select)
    const bioEl = profileView.querySelector('#Bio');
    const bioTextField = MDCTextField.attachTo(bioEl);

    const userDivider = profileView.querySelector('[id="User for"] h4 span');
    const typeEl = profileView.querySelector('#Type');
    if (!!profile.type && profile.type !== '') {
        const typeTextField = MDCTextField.attachTo(typeEl);
        this.disableInput(typeEl);
    } else {
        const typeSelect = this.attachSelect(typeEl);
        typeSelect.listen('MDCSelect:change', function() {
            profile.type = typeSelect.value;
            userDivider.innerText = profile.type + ' for';
        });
    }

    const genderEl = profileView.querySelector('#Gender');
    const genderSelect = this.attachSelect(genderEl);
    genderSelect.listen('MDCSelect:change', function() {
        profile.gender = genderSelect.value;
    });

    const gradeEl = profileView.querySelector('#Grade');
    const gradeSelect = this.attachSelect(gradeEl);
    gradeSelect.listen('MDCSelect:change', function() {
        profile.grade = gradeSelect.value;
    });

    // CONTACT INFO (phone text field, email text field)
    const phoneEl = profileView.querySelector('#Phone');
    const phoneTextField = MDCTextField.attachTo(phoneEl);

    const emailEl = profileView.querySelector('#Email');
    const emailTextField = MDCTextField.attachTo(emailEl);

    // TUTOR/PUPIL FOR (subject selects)
    this.subjectTextFields = [];
    profileView.querySelectorAll('#Subject').forEach((subjectEl) => {
        var subjectTextField = MDCTextField.attachTo(subjectEl);
        subjectEl.addEventListener('click', () => {
            that.viewSubjectSelectDialog(subjectTextField, subjectEl);
        });
        that.subjectTextFields.push(subjectTextField);
    });

    // AVAILABILITY (time, day, and location selects)
    this.availabilityTextFields = [];
    profileView.querySelectorAll('#Available').forEach((el) => {
        // TODO: Disable these text fields in some way so that they don't allow
        // keyboard input.
        const textField = MDCTextField.attachTo(el);
        el.addEventListener('click', () => {
            that.viewEditAvailabilityDialog(textField);
        });
        that.availabilityTextFields.push(textField);
    });


    function newUser() {
        profile.bio = bioTextField.value || "";
        profile.phone = phoneTextField.value || "";
        profile.name = nameTextField.value || "";
        profile.email = emailTextField.value || "";
        switch (profile.gender) {
            case 'Male':
                profile.photo = 'https://tutorbook.app/app/img/male.png';
                break;
            case 'Female':
                profile.photo = 'https://tutorbook.app/app/img/female.png';
                break;
            default:
                profile.photo = 'https://tutorbook.app/app/img/male.png';
                break;
        }

        if (profile.email === '') {
            that.viewSnackbar('Please add a valid email address.');
            emailTextField.required = true;
            emailTextField.valid = false;
        } else if (profile.name === '') {
            that.viewSnackbar('Please add a valid username.');
            nameTextField.required = true;
            nameTextField.valid = false;
        }

        // Read in all current subject select values
        profile.subjects = [];
        that.subjectTextFields.forEach((textField) => {
            if (that.data.subjects.indexOf(textField.value) >= 0) {
                profile.subjects.push(textField.value);
            }
        });

        // Update the user's profile to match all existing values
        profile.availability = that.getAvailability();

        // If the profile is populated, dismiss the setupProfileCard
        profile.cards.setupProfile = !that.userProfile(profile);

        if (profile.type !== 'Supervisor') {
            profile.authenticated = true;
        }

        return firebase.firestore().collection('usersByEmail').doc(profile.email)
            .set(profile).then(() => {
                that.viewSnackbar('Account created.');
                that.back();
            }).catch((err) => {
                that.viewSnackbar('Could not create account that already exists. Try signing in as this person instead.');
                console.error('Error while updating proxy account:', err);
            });
    };

    // Update user document only when app bar is clicked
    document.querySelector('.header #ok').addEventListener('click', () => {
        newUser();
    });
};




// ============================================================================
// LOCATION MANAGEMENT VIEW (FOR SUPERVISORS)
// ============================================================================


// View function that enables supervisors to manage their locations
Tutorbook.prototype.viewLocationManager = function() {
    this.viewIntercom(false);
    history.pushState({}, null, '/app/locations');
    this.navSelected = 'Locations';
    var that = this;
    const locationsView = this.renderTemplate('location-manager', {
        // If the user is viewing on mobile, we don't want to show a welcome message
        welcome: !this.onMobile,
        new: () => {
            that.viewNewLocationDialog();
        },
    });
    const locationsHeader = this.renderHeader('header-main', {
        title: 'Locations'
    });
    this.view(locationsHeader, locationsView);

    ['.mdc-fab'].forEach((component) => {
        locationsView.querySelectorAll(component).forEach((el) => {
            MDCRipple.attachTo(el);
        });
    });

    this.viewLocationCards();
};


// View function that calls a data action function to get all the location docs
// that the currentUser is a supervisor of and then uses the locationsRecycler
// to render and append cards for each of those locations
Tutorbook.prototype.viewLocationCards = function() {
    var that = this;
    this.emptyCards();

    this.getLocationData().onSnapshot((snapshot) => {
        if (!snapshot.size) {
            return that.locationRecycler.empty();
        }

        snapshot.docChanges().forEach((change) => {
            if (change.type === 'removed') {
                that.locationRecycler.remove(change.doc);
            } else {
                that.locationRecycler.display(change.doc);
            }
        });
    });

    // Add welcome card if user is onMobile (we don't show a message but rather
    // a card if they are)
    if (this.onMobile) {
        $('main #cards').prepend(this.renderWelcomeCard({
            title: 'Manage Locations',
            subtitle: 'Create and update your locations',
            summary: 'Here, you can edit your existing locations and apply for the ' +
                'creation of new supervised locations.',
        }));
    }

};


// Data flow function that returns a query for a location docs that the
// currentUser is a supervisor of
Tutorbook.prototype.getLocationData = function() {
    return firebase.firestore().collection('locations')
        .where('supervisors', 'array-contains', this.user.email)
        .orderBy('timestamp', 'desc')
        .limit(50);
};


// Data flow function that grabs the location doc with the given id
Tutorbook.prototype.getLocationsByName = function(name) {
    return firebase.firestore().collection('locations')
        .where('name', '==', name)
        .get();
};


// Data flow function that grabs the location doc with the given id
Tutorbook.prototype.getLocation = function(id) {
    return firebase.firestore().collection('locations').doc(id).get();
};




// ============================================================================
// NEW & EDIT LOCATION DIALOGS
// ============================================================================


// Render function that appends an empty hour input item to the input-wrapper
Tutorbook.prototype.addHourInputItem = function() {
    var that = this;
    const wrapper = document.querySelector('#Hours-Wrapper');

    var dayEl = that.renderSelect('Day', '', that.data.days);
    var hourEl = that.renderHourInput();

    var hourInputs = [];
    hourInputs.push({
        day: dayEl,
        hour: hourEl,
    });

    var daySelect = this.attachSelect(dayEl);
    daySelect.listen('MDCSelect:change', () => {
        that.updateLocationHours();
    });

    var hourInput = this.attachHourInput(hourEl);

    this.hourInputs.push({
        day: daySelect,
        hour: hourInput,
    });

    const listItems = this.renderHourInputListItems(hourInputs);
    listItems.forEach((el) => {
        wrapper.appendChild(el);
    });
};


// Helper function to remove an hour input item
Tutorbook.prototype.removeHourInputItem = function() {
    const wrapper = document.querySelector('#Hours-Wrapper');
    const el = wrapper.lastElementChild;
    wrapper.removeChild(el);
    this.hourInputs.pop();
};


// View function that renders the same input dialog as the editLocationDialog but
// adds a different data manager to create a new location request (that must be
// approved by me before it becomes an official location).
Tutorbook.prototype.viewNewLocationDialog = function(subject, user) {
    // First, pre-fill as many options as possible (e.g. if the given user only
    // has one availableLocation, set that as the newLocation location.
    var location = {
        'name': '',
        'city': '', // TODO: Set this to the city closest to the user's
        // currentLocation.
        'hours': {},
        // NOTE: Hours of locations are stored in the Firestore database as:
        // hours: {
        //   Friday: [
        //     { open: '10:00 AM', close: '12:00 PM' },
        //     { open: '2:00 PM', close: '5:00 PM' },
        //   ]
        // }
        'description': '',
        'supervisors': [this.user.email], // We assume that the user creating
        // the new location will want to be a supervisor of it.
        'timestamp': new Date(),
    };

    // Then, render and view the editLocationDialog and header	
    const newLocationHeader = this.renderHeader('header-action', {
        title: 'New Location',
        // Adding an empty ok function ensures that the button shows up in the
        // top app bar and that we don't get a data-fir-click error.
        ok: () => { // The actual clickListener is added with the dataManager.
        },
        cancel: () => {
            this.back();
        },
    });
    const newLocationView = this.renderEditLocationDialog(location, user);
    this.view(newLocationHeader, newLocationView);
    this.currentLocation = this.filterLocationData(location);
    this.addNewLocationManager();
};


// Data manager function that activates all of the MDC inputs in the new
// location dialog.
Tutorbook.prototype.addNewLocationManager = function() {
    var that = this;

    const dialog = document.querySelector('.main .dialog-input');
    var location = this.currentLocation;

    // BASIC INFO
    const nameEl = dialog.querySelector('#Name');
    const nameTextField = MDCTextField.attachTo(nameEl);

    const cityEl = dialog.querySelector('#City');
    const citySelect = this.attachSelect(cityEl);
    citySelect.listen('MDCSelect:change', function() {
        location.city = citySelect.value;
    });

    const descriptionEl = dialog.querySelector('#Description');
    const descriptionTextField = MDCTextField.attachTo(descriptionEl);

    // HOURS
    this.hourInputs = [];
    dialog.querySelectorAll('#Hours-Wrapper .input-list-item').forEach((el) => {
        var dayEl = el.querySelector('#Day');
        var daySelect = this.attachSelect(dayEl);
        daySelect.listen('MDCSelect:change', () => {
            that.updateLocationHours();
        });

        // NOTE: hourInputs are just textFields that open a dialog when clicked
        var hourEl = el.querySelector('#Open');
        var hourInput = this.attachHourInput(hourEl);

        that.hourInputs.push({
            day: daySelect,
            hour: hourInput
        });
    });

    // SUPERVISORS
    var supervisorTextFields = [];
    dialog.querySelectorAll('#Supervisor').forEach((el) => {
        var supervisorTextField = MDCTextField.attachTo(el);
        supervisorTextFields.push(supervisorTextField);
    });

    function updateTextData() {
        location.name = nameTextField.value;
        location.description = descriptionTextField.value;
        location.supervisors = [];
        supervisorTextFields.forEach((textField) => {
            if (textField.value !== '') {
                location.supervisors.push(textField.value);
            }
        });
    };

    function newLocation() {
        that.updateLocationHours();
        that.back();
        updateTextData();
        that.newLocation(
            that.filterLocationData(location)
        ).then(() => {
            that.initLocationData();
            that.viewSnackbar('Location created.');
        }).catch((err) => {
            that.viewSnackbar('Could not create location.');
        });
    };

    // Only update request when the check button is clicked
    document.querySelector('.header #ok').addEventListener('click', () => {
        newLocation();
    });
};


Tutorbook.prototype.updateLocationHours = function() {
    var hourInputs = this.hourInputs;
    var location = this.currentLocation;
    var that = this;
    // NOTE: Hours of locations are stored in the Firestore database as:
    // hours: {
    //   Friday: [
    //     { open: '10:00 AM', close: '12:00 PM' },
    //     { open: '2:00 PM', close: '5:00 PM' },
    //   ]
    // }
    // First, get all of the set days
    for (var i = 0; i < hourInputs.length; i++) {
        var inputs = hourInputs[i];
        // Throw an error if the day el is populated but the open is empty
        // and vice versa
        function isEmpty(value) {
            return value === '' || value === undefined || value === null;
        };

        function isNotEmpty(value) {
            return value !== '' && value !== undefined && value !== null;
        };
        if (isEmpty(inputs.day.value) && isNotEmpty(inputs.hour.value)) {
            inputs.day.required = true;
            that.viewSnackbar('Please add a valid day.');
            throw new Error('Please add a valid day.');
            return;
        } else if (isEmpty(inputs.hour.value) && isNotEmpty(inputs.day.value)) {
            inputs.hour.required = true;
            that.viewSnackbar('Please add valid hours for ' + inputs.day.value + '.');
            throw new Error('Please add a valid time.');
            return;
        } else {
            inputs.hour.valid = true;
            inputs.day.valid = true;
        }

        // Empty the existing values
        if (inputs.day.value !== '') {
            location.hours[inputs.day.value] = [];
        }
    }

    hourInputs.forEach((inputs) => {
        const hourInput = inputs.hour;
        const daySelect = inputs.day;
        // NOTE: Time is formatted like '10:00 AM to 2:00 PM'
        const timeString = hourInput.value;
        const split = timeString.split(' ');
        const openTime = split[0] + ' ' + split[1];
        const closeTime = split[3] + ' ' + split[4];

        // Push the final time map to hours on that day
        if (daySelect.value !== '' && timeString !== '') {
            location.hours[daySelect.value].push({
                open: openTime,
                close: closeTime
            });
        }
    });
    this.log('Updated hours:', location.hours);
};


// Render function that returns all the input elements necessary to create 
// and/or edit a location document
Tutorbook.prototype.viewEditLocationDialog = function(location) {
    /*
     *history.pushState({}, null, '/app/locations/' + location.id + '?d=edit');
     */
    // NOTE: This function needs the request data passed into it to include
    // the ID so that the addUpdateLocationManager will be able to update 
    // the corresponding Firestore document correctly.
    const editLocationHeader = this.renderHeader('header-action', {
        title: 'Edit Location',
        // Adding an empty ok function ensures that the button shows up in the
        // top app bar and that we don't get a data-fir-click error.
        ok: () => { // The actual clickListener is added with the dataManager.
        },
        cancel: () => {
            this.back();
        },
    });
    const editLocationView = this.renderEditLocationDialog(location);
    this.view(editLocationHeader, editLocationView);
    this.currentLocation = location;
    this.addUpdateLocationManager();
};


// View function that opens a time select dialog that allows the user to either
// select a specific time w/ a clock input or a specialty time (e.g. B Period)
// w/ a MDC Select. This then updates the currentLocation's times with this time
// select's values.
Tutorbook.prototype.viewSetLocationHoursDialog = function(timeString, input) {
    const dialogEl = this.renderSetLocationHoursDialog(timeString);
    const dialog = MDCDialog.attachTo(dialogEl);
    dialog.autoStackButtons = false;
    var that = this;

    dialog.open();

    const openSelect = this.attachSelect(dialogEl.querySelector('#Open'));
    const closeSelect = this.attachSelect(dialogEl.querySelector('#Close'));

    dialogEl.querySelector('#ok-button').addEventListener('click', () => {
        // First, parse dialog input into a formatted string.
        const newTimeString = openSelect.value + ' to ' + closeSelect.value;
        // Then, replace the original input el's value with that new
        // formatted string.
        input.value = newTimeString;
        dialog.close();
    });
};


// Render function that returns a time select dialog that allows the user to 
// either select a specific time w/ a clock input or a specialty time (e.g. B 
// Period) w/ a MDC Select.
Tutorbook.prototype.renderSetLocationHoursDialog = function(timeString) {
    // NOTE: Time is formatted like '10:00 AM to 2:00 PM'
    const split = timeString.split(' ');
    const openTime = split[0] + ' ' + split[1];
    const closeTime = split[3] + ' ' + split[4];
    $('#dialog-form .mdc-dialog__title').text('Set Hours');

    // Most of the actual items are rendered here and appending to the dialog
    const times = this.data.periods.concat(this.data.timeStrings);
    const openEl = this.renderSelect(
        'Open',
        openTime,
        times
    );
    var that = this;

    const closeEl = this.renderSelect(
        'Close',
        closeTime,
        times
    );

    const content = this.renderTemplate('input-wrapper');
    content.appendChild(this.renderInputListItem(openEl));
    content.appendChild(this.renderInputListItem(closeEl));

    $('#dialog-form .mdc-dialog__content').empty().append(content);

    return document.querySelector('#dialog-form');
};


// Data manager helper function that inits MDC Components and adds event
// listeners to update the given location when those components's values change
Tutorbook.prototype.addUpdateLocationManager = function() {
    var that = this;

    const dialog = document.querySelector('.main .dialog-input');
    var location = this.currentLocation;

    // BASIC INFO
    const nameEl = dialog.querySelector('#Name');
    const nameTextField = MDCTextField.attachTo(nameEl);

    const cityEl = dialog.querySelector('#City');
    const citySelect = this.attachSelect(cityEl);
    citySelect.listen('MDCSelect:change', function() {
        location.city = citySelect.value;
    });

    const descriptionEl = dialog.querySelector('#Description');
    const descriptionTextField = MDCTextField.attachTo(descriptionEl);

    // HOURS
    this.hourInputs = [];
    dialog.querySelectorAll('#Hours-Wrapper .input-list-item').forEach((el) => {
        var dayEl = el.querySelector('#Day');
        var daySelect = this.attachSelect(dayEl);
        daySelect.listen('MDCSelect:change', () => {
            that.updateLocationHours();
        });

        // NOTE: hourInputs are just textFields that open a dialog when clicked
        var hourEl = el.querySelector('#Open');
        var hourInput = this.attachHourInput(hourEl);

        this.hourInputs.push({
            day: daySelect,
            hour: hourInput
        });
    });

    // SUPERVISORS
    var supervisorTextFields = [];
    dialog.querySelectorAll('#Supervisor').forEach((el) => {
        var supervisorTextField = MDCTextField.attachTo(el);
        supervisorTextFields.push(supervisorTextField);
    });

    function updateTextData() {
        location.name = nameTextField.value;
        location.description = descriptionTextField.value;
        location.supervisors = [];
        supervisorTextFields.forEach((textField) => {
            if (textField.value !== '') {
                location.supervisors.push(textField.value);
            }
        });
    };

    function updateLocation() {
        that.updateLocationHours();
        that.back();
        updateTextData();
        that.updateLocation(
            that.filterLocationData(location),
            location.id
        ).then(() => {
            that.initLocationData();
            that.viewSnackbar('Location updated.');
        });
    };

    // Only update request when the check button is clicked
    document.querySelector('.header #ok').addEventListener('click', () => {
        updateLocation();
    });
};


// Helper function to attach a MDC Select to the hour input such that:
// 1) The animations and outline still work but
// 2) The select does not open a menu when activated but rather opens a set time
// dialog.
// 3) This function waits until the dialog is closed and then sets the MDC 
// Select value to the final hours as a { open: '10:00 AM', close: '12:00 PM' }
// map
Tutorbook.prototype.attachHourInput = function(el) {
    el.addEventListener('click', () => {
        this.viewSetLocationHoursDialog(textField.value, textField);
    });
    const textField = MDCTextField.attachTo(el);
    return textField;
};


// Render function that returns all the input elements necessary to create 
// and/or edit a location document
Tutorbook.prototype.renderEditLocationDialog = function(location) {
    const mainEl = this.renderTemplate('dialog-input');

    // Ensure that inputs are appended in correct order w/ list dividers
    mainEl.appendChild(this.renderListDivider('Basic info'));
    mainEl.appendChild(
        this.renderInputListItem(
            this.renderTextField('Name', location.name)
        )
    );
    mainEl.appendChild(
        this.renderInputListItem(
            this.renderSelect('City', location.city, this.data.cities)
        )
    );
    mainEl.appendChild(
        this.renderTextAreaItem('Description', location.description)
    );

    var that = this;
    mainEl.appendChild(this.renderActionListDivider('Hours', {
        add: () => {
            that.addHourInputItem();
        },
        remove: () => {
            that.removeHourInputItem();
        },
    }));
    mainEl.appendChild(this.renderHourInputsItem(location.hours));

    mainEl.appendChild(this.renderListDivider('Supervisors'));
    mainEl.appendChild(this.renderSupervisorTextFieldsItem(location.supervisors));

    return mainEl;
};


// Render function to return a div wrapper with all supervisor textField list 
// items.
Tutorbook.prototype.renderSupervisorTextFieldDialogItem = function(textFields) {
    var listItems = [];
    textFields.forEach((el) => {
        var listItem = this.renderTemplate('input-list-item');
        listItem.appendChild(el);
        listItems.push(listItem);
    });
    const wrapper = this.renderTemplate('input-wrapper');
    wrapper.setAttribute('id', 'Supervisors');

    listItems.forEach((el) => {
        wrapper.appendChild(el);
    });
    return wrapper;
};


// Render function that takes in an array of hourInput maps and returns an
// array of hourInput list items.
Tutorbook.prototype.renderHourInputListItems = function(hourInputMaps) {
    // NOTE: hourInputMaps looks like this:
    // hourInputMaps = [
    //   { hour: <hourInputEl>, day: <daySelectEl> },
    //   { hour: <hourInputEl>, day: <daySelectEl> },
    // ];
    var listItems = [];
    hourInputMaps.forEach((map) => {
        // NOTE: renderSplitListItem just appends them together such that each
        // input is allotted 50% of available screen space.
        listItems.push(this.renderSplitListItem(map.day, map.hour));
    });
    return listItems;
};


// Render function that returns an interactive location card
Tutorbook.prototype.renderLocationCard = function(doc) {
    var that = this;

    function getTodaysHours(hours) {
        // NOTE: Hours of locations are stored in the Firestore database as:
        // hours: {
        //   Friday: [
        //     { open: '10:00 AM', close: '12:00 PM' },
        //     { open: '2:00 PM', close: '5:00 PM' },
        //   ]
        // }
        var result = [];
        Object.entries(hours).forEach((entry) => {
            const day = entry[0];
            const hours = entry[1];

            if (day === that.data.days[new Date().getDay()]) {
                // TODO: Push every hour from the open time up to the closing
                // time for that day to result.
                hours.forEach((hour) => {
                    result.push(hour.open);
                });
            }

        });

        return result;
    };
    /*
     *
     *    var cardData = this.cloneMap(doc.data());
     *    cardData['todays-hours'] = getTodaysHours(cardData.hours);
     *    cardData['edit'] = () => {
     *        this.viewEditLocationDialog(this.combineMaps(doc.data(), {
     *            id: doc.id
     *        }));
     *    };
     *    cardData['delete'] = () => {
     *        return that.viewConfirmationDialog('Permanently Delete Location?', 'You are about to permanently delete ' +
     *                'the ' + cardData.name + ' from app data. This action cannot be undone.' +
     *                ' Please ensure to check with your fellow supervisors before continuing.')
     *            .listen('MDCDialog:closing', (event) => {
     *                if (event.detail.action === 'yes') {
     *                    return firebase.firestore().collection('locations').doc(doc.id).delete().then(() => {
     *                        that.viewSnackbar('Deleted location.');
     *                    }).catch((err) => {
     *                        that.viewSnackbar('Could not delete location.');
     *                        console.error('Error while deleting location:', err);
     *                    });
     *                }
     *            });
     *    };
     *    cardData['schedule'] = () => {
     *        that.log('TODO: Implement appointment schedule and history');
     *    };
     *    const card = this.renderTemplate('card-location', cardData);
     *    card
     *        .querySelectorAll('.mdc-button, .mdc-card__primary-action, .mdc-icon-button')
     *        .forEach((el) => {
     *            MDCRipple.attachTo(el);
     *        });
     */

    const card = this.renderCard(doc.id, doc.data(), 'location', doc.data().name,
        doc.data().city || 'Tap edit to add city', doc.data().description ||
        'Click the edit button to add a description.', {
            primary: () => {
                that.viewEditLocationDialog(that.combineMaps(doc.data(), {
                    id: doc.id
                }));
            },
            delete: () => {
                return that.viewConfirmationDialog('Permanently Delete Location?', 'You are about to permanently delete ' +
                        'the ' + doc.data().name + ' from app data. This action cannot be undone.' +
                        ' Please ensure to check with your fellow supervisors before continuing.')
                    .listen('MDCDialog:closing', (event) => {
                        if (event.detail.action === 'yes') {
                            return firebase.firestore().collection('locations').doc(doc.id).delete().then(() => {
                                that.viewSnackbar('Deleted location.');
                            }).catch((err) => {
                                that.viewSnackbar('Could not delete location.');
                                console.error('Error while deleting location:', err);
                            });
                        }
                    });
            },
            edit: () => {
                that.viewEditLocationDialog(that.combineMaps(doc.data(), {
                    id: doc.id
                }));
            },
        });

    // Setting the id allows to locating the individual user card
    card.setAttribute('id', 'doc-' + doc.id);
    card.setAttribute('timestamp', doc.data().timestamp);
    card.setAttribute('class', 'location-card ' + card.getAttribute('class'));
    var dismissButton = card.querySelector('[data-fir-click="dismiss"]');
    card.querySelector('.mdc-card__actions').removeChild(dismissButton);

    return card;
};




// ============================================================================
// SUBJECT SELECT DIALOG
// ============================================================================


// View function that shows a subject select dialog that changes the value of
// the given textField
Tutorbook.prototype.viewSubjectSelectDialog = function(textField, textFieldEl) {
    const dialogEl = this.renderSubjectSelectDialog();
    const pages = dialogEl.querySelectorAll('.page');
    const dialog = MDCDialog.attachTo(dialogEl);

    var that = this;

    function displaySection(id) {
        pages.forEach(function(sel) {
            if (sel.id === id) {
                sel.style.display = 'inherit';
            } else {
                sel.style.display = 'none';
            }
            dialog.layout();
        });
    };

    dialogEl.querySelectorAll('#page-all .mdc-list-item').forEach(function(el) {
        el.addEventListener('click', function() {
            var id = el.id.split('-').slice(1).join('-');
            displaySection(id);
        });
    });

    pages.forEach(function(sel) {
        var key = sel.id.split('-')[1];
        if (key === 'all') {
            return;
        }

        sel.querySelectorAll('.mdc-list-item').forEach(function(el) {
            el.addEventListener('click', function() {
                textField.value = el.innerText.trim();
                // Read in all current subject select values
                that.user.subjects = [];
                that.subjectTextFields.forEach((textField) => {
                    if (that.data.subjects.indexOf(textField.value) >= 0) {
                        that.user.subjects.push(textField.value);
                    }
                });
                if (location.toString().endsWith('profile')) {
                    that.updateUser().then(() => {
                        that.viewSnackbar('Subjects updated.');
                    });
                }
                dialog.close();
            });
        });
    });

    displaySection('page-all');
    dialogEl.querySelectorAll('.back').forEach(function(el) {
        el.addEventListener('click', function() {
            displaySection('page-all');
        });
    });

    dialog.autoStackButtons = false;
    dialog.listen('MDCDialog:closing', (event) => {
        if (event.detail.action === 'close') {
            // TODO: Ensure that this actually unfocuses on the current subject
            // textField as we don't want the user to be able to input any
            // random text value.
            that.log('Closing dialog and unfocusing on the textFieldEl.');
            return textFieldEl.blur();
        }
        if (location.toString().endsWith('profile')) {
            that.updateUser().then(() => {
                that.viewSnackbar('Subjects updated.');
            }).catch((err) => {
                that.viewSnackbar('Could not update subjects.');
                console.error('Error while updating subjects:', err);
            });
        }
    });
    dialogEl.querySelectorAll('.mdc-list-item').forEach((el) => {
        MDCRipple.attachTo(el);
    });

    return dialog.open();
};


// Render function that sets up the subject select dialogEl
Tutorbook.prototype.renderSubjectSelectDialog = function() {
    const dialogEl = document.querySelector('#dialog-subjects');
    const pages = dialogEl.querySelectorAll('.page');

    var that = this;
    this.replaceElement(
        dialogEl.querySelector('#math-list'),
        this.renderTemplate('dialog-filter-item-list', {
            items: this.data.mathSubjects
        })
    );

    this.replaceElement(
        dialogEl.querySelector('#science-list'),
        this.renderTemplate('dialog-filter-item-list', {
            items: this.data.scienceSubjects
        })
    );

    this.replaceElement(
        dialogEl.querySelector('#history-list'),
        this.renderTemplate('dialog-filter-item-list', {
            items: this.data.historySubjects
        })
    );

    this.replaceElement(
        dialogEl.querySelector('#language-list'),
        this.renderTemplate('dialog-filter-item-list', {
            items: this.data.languageSubjects
        })
    );

    this.replaceElement(
        dialogEl.querySelector('#english-list'),
        this.renderTemplate('dialog-filter-item-list', {
            items: this.data.englishSubjects
        })
    );

    this.replaceElement(
        dialogEl.querySelector('#life-skills-list'),
        this.renderTemplate('dialog-filter-item-list', {
            items: this.data.lifeSkills
        })
    );

    return dialogEl;
};




// ============================================================================
// CHILDREN MANAGEMENT VIEW
// ============================================================================


Tutorbook.prototype.deleteChild = function(doc) {
    const that = this;
    return that.viewConfirmationDialog('Delete Child?', 'Are you sure you want to permanently delete this ' +
            'child\'s profile? Doing so will cancel all appointents and lesson requests made for this child. This action cannot be undone.')
        .listen('MDCDialog:closing', async (event) => {
            if (event.detail.action === 'yes') {
                $('#card-children-' + doc.data().uid).remove();
                return firebase.firestore().collection('usersByEmail').doc(doc.id)
                    .delete().then(() => {
                        that.viewSnackbar('Deleted account.');
                    }).catch((err) => {
                        that.viewSnackbar('Could not delete account.' +
                            ' Please ensure you have proper credentials.');
                        console.error('Error while deleting proxy account:', err);
                    });
            }
        });
};


// Almost the same as the newProxyRequestDialog except that instead of a dialog
// asking you to select a proxy user, you select the proxy user within the
// dialog itself (a select right before the Subject select box).
Tutorbook.prototype.viewNewChildRequestDialog = async function(subject, user) {
    var that = this;
    const childUser = this.user.children.data[0];
    var request = {
        'subject': subject,
        'fromUser': that.filterRequestUserData(childUser),
        'toUser': that.filterRequestUserData(user),
        'timestamp': new Date(),
        'location': {
            name: '',
            id: '',
        },
        'message': '',
        'time': {
            day: '',
            from: '',
            to: '',
        },
        'payment': {
            type: user.payments.type,
            method: 'PayPal',
            amount: 0,
        },
    };
    const locations = that.getUserAvailableLocations(user.availability);
    const times = that.getUserAvailableTimes(user.availability);
    const days = that.getUserAvailableDays(user.availability);
    if (locations.length === 1) {
        request.location.name = locations[0];
        that.getLocationsByName(request.location.name).then((snapshot) => {
            snapshot.forEach((doc) => {
                request.location.id = doc.id;
            });
        });
    }
    if (times.length === 1) {
        request.time.from = times[0];
        request.time.to = times[0];
    }
    if (days.length === 1) {
        request.time.day = days[0];
    }

    // If there are only no options, make sure to tell the user so they don't
    // think that it's a bug (that the only select options are the ones that
    // were already selected).
    if (locations.length < 1 && days.length < 1 && times.length < 1) {
        that.viewSnackbar(user.name + ' does not have any availability.');
        return;
    }

    // Then, render and view the editRequestDialog and header	
    const newRequestHeader = that.renderHeader('header-action', {
        title: 'New Request',
        // Adding an empty ok function ensures that the button shows up in the
        // top app bar and that we don't get a data-fir-click error.
        send: () => { // The actual clickListener is added with the dataManager.
        },
        cancel: () => {
            that.back();
        },
    });
    const newRequestView = await this.renderNewChildRequestDialog(request, user);
    this.view(newRequestHeader, newRequestView);
    this.currentRequest = this.filterRequestData(request);
    this.addNewChildRequestManager();
};


// Function that inits child data
Tutorbook.prototype.initChildren = async function() {
    if (this.user.type === 'Parent') {
        const db = firebase.firestore();
        const children = await db.collection('usersByEmail')
            .where('proxy', 'array-contains', this.user.email)
            .get();
        this.user.children = {};
        this.user.children.names = [];
        this.user.children.data = [];
        this.user.children.emails = [];
        return children.forEach((child) => {
            this.user.children.names.push(child.data().name);
            this.user.children.emails.push(child.data().emails);
            this.user.children.data.push(child.data());
        });
    }
};


// Function that renders the newRequestDialog and adds a "Child" select option.
Tutorbook.prototype.renderNewChildRequestDialog = async function(request, toUser) {
    const dialog = this.renderNewRequestDialog(request, toUser);
    $(this.renderSelectItem(
        'Child',
        request.fromUser.name,
        this.user.children.names,
    )).insertBefore(dialog.querySelector('#Subject').parentNode);
    console.log('Rendered dialog:', dialog.innerHTML);
    return dialog;
};


// Function that adds the newRequestManager along with a listener that changes
// the fromUser of the request.
Tutorbook.prototype.addNewChildRequestManager = function() {
    this.addNewRequestManager();
    const userSelect = this.attachSelect($('.main #Child')[0]);
    userSelect.listen('MDCSelect:change', async () => {
        var user = this.user.children.data[
            this.user.children.names.indexOf(userSelect.value)
        ];
        this.currentRequest.fromUser = this.filterRequestUserData(user);
    });
};


// Function that opens up a profile view to create a new child
Tutorbook.prototype.addChild = function() {
    const profile = this.data.emptyProfile;
    profile.type = 'Pupil';
    try {
        profile.proxy.push(this.user.email);
    } catch (e) {
        profile.proxy = [this.user.email];
    }
    const profileView = this.renderNewAccountDialog(profile);
    const profileHeader = this.renderHeader('header-action', {
        title: 'New Child',
        // Adding an empty ok function ensures that the button shows up in the
        // top app bar and that we don't get a data-fir-click error.
        ok: () => { // The actual clickListener is added with the dataManager.
        },
        cancel: () => {
            this.back();
        },
    });
    this.view(profileHeader, profileView);
    this.currentAccountMap = profile;
    this.addNewAccountManager();
};


Tutorbook.prototype.editChild = function(doc) {
    const profile = doc.data();
    const profileView = this.renderProfile(profile);
    const profileHeader = this.renderHeader('header-action', {
        title: 'Edit Child',
        // Adding an empty ok function ensures that the button shows up in the
        // top app bar and that we don't get a data-fir-click error.
        ok: () => { // The actual clickListener is added with the dataManager.
        },
        cancel: () => {
            this.back();
        },
    });
    this.view(profileHeader, profileView);
    this.currentAccountDoc = doc;
    this.addUpdateAccountManager();
};


// View function that adds children cards to the dashboard view
Tutorbook.prototype.viewChildren = function() {
    const that = this;
    this.emptyChildren();
    this.getChildren().onSnapshot((snapshot) => {
        if (!snapshot.size) {
            return that.dashboardRecycler.empty('children');
        }

        snapshot.docChanges().forEach((change) => {
            if (change.type === 'removed') {
                that.dashboardRecycler.remove(change.doc, 'children');
            } else {
                that.dashboardRecycler.display(change.doc, 'children');
            }
        });
    });

    // Show the children's cards as well
    this.user.children.data.forEach((child) => {
        this.getDashboardSubcollections().forEach((subcollection) => {
            this.getChildSubcollectionData(subcollection, child).onSnapshot((snapshot) => {
                const type = subcollection + '-childNum' + this.user.children.data.indexOf(child);
                if (!snapshot.size) {
                    return that.dashboardRecycler.empty(type);
                }

                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'removed') {
                        that.dashboardRecycler.remove(change.doc, type);
                    } else {
                        that.dashboardRecycler.display(change.doc, type);
                    }
                });
            });
        });
    });
};


// Data flow function that returns a query for a certain user subcollection
Tutorbook.prototype.getChildSubcollectionData = function(subcollection, child) {
    return firebase.firestore()
        .collection('usersByEmail')
        .doc(child.email)
        .collection(subcollection)
        .limit(30);
};


// Gets all children
Tutorbook.prototype.getChildren = function() {
    const db = firebase.firestore();
    return db.collection('usersByEmail')
        .where('proxy', 'array-contains', this.user.email);
};


// Removes all children cards from the dashboard view
Tutorbook.prototype.emptyChildren = function() {
    return $('.main #cards .child').remove();
};




// ============================================================================
// PROFILE VIEW
// ============================================================================


// View function that opens a dialog to set a day, location, fromTime, and 
// toTime. It then replaces the textFieldVal with the correct new value.
Tutorbook.prototype.viewEditAvailabilityDialog = function(textField) {
    console.log('Viewing editAvailability dialog:', textField);
    // First, parse the val into the correct format
    var availableTime = this.parseAvailabilityString(textField.value, true);

    if (this.data.locations.length === 1) {
        availableTime.location = this.data.locations[0];
    }

    // Then, render a dialog with those values pre-filled and allow the user to
    // change them.
    return this.renderEditAvailabilityDialog(availableTime).then((dialogEl) => {
        const dialog = MDCDialog.attachTo(dialogEl);

        var that = this;

        // Show the default values and only rerender once the user chooses
        // a location. NOTE: We also have to rerender the timeSelects when
        // a day is chosen and we have to rerender the fromTimeSelect when
        // the toTimeSelect is chosen (as we don't want to be able to input
        // negative time) and vice versa.

        var daySelect = this.attachSelect(dialogEl.querySelector('#Day'));
        daySelect.listen('MDCSelect:change', function() {
            availableTime.day = daySelect.value;
            that.refreshTimeSelects(availableTime);
        });

        var toTimeSelect = this.attachSelect(dialogEl.querySelector('#To'));
        toTimeSelect.listen('MDCSelect:change', function() {
            availableTime.toTime = toTimeSelect.value;
        });

        var fromTimeSelect = this.attachSelect(
            dialogEl.querySelector('#From')
        );
        fromTimeSelect.listen('MDCSelect:change', function() {
            availableTime.fromTime = fromTimeSelect.value;
        });

        const locationSelect = this.attachSelect(
            dialogEl.querySelector('#Location')
        );
        locationSelect.listen('MDCSelect:change', function() {
            availableTime.location = locationSelect.value;
            // Now, contrain the other select menus to values that this location
            // has for available times.
            that.refreshDayAndTimeSelects(availableTime);
        });

        // Check to see if a location was selected. If there is a location
        // selected, make sure to only render those options that it's supervisor has
        // specified in their location management view.
        if (!!availableTime.location && availableTime.location !== '') {
            // Re-render all of the selects to match the selected location
            this.refreshDayAndTimeSelects(availableTime);

            if (!!availableTime.day && availableTime.day !== '') {
                // Re-render all fo the time selects to match the selected day
                this.refreshTimeSelects(availableTime);
            }
        }

        function invalid(select) {
            // TODO: Make the select styling actually work within this dialog
            that.viewSnackbar('Please select a valid availability.');
            select.required = true;
            select.valid = false;
        };

        function validTime(time) {
            console.log('Checking if time is valid:', time);
            var valid = true;
            if (time.location === '') {
                invalid(locationSelect);
                valid = false;
            }
            if (time.day === '') {
                invalid(daySelect);
                valid = false;
            }
            if (time.toTime === '') {
                invalid(toTimeSelect);
                valid = false;
            }
            if (time.fromTime === '') {
                invalid(fromTimeSelect);
                valid = false;
            }
            return valid;
        };

        // Replace the ok button to remove event listeners (so we don't get the
        // issue of opening an invalid availability snackbar).
        $(dialogEl.querySelector('#ok-button')).replaceWith(
            dialogEl.querySelector('#ok-button').cloneNode(true)
        );
        dialog.autoStackButtons = false;
        dialogEl.querySelector('#ok-button').addEventListener('click', () => {
            if (validTime(availableTime)) {
                // Update the textField value to match the new value
                textField.value = that.getAvailabilityString(availableTime);
                dialog.close();
            }
        });

        dialog.open();
    });
};


// Render function that returns a dialog that allows the user to change the
// location, day, fromTime, and toTime of a given availability textField.
Tutorbook.prototype.renderEditAvailabilityDialog = function(data) {
    return this.initLocationData().then(() => {
        const dialog = document.querySelector('#dialog-form')
        $('#dialog-form .mdc-dialog__title').text('Edit Availability');

        const dayEl = this.renderSelect('Day', data.day, this.data.days);
        const locationEl = this.renderSelect(
            'Location',
            data.location,
            this.data.locations
        );

        // NOTE: All of this changes once you add the data manager (as we want
        // to only show those times that are specified by the location supervisor)
        const times = this.data.periods.concat(this.data.timeStrings);
        const fromTimeEl = this.renderSelect(
            'From',
            data.fromTime,
            [data.fromTime].concat(times)
        );
        const toTimeEl = this.renderSelect(
            'To',
            data.toTime,
            [data.toTime].concat(times)
        );

        const content = this.renderTemplate('input-wrapper');
        content.appendChild(this.renderInputListItem(locationEl));
        content.appendChild(this.renderInputListItem(dayEl));
        content.appendChild(this.renderInputListItem(fromTimeEl));
        content.appendChild(this.renderInputListItem(toTimeEl));

        $('#dialog-form .mdc-dialog__content').empty().append(content);

        return dialog;
    });
};


// Helper function to read in and parse all of the populated availableTime
// MDC TextFields and to update the user's document with the correct data in the
// correct data structure.
Tutorbook.prototype.getAvailability = function() {
    const textFields = this.availabilityTextFields;
    // NOTE: Availability is stored in the Firestore database as:
    // availability: {
    //   Gunn Library: {
    //     Friday: [
    //       { open: '10:00 AM', close: '3:00 PM' },
    //       { open: '10:00 AM', close: '3:00 PM' },
    //     ],
    //   }
    //   ...
    // };
    // First, create an array of all the displayed availability strings
    var strings = [];
    textFields.forEach((field) => {
        if (field.value !== '') {
            strings.push(field.value);
        }
    });

    // Then, convert those strings into individual parsed maps
    var maps = [];
    strings.forEach((string) => {
        maps.push(this.parseAvailabilityString(string));
    });

    // Finally, parse those maps into one availability map
    var result = {};
    maps.forEach((map) => {
        result[map.location] = {};
    });
    maps.forEach((map) => {
        result[map.location][map.day] = [];
    });
    maps.forEach((map) => {
        result[map.location][map.day].push({
            open: map.fromTime,
            close: map.toTime,
        });
    });

    return result;
};


// View function that shows profile view
Tutorbook.prototype.viewProfile = async function() {
    history.pushState({}, null, '/app/profile');
    this.navSelected = 'Profile';
    this.viewIntercom(true);
    this.initUser(); // Ensure that service hours, etc. are up-to-date.
    const profileView = this.renderProfile(this.user);
    const profileHeader = this.renderHeader('header-main', {
        'title': 'Profile'
    });
    this.view(profileHeader, profileView);
    // NOTE: We have to attach MDC Components after the view is shown or they
    // do not render correctly.
    this.addProfileManager(profileView);
};


// Render function that renders the profile view with the given user's info
Tutorbook.prototype.renderProfile = function(profile) {
    const mainEl = this.renderTemplate('profile');

    // Ensure that inputs are appended in correct order w/ list dividers
    mainEl.appendChild(this.renderProfileHeader(profile));

    // ABOUT YOU
    // Type can be changed only once
    if (!!profile.type && profile.type !== '') {
        var typeEl = this.renderTextField('Type', profile.type);
    } else {
        var typeEl = this.renderSelect('Type', profile.type, this.data.types);
    }
    mainEl.appendChild(this.renderListDivider('About you'));
    if (this.user.type === 'Tutor' && this.user.payments.type === 'Paid') {
        mainEl.appendChild(this.renderSplitListItem(
            this.renderTextField('Hours tutored',
                this.getDurationStringFromSecs(this.user.secondsTutored || 0)
            ),
            typeEl,
        ));
        mainEl.appendChild(this.renderSplitListItem(
            this.renderSelect('Grade', profile.grade, this.data.grades),
            this.renderSelect('Gender', profile.gender, this.data.genders)
        ));
        mainEl.appendChild(
            this.renderTextAreaItem('Background and qualifications', profile.bio)
        );
    } else if (this.user.type === 'Tutor' && this.user.payments.type === 'Free') {
        mainEl.appendChild(this.renderSplitListItem(
            this.renderTextField('Bio', profile.bio),
            typeEl,
        ));
        mainEl.appendChild(this.renderSplitListItem(
            this.renderSelect('Grade', profile.grade, this.data.grades),
            this.renderSelect('Gender', profile.gender, this.data.genders)
        ));
        mainEl.appendChild(this.renderTextFieldItem('Service hours',
            this.getDurationStringFromSecs(this.user.secondsTutored || 0)
        ));
    } else {
        mainEl.appendChild(this.renderSplitListItem(
            this.renderTextField('Bio', profile.bio),
            typeEl,
        ));
        mainEl.appendChild(this.renderSplitListItem(
            this.renderSelect('Grade', profile.grade, this.data.grades),
            this.renderSelect('Gender', profile.gender, this.data.genders)
        ));
    }

    // CONTACT INFO
    mainEl.appendChild(this.renderListDivider('Contact info'));
    mainEl.appendChild(this.renderSplitListItem(
        this.renderTextField('Phone', profile.phone),
        this.renderTextField('Email', profile.email)
    ));

    // TUTOR/PUPIL FOR
    // Just in case the user hasn't set a user type yet
    var userTypeString = profile.type || 'User';
    mainEl.appendChild(this.renderActionListDivider(
        userTypeString + ' for', {
            add: () => {
                this.addSubjectProfileInput();
            },
            remove: () => {
                this.removeSubjectProfileInput();
            },
        }));
    mainEl.appendChild(this.renderSubjectTextFieldsItem(profile.subjects));

    // AVAILABILITY
    mainEl.appendChild(this.renderActionListDivider('Availability', {
        add: () => {
            this.addAvailabilityProfileInput();
        },
        remove: () => {
            this.removeAvailabilityProfileInput();
        },
    }));
    mainEl.appendChild(this.renderAvailabilityItem(profile.availability));

    return mainEl;
};


// Helper function that adds a subject input item
Tutorbook.prototype.addSubjectProfileInput = function() {
    const wrapper = document.querySelector('#Subjects-Wrapper');
    const textFieldElA = this.renderTextField('Subject', '');
    const textFieldElB = this.renderTextField('Subject', '');
    const el = this.renderSplitListItem(
        textFieldElA,
        textFieldElB
    );
    wrapper.appendChild(el);

    // textField A
    var that = this;
    const textFieldA = MDCTextField.attachTo(textFieldElA);
    textFieldElA.addEventListener('click', () => {
        that.viewSubjectSelectDialog(textFieldA, textFieldElA);
    });
    this.subjectTextFields.push(textFieldA);

    // textField B
    const textFieldB = MDCTextField.attachTo(textFieldElB);
    textFieldElB.addEventListener('click', () => {
        that.viewSubjectSelectDialog(textFieldB, textFieldElB);
    });
    this.subjectTextFields.push(textFieldB);

    textFieldA.focus();
    this.viewSubjectSelectDialog(textFieldA, textFieldElA);
};


// Helper function that removes a subject input item
Tutorbook.prototype.removeSubjectProfileInput = function() {
    const wrapper = document.querySelector('#Subjects-Wrapper');
    const el = wrapper.lastElementChild;
    wrapper.removeChild(el);
    this.subjectTextFields.pop();
    this.subjectTextFields.pop();
    var that = this;
    this.user.subjects = [];
    this.subjectTextFields.forEach((textField) => {
        if (that.data.subjects.indexOf(textField.value) >= 0) {
            that.user.subjects.push(textField.value);
        }
    });
    // We have to have this if statement b/c in the supervisor view, they 
    // have to actually save their changes to a certain account profile.
    if (location.toString().endsWith('profile')) {
        this.updateUser().then(() => {
            that.viewSnackbar('Subjects updated.');
        });
    }
};


// Helper function that adds an availability input item
Tutorbook.prototype.addAvailabilityProfileInput = function() {
    const availabilityEl = this.renderTextFieldItem('Availability', '');
    document.querySelector('main .profile #Availability-Wrapper')
        .appendChild(availabilityEl);
    const availabilityTextField = MDCTextField.attachTo(
        availabilityEl.querySelector('.mdc-text-field')
    );
    var that = this;
    availabilityEl.addEventListener('click', () => {
        that.viewEditAvailabilityDialog(availabilityTextField);
    });
    this.availabilityTextFields.push(availabilityTextField);
    availabilityTextField.focus();
    this.viewEditAvailabilityDialog(availabilityTextField);
};


// Helper function that removes an availability input item
Tutorbook.prototype.removeAvailabilityProfileInput = function() {
    const wrapper = document.querySelector('main .profile #Availability-Wrapper');
    const el = wrapper.lastElementChild;
    this.availabilityTextFields.pop();
    wrapper.removeChild(el);
};


// Storage function that uploads the given profile image file to Cloud Storage
// and updates the currentUser's profile image URL to match.
Tutorbook.prototype.saveProfileImage = async function(file) {
    // 1 - We change the profile image to a loading icon that will get updated 
    // with the shared image.
    const db = firebase.firestore();
    this.viewSnackbar('Uploading profile image...');
    this.user.photo = 'https://tutorbook.app/app/img/loading.gif';
    await this.updateUser();

    // 2 - Upload the image to Cloud Storage.
    var filePath = 'users/' + this.user.email + '/profileImages/' + file.name;
    var err;
    var fileSnapshot;
    [err, fileSnapshot] = await to(firebase.storage().ref(filePath).put(file));
    if (err) {
        console.log('Error while uploading profile image:', err);
        throw err;
    }

    // 3 - Generate a public URL for the file.
    err = undefined;
    var url;
    [err, url] = await to(fileSnapshot.ref.getDownloadURL());
    if (err) {
        console.log('Error while getting profile image url:', err);
        throw err;
    }

    // 4 - Update the chat message placeholder with the image’s URL.
    this.user.photo = url;
    await this.updateUser();
    this.viewSnackbar('Uploaded profile image.');

    // Rerender the user header to match
    $('.main .profile-header').replaceWith(
        this.renderProfileHeader(this.user)
    );

    // USER HEADER
    $('.main .profile-header .pic').mouseenter(() => {
        // Show the modify pic overlay
        $('.main .profile-header .pic').hide();
        $('.main .profile-header .modify-pic').show();
    });

    $('.main .profile-header .modify-pic').mouseleave(() => {
        // Hide the modify pic overlay
        $('.main .profile-header .modify-pic').hide();
        $('.main .profile-header .pic').show();
    });

    $('.main .profile-header .modify-pic').click(() => {
        $('.main .profile-header #media-capture').click();
    });

    $('.main .profile-header #media-capture').change((event) => {
        event.preventDefault();
        const file = event.target.files[0];

        // Check if the file is an image.
        if (!file.type.match('image.*')) {
            that.viewSnackbar('You can only upload images.');
            return;
        }

        // Upload file to Firebase Cloud Storage
        return that.saveProfileImage(file);
    });
};


// Helper function that adds listeners to the profile view and updates the 
// currentUser and his/her profile document as necessary.
Tutorbook.prototype.addProfileManager = function(profileView) {
    var that = this;

    // USER HEADER
    $('.main .profile-header .pic').mouseenter(() => {
        // Show the modify pic overlay
        $('.main .profile-header .pic').hide();
        $('.main .profile-header .modify-pic').show();
    });

    $('.main .profile-header .modify-pic').mouseleave(() => {
        // Hide the modify pic overlay
        $('.main .profile-header .modify-pic').hide();
        $('.main .profile-header .pic').show();
    });

    $('.main .profile-header .modify-pic').click(() => {
        $('.main .profile-header #media-capture').click();
    });

    $('.main .profile-header #media-capture').change((event) => {
        event.preventDefault();
        const file = event.target.files[0];

        // Check if the file is an image.
        if (!file.type.match('image.*')) {
            that.viewSnackbar('You can only upload images.');
            return;
        }

        // Upload file to Firebase Cloud Storage
        return that.saveProfileImage(file);
    });

    // ABOUT YOU (bio text field, type select, gender select, grade select)
    if (this.user.type === 'Tutor' && this.user.payments.type === 'Paid') {
        var bioEl = profileView.querySelector('[id="Background and qualifications"]');
        const hoursEl = profileView.querySelector('[id="Hours tutored"]');
        const hoursTextField = MDCTextField.attachTo(hoursEl);
        this.disableInput(hoursEl);
    } else {
        var bioEl = profileView.querySelector('#Bio');
    }
    const bioTextField = MDCTextField.attachTo(bioEl);

    const typeEl = profileView.querySelector('#Type');
    if (!!this.user.type && this.user.type !== '') {
        const typeTextField = MDCTextField.attachTo(typeEl);
        this.disableInput(typeEl);
    } else {
        const typeSelect = this.attachSelect(typeEl);
        typeSelect.listen('MDCSelect:change', function() {
            that.user.type = typeSelect.value;
            updateUser();
            that.viewSnackbar('Type updated.');
        });
    }

    if (this.user.type === 'Tutor' && this.user.payments.type === 'Free') {
        const serviceHoursEl = profileView.querySelector('[id="Service hours"]');
        const serviewHoursTextField = MDCTextField.attachTo(serviceHoursEl);
        this.disableInput(serviceHoursEl);
    }

    const genderEl = profileView.querySelector('#Gender');
    const genderSelect = this.attachSelect(genderEl);
    genderSelect.listen('MDCSelect:change', function() {
        that.user.gender = genderSelect.value;
        updateUser();
        that.viewSnackbar('Gender updated.');
    });

    const gradeEl = profileView.querySelector('#Grade');
    const gradeSelect = this.attachSelect(gradeEl);
    gradeSelect.listen('MDCSelect:change', function() {
        that.user.grade = gradeSelect.value;
        updateUser();
        that.viewSnackbar('Grade updated.');
    });

    // CONTACT INFO (phone text field, email text field)
    const phoneEl = profileView.querySelector('#Phone');
    const phoneTextField = MDCTextField.attachTo(phoneEl);

    const emailEl = profileView.querySelector('#Email');
    const emailTextField = MDCTextField.attachTo(emailEl);
    this.disableInput(emailEl);

    // TUTOR/PUPIL FOR (subject selects)
    this.subjectTextFields = [];
    profileView.querySelectorAll('#Subject').forEach((subjectEl) => {
        var subjectTextField = MDCTextField.attachTo(subjectEl);
        subjectEl.addEventListener('click', () => {
            that.viewSubjectSelectDialog(subjectTextField, subjectEl);
        });
        that.subjectTextFields.push(subjectTextField);
    });

    // AVAILABILITY (time, day, and location selects)
    this.availabilityTextFields = [];
    profileView.querySelectorAll('#Available').forEach((el) => {
        // TODO: Disable these text fields in some way so that they don't allow
        // keyboard input.
        const textField = MDCTextField.attachTo(el);
        el.addEventListener('click', () => {
            that.viewEditAvailabilityDialog(textField);
        });
        this.availabilityTextFields.push(textField);
    });


    function updateUser() {
        that.user.bio = bioTextField.value || "";
        that.user.phone = phoneTextField.value || "";

        // Read in all current subject select values
        profile.subjects = [];
        that.subjectTextFields.forEach((textField) => {
            if (that.data.subjects.indexOf(textField.value) >= 0) {
                profile.subjects.push(textField.value);
            }
        });

        // Update the user's profile to match all existing values
        that.user.availability = that.getAvailability();

        // If the profile is populated, dismiss the setupProfileCard
        that.user.cards.setupProfile = !that.userProfile(that.user) && that.user.type === 'Tutor';

        // If the availability is populated, dismiss the setupProfileCard
        that.user.cards.setupAvailability = !that.userAvailability(that.user) && that.user.type === 'Pupil';

        // Update the currentFilters so that they match the currentUser's
        // subjects.
        that.initFilters();

        that.updateUser();
    };

    // Update user document only when app bar is clicked
    document.querySelectorAll('.header .button').forEach((button) => {
        button.addEventListener('click', () => {
            updateUser();
        });
    });
};


// Helper function that returns true if and only if the user's availability is fully
// populated.
Tutorbook.prototype.userAvailability = function(profile) {
    // NOTE: We don't care if they don't have a phone # or bio
    return Object.keys(profile.availability).length !== 0;
};


// Helper function that returns true if and only if the user's profile is fully
// populated.
Tutorbook.prototype.userProfile = function(profile) {
    // NOTE: We don't care if they don't have a phone # or bio
    return (!!profile.type && !!profile.grade && !!profile.gender &&
        !!profile.email && !!profile.subjects && !!profile.availability);
};


// Render function to return a profile div with all location select list items.
Tutorbook.prototype.renderLocationSelectDialogItem = function(locationSelects) {
    const listItems = this.renderSplitSelectListItems(locationSelects, 'Location', this.data.locations);
    const wrapper = this.renderTemplate('input-wrapper');

    listItems.forEach((el) => {
        wrapper.appendChild(el);
    });

    return wrapper;
};


// Render function to return a profile div with all time select list items.
Tutorbook.prototype.renderTimeSelectDialogItem = function(timeSelects) {
    const listItems = this.renderTimeSelectListItems(timeSelects);
    const wrapper = this.renderTemplate('input-wrapper');

    listItems.forEach((el) => {
        wrapper.appendChild(el);
    });
    return wrapper;
};




// ============================================================================
// TUTOR CLOCKIN & CLOCKOUT FUNCTIONS
// ============================================================================


// Clock-In Data Flow:
// 1) Tutor adds a clockIn document to the supervisor of the given 
// location's subcollection.
//
// 2) Supervisor then sees a dialog asking for their approval of the clockIn
// 2a) Once approved, clockIn document is deleted and approvedClockIn
// document is created within the supervisor's subcollections.
// 2b) Supervisor creates an activeAppointment document in both the tutor's and
// the location's subcollections
// 
// 3) Tutor adds a clockOut document to the supervisor of the given
// location's subcollection.
// 
// 4) Supervisor then sees a dialog asking for their approval of the clockOut
// 4a) Once approved, clockOut doc is deleted and approvedClockOut doc is
// created within the supervisor's subcollections.
// 4b) Supervisor also deletes the activeAppointment docs in both the tutor's 
// and the location's subcollections. Supervisor then creates pastAppointment
// docs in both the tutor's and the location's subcollections.
// 
// 5) Firebase function then goes and indexes all of the pastAppointments that
// this tutor was on and updates that tutor's payment subcollection with the
// correct number of hours (which in turn triggers a payment Firebase function
// to run, etc.)


// Helper function to clockIn or clockOut depending on the currentClockIn
Tutorbook.prototype.clock = function() {
    var that = this;
    const clockInButton = document.querySelector('.mdc-fab');
    if (!!!this.currentClockInTimer) {
        // Calls clockIn and sets the mdc-fab label to 'Clock Out' if there
        // isn't a currentClockInTimer running.
        this.clockIn();
        // Ensure that the user does not leave that page
        // TODO: Make this more flexible (i.e. store the currentClockIn somewhere
        // and then if the user reloads the page, show the activeAppt dialog
        // for any activeAppts)
        // NOTE: To use the HTML DOM method .removeEventListener() we cannot
        // use anonymous functions and thus we have to replace the whole
        // element here.
        document
            .querySelectorAll('.header .mdc-top-app-bar .material-icons')
            .forEach((originalNavButton) => {
                var navButton = originalNavButton.cloneNode(true);
                originalNavButton.parentNode.replaceChild(navButton, originalNavButton);
                navButton.addEventListener('click', () => {
                    that.viewSnackbar('Navigation is locked until you clock out.');
                });
            });
        clockInButton.querySelector('.mdc-fab__label').innerText = "Clock Out";
    } else {
        // Otherwise, calls clockOut.
        this.clockOut();

        // Restore navigation abilities
        var cancelButton = '.header .mdc-top-app-bar [data-fir-click="cancel"]';
        $(cancelButton).replaceWith($(cancelButton).clone().click(() => {
            that.back();
        }));

        var printButton = '.header .mdc-top-app-bar [data-fir-click="print"]';
        $(printButton).replaceWith($(printButton).clone().click(() => {
            that.printPage();
        }));

        var editButton = '.header .mdc-top-app-bar [data-fir-click="edit"]';
        $(editButton).replaceWith($(editButton).clone().click(() => {
            var appt = that.filterApptData(that.currentAppt);
            that.getUser(
                that.getOtherUser(appt.attendees[0], appt.attendees[1]).email
            ).then((doc) => {
                // NOTE: We always want to retrieve the latest profile doc
                const user = doc.data();
                that.viewEditApptDialog(appt, user);
            });
        }));

        clockInButton.querySelector('.mdc-fab__label').innerText = "Clock In";
    }
};


// Helper function to start a timer and create a clockIn doc in the
// supervisor's subcollections
Tutorbook.prototype.clockIn = async function() {
    // We use the window.setInterval() function to update the current time
    // every 10 milliseconds.
    this.currentClockIn = {
        sentTimestamp: new Date(),
        sentBy: this.filterApptUserData(this.user),
    };

    this.log('Clocking into appt:', this.currentAppt);

    const db = firebase.firestore();
    const locationID = this.currentAppt.location.id;
    const supervisor = await this.getLocationSupervisor(locationID);
    const clockIn = db.collection('usersByEmail').doc(supervisor)
        .collection('clockIns').doc(this.currentAppt.id);

    // NOTE: We can't have this as reference to the original as it causes an 
    // infinite loop.
    this.currentAppt.supervisor = supervisor;
    this.currentAppt.clockIn = this.cloneMap(this.currentClockIn);
    this.currentClockIn.for = this.cloneMap(this.currentAppt);
    this.log('Adding clockIn:', this.currentClockIn);

    this.currentClockInTimer = window.setInterval(this.updateTimes, 10);
    var that = this;
    clockIn.set(this.currentClockIn).then(() => {
        that.viewSnackbar('Sent clock in request to ' + supervisor + '.');
        that.watchClockInStatus();
    }).catch((err) => {
        window.clearInterval(this.currentClockInTimer);
        this.currentClockInTimer = undefined;
        that.log('Error while adding clockIn doc:', err);
        that.viewSnackbar('Could not send clock in request. Please ensure' +
            ' this isn\'t a duplicate request.');
    });
};


// Data flow function that returns the active supervisor for a given location
Tutorbook.prototype.getLocationSupervisor = function(id) {
    try {
        return firebase.firestore().collection('locations').doc(id).get().then((doc) => {
            const supervisors = doc.data().supervisors;
            return supervisors[0]; // TODO: How do we check to see if a given
            // supervisor is actually active on the app right now?
        });
    } catch (e) {
        console.warn('Error while getting a location supervisor:', e);
        var that = this;
        this.viewNotificationDialog('Update Availability?', 'The availability ' +
                ' shown here is not up-to-date. The ' + location + ' may ' +
                'no longer be open at these times or this user may no longer ' +
                'be available (they can change their availability from their ' +
                'profile). Please cancel this request and ' +
                'create a new one.')
            .listen('MDCDialog:closing', (event) => {
                that.back();
            });
    }
};


// Data action function that watches for an activeAppointment document to be
// created with the same id as the currentClockIn (which has the same id as the
// original appointment document).
Tutorbook.prototype.watchClockInStatus = function() {
    var that = this;
    this.log('Watching clockIn status...');
    // First, watch for an activeAppointment doc to be created (once it is, 
    // we know that the clockIn was approved).
    firebase.firestore().collection('usersByEmail').doc(this.user.email)
        .collection('activeAppointments')
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                // NOTE: We can only do this b/c there will never be more than
                // one activeAppt for a given original appt at a time (i.e. b/c
                // the supervisor deletes every activeAppt document when the
                // tutor clocksOut for that appt).
                if (change.type !== 'removed' &&
                    change.doc.data().clockIn.sentTimestamp.toDate().getTime() ===
                    that.currentClockIn.sentTimestamp.getTime() &&
                    change.doc.id === that.currentAppt.id) {
                    that.viewSnackbar('Clock in approved.');
                }
            });
        });

    // Next, watch for a rejectedClockIn doc to be created (once it is, we
    // know that the clockIn was rejected).
    this.getUser(this.currentAppt.supervisor).then((doc) => {
        return doc.data();
    }).then((supervisor) => {
        firebase.firestore().collection('usersByEmail').doc(this.currentAppt.supervisor)
            .collection('rejectedClockIns')
            // NOTE: We must have this where condition, or the request will be
            // rejected by our new Firestore rules
            .where('sentBy.email', '==', this.user.email)
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.doc.data().sentTimestamp.toDate().getTime() ===
                        that.currentClockIn.sentTimestamp.getTime()) {
                        that.viewNotificationDialog('Clock In Rejected',
                            'Your clock in request was rejected. Please contact ' +
                            'your supervisor ' + supervisor.name + ' at ' +
                            (supervisor.phone || supervisor.email) + '.');
                        window.clearInterval(this.currentClockInTimer);
                        this.currentClockInTimer = undefined;
                        clockInButton.querySelector('.mdc-fab__label').innerText = "Clock In";
                    }
                });
            });
    });
};


// Data action function that watches for an pastAppointment document to be
// created with the same id as the currentClockOut (which has the same id as the
// original appointment document).
Tutorbook.prototype.watchClockOutStatus = function() {
    var that = this;
    const db = firebase.firestore();
    this.log('Watching clockOut status...');
    db.collection('usersByEmail').doc(this.user.email)
        .collection('pastAppointments')
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                // NOTE: We can't use id to double check that this pastAppt doc
                // is the right one as we want to have unique ids for each
                // pastAppt doc (as we need to have more than one for the same
                // original appt).
                if (change.type === 'added' &&
                    change.doc.data().clockOut.sentTimestamp.toDate().getTime() ===
                    that.currentClockOut.sentTimestamp.getTime()) {
                    that.viewSnackbar('Clock out approved.');
                }
            });
        });

    // Next, watch for a rejectedClockOut doc to be created (once it is, we
    // know that the clockIn was rejected).
    this.getUser(this.currentAppt.supervisor).then((doc) => {
        return doc.data();
    }).then((supervisor) => {
        db.collection('usersByEmail').doc(this.currentAppt.supervisor)
            .collection('rejectedClockOuts')
            // NOTE: We must have this where condition, or the request will be
            // rejected by our new Firestore rules
            .where('sentBy.email', '==', this.user.email)
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.doc.data().sentTimestamp.toDate().getTime() ===
                        that.currentClockOut.sentTimestamp.getTime()) {
                        /*
                         *that.viewSnackbar('Clock in rejected. Please contact ' +
                         *    'your supervisor, ' + supervisor.name + '.');
                         */
                        that.viewNotificationDialog('Clock Out Rejected',
                            'Your clock out request was rejected. Please contact ' +
                            'your supervisor ' + supervisor.name + ' at ' +
                            (supervisor.phone || supervisor.email) + '.');
                    }
                });
            });
    });
};


// Data action function that creates a clockOut document based on the
// currentAppt and current date and time.
Tutorbook.prototype.addClockOut = function() {
    // First, determine where to send this clockOut request (i.e. what location
    // is the appt at and what supervisors are at that location)
    var that = this;
    const supervisor = that.currentAppt.supervisor;
    // NOTE: The id of the clockOut document is the same as the id of
    // the original appt. This is b/c there will only ever be one clockOut
    // at a time for a given appt document.
    return firebase.firestore().collection('usersByEmail').doc(supervisor)
        .collection('clockOuts').doc(that.currentAppt.id)
        .set(that.currentClockOut).then(() => {
            that.viewSnackbar('Sent clock out request to ' + supervisor + '.');
        }).catch((err) => {
            that.log('Error while adding clockOut doc:', err);
            that.viewSnackbar('Could not send clock out request. Please ensure' +
                ' this isn\'t a duplicate request and that your clock in ' +
                'was approved.');
        });
};


// Data action function to 
// Helper function to actually go and update the time displays
Tutorbook.prototype.updateTimes = function() {
    // Formatted as: Hr:Min:Sec.Millisec
    var currentTimeDisplay = document.querySelector('#Current input');
    var current = currentTimeDisplay.value.toString();
    var currentHours = new Number(current.split(':')[0]);
    var currentMinutes = new Number(current.split(':')[1]);
    var currentSeconds = new Number(current.split(':')[2].split('.')[0]);
    var currentMilli = new Number(current.split('.')[1]) || 0;

    // Add to currentMilli
    currentMilli++;

    // Parse the current values to ensure they are formatted correctly
    if (currentMilli === 100) {
        currentMilli = 0;
        currentSeconds++;
    }
    if (currentSeconds === 60) {
        currentSeconds = 0;
        currentMinutes++;
    }
    if (currentMinutes === 60) {
        currentMinutes = 0;
        currentHours++;
    }

    currentTimeDisplay.value = currentHours + ':' + currentMinutes +
        ':' + currentSeconds + '.' + currentMilli;

    // Next, update the total time
    // Formatted as: Hr:Min:Sec.Millisec
    var totalTimeDisplay = document.querySelector('#Total input');
    var total = totalTimeDisplay.value.toString();
    var totalHours = new Number(total.split(':')[0]);
    var totalMinutes = new Number(total.split(':')[1]);
    var totalSeconds = new Number(total.split(':')[2].split('.')[0]);
    var totalMilli = new Number(total.split('.')[1]);

    // Add to totalMilli
    totalMilli++;

    // Parse the total values to ensure they are formatted correctly
    if (totalMilli === 100) {
        totalMilli = 0;
        totalSeconds++;
    }
    if (totalSeconds === 60) {
        totalSeconds = 0;
        totalMinutes++;
    }
    if (totalMinutes === 60) {
        totalMinutes = 0;
        totalHours++;
    }

    totalTimeDisplay.value = totalHours + ':' + totalMinutes +
        ':' + totalSeconds + '.' + totalMilli;
};


// Helper function that stops the timers and creates a clockOut doc in
// the supervisor's subcollections
Tutorbook.prototype.clockOut = async function() {
    window.clearInterval(this.currentClockInTimer);
    this.currentClockInTimer = undefined;
    this.currentClockOut = {
        sentTimestamp: new Date(),
        sentBy: this.filterApptUserData(this.user),
    };

    const db = firebase.firestore();
    const clockOut = db.collection('usersByEmail').doc(this.currentAppt.supervisor)
        .collection('clockOuts').doc(this.currentAppt.id);

    // NOTE: We can't have this as reference to the original as it causes an 
    // infinite loop.
    this.currentAppt.clockOut = this.cloneMap(this.currentClockOut);
    this.currentClockOut.for = this.cloneMap(this.currentAppt);

    var that = this;
    clockOut.set(this.currentClockOut).then(() => {
        that.viewSnackbar('Sent clock out request to ' + this.currentAppt.supervisor + '.');
        that.watchClockOutStatus();
    }).catch((err) => {
        that.log('Error while adding clockOut doc:', err);
        that.viewSnackbar('Could not send clock out request. Please ensure' +
            ' this isn\'t a duplicate request and that your clock in ' +
            'was approved.');
    });
    /*
     *this.currentAppt.time.hours = document.querySelector('#Total input').value;
     *this.modifyAppt(this.filterApptData(this.currentAppt), this.currentAppt.id);
     */
};



// ============================================================================
// SUPERVISOR CLOCKIN & CLOCKOUT FUNCTIONS
// ============================================================================


// View function that opens a dialog asking for approval for a clockIn
Tutorbook.prototype.viewClockInDialog = function(doc) {
    if (this.clockInDialogOpen) {
        return;
    }
    const data = doc.data();
    const title = 'Approve Clock In?';
    const summary = data.sentBy.name + ' clocked in at ' +
        this.getTimeString(data.sentTimestamp) + ' for ' +
        this.getGenderPronoun(data.sentBy.gender) + ' appointment with ' +
        this.getOtherAttendee(data.sentBy, data.for.attendees).name + ' at ' +
        data.for.time.from + '. Approve this clock in?';

    const dialogEl = this.renderTemplate('dialog-confirmation-template');
    dialogEl.querySelector('.mdc-dialog__title').innerText = title;
    dialogEl.querySelector('.mdc-dialog__content').innerText = summary;
    this.viewDialog(dialogEl);

    var that = this;
    const dialog = MDCDialog.attachTo(dialogEl);
    dialog.listen('MDCDialog:closing', (event) => {
        that.clockInDialogOpen = false;
        if (event.detail.action === 'yes') {
            return that.approveClockIn(data, doc.id);
        } else if (event.detail.action === 'no') {
            return that.rejectClockIn(data, doc.id);
        }
    });
    dialog.scrimClickAction = '';
    dialog.escapeKeyAction = '';
    dialog.autoStackButtons = false;

    this.clockInDialogOpen = true;
    return dialog.open();
};


// View function that opens a dialog asking for approval for a clockOut
Tutorbook.prototype.viewClockOutDialog = function(doc) {
    if (this.clockOutDialogOpen) {
        return;
    }
    const data = doc.data();
    const title = 'Approve Clock Out?';
    const summary = data.sentBy.name + ' clocked out at ' +
        this.getTimeString(data.sentTimestamp) + ' for his appointment with ' +
        this.getOtherAttendee(data.sentBy, data.for.attendees).name + ' ending at ' +
        data.for.time.to + '. Approve this clock out?';

    const dialogEl = this.renderTemplate('dialog-confirmation-template');
    dialogEl.querySelector('.mdc-dialog__title').innerText = title;
    dialogEl.querySelector('.mdc-dialog__content').innerText = summary;
    this.viewDialog(dialogEl);

    var that = this;
    const dialog = MDCDialog.attachTo(dialogEl);
    dialog.listen('MDCDialog:closing', (event) => {
        that.clockOutDialogOpen = false;
        if (event.detail.action === 'yes') {
            return that.approveClockOut(data, doc.id);
        } else if (event.detail.action === 'no') {
            return that.rejectClockOut(data, doc.id);
        }
    });
    dialog.scrimClickAction = '';
    dialog.escapeKeyAction = '';
    dialog.autoStackButtons = false;

    this.clockOutDialogOpen = true;
    return dialog.open();
};


// Render function that returns a populated clockIn dashboard card
// asking for approval or rejection. This should also open a confirmation
// dialog that forces an action before the rest of the app can be used.
Tutorbook.prototype.renderClockInCard = function(doc) {
    const data = doc.data();
    var that = this;
    var card = this.renderCard(doc.id, data, 'clockIns',
        data.sentBy.name.split(' ')[0] + ' Clocked In',
        data.sentBy.email + ' wants to clock in',
        data.sentBy.name + ' clocked in at ' +
        this.getTimeString(data.sentTimestamp) + ' for his appointment with ' +
        this.getOtherAttendee(data.sentBy, data.for.attendees).name + ' starting at ' +
        data.for.time.from + '. Please address this request as ' +
        'soon as possible.', {
            primary: () => {
                that.viewUpcomingApptDialog(that.combineMaps(data.for, {
                    id: doc.id
                }));
            },
        });

    // Add buttons to approve or reject at bottom
    var dismissButton = card.querySelector('.mdc-card__action');
    var approveButton = this.renderTemplate('card-button', {
        label: 'Approve',
        action: () => {
            that.approveClockIn(doc.data(), doc.id);
        },
    });
    var rejectButton = this.renderTemplate('card-button', {
        label: 'Reject',
        action: () => {
            that.rejectClockIn(doc.data(), doc.id);
        },
    });
    var actions = card.querySelector('.mdc-card__actions');
    actions.insertBefore(approveButton, dismissButton);
    actions.insertBefore(rejectButton, dismissButton);
    actions.removeChild(dismissButton);

    // TODO: Do we want to even render a card? Or do we want to just use a 
    // dialog?
    this.viewClockInDialog(doc);
    return card;
};


// Data action function that deletes the clockIn document and creates an
// approvedClockIn document within the currentUser's (i.e. the supervisor's)
// subcollections.
Tutorbook.prototype.approveClockIn = async function(clockIn, id) {
    const db = firebase.firestore();
    const ref = db.collection('usersByEmail').doc(this.user.email)
        .collection('clockIns').doc(id);
    const approvedClockIn = db.collection('usersByEmail').doc(this.user.email)
        .collection('approvedClockIns').doc();
    const activeAppts = [
        db.collection('usersByEmail').doc(clockIn.for.attendees[0].email)
        .collection('activeAppointments')
        .doc(id),
        db.collection('usersByEmail').doc(clockIn.for.attendees[1].email)
        .collection('activeAppointments')
        .doc(id),
        db.collection('locations').doc(clockIn.for.location.id)
        .collection('activeAppointments')
        .doc(id),
    ];
    await ref.delete();
    var that = this;
    await approvedClockIn.set(this.combineMaps(clockIn, {
        approvedTimestamp: new Date(),
        approvedBy: that.conciseUser,
    }));
    // Tedious work around of the infinite loop
    const activeApptData = this.cloneMap(clockIn.for);
    activeApptData.clockIn = this.combineMaps(clockIn, {
        approvedTimestamp: new Date(),
        approvedBy: that.conciseUser,
    });
    for (var i = 0; i < activeAppts.length; i++) {
        var activeAppt = activeAppts[i];
        console.log('Approving clockIn:', activeApptData);
        await activeAppt.set(activeApptData);
    }
    this.viewSnackbar('Approved clock in from ' + clockIn.sentBy.email + '.');
};


// Data action function that deletes the clockIn document and creates a
// rejectedClockIn document within the currentUser's (i.e. the supervisor's)
// subcollections.
Tutorbook.prototype.rejectClockIn = async function(clockInData, id) {
    const db = firebase.firestore();
    const appt = clockInData.for;
    const clockIn = db.collection('usersByEmail').doc(this.user.email)
        .collection('clockIns').doc(id);
    const rejectedClockIn = db.collection('usersByEmail').doc(this.user.email)
        .collection('rejectedClockIns').doc();
    await clockIn.delete();
    await rejectedClockIn.set(this.combineMaps(clockInData, {
        rejectedBy: this.conciseUser,
        rejectedTimestamp: new Date(),
    }));
    this.viewSnackbar('Rejected clock in from ' + clockInData.sentBy.email + '.');
};


// Data action function that:
// 1) Deletes the clockOut document and
// 2) Creates an approvedClockOut document within the currentUser's (i.e. the 
// supervisor's) subcollections.
// 3) Deletes the activeAppointment documents in the location's, the tutor's and
// the pupil's subcollections.
// 4) Creates a pastAppointment document in the tutor's, the pupil's, and the 
// location's 'pastAppointments' subcollections.
Tutorbook.prototype.approveClockOut = async function(clockOutData, id) {
    // Tedious work around of the infinite loop
    const approvedClockOutData = this.combineMaps(clockOutData, {
        approvedTimestamp: new Date(),
        approvedBy: this.filterApptUserData(this.user),
    });
    const appt = this.cloneMap(approvedClockOutData.for);
    appt.clockOut = this.cloneMap(approvedClockOutData);
    this.log('Approving clock out for appt:', appt);

    // Define Firestore doc locations
    const db = firebase.firestore();
    const clockOut = db.collection('usersByEmail').doc(this.user.email)
        .collection('clockOuts').doc(id);
    const approvedClockOut = db.collection('usersByEmail').doc(this.user.email)
        .collection('approvedClockOuts').doc();
    const activeAppts = [
        db.collection('usersByEmail').doc(appt.attendees[0].email)
        .collection('activeAppointments')
        .doc(id),
        db.collection('usersByEmail').doc(appt.attendees[1].email)
        .collection('activeAppointments')
        .doc(id),
        db.collection('locations').doc(appt.location.id)
        .collection('activeAppointments')
        .doc(id),
    ];
    const pastAppts = [
        db.collection('usersByEmail').doc(appt.attendees[0].email)
        .collection('pastAppointments')
        .doc(),
    ];
    const pastApptID = pastAppts[0].id;
    pastAppts.push(
        db.collection('usersByEmail').doc(appt.attendees[1].email)
        .collection('pastAppointments')
        .doc(pastApptID),
    );
    pastAppts.push(
        db.collection('locations').doc(appt.location.id)
        .collection('pastAppointments')
        .doc(pastApptID),
    );

    // Actually mess with docs
    await clockOut.delete();
    await approvedClockOut.set(approvedClockOutData);
    for (var i = 0; i < activeAppts.length; i++) {
        await activeAppts[i].delete();
    }
    for (var i = 0; i < pastAppts.length; i++) {
        await pastAppts[i].set(appt);
    }
    this.viewSnackbar('Approved clock out from ' + clockOutData.sentBy.email + '.');
};


// Data action function that deletes the clockOut document and creates a
// rejectedClockOut document within the currentUser's (i.e. the supervisor's)
// subcollections.
Tutorbook.prototype.rejectClockOut = async function(clockOutData, id) {
    const db = firebase.firestore();
    const appt = clockOutData.for;
    const clockOut = db.collection('usersByEmail').doc(this.user.email)
        .collection('clockOuts').doc(id);
    const rejectedClockOut = db.collection('usersByEmail').doc(this.user.email)
        .collection('rejectedClockOuts').doc();
    const activeAppts = [
        db.collection('usersByEmail').doc(appt.attendees[0].email)
        .collection('activeAppointments')
        .doc(id),
        db.collection('usersByEmail').doc(appt.attendees[1].email)
        .collection('activeAppointments')
        .doc(id),
        db.collection('locations').doc(appt.location.id)
        .collection('activeAppointments')
        .doc(id),
    ];
    await clockOut.delete();
    await rejectedClockOut.set(this.combineMaps(clockOutData, {
        rejectedBy: this.conciseUser,
        rejectedTimestamp: new Date(),
    }));
    activeAppts.forEach(async (appt) => {
        await appt.delete();
    });
    this.viewSnackbar('Rejected clock out from ' + clockOutData.sentBy.email + '.');
};


// Render function that returns a populated clockOut dashboard card
// askoutg for approval or rejection. This should also open a confirmation
// dialog that forces an action before the rest of the app can be used.
Tutorbook.prototype.renderClockOutCard = function(doc) {
    const data = doc.data();
    var that = this;
    var card = this.renderCard(doc.id, data, 'clockOuts',
        data.sentBy.name.split(' ')[0] + ' Clocked Out',
        data.sentBy.email + ' wants to clock out',
        data.sentBy.name + ' clocked out at ' +
        this.getTimeString(data.sentTimestamp) + ' for his appointment with ' +
        this.getOtherAttendee(data.sentBy, data.for.attendees).name + ' ending at ' +
        data.for.time.to + '. Please address this request as ' +
        'soon as possible.', {
            primary: () => {
                that.viewUpcomingApptDialog(that.combineMaps(data.for, {
                    id: doc.id
                }));
            },
        });

    // Add buttons to approve or reject at bottom
    var dismissButton = card.querySelector('.mdc-card__action');
    var approveButton = this.renderTemplate('card-button', {
        label: 'Approve',
        action: () => {
            that.approveClockOut(doc.data(), doc.id);
        },
    });
    var rejectButton = this.renderTemplate('card-button', {
        label: 'Reject',
        action: () => {
            that.rejectClockOut(doc.data(), doc.id);
        },
    });
    var actions = card.querySelector('.mdc-card__actions');
    actions.insertBefore(approveButton, dismissButton);
    actions.insertBefore(rejectButton, dismissButton);
    actions.removeChild(dismissButton);

    // TODO: Do we want to even render a card? Or do we want to just use a 
    // dialog?
    this.viewClockOutDialog(doc);
    return card;
};




// ============================================================================
// DASHBOARD VIEW
// ============================================================================


// View function that adds the given card to the .main #cards list based on 
// timestamp
Tutorbook.prototype.viewCard = function(card, mainListEl, order) {
    this.log('Viewing card:', card);
    if (!!!card) {
        console.warn('Invalid card passed to viewCard:', card);
        return;
    }

    var mainEl = document.querySelector('.main');
    var mainListEl = mainListEl || mainEl.querySelector('#cards');
    var id = card.getAttribute('id');
    var timestamp = card.getAttribute('timestamp');

    var existingCard = mainListEl.querySelector('[id="' + id + '"]');
    if (!!existingCard) {
        // modify
        mainListEl.insertBefore(card, existingCard);
        mainListEl.removeChild(existingCard);
    } else {
        // We want certain cards to always appear above others (i.e. the
        // setup cards).
        console.log('Adding card:', id);
        switch (id) {
            case 'welcome-card':
                $(mainListEl).prepend(card);
                break;
            case 'setup-tutors-card':
                // Card asking to search for tutors.
                if ($('#welcome-card').length) {
                    $(card).insertAfter('#welcome-card');
                } else {
                    // No welcome card, put this card first.
                    $(mainListEl).prepend(card);
                }
                break;
            case 'setup-availability-card':
                // Card asking to set availability so tutors can modify
                // your requests.
                if ($('#setup-tutors-card').length) {
                    $(card).insertAfter('#setup-tutors-card');
                } else if ($('#welcome-card').length) {
                    $(card).insertAfter('#welcome-card');
                } else {
                    // No search tutors card, put this card first.
                    $(mainListEl).prepend(card);
                }
                break;
            case 'setup-notifications-card':
                // Card asking to enable webpush notifications.
                if ($('#setup-availability-card').length) {
                    $(card).insertAfter('#setup-availability-card');
                    /*
                     *    NOTE: Right now, we get a bug if we add this check.
                     *    Though we don't need it, b/c the setup profile
                     *    card will always be added after this one.
                     *} else if ($('#setup-profile-card').length) {
                     *    $(card).insertAfter('#setup-profile-card');
                     */
                } else if ($('#setup-tutors-card').length) {
                    $(card).insertAfter('#setup-tutors-card');
                } else if ($('#welcome-card').length) {
                    $(card).insertAfter('#welcome-card');
                } else {
                    $(mainListEl).prepend(card);
                }
                break;
            case 'setup-profile-card':
                // Card asking to populate your tutor profile.
                if ($('#welcome-card').length) {
                    $(card).insertAfter('#welcome-card');
                } else {
                    // No welcome card, put this card first.
                    $(mainListEl).prepend(card);
                }
                break;
            default:
                // Add by timestamp
                for (var i = 0; i < mainListEl.children.length; i++) {
                    var child = mainListEl.children[i];
                    var time = child.getAttribute('timestamp');
                    // If there is a request that was sent later (more recently)
                    // Then this request will appear after that request
                    if (time && time < timestamp) {
                        break;
                    }
                }
                // Append it normally
                if (!child) {
                    $(mainListEl).append(card);
                } else {
                    $(card).insertBefore(child);
                }
                break;
        };
    }

    // Attach MDCRipple if the card is a list-item
    if (card.getAttribute('class').split(' ').indexOf('mdc-list-item') >= 0) {
        MDCRipple.attachTo(card);
    }
};


// View function that shows dashboard
Tutorbook.prototype.viewDashboard = function() {
    this.log('Viewing dashboard...');
    history.pushState({}, null, '/app/home');
    this.navSelected = 'Home';
    this.viewIntercom(true);
    const dashboardHeader = this.renderHeader('header-main', {
        'title': 'Tutorbook'
    });
    try {
        var dashboardView = this.renderTemplate('dashboard', {
            // If the user is viewing on mobile, we don't
            // want to show the welcome message in huge text.
            welcome: !this.onMobile,
            title: this.user.cards.welcomeMessage.title,
            subtitle: this.user.cards.welcomeMessage.summary,
        });
    } catch (e) {
        this.initWelcomeMessage();
        var dashboardView = this.renderTemplate('dashboard', {
            // If the user is viewing on mobile, we don't
            // want to show the welcome message in huge text.
            welcome: !this.onMobile,
            title: this.user.cards.welcomeMessage.title || "Welcome to Tutorbook",
            subtitle: this.user.cards.welcomeMessage.summary || "We're glad you're here. Below are some friendly suggestions for what to do next.",
        });
    }

    this.view(dashboardHeader, dashboardView);

    return this.viewDashboardCards();
};


// Helper function that returns an array of all the user subcollections that
// should be displayed in the given user's dashboard (e.g. only show the 
// clockIns/Outs to supervisors)
Tutorbook.prototype.getDashboardSubcollections = function() {
    switch (this.user.type) {
        case 'Supervisor':
            return [
                'clockIns',
                'clockOuts',
                'approvedClockIns',
                'approvedClockOuts',
            ];
        default:
            return [
                'requestsIn',
                'canceledRequestsIn',
                'modifiedRequestsIn',
                'requestsOut',
                'modifiedRequestsOut',
                'rejectedRequestsOut',
                'approvedRequestsOut',
                'appointments',
                'activeAppointments',
                'modifiedAppointments',
                'canceledAppointments',
                'needApprovalPayments',
            ];
    };
};


// Data flow function that returns an array of queries representing all app
// activity that relates to this supervisor's location(s).
Tutorbook.prototype.getSupervisorDashboardQueries = function() {
    const subcollections = {
        'location.id': [
            // TODO: We don't need to use appointments, modifiedAppointments,
            // canceledAppointments, or activeAppointments here as they
            // are covered by the location queries.
            'requestsOut',
        ],
        'for.location.id': [
            'modifiedRequestsIn',
            'canceledRequestsIn',
            'modifiedRequestsOut',
            'rejectedRequestsOut',
            'approvedRequestsOut',
        ],
    };
    return this.getSupervisorLocationIDs().then((locationIDs) => {
        var queries = {};
        locationIDs.forEach((locationID) => {
            Object.entries(subcollections).forEach((entry) => {
                var locationIDQuery = entry[0];
                var subcollections = entry[1];
                subcollections.forEach((subcollection) => {
                    var db = firebase.firestore().collectionGroup(subcollection);
                    var query = db.where(locationIDQuery, '==', locationID);
                    queries[subcollection + '-' + locationID] = query;
                });
            });
        });
        // The queries map returned includes the collection type as the key
        // and an array of queries for that collection as the value (b/c we
        // have multiple locations we're querying for).
        return queries;
    }).catch((err) => {
        console.error('Error while getting Firestore queries for ' +
            this.user.name + '\'s supervisor ' + subcollection + ':', err);
    });
};


// View function that shows the supervisor dashboard cards (i.e. cards that show
// the numbers of each type of card).
Tutorbook.prototype.viewSupervisorDashboardCards = function() {
    var that = this;
    this.emptyCards();

    // First, render setup cards based on the this.user.cards map
    Object.entries(this.user.cards).forEach((entry) => {
        const cardType = entry[0];
        const cardData = entry[1];
        this.dashboardRecycler.display(cardData, cardType);
    });

    // Then, show the supervisor dashboard queries but use a different
    // recycler that, instead of just appending the cards to the dashboard,
    // adds each type of card to it's own hidden sub-div that can be accessed
    // by clicking on one of the analytics cards in the dashboard.
    this.getSupervisorDashboardQueries().then((queries) => {
        Object.entries(queries).forEach((entry) => {
            var subcollection = entry[0];
            var query = entry[1];
            query.onSnapshot((snapshot) => {
                if (!snapshot.size) {
                    return that.supervisorDashboardRecycler
                        .empty(subcollection);
                }

                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'removed') {
                        that.supervisorDashboardRecycler
                            .remove(change.doc, subcollection);
                    } else {
                        that.supervisorDashboardRecycler
                            .display(change.doc, subcollection);
                    }
                });
            });
        });
    });

    // Then, read the Firestore database for relevant cardData
    this.getDashboardSubcollections().forEach((subcollection) => {
        this.getSubcollectionData(subcollection).onSnapshot((snapshot) => {
            if (!snapshot.size) {
                return that.dashboardRecycler.empty(subcollection);
            }

            snapshot.docChanges().forEach((change) => {
                if (change.type === 'removed') {
                    that.dashboardRecycler.remove(change.doc, subcollection);
                } else {
                    that.dashboardRecycler.display(change.doc, subcollection);
                }
            });
        });
    });
};


// View function that shows dashboard cards as Firestore documents change
Tutorbook.prototype.viewDashboardCards = function() {
    var that = this;
    this.emptyCards();

    this.log('Viewing dashboard cards...');
    if (this.user.type === 'Parent') {
        this.viewChildren();
    }

    // First, render setup cards based on the this.user.cards map
    Object.entries(this.user.cards).forEach((entry) => {
        const cardType = entry[0];
        const cardData = entry[1];
        this.dashboardRecycler.display(cardData, cardType);
    });

    if (this.user.type === 'Supervisor') {
        // Show the supervisor all app activity that relates to their location(s)
        this.getSupervisorDashboardQueries().then((queries) => {
            Object.entries(queries).forEach((entry) => {
                var subcollection = entry[0];
                var query = entry[1];
                query.onSnapshot((snapshot) => {
                    if (!snapshot.size) {
                        return that.dashboardRecycler.empty(subcollection);
                    }

                    snapshot.docChanges().forEach((change) => {
                        if (change.type === 'removed') {
                            that.dashboardRecycler
                                .remove(change.doc, subcollection);
                        } else {
                            that.dashboardRecycler
                                .display(change.doc, subcollection);
                        }
                    });
                });
            });
        });
    }
    // Then, read the Firestore database for relevant cardData
    this.getDashboardSubcollections().forEach((subcollection) => {
        this.getSubcollectionData(subcollection).onSnapshot((snapshot) => {
            if (!snapshot.size) {
                return that.dashboardRecycler.empty(subcollection + '-user');
            }

            snapshot.docChanges().forEach((change) => {
                if (change.type === 'removed') {
                    that.dashboardRecycler.remove(change.doc, subcollection + '-user');
                } else {
                    that.dashboardRecycler.display(change.doc, subcollection + '-user');
                }
            });
        });
    });
};


// Helper function that empties the current dashboard cards to display new ones
Tutorbook.prototype.emptyCards = function() {
    this.log('Emptying cards...');
    this.cards = {};
    return $('main #cards').empty();
};




// ============================================================================
// DASHBOARD CARDS RENDER FUNCTIONS
// ============================================================================


// Render function that returns a populated modifiedRequestsIn dashboard card
Tutorbook.prototype.renderModifiedRequestInCard = function(doc) {
    const data = doc.data();
    const pronoun = this.getGenderPronoun(data.modifiedBy.gender);
    var that = this;
    if (this.user.type === 'Supervisor') {
        var subtitle = data.modifiedBy.name + ' modified ' + pronoun + ' request to ' +
            data.for.toUser.name;
        var summary = data.modifiedBy.name.split(' ')[0] + ' modified ' + pronoun + ' lesson request' +
            ' to ' + data.for.toUser.name.split(' ')[0] +
            '. Please ensure to addresss these changes as necessary.';
    } else {
        var subtitle = data.modifiedBy.name + ' modified ' + pronoun + ' request to you';
        var summary = data.modifiedBy.name.split(' ')[0] + ' modified ' + pronoun + ' lesson request' +
            ' to you. Please ensure to addresss these changes as necessary.';
    }
    return this.renderCard(doc.id, data, 'modifiedRequestsIn', 'Modified Request',
        subtitle, summary, {
            primary: () => {
                that.viewViewRequestDialog(that.combineMaps(data.for, {
                    id: doc.id
                }));
            },
        });
};


// Render function that returns a populated canceledRequestsIn dashboard card
Tutorbook.prototype.renderCanceledRequestInCard = function(doc) {
    const data = doc.data();
    const pronoun = this.getGenderPronoun(data.canceledBy.gender);
    if (this.user.type === 'Supervisor') {
        var subtitle = data.canceledBy.name + ' canceled ' + pronoun + ' request to ' +
            data.for.toUser.name;
        var summary = data.canceledBy.name.split(' ')[0] + ' canceled ' + pronoun +
            ' request to ' + data.for.toUser.name.split(' ')[0] + '. Please ' +
            'ensure to addresss these changes as necessary.';
    } else {
        var subtitle = data.canceledBy.name + ' canceled ' + pronoun + ' request to you';
        var summary = data.canceledBy.name.split(' ')[0] + ' canceled ' + pronoun +
            ' request to you. Please ensure to addresss these changes as ' +
            'necessary.';
    }
    return this.renderCard(doc.id, data, 'canceledRequestsIn', 'Canceled Request',
        subtitle, summary, {});
};


// Render function that returns a populated modifiedRequestsOut dashboard card
Tutorbook.prototype.renderModifiedRequestOutCard = function(doc) {
    const data = doc.data();
    var that = this;
    if (this.user.type === 'Supervisor') {
        var subtitle = data.modifiedBy.name + ' modified ' + data.for.fromUser.name +
            '\'s request';
        var summary = data.modifiedBy.name.split(' ')[0] + ' modified ' +
            data.for.fromUser.name.split(' ')[0] +
            '\'s lesson request. Please ensure to addresss these changes as necessary.';
    } else {
        var subtitle = data.modifiedBy.name + ' modified your request';
        var summary = data.modifiedBy.name.split(' ')[0] + ' modified the ' +
            'lesson request you sent. Please ensure to addresss these changes as necessary.';
    }
    return this.renderCard(doc.id, data, 'modifiedRequestsOut', 'Modified Request',
        subtitle, summary, {
            primary: () => {
                that.viewViewRequestDialog(that.combineMaps(data.for, {
                    id: doc.id
                }));
            },
        });
};


// Render function that returns a populated rejectedRequestsOut dashboard card
Tutorbook.prototype.renderRejectedRequestOutCard = function(doc) {
    const data = doc.data();
    if (this.user.type === 'Supervisor') {
        var subtitle = data.rejectedBy.name + ' rejected ' + data.for.fromUser.name + '\'s request';
        var summary = data.rejectedBy.name.split(' ')[0] + ' rejected ' +
            data.for.fromUser.name.split(' ')[0] +
            '\'s lesson request. Please ensure to addresss these changes as necessary.';
    } else {
        var subtitle = data.rejectedBy.name + ' rejected your request';
        var summary = data.rejectedBy.name.split(' ')[0] + ' rejected the ' +
            'request you sent. Please ensure to addresss these changes as necessary.';
    }
    return this.renderCard(doc.id, data, 'rejectedRequestsOut', 'Rejected Request',
        subtitle, summary, {});
};


// Render function that returns a populated approvedRequestsOut dashboard card
Tutorbook.prototype.renderApprovedRequestOutCard = function(doc) {
    const data = doc.data();
    const otherUser = data.for.fromUser;

    var that = this;

    function viewAppt() {
        // Show appointment
        if (that.user.type === 'Supervisor') {
            // First, try the fromUser's collections
            return firebase.firestore().collection('usersByEmail')
                .doc(data.for.fromUser.email)
                .collection('appointments')
                .doc(doc.id).get().then((doc) => {
                    if (doc.exists) {
                        return that.viewUpcomingApptDialog(that.combineMaps(
                            doc.data(), {
                                id: doc.id
                            }));
                    }
                    // Then, if that doc doesn't exist yet, try
                    // the toUser's collections
                    return firebase.firestore().collection('usersByEmail')
                        .doc(data.for.toUser.email)
                        .collection('appointments')
                        .doc(doc.id).get().then((doc) => {
                            if (doc.exists) {
                                return that.viewUpcomingApptDialog(
                                    that.combineMaps(
                                        doc.data(), {
                                            id: doc.id
                                        }));
                            }
                            console.error('Could not find appt document for approvedRequest:', doc.id);
                        });
                });
        } else {
            that.getAppt(doc.id).then((doc) => {
                that.viewUpcomingApptDialog(that.combineMaps(
                    doc.data(), {
                        id: doc.id
                    }));
            });
        }
    };

    const subtitle = (this.user.type === 'Supervisor') ? data.approvedBy.name.split(' ')[0] +
        ' approved a request from ' + otherUser.name.split(' ')[0] :
        data.approvedBy.name.split(' ')[0] + ' approved the request you sent';
    const summary = data.approvedBy.name + ((this.user.type === 'Supervisor') ? ' approved a ' +
            'request from ' + otherUser.name : ' approved the request you sent') +
        '. Please ensure to addresss these changes as necessary.';
    return this.renderCard(doc.id, data, 'approvedRequestsOut', 'Approved Request',
        subtitle, summary, {
            primary: () => {
                return viewAppt();
            },
        });
};


// Render function that returns a populated modifiedAppointments dashboard card
Tutorbook.prototype.renderModifiedApptCard = function(doc) {
    const data = doc.data();
    var subtitle = data.modifiedBy.name.split(' ')[0] + ' modified ' +
        'your appointment';
    var summary = data.modifiedBy.name + ' modified your ' +
        'appointment together. Please ensure to addresss these changes as necessary.';
    return this.renderCard(doc.id, data, 'modifiedAppointments', 'Modified Appointment',
        subtitle, summary, {});
};


// Render function that returns a populated canceledAppointments dashboard card
Tutorbook.prototype.renderCanceledApptCard = function(doc) {
    const data = doc.data();
    if (data.canceledBy.email !== data.for.attendees[0].email) {
        var otherUser = data.for.attendees[0];
    } else {
        var otherUser = data.for.attendees[1];
    }
    const summary = (this.user.type === 'Supervisor') ? data.canceledBy.name +
        ' canceled ' + this.getGenderPronoun(data.canceledBy.gender) +
        ' tutoring appointment with ' + otherUser.name + '. Please ' +
        'ensure to address these changes as necessary.' :
        ([data.for.attendees[0].email, data.for.attendees[1].email].indexOf(data.canceledBy.email) < 0) ?
        data.canceledBy.name + ' canceled your ' +
        'appointment with ' + otherUser.name + '. Please ensure to addresss these changes as necessary.' :
        data.canceledBy.name + ' canceled your ' +
        'appointment together. Please ensure to addresss these changes as necessary.';
    const subtitle = data.canceledBy.name.split(' ')[0] + ' canceled ' +
        ((this.user.type === 'Supervisor') ? this.getGenderPronoun(data.canceledBy.gender) : 'your') +
        ' appointment';
    var that = this;
    const card = this.renderCard(doc.id, data, 'canceledAppointments', 'Canceled Appointment',
        subtitle,
        summary, {
            primary: () => {
                that.viewCanceledApptDialog(data.for, doc.id);
            }
        });
    return card;
};


// Render function this returns a populated requestIn dashboard card
Tutorbook.prototype.renderRequestInCard = function(doc) {
    var that = this;

    const request = doc.data();
    var cardData = this.cloneMap(request);
    cardData['subtitle'] = 'From ' + request.fromUser.name;
    cardData['summary'] = request.fromUser.name.split(' ')[0] +
        ' requested you as a ' + request.toUser.type.toLowerCase() +
        ' for ' + request.subject + ' on ' + request.time.day + 's at the ' +
        request.location.name + '. Tap to learn more and setup an appointment.';
    cardData['go_to_request'] = function() {
        var data = that.cloneMap(request);
        data.id = doc.id;
        that.viewViewRequestDialog(data);
    };
    cardData['reject_request'] = function() {
        const summary = "Reject request from " + request.fromUser.name +
            " for " + request.subject + " at " +
            request.time.from + " on " + request.time.day +
            "s.";
        that.viewConfirmationDialog('Reject Request?', summary)
            .listen('MDCDialog:closing', async (event) => {
                if (event.detail.action === 'yes') {
                    $('#doc-requestsIn-' + doc.id).remove();
                    await that.rejectRequest(doc.id, request);
                    that.log('Rejected request from ' + request.fromUser.email +
                        ':', request);
                    that.viewSnackbar('Rejected request from ' +
                        request.fromUser.email + '.');
                }
            });
    };

    const card = this.renderTemplate('card-requestIn', cardData);
    card
        .querySelectorAll('.mdc-button, .mdc-card__primary-action, .mdc-icon-button')
        .forEach((el) => {
            MDCRipple.attachTo(el);
        });

    // Setting the id allows to locating the individual user card
    // NOTE: We cannot just use the doc.id for these cards (as we reuse the
    // same doc IDs for documents that correspond to the same request or appt)
    // So, we have to check that the card types match as well.
    card.setAttribute('id', 'doc-requestsIn-' + doc.id);
    card.setAttribute('timestamp', doc.data().timestamp);

    return card;
};


Tutorbook.prototype.renderStubCard = function(title) {
    const card = this.renderTemplate('card-empty', {
        title: title,
        subtitle: title,
        summary: title,
    });
    return card;
};


// Data action function that syncs the dismissedCards with the local array
Tutorbook.prototype.initDismissedCards = function() {
    this.dismissedCards = [];
    if (this.user.type === 'Supervisor' || this.user.type === 'Parent') {
        var that = this;
        return firebase.firestore().collection('usersByEmail').doc(this.user.email)
            .collection('dismissedCards').get().then((snapshot) => {
                snapshot.forEach((doc) => {
                    that.dismissedCards.push(doc.id);
                });
            }).catch((err) => {
                console.error('Error while initializing dismissedCards:', err);
            });
    }
};


// Data action function that removes the dashboard card document from the user's
// subcollection.
Tutorbook.prototype.removeCardDoc = function(type, id) {
    if (this.user.type === 'Supervisor' || this.user.type === 'Parent') {
        // To enable supervisor's to dismiss cards, we add a dismissedCards
        // subcollection that is synced locally. Cards in this collection
        // are not shown in the dashboard view.
        this.dismissedCards.push(type + '-' + id);
        return firebase.firestore().collection('usersByEmail').doc(this.user.email)
            .collection('dismissedCards').doc(type + '-' + id).set({
                timestamp: new Date()
            });
    } else {
        return firebase.firestore().collection('usersByEmail').doc(this.user.email)
            .collection(type).doc(id).delete();
    }
};


// Render function that returns a populated dashboard card (i.e. with the text
// filled in w/ title, subtitle, and summary data and with the actions
// generating action buttons with the map keys as labels and values as their
// click functions/listeners).
Tutorbook.prototype.renderCard = function(id, data, cardType, title, subtitle, summary, actions) {
    var that = this;
    const card = this.renderTemplate('card-empty', {
        // NOTE: We cannot just use the doc.id for these cards (as we reuse the
        // same doc IDs for documents that correspond to the same request or appt)
        // So, we have to check that the card types match as well.
        id: 'doc-' + cardType + '-' + id,
        title: title,
        subtitle: subtitle,
        summary: summary,
        actions: actions,
        timestamp: data.timestamp,
    });

    // Add actions (besides the primary action, which is what happens when
    // you click on the card itself) to the card as buttons
    const buttons = card.querySelector('.mdc-card__actions');
    Object.entries(actions).forEach((entry) => {
        var label = entry[0];
        var action = entry[1];
        if (label !== 'primary') {
            buttons.insertBefore(
                that.renderCardButton(label, action),
                buttons.firstElementChild
            );
        }
    });

    card
        .querySelectorAll('.mdc-button, .mdc-card__primary-action, .mdc-icon-button')
        .forEach((el) => {
            MDCRipple.attachTo(el);
        });
    // NOTE: Setting the class allows the dashboardRecycler to remove all cards 
    // of a given type when they turn up empty from the Firestore query.
    card.setAttribute('class', card.getAttribute('class') + ' card-' + cardType);
    card.querySelector('[data-fir-click="dismiss"]').addEventListener('click', () => {
        $(card).remove();
        that.removeCardDoc(cardType, id);
    });

    return card;
};


// Render function that returns a MDC Card action button with the given label
// and click action.
Tutorbook.prototype.renderCardButton = function(label, action) {
    return this.renderTemplate('card-button', {
        label: label,
        action: action,
    });
};


// Render function that returns a populated requestOut dashboard card
Tutorbook.prototype.renderRequestOutCard = function(doc) {
    var that = this;

    const request = doc.data();
    var cardData = this.cloneMap(request);
    if (this.user.type === 'Supervisor') {
        cardData['subtitle'] = 'From ' + request.fromUser.name +
            ' to ' + request.toUser.name;
        cardData['summary'] = request.fromUser.name.split(' ')[0] +
            ' requested ' + request.toUser.name.split(' ')[0] +
            ' as a ' + request.toUser.type.toLowerCase() + ' for ' +
            request.subject + ' on ' + request.time.day + 's at the ' +
            request.location.name + '. Tap to learn more and view this request.';
    } else {
        cardData['subtitle'] = 'To ' + request.toUser.name;
        cardData['summary'] = 'You requested ' + request.toUser.name.split(' ')[0] +
            ' as a ' + request.toUser.type.toLowerCase() + ' for ' +
            request.subject + ' on ' + request.time.day + 's at the ' +
            request.location.name + '. Tap to learn more and edit your request.';
    }
    cardData['go_to_request'] = function() {
        var data = that.cloneMap(request);
        data.id = doc.id;
        that.viewViewRequestDialog(data);
    };
    cardData['edit_request'] = function() {
        var data = that.cloneMap(request);
        data.id = doc.id;
        that.viewEditDialog(data);
    };
    cardData['show_cancel'] = true; // TODO: Only allow supervisor's to cancel
    // request's that they've created as a proxy.
    cardData['cancel_request'] = function() {
        const summary = "Cancel request to " + request.toUser.name + " for " +
            request.subject + " at " + request.time.from + " on " +
            request.time.day + "s.";
        that.viewConfirmationDialog('Cancel Request?', summary)
            .listen('MDCDialog:closing', async (event) => {
                if (event.detail.action === 'yes') {
                    $('#doc-requestsOut-' + doc.id).remove();
                    await that.cancelRequest(doc.id, request);
                    that.log('Canceled request to ' + request.toUser.email + ':',
                        request);
                    that.viewSnackbar('Canceled request to ' +
                        request.toUser.email + '.');
                }
            });
    };

    var card = this.renderTemplate('card-requestOut', cardData);
    card
        .querySelectorAll('.mdc-button, .mdc-card__primary-action, .mdc-icon-button')
        .forEach((el) => {
            MDCRipple.attachTo(el);
        });

    // Setting the id allows to locating the individual user card
    // NOTE: We cannot just use the doc.id for these cards (as we reuse the
    // same doc IDs for documents that correspond to the same request or appt)
    // So, we have to check that the card types match as well.
    card.setAttribute('id', 'doc-requestsOut-' + doc.id);
    card.setAttribute('timestamp', doc.data().timestamp);

    return card;
};


// Render function that returns a populated modifiedAppointments dashboard card
Tutorbook.prototype.renderActiveApptCard = function(doc) {
    console.log('Rendering active appointment card:', doc.data());
    const appt = doc.data();

    if (appt.attendees[0].email == firebase.auth().currentUser.email) {
        var withUser = appt.attendees[1];
    } else {
        var withUser = appt.attendees[0];
    }

    if (this.user.type === 'Supervisor') {
        var subtitle = "Between " + appt.attendees[0].name + ' and ' +
            appt.attendees[1].name;
        var summary = 'Tutoring session right now between ' + appt.attendees[0].name + ' and ' +
            appt.attendees[1].name + ' for ' +
            appt.for.subject + " on " + appt.time.day + "s at " +
            appt.clockIn.sentTimestamp.toDate().toLocaleTimeString() + ".";
    } else {
        var subtitle = "With " + withUser.name;
        var summary = "Tutoring session right now with " + withUser.name +
            " for " + appt.for.subject + " on " + appt.time.day + "s at " +
            appt.clockIn.sentTimestamp.toDate().toLocaleTimeString() + ".";
    }

    var that = this;
    const actions = {
        primary: () => {
            that.viewActiveApptDialog(appt, doc.id);
        },
        'Delete': () => {
            return that.viewConfirmationDialog('Delete Appointment?', summary)
                .listen('MDCDialog:closing', async (event) => {
                    if (event.detail.action === 'yes') {
                        $('#doc-activeAppointments-' + doc.id).remove();
                        await that.deleteActiveAppt(appt, doc.id);
                        that.viewSnackbar('Active appointment deleted.');
                    }
                });
        },
    };
    if (this.user.type === 'Tutor') {
        actions.ClockOut = async () => {
            that.currentAppt = that.combineMaps(appt, {
                id: doc.id,
            });
            that.clockOut();
        };
    }

    const card = this.renderCard(doc.id, appt, 'activeAppointments', 'Active Appointment',
        subtitle, summary, actions);
    card.querySelector('.mdc-card__actions').removeChild(
        card.querySelector('[data-fir-click="dismiss"]')
    );
    card.setAttribute('class', 'card-activeAppointments ' + card.getAttribute('class'));
    console.log('Rendered activeAppointment card:', card);

    return card;
};


Tutorbook.prototype.deletePastAppt = async function(appt, id) {
    const db = firebase.firestore();
    const appts = [
        db.collection('usersByEmail').doc(appt.attendees[0].email)
        .collection('pastAppointments').doc(id),
        db.collection('usersByEmail').doc(appt.attendees[1].email)
        .collection('pastAppointments').doc(id),
        db.collection('locations').doc(appt.location.id)
        .collection('pastAppointments').doc(id),
    ];
    try {
        appts.forEach(async (appt) => {
            await appt.delete();
        });
        this.viewSnackbar('Deleted past appointment.');
    } catch (e) {
        console.error('Error while deleting past appointment:', e);
        this.viewSnackbar('Could not delete past appointment.');
    }
};


Tutorbook.prototype.deleteActiveAppt = async function(appt, id) {
    const db = firebase.firestore();
    const appts = [
        db.collection('usersByEmail').doc(appt.attendees[0].email)
        .collection('activeAppointments').doc(id),
        db.collection('usersByEmail').doc(appt.attendees[1].email)
        .collection('activeAppointments').doc(id),
        db.collection('locations').doc(appt.location.id)
        .collection('activeAppointments').doc(id),
    ];
    try {
        appts.forEach(async (appt) => {
            await appt.delete();
        });
        this.viewSnackbar('Deleted active appointment.');
    } catch (e) {
        console.error('Error while deleting active appointment:', e);
        this.viewSnackbar('Could not delete active appointment.');
    }
};


Tutorbook.prototype.renderApptCard = function(doc) {
    const appt = doc.data();
    var cardData = this.cloneMap(appt);

    if (appt.attendees[0].email == firebase.auth().currentUser.email) {
        var withUser = appt.attendees[1];
    } else {
        var withUser = appt.attendees[0];
    }

    var that = this;
    if (this.user.type === 'Supervisor') {
        cardData['subtitle'] = "Between " + appt.attendees[0].name + ' and ' +
            appt.attendees[1].name;
        cardData['summary'] = appt.attendees[0].name + ' and ' +
            appt.attendees[1].name + ' have tutoring sessions for ' +
            appt.for.subject + " on " + appt.time.day + "s at " +
            appt.time.from + ".";
    } else {
        cardData['subtitle'] = "With " + withUser.name;
        cardData['summary'] = "You have tutoring sessions with " + withUser.name +
            " for " + appt.for.subject + " on " + appt.time.day + "s at " +
            appt.time.from + ".";
    }
    cardData['go_to_appt'] = function() {
        var data = that.cloneMap(appt);
        data.id = doc.id;
        that.viewUpcomingApptDialog(data);
    };
    cardData['show_cancel'] = true; // TODO: Only allow supervisor's to cancel
    // appointment's that they've created as a proxy.
    cardData['cancel_appt'] = function() {
        const summary = "Cancel sessions with " + withUser.name + " for " +
            appt.for.subject + " at " + appt.time.from + " on " +
            appt.time.day + "s.";
        that.viewConfirmationDialog('Cancel Appointment?', summary)
            .listen('MDCDialog:closing', async (event) => {
                if (event.detail.action === 'yes') {
                    $('#doc-appointments-' + doc.id).remove();
                    await that.cancelAppt(appt, doc.id);
                    that.log('Canceled appointment with ' + withUser.email +
                        ':', appt);
                    that.viewSnackbar('Canceled appointment with ' + withUser.email + '.');
                }
            });
    };

    var card = this.renderTemplate('card-appointment', cardData);
    card.querySelectorAll('.mdc-button, .mdc-card__primary-action, .mdc-icon-button')
        .forEach((el) => {
            MDCRipple.attachTo(el);
        });

    // Setting the id allows to locating the individual user card
    // NOTE: We cannot just use the doc.id for these cards (as we reuse the
    // same doc IDs for documents that correspond to the same request or appt)
    // So, we have to check that the card types match as well.
    card.setAttribute('id', 'doc-appointments-' + doc.id);
    card.setAttribute('timestamp', doc.data().timestamp);

    return card;
};




// ============================================================================
// DATA STRUCTURE FILTER FUNCTIONS
// ============================================================================


// Helper function that takes in a map and returns only those values that
// correspond with location data.
Tutorbook.prototype.filterLocationData = function(data) {
    return {
        'name': data.name,
        'city': data.city,
        'hours': data.hours,
        'description': data.description,
        'supervisors': data.supervisors,
        'timestamp': data.timestamp,
    };
};


// Helper function that takes in a map and returns only those values that
// correspond with the location data that is editable by request dialogs.
Tutorbook.prototype.filterLocationInputData = function(data) {
    return {
        'name': data.name,
        'city': data.city,
        'hours': data.hours,
        'description': data.description,
        'supervisors': data.supervisors,
    };
};


// Helper function that takes in a map and returns only those values that
// correspond with the request data that is editable by request dialogs.
Tutorbook.prototype.filterRequestInputData = function(data) {
    return {
        'subject': data.subject,
        'time': data.time,
        'message': data.message,
        'location': data.location,
    };
};


// Helper function that takes in a map and returns only those valuse that
// correspond with appt data.
Tutorbook.prototype.filterPastApptData = function(data) {
    return {
        attendees: data.attendees,
        for: this.filterRequestData(data.for),
        time: {
            day: data.time.day,
            from: data.time.from,
            to: data.time.to,
            clocked: data.time.clocked,
        },
        clockIn: data.clockIn,
        clockOut: data.clockOut,
        location: data.location,
        timestamp: data.timestamp,
        id: data.id || '', // NOTE: We use this to be able to access and update the
        // Firestore document across different functions within the app all
        // using the same `this.currentRequest` map.
    };
};


// Helper function that takes in a map and returns only those valuse that
// correspond with appt data.
Tutorbook.prototype.filterApptData = function(data) {
    return {
        attendees: data.attendees,
        for: this.filterRequestData(data.for),
        time: {
            day: data.time.day,
            from: data.time.from,
            to: data.time.to,
            clocked: data.time.clocked || '0:0:0.00',
        },
        location: data.location,
        timestamp: data.timestamp,
        id: data.id || '', // NOTE: We use this to be able to access and update the
        // Firestore document across different functions within the app all
        // using the same `this.currentRequest` map.
    };
};


// Helper function that takes in a map and returns only those values that
// correspond with activeAppt data.
Tutorbook.prototype.filterActiveApptData = function(data) {
    return {
        attendees: data.attendees,
        for: this.filterRequestData(data.for),
        time: {
            day: data.time.day,
            from: data.time.from,
            to: data.time.to,
            clocked: data.time.clocked || '0:0:0.00',
        },
        location: data.location,
        timestamp: data.timestamp,
        // activeAppt only data
        clockIn: {
            sentBy: data.clockIn.sentBy,
            sentTimestamp: data.clockIn.sentTimestamp,
            approvedBy: data.clockIn.approvedBy,
            approvedTimestamp: data.clockIn.approvedTimestamp,
        },
        supervisor: data.supervisor,
        id: data.id || '', // NOTE: We use this to be able to access and update the
        // Firestore document across different functions within the app all
        // using the same `this.currentRequest` map.
    };
};


// Helper function that takes in a map and returns only those values that
// correspond with pastAppt data (this is also how my Firebase Functions will be
// able to process payments, etc).
Tutorbook.prototype.filterPastApptData = function(data) {
    return {
        attendees: data.attendees,
        for: this.filterRequestData(data.for),
        time: {
            day: data.time.day,
            from: data.time.from,
            to: data.time.to,
            clocked: data.time.clocked || '0:0:0.00',
        },
        location: data.location,
        timestamp: data.timestamp,
        // activeAppt only data
        clockIn: {
            sentBy: data.clockIn.sentBy,
            sentTimestamp: data.clockIn.sentTimestamp,
            approvedBy: data.clockIn.approvedBy,
            approvedTimestamp: data.clockIn.approvedTimestamp,
        },
        supervisor: {
            name: data.supervisor.name,
            email: data.supervisor.email,
            phone: data.supervisor.phone,
        },
        // pastAppt only data
        clockOut: {
            sentBy: data.clockIn.sentBy,
            sentTimestamp: data.clockIn.sentTimestamp,
            approvedBy: data.clockIn.approvedBy,
            approvedTimestamp: data.clockIn.approvedTimestamp,
        },
        duration: data.duration,
        payment: data.payment, // TODO: Implement a payment method system
        // that can detect when an appt occurred and select the correct
        // payment method(s) b/c of the timestamp(s).
        id: data.id || '', // NOTE: We use this to be able to access and update the
        // Firestore document across different functions within the app all
        // using the same `this.currentRequest` map.
    };
};


// Helper function that takes in a map and returns only those values that
// correspond with request data.
Tutorbook.prototype.filterRequestData = function(data) {
    return {
        'subject': data.subject,
        'time': data.time,
        'message': data.message,
        'location': data.location,
        'fromUser': this.filterRequestUserData(data.fromUser),
        'toUser': this.filterRequestUserData(data.toUser),
        'timestamp': data.timestamp,
        'payment': data.payment || {
            amount: 0,
            type: 'Free',
            method: 'PayPal',
        },
        'id': data.id || '', // NOTE: We use this to be able to access and update the
        // Firestore document across different functions within the app all
        // using the same `this.currentRequest` map.
    };
};


// Helper function that takes in a map and returns only those values that
// correspond with profile document data.
Tutorbook.prototype.filterProfileData = function(user) {
    return {
        'subjects': user.subjects,
        'grade': user.grade,
        'gender': user.gender,
        'phone': user.phone,
        'email': user.email,
        'bio': user.bio,
        'type': user.type,
        'availability': user.availability,
    };
};


// Helper function that filters a user profile to only the fields that we care
// about in the context of an appt
Tutorbook.prototype.filterApptUserData = function(user) {
    return {
        name: user.name,
        email: user.email,
        phone: user.phone,
        id: user.id,
        photo: user.photo,
        type: user.type,
    };
};


// Helper function that filters a user profile to only the fields that we care
// about in the context of a request
Tutorbook.prototype.filterRequestUserData = function(user) {
    return {
        name: user.name,
        email: user.email,
        phone: user.phone,
        id: user.id,
        photo: user.photo,
        type: user.type,
        gender: user.gender, // We need this to render gender pronouns correctly
        hourlyCharge: (!!user.payments) ? user.payments.hourlyCharge : 0,
        proxy: user.proxy,
    };
};




// ============================================================================
// NEW REQUEST DIALOG
// ============================================================================


// View function that opens a huge select dialog showing a list of the
// supervisor's proxy users.
Tutorbook.prototype.viewSelectProxyUserDialog = function() {
    var that = this;
    return this.getProxyUserEmails().then((emails) => {
        const dialogEl = that.renderTemplate('dialog-list', {
            items: emails,
            title: 'Select Proxy User',
        });
        that.viewDialog(dialogEl);
        const dialog = MDCDialog.attachTo(dialogEl);
        dialogEl.querySelectorAll('.mdc-list-item').forEach((el) => {
            MDCRipple.attachTo(el);
            el.addEventListener('click', () => {
                return that.getUser(el.innerText).then((doc) => {
                    that.currentProxyUser = doc.data();
                    dialog.close('accept');
                });
            });
        });
        dialog.open();
        return dialog;
    }).catch((err) => {
        console.error('Error while viewing the selectProxyUser dialog:', err);
        that.viewSnackbar('Could not open the select proxy user dialog.');
    });

};


// View function that is almost the same as the normal viewNewRequestDialog
// except that this is meant for supervisors to proxy for a given user, so we
// ask them to select which user this newRequest is actually for.
Tutorbook.prototype.viewNewProxyRequestDialog = function(subject, user) {
    var that = this;
    return this.viewSelectProxyUserDialog().then((dialog) => {
        dialog.listen('MDCDialog:closing', (event) => {
            if (event.detail.action === 'accept') {
                var request = {
                    'subject': subject,
                    'fromUser': that.filterRequestUserData(that.currentProxyUser),
                    'toUser': that.filterRequestUserData(user),
                    'timestamp': new Date(),
                    'location': {
                        name: '',
                        id: '',
                    },
                    'message': '',
                    'time': {
                        day: '',
                        from: '',
                        to: '',
                    },
                    'payment': {
                        type: user.payments.type,
                        method: 'PayPal',
                        amount: 0,
                    },
                };
                const locations = that.getUserAvailableLocations(user.availability);
                const times = that.getUserAvailableTimes(user.availability);
                const days = that.getUserAvailableDays(user.availability);
                if (locations.length === 1) {
                    request.location.name = locations[0];
                    that.getLocationsByName(request.location.name).then((snapshot) => {
                        snapshot.forEach((doc) => {
                            request.location.id = doc.id;
                        });
                    });
                }
                if (times.length === 1) {
                    request.time.from = times[0];
                    request.time.to = times[0];
                }
                if (days.length === 1) {
                    request.time.day = days[0];
                }

                // If there are only no options, make sure to tell the user so they don't
                // think that it's a bug (that the only select options are the ones that
                // were already selected).
                if (locations.length < 1 && days.length < 1 && times.length < 1) {
                    that.viewSnackbar(user.name + ' does not have any availability.');
                    return;
                }

                // Then, render and view the editRequestDialog and header	
                const newRequestHeader = that.renderHeader('header-action', {
                    title: 'New Request',
                    // Adding an empty ok function ensures that the button shows up in the
                    // top app bar and that we don't get a data-fir-click error.
                    send: () => { // The actual clickListener is added with the dataManager.
                    },
                    cancel: () => {
                        that.back();
                    },
                });
                const newRequestView = that.renderNewRequestDialog(request, user);
                that.view(newRequestHeader, newRequestView);
                that.currentRequest = that.filterRequestData(request);
                that.addNewRequestManager();
            }
        });
    });
};


// View function that renders the same input dialog as the editRequestDialog but
// adds a different data manager.
Tutorbook.prototype.viewNewRequestDialog = function(subject, user) {
    // First, pre-fill as many options as possible (e.g. if the given user only
    // has one availableLocation, set that as the newRequest location.
    var request = {
        'subject': subject,
        'fromUser': this.filterRequestUserData(this.user),
        'toUser': this.filterRequestUserData(user),
        'timestamp': new Date(),
        'location': {
            name: '',
            id: '',
        },
        'message': '',
        'time': {
            day: '',
            from: '',
            to: '',
        },
        'payment': {
            type: user.payments.type,
            method: 'PayPal',
            amount: 0,
        },
    };
    const locations = this.getUserAvailableLocations(user.availability);
    const times = this.getUserAvailableTimes(user.availability);
    const days = this.getUserAvailableDays(user.availability);
    if (locations.length === 1) {
        request.location.name = locations[0];
        this.getLocationsByName(request.location.name).then((snapshot) => {
            snapshot.forEach((doc) => {
                request.location.id = doc.id;
            });
        });
    }
    if (times.length === 1) {
        request.time.from = times[0];
        request.time.to = times[0];
    }
    if (days.length === 1) {
        request.time.day = days[0];
    }

    // If there are only no options, make sure to tell the user so they don't
    // think that it's a bug (that the only select options are the ones that
    // were already selected).
    if (locations.length < 1 && days.length < 1 && times.length < 1) {
        this.viewSnackbar(user.name + ' does not have any availability.');
        return;
    }

    // Then, render and view the editRequestDialog and header	
    const newRequestHeader = this.renderHeader('header-action', {
        title: 'New Request',
        // Adding an empty ok function ensures that the button shows up in the
        // top app bar and that we don't get a data-fir-click error.
        send: () => { // The actual clickListener is added with the dataManager.
        },
        cancel: () => {
            this.back();
        },
    });
    const newRequestView = this.renderNewRequestDialog(request, user);
    this.view(newRequestHeader, newRequestView);
    this.currentRequest = this.filterRequestData(request);
    this.addNewRequestManager();
};


// Essentially the same as the renderEditRequestDialog, but this dialog includes
// a payment method section if the tutor in question is a paid tutor.
Tutorbook.prototype.renderNewRequestDialog = function(request, user) {
    const mainEl = this.renderTemplate('dialog-input');

    this.log('Viewing newRequest dialog for user:', user);
    // First, parse the user's availability map into location, day, and time arrays
    const userLocations = this.getUserAvailableLocations(user.availability);
    // If we already have a location filled, we want to limit the days to
    // that locations days
    const userDays = (!!request.location && !!request.location.name) ?
        this.getUserAvailableDaysForLocation(
            user.availability,
            request.location.name
        ) : this.getUserAvailableDays(user.availability);
    const userTimes = (!!request.time && !!request.time.day && !!request.location &&
        !!request.location.name) ? this.getUserAvailableTimesForDay(
        user.availability,
        request.time.day,
        request.location.name,
    ) : this.getUserAvailableTimes(user.availability);

    // If there are only no options, make sure to tell the user so they don't
    // think that it's a bug (that the only select options are the ones that
    // were already selected).
    if (userLocations.length < 1 && userDays < 1 && userTimes < 1) {
        this.viewSnackbar(user.name + ' does not have any other availability.');
    }

    // Ensure that inputs are appended in correct order w/ list dividers
    // NOTE: The request time is stored as:
    // time: {
    //   day: 'Friday',
    //   from: '11:00 PM', 
    //   to: '12:00 AM',
    // }
    mainEl.appendChild(this.renderUserHeader(user));
    mainEl.appendChild(this.renderListDivider('At'));
    mainEl.appendChild(
        this.renderSelectItem('Location', request.location.name, this.concatArr([request.location.name], userLocations))
    );
    mainEl.appendChild(
        this.renderSelectItem('Day', request.time.day, this.concatArr([request.time.day], userDays))
    );
    mainEl.appendChild(
        this.renderSelectItem('From', request.time.from, this.concatArr([request.time.from], userTimes))
    );
    mainEl.appendChild(
        this.renderSelectItem('To', request.time.to, this.concatArr([request.time.to], userTimes))
    );
    mainEl.appendChild(this.renderListDivider('For'));
    mainEl.appendChild(
        this.renderSelectItem('Subject', request.subject, this.concatArr([request.subject], user.subjects))
    );
    mainEl.appendChild(this.renderTextAreaItem('Message', request.message));


    // If the tutor is paid, we want to render a payment section w/ paypal
    // buttons in the bottom
    // TODO: Add secure payment data storage and manipulation with Firestore
    if (user.payments.type === 'Paid') {
        mainEl.appendChild(this.renderNewRequestPaymentsItem());
    }

    return mainEl;
};


// Helper function that adds listeners to the profile view and updates the 
// currentUser and his/her profile document as necessary.
Tutorbook.prototype.addNewRequestManager = function() {
    var that = this;
    const dialog = document.querySelector('.main');
    var request = this.currentRequest;

    this.getUser(request.toUser.email).then((doc) => {
        const user = doc.data();
        const availability = doc.data().availability;
        // AT
        const locationEl = dialog.querySelector('#Location');
        const locationSelect = this.attachSelect(locationEl);
        locationSelect.listen('MDCSelect:change', function() {
            request.location.name = locationSelect.value;
            that.getLocationsByName(locationSelect.value).then((snapshot) => {
                snapshot.forEach((doc) => {
                    request.location.id = doc.id;
                });
            });
            that.refreshRequestDialogDayAndTimeSelects(request, availability);
            // TODO: Make the other selects change to match the user's availability
            // at the newly selected location.
        });

        const dayEl = dialog.querySelector('#Day');
        const daySelect = this.attachSelect(dayEl);
        daySelect.listen('MDCSelect:change', () => {
            request.time.day = daySelect.value;
            that.refreshRequestDialogTimeSelects(request, availability);
        });

        const fromTimeEl = dialog.querySelector('#From');
        const fromTimeSelect = this.attachSelect(fromTimeEl);
        fromTimeSelect.listen('MDCSelect:change', () => {
            request.time.from = fromTimeSelect.value;
            that.refreshPaymentAmount();
        });

        const toTimeEl = dialog.querySelector('#To');
        const toTimeSelect = this.attachSelect(toTimeEl);
        toTimeSelect.listen('MDCSelect:change', () => {
            request.time.to = toTimeSelect.value;
            that.refreshPaymentAmount();
        });

        // FOR
        const subjectEl = dialog.querySelector('#Subject');
        const subjectSelect = this.attachSelect(subjectEl);
        subjectSelect.listen('MDCSelect:change', function() {
            request.subject = subjectSelect.value;
        });

        const messageEl = dialog.querySelector('#Message');
        const messageTextField = MDCTextField.attachTo(messageEl);

        if (user.payments.type === 'Paid') {
            this.addNewRequestPaymentManager();
        }

        // Add a requestsIn, requestsOut, and an authorizedPayment doc
        async function newRequest() {
            if (user.payments.type === 'Paid' && !!!that.currentPayment.transaction) {
                // Payment was not completed, don't do anything
                that.viewSnackbar('Please add a valid payment method.');
                return;
            }
            that.back();
            request.message = messageTextField.value;
            request.payment = {
                amount: (!!that.currentPayment && !!that.currentPayment.amount) ? that.currentPayment.amount : 0,
                type: user.payments.type || 'Free',
                method: 'PayPal',
            };

            await that.newRequest(that.currentRequest, that.currentPayment);
            that.log('Request sent to ' + request.toUser.email + ':', request);

            that.closeSnackbar('snackbar');
            if (!that.notificationsEnabled) {
                that.viewConfirmationDialog('Enable Notifications?', 'Enable push ' +
                        'notifications to be notified when ' + request.toUser.name +
                        ' approves, modifies, or rejects your lesson request.')
                    .listen('MDCDialog:closing', (event) => {
                        if (event.detail.action === 'yes') {
                            that.getNotificationPermission();
                        }
                        that.viewUndoSnackbar(
                            'Request sent to ' + request.toUser.email + '.',
                            () => {
                                that.closeSnackbar('snackbar-undo');
                                that.deleteRequest(id, request).then(() => {
                                    that.viewSnackbar('Request canceled.');
                                }).catch((err) => {
                                    that.log('Error while canceling request:', err);
                                    that.viewSnackbar('Could not cancel request.');
                                });
                            });
                    }).catch((err) => {
                        that.log('Error while getting notification ' +
                            'permission:', err);
                        that.viewSnackbar('Could not enable notifications.');
                    });
            } else {
                that.viewUndoSnackbar(
                    'Request sent to ' + request.toUser.email + '.',
                    () => {
                        that.closeSnackbar('snackbar-undo');
                        that.deleteRequest(id, request).then(() => {
                            that.viewSnackbar('Request canceled.');
                        }).catch((err) => {
                            that.log('Error while canceling request:', err);
                            that.viewSnackbar('Could not cancel request.');
                        });
                    });
            }
        };

        // Only add the new request when the check button is clicked
        document.querySelector('.header #send').addEventListener('click', () => {
            newRequest();
        });
    });
};




// ============================================================================
// VIEW REQUEST DIALOG
// ============================================================================


// View function that takes in a map of labels and values and shows a
// full-screen dialog with disabled MDC Outlined TextFields using the labels 
// keys as the floating label text and values as the input values.
Tutorbook.prototype.viewViewRequestDialog = function(request) {
    this.viewIntercom(false);
    /*
     *history.pushState({}, null, '/app/requests/' + request.id + '?d=view');
     */
    var that = this;
    const viewRequestHeader = this.renderHeader('header-action', {
        title: 'View Request',
        edit: () => {
            if (that.user.type === 'Supervisor') {
                // We show the availability of the toUser by default
                that.getUser(request.toUser.email).then((doc) => {
                    const user = doc.data();
                    that.viewEditRequestDialog(request, user);
                });
            } else {
                that.getUser(
                    that.getOtherUser(request.fromUser, request.toUser).email
                ).then((doc) => {
                    // NOTE: We always want to retrieve the latest profile doc
                    const user = doc.data();
                    that.log('Viewing editRequestDialog for user:', user);
                    that.viewEditRequestDialog(request, user);
                });
            }
        },
        showEdit: true, // TODO: Only allow supervisor's to edit requests 
        // that they've created as proxies.
        print: () => {
            this.printPage();
        },
        showApprove: request.toUser.email === this.user.email,
        approve: async () => {
            that.back();
            await that.approveRequest(request, request.id);
            that.viewSnackbar('Approved request from ' + request.fromUser.email + '.');
        },
        cancel: () => {
            this.back();
        },
    });
    const viewRequestView = this.renderViewRequestDialog(request);
    this.view(viewRequestHeader, viewRequestView);
    this.currentRequest = request;
    this.addViewRequestDataManager();
};


// Helper function that disables the given input el
Tutorbook.prototype.disableInput = function(inputEl) {
    ['textarea', 'input'].forEach((input) => {
        inputEl.querySelectorAll(input)
            .forEach((el) => {
                el.setAttribute('disabled', true);
            });
    });

    return inputEl;
};


// Helper function to attach MDC TextFields to viewRequestDialog
Tutorbook.prototype.addViewRequestDataManager = function() {
    const dialog = document.querySelector('.main');
    // NOTE: We have to attach MDC Components after the view is shown or they
    // do not render correctly.
    dialog.querySelectorAll('.mdc-text-field').forEach((el) => {
        MDCTextField.attachTo(el);
    });

    // Disable all inputs
    ['textarea', 'input'].forEach((input) => {
        dialog.querySelectorAll(input)
            .forEach((el) => {
                el.setAttribute('disabled', true);
            });
    });
};


// Render function that returns a full screen dialog of disabled MDC Outlined
// TextFields.
Tutorbook.prototype.renderViewRequestDialog = function(data) {
    const mainEl = this.renderTemplate('dialog-input');
    const otherUser = this.findOtherUser(data.fromUser, data.toUser);

    // Show both the toUser and the fromUser if the currentUser isn't one of
    // them (i.e. they're a supervisor for this location).
    if ([data.fromUser.email, data.toUser.email].indexOf(this.user.email) < 0) {
        // NOTE: We get an error here if the list divider is the same id as
        // the input for time (which it would be #From and #From).
        mainEl.appendChild(this.renderListDivider('From ' + data.fromUser.type.toLowerCase()));
        mainEl.appendChild(this.renderUserHeader(data.fromUser));
        mainEl.appendChild(this.renderListDivider('To ' + data.toUser.type.toLowerCase()));
        mainEl.appendChild(this.renderUserHeader(data.toUser));
    } else {
        mainEl.appendChild(this.renderUserHeader(otherUser));
    }

    // Ensure that inputs are appended in correct order w/ list dividers
    mainEl.appendChild(this.renderListDivider('At'));
    mainEl.appendChild(this.renderTextFieldItem('Location', data.location.name));
    mainEl.appendChild(this.renderTextFieldItem('Day', data.time.day));
    mainEl.appendChild(this.renderTextFieldItem('From', data.time.from));
    mainEl.appendChild(this.renderTextFieldItem('To', data.time.to));
    mainEl.appendChild(this.renderListDivider('For'));
    mainEl.appendChild(this.renderTextFieldItem('Subject', data.subject));
    mainEl.appendChild(this.renderTextAreaItem('Message', data.message));

    // Add payment views if needed
    if (data.payment.type === 'Paid') {
        mainEl.appendChild(this.renderListDivider('Payment'))
        mainEl.appendChild(this.renderTextFieldItem('Amount', '$' + data.payment.amount));
        mainEl.appendChild(this.renderTextFieldItem('Payment method', data.payment.method));
    }

    return mainEl;
};




// ============================================================================
// EDIT REQUEST DIALOG
// ============================================================================


// View function that takes in a map of labels and values and shows a
// full-screen dialog with MDC Outlined Inputs using the labels keys as the
// floating label text and values as the input values.
Tutorbook.prototype.viewEditRequestDialog = async function(request, user) {
    /*
     *history.pushState({}, null, '/app/requests/' + request.id + '?d=edit');
     */
    // NOTE: This function needs the request data passed into it to include
    // the ID so that the addUpdateRequestDataManager will be able to update 
    // the corresponding Firestore document correctly.
    const editRequestHeader = this.renderHeader('header-action', {
        title: 'Edit Request',
        // Adding an empty ok function ensures that the button shows up in the
        // top app bar and that we don't get a data-fir-click error.
        ok: () => { // The actual clickListener is added with the dataManager.
        },
        cancel: () => {
            this.back();
        },
    });
    // TODO: Make this work with async await functions
    const editRequestView = await this.renderEditRequestDialog(request, user);
    this.view(editRequestHeader, editRequestView);
    this.currentRequest = this.filterRequestData(request);
    this.addUpdateRequestDataManager();
};


// Render function that takes in a map of labels and values and returns a
// full-screen dialog with MDC Outlined Inputs using the labels keys as the
// floating label text and values as the input values.
Tutorbook.prototype.renderEditRequestDialog = async function(request, user) {
    const mainEl = this.renderTemplate('dialog-input');
    // First, parse the user's availability map into location, day, and time arrays
    const userLocations = this.getUserAvailableLocations(user.availability);
    // If we already have a location filled, we want to limit the days to
    const userDays = (!!request.location && !!request.location.name) ?
        this.getUserAvailableDaysForLocation(
            user.availability,
            request.location.name
        ) : this.getUserAvailableDays(user.availability);
    const userTimes = (!!request.time && !!request.time.day && !!request.location &&
        !!request.location.name) ? this.getUserAvailableTimesForDay(
        user.availability,
        request.time.day,
        request.location.name,
    ) : this.getUserAvailableTimes(user.availability);

    // If there are only no options, make sure to tell the user so they don't
    // think that it's a bug (that the only select options are the ones that
    // were already selected).
    if (userLocations.length < 1 && userDays < 1 && userTimes < 1) {
        this.viewSnackbar(user.name + ' does not have any other availability.');
    }

    // Ensure that inputs are appended in correct order w/ list dividers
    // NOTE: The request time is stored as:
    // time: {
    //   day: 'Friday',
    //   from: '11:00 PM', 
    //   to: '12:00 AM',
    // }
    if (this.user.type === 'Supervisor') {
        // NOTE: By default we show the toUser's availability for supervisors,
        // and thus this "user" object is the toUser's data.
        const fromUserDoc = await this.getUser(request.fromUser.email);
        const fromUser = fromUserDoc.data();
        mainEl.appendChild(this.renderListDivider('From ' + fromUser.type.toLowerCase()));
        mainEl.appendChild(this.renderUserHeader(fromUser));
        mainEl.appendChild(this.renderListDivider('To ' + user.type.toLowerCase()));
    }
    mainEl.appendChild(this.renderUserHeader(user));
    mainEl.appendChild(this.renderListDivider('At'));
    mainEl.appendChild(
        this.renderSelectItem('Location', request.location.name, this.concatArr([request.location.name], userLocations))
    );
    mainEl.appendChild(
        this.renderSelectItem('Day', request.time.day, this.concatArr([request.time.day], userDays))
    );
    mainEl.appendChild(
        this.renderSelectItem('From', request.time.from, this.concatArr([request.time.from], userTimes))
    );
    mainEl.appendChild(
        this.renderSelectItem('To', request.time.to, this.concatArr([request.time.to], userTimes))
    );
    mainEl.appendChild(this.renderListDivider('For'));
    mainEl.appendChild(
        this.renderSelectItem('Subject', request.subject, this.concatArr([request.subject], user.subjects))
    );
    mainEl.appendChild(this.renderTextAreaItem('Message', request.message));

    return mainEl;
};


// Helper function that adds listeners to the profile view and updates the 
// currentUser and his/her profile document as necessary.
Tutorbook.prototype.addUpdateRequestDataManager = function() {
    var that = this;
    const dialog = document.querySelector('.main');
    var request = this.filterRequestData(this.currentRequest);

    this.getUser(this.getOtherUser(request.toUser, request.fromUser).email).then((doc) => {
        const availability = doc.data().availability;
        // AT
        const locationEl = dialog.querySelector('#Location');
        const locationSelect = this.attachSelect(locationEl);
        locationSelect.listen('MDCSelect:change', function() {
            request.location.name = locationSelect.value;
            that.getLocationsByName(locationSelect.value).then((snapshot) => {
                snapshot.forEach((doc) => {
                    request.location.id = doc.id;
                });
            });
            that.refreshRequestDialogDayAndTimeSelects(request, availability);
            // TODO: Make the other selects change to match the user's availability
            // at the newly selected location.
        });

        const dayEl = dialog.querySelector('#Day');
        const daySelect = this.attachSelect(dayEl);
        daySelect.listen('MDCSelect:change', () => {
            request.time.day = daySelect.value;
            that.refreshRequestDialogTimeSelects(request, availability);
        });

        const fromTimeEl = dialog.querySelector('#From');
        const fromTimeSelect = this.attachSelect(fromTimeEl);
        fromTimeSelect.listen('MDCSelect:change', () => {
            request.time.from = fromTimeSelect.value;
        });

        const toTimeEl = dialog.querySelector('#To');
        const toTimeSelect = this.attachSelect(toTimeEl);
        toTimeSelect.listen('MDCSelect:change', () => {
            request.time.to = toTimeSelect.value;
        });

        // FOR
        const subjectEl = dialog.querySelector('#Subject');
        const subjectSelect = that.attachSelect(subjectEl);
        subjectSelect.listen('MDCSelect:change', function() {
            request.subject = subjectSelect.value;
        });

        const messageEl = dialog.querySelector('#Message');
        const messageTextField = MDCTextField.attachTo(messageEl);

        function modifyRequest() {
            that.back();
            request.message = messageTextField.value;
            that.modifyRequest(
                that.filterRequestData(request),
                request.id
            ).then(() => {
                that.viewSnackbar('Request updated.');

                // Once the request is updated, check if the lastView is an outdated
                // rendering of the viewRequest dialog or dashboard for this request.
                const lastHeaderTitle = that.lastView.header
                    .querySelector('.mdc-top-app-bar__title').innerText;
                if (lastHeaderTitle === 'View Request') {
                    // Rerender that view to match the updated request.
                    that.lastView.main = that.renderViewRequestDialog(request);
                }

            });
        };

        // Only update request when the check button is clicked
        document.querySelector('.header #ok').addEventListener('click', () => {
            modifyRequest();
        });
    });
};




// ============================================================================
// VIEW APPT DIALOGS
// ============================================================================


// View function that is almost the same as the viewUpcoming appt dialog except
// it shows the times that the tutor clocked in and out, the supervisor who
// approved those clockIns/Outs, the duration of the appt, and a link to the
// appointment's payment.
Tutorbook.prototype.viewPastApptDialog = function(appt) {
    var that = this;
    this.viewIntercom(false);
    const viewApptHeader = this.renderHeader('header-action', {
        title: 'Past Appointment',
        print: () => {
            this.printPage();
        },
        cancel: () => {
            this.back();
        },
    });
    const viewApptView = this.renderPastApptDialog(appt);
    this.view(viewApptHeader, viewApptView);
    this.currentAppt = appt;
    this.addApptDataManager();
};


// View function that is almost hte same as the viewUpcoming appt dialog except
// it shows an active timer based on the currentClockIn time.
Tutorbook.prototype.viewActiveApptDialog = function(appt, id) {
    var that = this;
    this.viewIntercom(false);
    const viewApptHeader = this.renderHeader('header-action', {
        title: 'Active Appointment',
        print: () => {
            this.printPage();
        },
        cancel: () => {
            this.back();
        },
    });
    const viewApptView = this.renderUpcomingApptDialog(appt);
    this.view(viewApptHeader, viewApptView);
    this.currentAppt = appt;
    this.addActiveApptDataManager();
};


// View function that is almost like the viewUpcomingAppt function but shows a 
// different header.
Tutorbook.prototype.viewCanceledApptDialog = function(appt) {
    var that = this;
    this.viewIntercom(false);
    const viewApptHeader = this.renderHeader('header-action', {
        title: 'Canceled Appointment',
        showEdit: false,
        print: () => {
            this.printPage();
        },
        cancel: () => {
            this.back();
        },
    });
    const viewApptView = this.renderUpcomingApptDialog(appt);
    this.view(viewApptHeader, viewApptView);
    $('.main .mdc-fab').remove();
    this.currentAppt = appt;
    this.addUpcomingApptDataManager();
};


// View function that is almost like the viewRequest function but shows a 
// different header.
Tutorbook.prototype.viewUpcomingApptDialog = function(appt) {
    var that = this;
    this.viewIntercom(false);
    const viewApptHeader = this.renderHeader('header-action', {
        title: 'Upcoming Appointment',
        edit: () => {
            that.getUser(
                that.getOtherUser(appt.attendees[0], appt.attendees[1]).email
            ).then((doc) => {
                // NOTE: We always want to retrieve the latest profile doc
                const user = doc.data();
                that.viewEditApptDialog(appt, user);
            });
        },
        showEdit: true,
        print: () => {
            this.printPage();
        },
        cancel: () => {
            this.back();
        },
    });
    const viewApptView = this.renderUpcomingApptDialog(appt);
    this.view(viewApptHeader, viewApptView);
    this.currentAppt = appt;
    this.addUpcomingApptDataManager();
};


// Render function that returns a full screen dialog of disabled MDC Outlined
// TextFields.
Tutorbook.prototype.renderUpcomingApptDialog = function(appt) {
    var appt = this.filterApptData(appt);
    const mainEl = this.renderApptDialog(appt);

    // Only show the hours clocked if the user is a tutor
    if (this.user.type === 'Tutor') {
        const atListDivider = mainEl.querySelector('#At');
        mainEl.insertBefore(
            this.renderListDivider('Hours clocked'),
            atListDivider
        )
        mainEl.insertBefore(this.renderSplitListItem(
            this.renderTextField('Current', '0:0:0.00'),
            this.renderTextField('Total', appt.time.clocked || '0:0:0.00'),
        ), atListDivider);
    }

    if (appt.for.payment.type === 'Paid') {
        mainEl.appendChild(
            this.renderListDivider('Payment')
        );
        mainEl.appendChild(
            this.renderTextFieldItem('Amount', appt.for.payment.amount)
        );
        mainEl.appendChild(
            this.renderTextFieldItem('Method', appt.for.payment.method)
        );
    }

    // Only show the hours clocked if the user is a tutor
    if (this.user.type === 'Tutor') {
        mainEl.appendChild(this.renderFab('clockIn'));
    }

    return mainEl;
};


// Render function that is almost the same as the viewUpcoming appt dialog except
// it shows the times that the tutor clocked in and out, the supervisor who
// approved those clockIns/Outs, the duration of the appt, and a link to the
// appointment's payment.
Tutorbook.prototype.renderPastApptDialog = function(appt) {
    const view = this.renderApptDialog(appt);
    const clockIn = appt.clockIn.sentTimestamp.toDate().toLocaleTimeString();
    const clockOut = appt.clockOut.sentTimestamp.toDate().toLocaleTimeString();
    const duration = this.getDurationStringFromDates(
        appt.clockIn.sentTimestamp.toDate(),
        appt.clockOut.sentTimestamp.toDate()
    );

    const atListDivider = view.querySelector('#At');
    view.insertBefore(
        this.renderListDivider('Time clocked'),
        atListDivider
    )
    view.insertBefore(this.renderSplitListItem(
        this.renderTextField('Clock In', clockIn),
        this.renderTextField('Clock Out', clockOut),
    ), atListDivider);
    view.insertBefore(
        this.renderTextFieldItem('Duration', duration),
        atListDivider
    )

    return view;
};


// Render function that returns the basic appt dialog with the fields that every
// appt dialog should have (i.e. making it so that we don't repeat a bunch of 
// code btwn the viewUpcoming/Active/Past appt dialogs)
Tutorbook.prototype.renderApptDialog = function(appt) {
    const request = appt.for;
    const view = this.renderTemplate('dialog-input');

    if (this.user.type === 'Supervisor') {
        // Show user headers for both attendees
        view.appendChild(this.renderListDivider('Attendees'));
        view.appendChild(this.renderUserHeader(request.fromUser));
        view.appendChild(this.renderUserHeader(request.toUser));
    } else {
        const otherUser = this.findOtherUser(request.fromUser, request.toUser);
        view.appendChild(this.renderUserHeader(otherUser));
    }

    view.appendChild(this.renderListDivider('At'))
    view.appendChild(this.renderTextFieldItem('Location', request.location.name))
    view.appendChild(this.renderTextFieldItem('Day', request.time.day))
    view.appendChild(this.renderTextFieldItem('From', request.time.from))
    view.appendChild(this.renderTextFieldItem('To', request.time.to))
    view.appendChild(this.renderListDivider('For'))
    view.appendChild(this.renderTextFieldItem('Subject', request.subject))
    view.appendChild(this.renderTextAreaItem('Message', request.message));

    return view;
};




// ============================================================================
// EDIT APPT DIALOGS
// ============================================================================


// View function that is practically the same as the viewEditRequest function
Tutorbook.prototype.viewEditApptDialog = async function(appt, user) {
    var appt = this.filterApptData(appt);
    /*
     *history.pushState({}, null, '/app/requests/' + request.id + '?d=edit');
     */
    const editApptHeader = this.renderHeader('header-action', {
        title: 'Edit Appointment',
        // Adding an empty ok function ensures that the button shows up in the
        // top app bar and that we don't get a data-fir-click error.
        ok: () => { // The actual clickListener is added with the dataManager.
        },
        cancel: () => {
            this.back();
        },
    });
    const editApptView = await this.renderEditRequestDialog(appt.for, user);
    this.view(editApptHeader, editApptView);
    this.currentAppt = appt;
    this.addUpdateApptDataManager();
};


// Helper function that sets the current clocked time and total time based on
// the currentClockInTimer.
Tutorbook.prototype.addActiveApptDataManager = function() {
    const appt = this.filterActiveApptData(this.currentAppt);
    const dialog = this.addApptDataManager();
    const currentTimeDisplay = dialog.querySelector('#Current input');
    const totalTimeDisplay = dialog.querySelector('#Total input');

    currentTimeDisplay.value = this.getDurationStringFromDates(
        this.currentAppt.clockIn.sentTimestamp.toDate(),
        new Date()
    );
    totalTimeDisplay.value = this.getDurationStringFromDates(
        this.currentAppt.clockIn.sentTimestamp.toDate(),
        new Date()
    );
    console.log(currentTimeDisplay.value);
    this.currentClockInTimer = window.setInterval(this.updateTimes, 10);
    document
        .querySelectorAll('.header .mdc-top-app-bar .material-icons')
        .forEach((originalNavButton) => {
            var navButton = originalNavButton.cloneNode(true);
            originalNavButton.parentNode.replaceChild(navButton, originalNavButton);
            navButton.addEventListener('click', () => {
                that.viewSnackbar('Navigation is locked until you clock out.');
            });
        });
    const clockInButton = dialog.querySelector('.mdc-fab');
    MDCRipple.attachTo(clockInButton);
    var that = this;
    clockInButton.addEventListener('click', () => {
        that.clock();
    });
    clockInButton.querySelector('.mdc-fab__label').innerText = 'Clock Out';
};


// Helper function to attach MDC TextFields to viewApptDialog
Tutorbook.prototype.addUpcomingApptDataManager = function() {
    const appt = this.filterApptData(this.currentAppt);
    const dialog = this.addApptDataManager();

    if (this.user.type === 'Tutor') {
        const clockInButton = dialog.querySelector('.mdc-fab');
        MDCRipple.attachTo(clockInButton);
        var that = this;
        clockInButton.addEventListener('click', () => {
            that.clock();
        });
    }

    if (appt.for.payment.type === 'Paid') {
        // addApptDataManager attaches all mdc-text-fields
        $('main #Amount input').attr('disabled', 'true');
        $('main #Method input').attr('disabled', 'true');
    }
};


// Helper function that attaches MDC TextFields to a viewApptDialog and nothing
// else
Tutorbook.prototype.addApptDataManager = function() {
    const dialog = document.querySelector('.main');

    // NOTE: We have to attach MDC Components after the view is shown or they
    // do not render correctly.
    dialog.querySelectorAll('.mdc-text-field').forEach((el) => {
        MDCTextField.attachTo(el);
    });

    // Disable all inputs
    ['textarea', 'input'].forEach((input) => {
        dialog.querySelectorAll(input)
            .forEach((el) => {
                el.setAttribute('disabled', true);
            });
    });

    return dialog;
};


// Helper function that adds listeners to the editAppt view and updates the appt
// doc as necessary.
Tutorbook.prototype.addUpdateApptDataManager = function() {
    var that = this;
    const dialog = document.querySelector('.main');
    var appt = this.filterApptData(this.currentAppt);
    const id = this.currentAppt.id; // NOTE: filterApptData gets rid of the id

    // AT
    const locationEl = dialog.querySelector('#Location');
    const locationSelect = this.attachSelect(locationEl);
    locationSelect.listen('MDCSelect:change', function() {
        appt.for.location.name = locationSelect.value;
        appt.location.name = locationSelect.value;
        that.getLocationsByName(locationSelect.value).then((snapshot) => {
            snapshot.forEach((doc) => {
                appt.location.id = doc.id;
                appt.for.location.id = doc.id;
            });
        });
        // TODO: Make the other selects change to match the user's availability
        // at the newly selected location.
    });

    const dayEl = dialog.querySelector('#Day');
    const daySelect = this.attachSelect(dayEl);
    daySelect.listen('MDCSelect:change', () => {
        appt.time.day = daySelect.value;
        appt.for.time.day = daySelect.value;
    });

    const fromTimeEl = dialog.querySelector('#From');
    const fromTimeSelect = this.attachSelect(fromTimeEl);
    fromTimeSelect.listen('MDCSelect:change', () => {
        appt.time.from = fromTimeSelect.value;
        appt.for.time.from = fromTimeSelect.value;
    });

    const toTimeEl = dialog.querySelector('#To');
    const toTimeSelect = this.attachSelect(toTimeEl);
    toTimeSelect.listen('MDCSelect:change', () => {
        appt.time.to = toTimeSelect.value;
        appt.for.time.to = toTimeSelect.value;
    });

    // FOR
    const subjectEl = dialog.querySelector('#Subject');
    const subjectSelect = that.attachSelect(subjectEl);
    subjectSelect.listen('MDCSelect:change', function() {
        appt.for.subject = subjectSelect.value;
    });

    const messageEl = dialog.querySelector('#Message');
    const messageTextField = MDCTextField.attachTo(messageEl);

    async function modifyAppt() {
        that.back();
        that.log(that.filterApptData(appt));
        appt.for.message = messageTextField.value;
        await that.modifyAppt(that.filterApptData(appt), id);
        that.viewSnackbar('Appointment updated.');

        // Once the appt is updated, check if the lastView is an outdated
        // rendering of the viewAppt dialog or dashboard for this appt.
        const lastHeaderTitle = that.lastView.header
            .querySelector('.mdc-top-app-bar__title').innerText;
        if (lastHeaderTitle === 'View Appointment') {
            // Rerender that view to match the updated appt.
            that.lastView.main = that.renderViewRequestDialog(appt.for);
        }
    };

    // Only update appt when the check button is clicked
    document.querySelector('.header #ok').addEventListener('click', () => {
        modifyAppt();
    });
};




// ============================================================================
// DATA CONVERSION HELPER FUNCTIONS
// ============================================================================


// Helper function that returns an availability string that is cut off after 20
// characters with a ...
Tutorbook.prototype.getFilterAvailabilityString = function(data) {
    const str = this.getAvailabilityString(data);
    return this.shortenString(str, 20);
};


// Helper function to cut off strings with a ...
Tutorbook.prototype.shortenString = function(str, length) {
    if (str.length <= length) {
        return str;
    }
    var result = '';
    str.split('').forEach((chr) => {
        if (result.length < length - 3) {
            result += chr;
        }
    });
    result += '...';
    return result;
};


// Helper function that takes in a map of day, location, fromTime, and toTime
// values and returns a string for the profile availability textFields.
Tutorbook.prototype.getAvailabilityString = function(data) {
    return data.day + 's at the ' + data.location + ' from ' + data.fromTime +
        ' to ' + data.toTime;
};


// Helper function to parse a profile availability string into a map of day,
// location, fromTime, and toTime values.
Tutorbook.prototype.parseAvailabilityString = function(string, openingDialog) {
    // NOTE: The string is displayed in the textField as such:
    // 'Friday at the Gunn Library from 11:00 AM to 12:00 PM'

    // First check if this is a valid string. If it isn't we want to throw
    // an error so nothing else happens.
    if (string.indexOf('at the') < 0 || string.indexOf('from') < 0 || string.indexOf('to') < 0) {
        if (openingDialog) {
            return {
                day: '',
                location: '',
                fromTime: '',
                toTime: '',
            };
        }
        this.viewSnackbar('Invalid availability. Please click on the input ' +
            'to re-select your availability.');
        throw new Error('Invalid availabilityString:', string);
    }

    // Helper function to return the string between the two others within an
    // array of strings
    function getStringBetween(splitString, startString, endString) {
        // We know that 'Friday at the' and 'from 11:00 AM' will always be the
        // same.
        const startIndex = splitString.indexOf(startString);
        const endIndex = splitString.indexOf(endString);
        var result = "";
        for (var i = startIndex + 1; i < endIndex; i++) {
            result += splitString[i] + ' ';
        }
        return result.trim();
    };

    // Same as above but without an endString (returns from startString
    // until the end)
    function getStringUntilEnd(splitString, startString) {
        const startIndex = splitString.indexOf(startString);
        var result = "";
        for (var i = startIndex + 1; i < splitString.length; i++) {
            result += splitString[i] + ' ';
        }
        return result.trim();
    };

    const split = string.split(' ');
    const day = split[0].substring(0, split[0].length - 1);
    const location = getStringBetween(split, 'the', 'from');
    const fromTime = getStringBetween(split, 'from', 'to');
    const toTime = getStringUntilEnd(split, 'to');

    return {
        day: day,
        location: location,
        fromTime: fromTime,
        toTime: toTime,
    };
};


// Helper function to return an array of timeStrings (e.g. '11:00 AM') for every
// 30 min between the startTime and endTime. (Or for every period in that day's
// schedule if the startTime and endTime are given as periods.)
// TODO: Make sure to sync w/ the Gunn App to be able to have an up to date
// daily period/schedule data.
Tutorbook.prototype.getTimesBetween = function(start, end, day) {
    var times = [];
    // First check if the time is a period
    if (this.data.periods.indexOf(start) >= 0) {
        // Check the day given and return the times between those two
        // periods on that given day.
        var periods = this.data.gunnSchedule[day];
        for (
            var i = periods.indexOf(start); i <= periods.indexOf(end); i++
        ) {
            times.push(periods[i]);
        }
    } else {
        var timeStrings = this.data.timeStrings;
        // Otherwise, grab every 30 min interval from the start and the end
        // time.
        for (
            var i = timeStrings.indexOf(start); i <= timeStrings.indexOf(end); i += 30
        ) {
            times.push(this.data.timeStrings[i]);
        }
    }
    return times;
};


// Helper function that returns the duration (in hrs:min:sec) between two
// timeStrings
Tutorbook.prototype.getDurationFromStrings = function(startString, endString) {
    // TODO: Right now, we just support getting times from actual time strings
    // not periods. To implement getting hours from periods, we need to
    // know exactly the day that the startString and endString took place
    // and the schedule for that day.
    var duration = '';
    var hours = this.getHoursFromStrings(startString, endString);
    duration += hours.split('.')[0];
    // NOTE: We multiply by 6 and not 60 b/c we already got rid of that
    // decimal when we split it (i.e. 0.5 becomes just 5)
    var minutes = Number(hours.split('.')[1]) * 6;
    duration += ':' + minutes;
    return duration;
};


// Helper function that returns the hours between two timeStrings
Tutorbook.prototype.getHoursFromStrings = function(startString, endString) {
    var times = this.data.timeStrings;
    var minutes = Math.abs(times.indexOf(endString) - times.indexOf(startString));
    return minutes / 60 + '';
};


// Helper function to return an array of strings of the user's availability
Tutorbook.prototype.getAvailabilityStrings = function(availability) {
    // NOTE: User availability is stored in the Firestore database as:
    // availability: {
    // 	Gunn Academic Center: {
    //     Friday: [
    //       { open: '10:00 AM', close: '3:00 PM' },
    //       { open: '10:00 AM', close: '3:00 PM' },
    //     ],
    //   },
    //   Paly Tutoring Center: {
    //   ...
    //   },
    // };
    var that = this;
    const availableTimes = [];
    Object.entries(availability).forEach((entry) => {
        var location = entry[0];
        var times = entry[1];
        Object.entries(times).forEach((time) => {
            var day = time[0];
            var openAndCloseTimes = time[1];
            openAndCloseTimes.forEach((openAndCloseTime) => {
                availableTimes.push(that.getAvailabilityString({
                    day: day,
                    location: location,
                    fromTime: openAndCloseTime.open,
                    toTime: openAndCloseTime.close,
                }) + '.');
            });
        })
    });

    // Next, sort the strings by day
    const result = [];
    const temp = {};
    availableTimes.forEach((time) => {
        var day = time.split(' ')[0];
        try {
            temp[day].push(time);
        } catch (e) {
            temp[day] = [time];
        }
    });
    [
        'Mondays',
        'Tuesdays',
        'Wednesdays',
        'Thursdays',
        'Fridays',
        'Saturdays',
        'Sundays',
    ].forEach((day) => {
        Object.entries(temp).forEach((entry) => {
            if (entry[0] === day) {
                entry[1].forEach((time) => {
                    result.push(time);
                });
            }
        });
    });
    return result;
};


// Helper function to return all of a user's possible days based on their
// availability map.
Tutorbook.prototype.getLocationAvailableDays = function(availability) {
    // NOTE: Location availability is stored in the Firestore database as:
    // availability: {
    //     Friday: [
    //       { open: '10:00 AM', close: '3:00 PM' },
    //       { open: '10:00 AM', close: '3:00 PM' },
    //     ],
    //   }
    //   ...
    // };
    var days = [];
    Object.entries(availability).forEach((time) => {
        var day = time[0];
        days.push(day);
    });
    return days;
};


// Helper function to return a list of all a location's times for a given
// day.
Tutorbook.prototype.getLocationTimesByDay = function(day, hours) {
    // NOTE: Location availability is stored in the Firestore database as:
    // availability: {
    //     Friday: [
    //       { open: '10:00 AM', close: '3:00 PM' },
    //       { open: '10:00 AM', close: '3:00 PM' },
    //     ],
    //   }
    //   ...
    // };
    var times = [];
    hours[day].forEach((time) => {
        times.push(time);
    });

    // Now, we have an array of time maps (i.e. { open: '10:00 AM', close: '3:00 PM' })
    var result = [];
    times.forEach((timeMap) => {
        result = result.concat(this.getTimesBetween(timeMap.open, timeMap.close, day));
    });
    return result;
};


// Helper function to return all of a user's possible times based on their
// availability map.
Tutorbook.prototype.getLocationAvailableTimes = function(availability) {
    // NOTE: Location availability is stored in the Firestore database as:
    // availability: {
    //     Friday: [
    //       { open: '10:00 AM', close: '3:00 PM' },
    //       { open: '10:00 AM', close: '3:00 PM' },
    //     ],
    //   }
    //   ...
    // };
    var that = this;
    var result = [];
    Object.entries(availability).forEach((time) => {
        var timeArray = time[1];
        var day = time[0];
        timeArray.forEach((time) => {
            result.push(that.combineMaps(time, {
                day: day
            }));
        });
    });

    // Now, we have an array of time maps (i.e. { open: '10:00 AM', close: '3:00 PM' })
    var times = [];
    result.forEach((timeMap) => {
        times = times.concat(this.getTimesBetween(timeMap.open, timeMap.close, timeMap.day));
    });
    return times;
};


// Helper function to return all of a user's possible locations based on their
// availability map.
Tutorbook.prototype.getUserAvailableLocations = function(availability) {
    // NOTE: Availability is stored in the Firestore database as:
    // availability: {
    //   Gunn Library: {
    //     Friday: [
    //       { open: '10:00 AM', close: '3:00 PM' },
    //       { open: '10:00 AM', close: '3:00 PM' },
    //     ],
    //   }
    //   ...
    // };
    var locations = [];
    Object.entries(availability).forEach((entry) => {
        locations.push(entry[0]);
    });
    return locations;
};


// Helper function to return a user's available days for a given location
Tutorbook.prototype.getUserAvailableDaysForLocation = function(availability, location) {
    // NOTE: Availability is stored in the Firestore database as:
    // availability: {
    //   Gunn Library: {
    //     Friday: [
    //       { open: '10:00 AM', close: '3:00 PM' },
    //       { open: '10:00 AM', close: '3:00 PM' },
    //     ],
    //   }
    //   ...
    // };
    try {
        var days = [];
        Object.entries(availability[location]).forEach((entry) => {
            var day = entry[0];
            var times = entry[1];
            days.push(day);
        });
        return days;
    } catch (e) {
        // This is most likely b/c the user's profile's location we deleted
        // or changed somehow
        console.log('Getting userAvailableDaysForLocation ' + location +
            ' from availability:', availability);
        console.warn('Error while getting userAvailableDaysForLocation:', e);
        var that = this;
        this.viewNotificationDialog('Update Availability?', 'The availability ' +
                ' shown here is not up-to-date. The ' + location + ' may ' +
                'no longer be open at these times or this user may no longer ' +
                'be available (they can change their availability from their ' +
                'profile). Please cancel this request and ' +
                'create a new one.')
            .listen('MDCDialog:closing', (event) => {
                that.back();
            });
        return this.getUserAvailableDays(availability);
    }
};


// Helper function to return a user's available times for a given day and location
Tutorbook.prototype.getUserAvailableTimesForDay = function(availability, day, location) {
    // NOTE: Availability is stored in the Firestore database as:
    // availability: {
    //   Gunn Library: {
    //     Friday: [
    //       { open: '10:00 AM', close: '3:00 PM' },
    //       { open: '10:00 AM', close: '3:00 PM' },
    //     ],
    //   }
    //   ...
    // };
    try {
        var times = [];
        Object.entries(availability[location]).forEach((entry) => {
            var d = entry[0];
            var t = entry[1];
            if (d === day) {
                times = t;
            }
        });

        var that = this;
        var result = [];
        times.forEach((time) => {
            result = result.concat(that.getTimesBetween(time.open, time.close, day));
        });
        return result;
    } catch (e) {
        // This is most likely b/c the user's profile's location we deleted
        // or changed somehow
        console.log('Getting userAvailableTimesForDay ' + day + ' at the ' +
            location + ' from availability:', availability);
        console.warn('Error while getting userAvailableTimesForDay:', e);
        var that = this;
        this.viewNotificationDialog('Update Availability?', 'The availability ' +
                ' shown here is not up-to-date. The ' + location + ' may ' +
                'no longer be open at these times or this user may no longer ' +
                'be available (they can change their availability from their ' +
                'profile). Please cancel this request and ' +
                'create a new one.')
            .listen('MDCDialog:closing', (event) => {
                that.back();
            });
        return this.getUserAvailableTimes(availability);
    }
};


// Helper function to return all of a user's possible days based on their
// availability map.
Tutorbook.prototype.getUserAvailableDays = function(availability) {
    // NOTE: Availability is stored in the Firestore database as:
    // availability: {
    //   Gunn Library: {
    //     Friday: [
    //       { open: '10:00 AM', close: '3:00 PM' },
    //       { open: '10:00 AM', close: '3:00 PM' },
    //     ],
    //   }
    //   ...
    // };
    var days = [];
    Object.entries(availability).forEach((entry) => {
        var times = entry[1];
        Object.entries(times).forEach((time) => {
            var day = time[0];
            days.push(day);
        });
    });
    return days;
};


// Helper function to return all of a user's possible times based on their
// availability map.
Tutorbook.prototype.getUserAvailableTimes = function(availability) {
    // NOTE: Availability is stored in the Firestore database as:
    // availability: {
    //   Gunn Library: {
    //     Friday: [
    //       { open: '10:00 AM', close: '3:00 PM' },
    //       { open: '10:00 AM', close: '3:00 PM' },
    //     ],
    //   }
    //   ...
    // };
    var that = this;
    var result = [];
    Object.entries(availability).forEach((entry) => {
        var location = entry[0];
        var times = entry[1];
        Object.entries(times).forEach((time) => {
            var timeArray = time[1];
            var day = time[0];
            timeArray.forEach((time) => {
                result.push(that.combineMaps(time, {
                    day: day
                }));
            });
        });
    });

    // Now, we have an array of time maps (i.e. { open: '10:00 AM', close: '3:00 PM' })
    var times = [];
    result.forEach((timeMap) => {
        times = times.concat(this.getTimesBetween(timeMap.open, timeMap.close, timeMap.day));
    });
    return times;
};




// ============================================================================
// HELP & FEEDBACK VIEW
// ============================================================================


// Render function that returns the feedback view that has an input dialog like
// my website contact page (fields for subject, email, a message, and a send
// button). TODO: Make the feedback view a card view with past messages to me
// and my answers to them.
Tutorbook.prototype.renderFeedbackView = function() {
    const mainEl = this.renderTemplate('feedback', {
        welcome: !this.onMobile,
    });
    if (this.onMobile) {
        // TODO: Render and append a welcome card that spans the whole top
        const welcomeCard = this.renderWelcomeCard({
            title: 'Help & Feedback',
            // TODO: Actually sync appointments and show the correct status
            // message here.
            summary: 'Ask us any question, and we\'ll try to get back to you' +
                ' as soon as we can.',
            subtitle: 'Direct line to your app\'s creator',
        });
        welcomeCard.setAttribute('style', 'margin: 16px;');
        const welcomeDivider = this.renderListDivider('');
        mainEl.insertBefore(welcomeDivider, mainEl.firstElementChild);
        mainEl.insertBefore(welcomeCard, mainEl.firstElementChild);
    }
    const inputs = mainEl.querySelector('.dialog-input');
    inputs.appendChild(this.renderTextFieldItem('Subject', ''));
    inputs.appendChild(this.renderTextAreaItem('Message', ''));
    mainEl.appendChild(this.renderFab('sendMessage'));
    return mainEl;
};


// View function that opens the feedback view
Tutorbook.prototype.viewFeedback = function() {
    this.viewIntercom(false);
    history.pushState({}, null, '/app/feedback');
    this.navSelected = 'Help & Feedback';
    const feedbackView = this.renderFeedbackView();
    const feedbackHeader = this.renderHeader('header-main', {
        title: 'Help & Feedback',
    });
    this.view(feedbackHeader, feedbackView);
    this.addFeedbackManager();
};


// Data manager function that sends the feedback message to me when the user
// clicks the sendMessage fab (IF all of the fields are valid)
Tutorbook.prototype.addFeedbackManager = function() {
    const view = document.querySelector('main .feedback');

    const subjectEl = view.querySelector('#Subject');
    const subjectTextField = MDCTextField.attachTo(subjectEl);

    const messageEl = view.querySelector('#Message');
    const messageTextField = MDCTextField.attachTo(messageEl);

    const sendMessageFab = view.querySelector('.mdc-fab');
    MDCRipple.attachTo(sendMessageFab);
    var that = this;
    sendMessageFab.addEventListener('click', () => {
        if (subjectTextField.value === '') {
            subjectTextField.required = true;
            subjectTextField.valid = false;
            if (messageTextField.value === '') {
                messageTextField.required = true;
                messageTextField.valid = false;
            }
            return;
        }
        if (messageTextField.value === '') {
            messageTextField.required = true;
            messageTextField.valid = false;
            return;
        }
        return that.sendFeedback(
            subjectTextField.value,
            messageTextField.value
        ).then(() => {
            // Clear the fields
            messageTextField.value = '';
            subjectTextField.value = '';
        });
    });
};


// Data flow function that sends me a feedback message
Tutorbook.prototype.sendFeedback = function(subject, message) {
    const feedback = {
        subject: subject,
        message: message,
        from: this.filterRequestUserData(this.user),
        timestamp: new Date(),
    };
    var that = this;
    return firebase.firestore().collection('feedback')
        .doc()
        .set(feedback).then(() => {
            that.log('Feedback was sent.');
            that.viewSnackbar('Sent feedback.');
        }).catch((err) => {
            that.log('Error while sending feedback:', err);
            that.viewSnackbar('Could not send feedback.');
        });
};




// ============================================================================
// DIALOG REFRESH INPUTS HELPER FUNCTIONS
// ============================================================================


// Helper function that rerenders the time and day selects when a new location 
// is chosen (this is for a request dialog).
Tutorbook.prototype.refreshRequestDialogDayAndTimeSelects = function(request, a) {
    var that = this;
    var days = this.getUserAvailableDaysForLocation(a, request.location.name);
    var times = this.getUserAvailableTimesForDay(a, days[0], request.location.name);

    if (times.length === 1) {
        request.time.from = times[0];
        request.time.to = times[0];
    }
    if (days.length === 1) {
        request.time.day = days[0];
    }

    // If there are only no options, make sure to tell the user so they don't
    // think this it's a bug (this the only select options are the ones this
    // were already selected).
    if (days.length < 1 && times.length < 1) {
        this.viewSnackbar(request.toUser.name + ' does not have any ' +
            'availability at the ' + request.location.name + '.');
        return;
    }

    var toTimeEl = this
        .renderSelect('To', request.time.to || '', times)
    var oldToTimeEl = document.querySelector('main .dialog-input')
        .querySelector('#To');
    oldToTimeEl.parentNode.insertBefore(toTimeEl, oldToTimeEl);
    oldToTimeEl.parentNode.removeChild(oldToTimeEl);
    var toTimeSelect = this.attachSelect(toTimeEl);
    toTimeSelect.listen('MDCSelect:change', function() {
        request.time.to = toTimeSelect.value;
        that.refreshPaymentAmount();
    });

    var fromTimeEl = this
        .renderSelect('From', request.time.from || '', times);
    var oldFromTimeEl = document.querySelector('main .dialog-input')
        .querySelector('#From');
    oldFromTimeEl.parentNode.insertBefore(fromTimeEl, oldFromTimeEl);
    oldFromTimeEl.parentNode.removeChild(oldFromTimeEl);
    var fromTimeSelect = this.attachSelect(fromTimeEl);
    fromTimeSelect.listen('MDCSelect:change', function() {
        request.time.from = fromTimeSelect.value;
        that.refreshPaymentAmount();
    });

    var dayEl = this
        .renderSelect('Day', request.time.day || '', days);
    var oldDayEl = document.querySelector('main .dialog-input')
        .querySelector('#Day');
    oldDayEl.parentNode.insertBefore(dayEl, oldDayEl);
    oldDayEl.parentNode.removeChild(oldDayEl);
    var daySelect = this.attachSelect(dayEl);
    daySelect.listen('MDCSelect:change', function() {
        request.time.day = daySelect.value;
        that.refreshRequestDialogTimeSelects(request, a);
    });
};


// Helper function that rerenders the time and day selects when a new location
// is chosen.
Tutorbook.prototype.refreshDayAndTimeSelects = function(availableTime) {
    var that = this;
    that.getLocationsByName(availableTime.location).then((snapshot) => {
        snapshot.forEach((doc) => {
            var location = doc.data();
            // Set the available days based on the location's
            // availability.

            var times = that.getLocationAvailableTimes(location.hours);
            var days = that.getLocationAvailableDays(location.hours);

            if (times.length === 1) {
                availableTime.fromTime = times[0];
                availableTime.toTime = times[0];
            }
            if (days.length === 1) {
                availableTime.day = days[0];
            }

            // If there are only no options, make sure to tell the user so they don't
            // think that it's a bug (that the only select options are the ones that
            // were already selected).
            if (days.length < 1 && times.length < 1) {
                that.viewSnackbar(location.name + ' does not have any open ' +
                    'hours.');
                return;
            }

            var toTimeEl = that
                .renderSelect('To', availableTime.toTime || '', times)
            var oldToTimeEl = document.querySelector('.mdc-dialog--open #To')
            oldToTimeEl.parentNode.insertBefore(toTimeEl, oldToTimeEl);
            oldToTimeEl.parentNode.removeChild(oldToTimeEl);
            var toTimeSelect = that.attachSelect(toTimeEl);
            toTimeSelect.listen('MDCSelect:change', function() {
                availableTime.toTime = toTimeSelect.value;
            });

            var fromTimeEl = that
                .renderSelect('From', availableTime.fromTime || '', times);
            var oldFromTimeEl = document.querySelector('.mdc-dialog--open #From');
            oldFromTimeEl.parentNode.insertBefore(fromTimeEl, oldFromTimeEl);
            oldFromTimeEl.parentNode.removeChild(oldFromTimeEl);
            var fromTimeSelect = that.attachSelect(fromTimeEl);
            fromTimeSelect.listen('MDCSelect:change', function() {
                availableTime.fromTime = fromTimeSelect.value;
            });

            var dayEl = that
                .renderSelect('Day', availableTime.day || '', days);
            var oldDayEl = document.querySelector('.mdc-dialog--open #Day');
            oldDayEl.parentNode.insertBefore(dayEl, oldDayEl);
            oldDayEl.parentNode.removeChild(oldDayEl);
            var daySelect = that.attachSelect(dayEl);
            daySelect.listen('MDCSelect:change', function() {
                availableTime.day = daySelect.value;
                that.refreshTimeSelects(availableTime);
            });
        });
    });
};


// Helper function that rerenders the time selects when a new day is chosen.
Tutorbook.prototype.refreshRequestDialogTimeSelects = function(request, a) {
    var that = this;
    var times = this.getUserAvailableTimesForDay(a, request.time.day, request.location.name);

    if (times.length === 1) {
        request.time.from = times[0];
        request.time.to = times[0];
    }

    // If there are only no options, make sure to tell the user so they don't
    // think this it's a bug (this the only select options are the ones this
    // were already selected).
    if (times.length < 1) {
        this.viewSnackbar(request.toUser.name + ' does not have any ' +
            'availability on ' + request.day + 's.');
        return;
    }

    var toTimeEl = this
        .renderSelect('To', request.time.to || '', times)
    var oldToTimeEl = document.querySelector('main .dialog-input')
        .querySelector('#To');
    oldToTimeEl.parentNode.insertBefore(toTimeEl, oldToTimeEl);
    oldToTimeEl.parentNode.removeChild(oldToTimeEl);
    var toTimeSelect = this.attachSelect(toTimeEl);
    toTimeSelect.listen('MDCSelect:change', function() {
        request.time.to = toTimeSelect.value;
        that.refreshPaymentAmount();
    });

    var fromTimeEl = this
        .renderSelect('From', request.time.from || '', times);
    var oldFromTimeEl = document.querySelector('main .dialog-input')
        .querySelector('#From');
    oldFromTimeEl.parentNode.insertBefore(fromTimeEl, oldFromTimeEl);
    oldFromTimeEl.parentNode.removeChild(oldFromTimeEl);
    var fromTimeSelect = this.attachSelect(fromTimeEl);
    fromTimeSelect.listen('MDCSelect:change', function() {
        request.time.from = fromTimeSelect.value;
        that.refreshPaymentAmount();
    });
};


// Helper function that rerenders the time selects when a new day is chosen.
Tutorbook.prototype.refreshTimeSelects = function(availableTime) {
    var that = this;
    that.getLocationsByName(availableTime.location).then((snapshot) => {
        snapshot.forEach((doc) => {
            var location = doc.data();
            // Set the available days based on the location's
            // availability.

            var times = that.getLocationTimesByDay(
                availableTime.day,
                location.hours
            );

            if (times.length === 1) {
                availableTime.fromTime = times[0];
                availableTime.toTime = times[0];
            }

            // If there are only no options, make sure to tell the user so they don't
            // think that it's a bug (that the only select options are the ones that
            // were already selected).
            if (times.length < 1) {
                that.viewSnackbar(location.name + ' does not have any open ' +
                    'hours.');
                return;
            }

            var toTimeEl = that
                .renderSelect('To', availableTime.toTime || '', times)
            var oldToTimeEl = document.querySelector('.mdc-dialog--open #To');
            oldToTimeEl.parentNode.insertBefore(toTimeEl, oldToTimeEl);
            oldToTimeEl.parentNode.removeChild(oldToTimeEl);
            var toTimeSelect = that.attachSelect(toTimeEl);
            toTimeSelect.listen('MDCSelect:change', function() {
                availableTime.toTime = toTimeSelect.value;
            });

            var fromTimeEl = that
                .renderSelect('From', availableTime.fromTime || '', times);
            var oldFromTimeEl = document.querySelector('.mdc-dialog--open #From');
            oldFromTimeEl.parentNode.insertBefore(fromTimeEl, oldFromTimeEl);
            oldFromTimeEl.parentNode.removeChild(oldFromTimeEl);
            var fromTimeSelect = that.attachSelect(fromTimeEl);
            fromTimeSelect.listen('MDCSelect:change', function() {
                availableTime.fromTime = fromTimeSelect.value;
            });
        });
    });

};


// Helper function that rerenders the toTimeSelect when a fromTime is chosen.
Tutorbook.prototype.refreshToTimeSelect = function(fromTime) {

};


// Helper function that rerenders the fromTimeSelect whne a toTime is chosen.
Tutorbook.prototype.refreshFromTimeSelect = function(toTime) {

};




// ============================================================================
// DIALOG COMPONENT RENDER FUNCTIONS
// ============================================================================


// Render function that returns a MDC List Divider
Tutorbook.prototype.renderActionListDivider = function(text, actions) {
    return this.renderTemplate('action-list-divider', {
        'text': text,
        'add_field': actions.add,
        'remove_field': actions.remove,
    });
};


// Render function that returns a MDC List Divider
Tutorbook.prototype.renderListDivider = function(text) {
    return this.renderTemplate('input-list-divider', {
        'text': text
    });
};


// Almost the same as renderUserHeader, only that this enables user's to upload
// a profile picture or view their profile as others would see it.
Tutorbook.prototype.renderProfileHeader = function(user) {
    var that = this;
    const userData = {
        'pic': user.photo || user.photoURL,
        'name': user.name || user.displayName,
        'email': user.email,
        'type': user.type || "",
        'go_to_user': () => {
            that.viewUser(user.email);
        },
    };
    const header = this.renderTemplate('profile-header', userData);

    return header;
};


// Render function that returns a MDC List Item with the user's profile as the
// avatar, the user's name as the primary text, and the user's email as the
// secondary text.
Tutorbook.prototype.renderUserHeader = function(user) {
    var that = this;
    const userData = {
        'pic': user.photo || user.photoURL,
        'name': user.name || user.displayName,
        'email': user.email,
        'type': user.type || "",
        'go_to_user': () => {
            that.viewUser(user.email);
        },
    };
    // TODO: Figure out how to make this MDCRipple actually show up in the final
    // view.
    const header = this.renderTemplate('user-header', userData);
    MDCRipple.attachTo(header);
    return header;
};


// Render function that returns a MDC TextField within a MDC List Item.
Tutorbook.prototype.renderTextFieldItem = function(label, val) {
    return this.renderInputListItem(this.renderTextField(label, val));
};


// Render function that returns a MDC TextArea within a MDC List Item.
Tutorbook.prototype.renderTextAreaItem = function(label, val) {
    const inputListItemEl = this.renderInputListItem(this.renderTextArea(label, val));
    inputListItemEl.setAttribute('style', 'min-height: 290px;');
    return inputListItemEl;
};


// Render function that returns a MDC Select within a MDC List Item.
Tutorbook.prototype.renderSelectItem = function(label, val, vals) {
    return this.renderInputListItem(this.renderSelect(label, val, vals));
};


// Render function that returns an input el within a MDC List Item.
Tutorbook.prototype.renderInputListItem = function(inputEl) {
    const inputListItemEl = this.renderTemplate('input-list-item');

    inputListItemEl.appendChild(inputEl);
    return inputListItemEl;
};


// Render function that returns a MDC Outlined TextField wrapped within a MDC
// List Item. NOTE: This function is only used in the viewRequest dialog.
Tutorbook.prototype.renderTextFieldListItem = function(key, val) {
    const listItem = this.renderTemplate('input-list-item');
    key = this.capitalizeFirstLetter(key);
    if (key === 'Message') {
        // Make sure not to cut off the message textarea
        var textField = this.renderTextArea(key, val);
        listItem.setAttribute('style', 'min-height: 290px;');
    } else {
        var textField = this.renderTextField(key, val);
    }

    listItem.appendChild(textField);
    return listItem;
};


// Render function that returns one div wrapper with a bunch of textFields with
// formatted available timeslots inside. Clicking on the textField opens a
// dialog with the selects needed to populate the textField.
Tutorbook.prototype.renderAvailabilityItem = function(availability) {
    var that = this;
    // NOTE: Availability is stored in the Firestore database as:
    // availability: {
    //   Gunn Library: {
    //     Friday: [
    //       { open: '10:00 AM', close: '3:00 PM' },
    //       { open: '10:00 AM', close: '3:00 PM' },
    //     ],
    //   }
    //   ...
    // };

    // We want to display it as an Outlined MDC TextField like this:
    // Available:
    // On Mondays at the Gunn Academic Center from B Period to C Period.
    var textFields = [];
    Object.entries(availability).forEach((entry) => {
        var location = entry[0];
        var times = entry[1];
        Object.entries(times).forEach((entry) => {
            var day = entry[0];
            var hours = entry[1];
            hours.forEach((hour) => {
                var textFieldVal = that.getAvailabilityString({
                    day: day,
                    location: location,
                    fromTime: hour.open,
                    toTime: hour.close,
                });
                var textFieldEl = that.renderTextField('Available', textFieldVal);
                textFields.push(textFieldEl);
            });
        });
    });

    // Always render at least one empty textField
    textFields.push(this.renderTextField('Available', ''));

    // Now, append all of those textFields to an MDC List Item input wrapper
    const wrapper = this.renderTemplate('input-wrapper');
    textFields.forEach((el) => {
        var listItem = this.renderTemplate('input-list-item');
        listItem.appendChild(el);
        wrapper.appendChild(listItem);
    });

    wrapper.setAttribute('id', 'Availability-Wrapper');
    return wrapper;
};


// Render function that takes in a hour data structure and renders the correct
// MDC Selects and TextFields (selects for days, textFields for hours)
Tutorbook.prototype.renderHourInputsItem = function(hours) {
    // NOTE: Hours of locations are stored in the Firestore database as:
    // hours: {
    //   Friday: [
    //     { open: '10:00 AM', close: '12:00 PM' },
    //     { open: '2:00 PM', close: '5:00 PM' },
    //   ]
    // }
    var hourInputs = [];
    var that = this;
    Object.entries(hours).forEach((entry) => {
        const day = entry[0];
        const hours = entry[1];
        hours.forEach((hour) => {
            hourInputs.push({
                day: that.renderSelect('Day', day, that.data.days),
                // renderHourInput renders an empty MDC Select with the hours
                // open populated as the value (e.g. '10:00 AM to 3:00 PM').
                // When the select is pressed, a select time dialog is shown.
                hour: that.renderHourInput(hour),

            });
        });
    });
    // Always render one more empty select than necessary (this ensures that
    // the user can still input data if they haven't already)
    hourInputs.push({
        day: that.renderSelect('Day', '', that.data.days),
        hour: that.renderHourInput(),
    });

    const listItems = this.renderHourInputListItems(hourInputs);
    const wrapper = this.renderTemplate('input-wrapper');
    wrapper.setAttribute('id', 'Hours');

    listItems.forEach((el) => {
        wrapper.appendChild(el);
    });

    wrapper.setAttribute('id', 'Hours-Wrapper');
    return wrapper;
};


// Render function that returns an empty MDC Select with the hours open 
// populated as the value (e.g. '10:00 AM to 3:00 PM'). When the select is 
// pressed, a select time dialog is shown.
Tutorbook.prototype.renderHourInput = function(hours) {
    if (!!hours) {
        var val = hours.open + ' to ' + hours.close;
    } else {
        var val = '';
    }
    // NOTE: Hours of locations are stored in the Firestore database as:
    // hours: {
    //   Friday: [
    //     { open: '10:00 AM', close: '12:00 PM' },
    //     { open: '2:00 PM', close: '5:00 PM' },
    //   ]
    // }
    // NOTE: Here, we are being passed one of those open/close maps (i.e. {
    // open: '10:00 AM', close: '12:00 PM' })
    const inputEl = this.renderTextField('Open', val);
    return inputEl;
};


// Render function that takes in an array of timeSelect maps and returns an
// array of timeSelect list items.
Tutorbook.prototype.renderTimeSelectListItems = function(timeSelectMaps) {
    var listItems = [];
    timeSelectMaps.forEach((map) => {
        listItems.push(this.renderSplitListItem(map.day, map.time));
    });
    return listItems;
};


// Render function that takes in an array of two inputEls and returns a MDC List
// Item with both elements.
Tutorbook.prototype.renderSplitListItem = function(inputA, inputB) {
    const listItem = this.renderTemplate('input-list-item');
    // TODO: Do this styling with pure scss or css, instead of this
    inputB.setAttribute('style', 'width:50% !important;');
    inputA.setAttribute('style', 'width:50% !important; margin-right:20px !important;');
    listItem.append(inputA);
    listItem.append(inputB);
    return listItem;
};


// Render function that takes in an array of textFields and returns an array of
// MDC List Items with both elements (each input takes 50%).
Tutorbook.prototype.renderSplitTextFieldListItems = function(textFields, label) {
    var listItems = [];
    var index = 0;
    for (index; index < textFields.length - 1; index += 2) {
        // NOTE: This logic assumes that there are at least two elements in the
        // textFields array. If there is only one, it will fail.
        listItems.push(
            this.renderSplitListItem(
                textFields[index],
                textFields[index + 1])
        );
    }
    // Just in case there is an odd number of textFields
    if (listItems[index] !== undefined) {
        listItems.push(
            this.renderSplitListItem(
                textFields[index],
                this.renderTextField(label, "")
            ));
    }
    return listItems;
};


// Render function that takes in an array of selects and returns an array of
// MDC List Items with both elements. NOTE: We need the vals to be able to add
// empty selects when needed.
Tutorbook.prototype.renderSplitSelectListItems = function(selects, label, vals) {
    var listItems = [];
    var index = 0;
    for (index; index < selects.length - 1; index += 2) {
        // NOTE: This logic assumes that there are at least two elements in the
        // selects array. If there is only one, it will fail.
        listItems.push(
            this.renderSplitListItem(
                selects[index],
                selects[index + 1])
        );
    }
    // Just in case there is an odd number of selects
    if (listItems[index] !== undefined) {
        listItems.push(
            this.renderSplitListItem(
                selects[index],
                this.renderSelect(label, "", vals)
            ));
    }
    return listItems;
};


// Render function that takes in an array of locations and returns an array of 
// MDC Outlined Selects.
Tutorbook.prototype.renderLocationSelects = function(locations) {
    var locationSelects = [];
    // Always render one more empty select set than necessary (this ensures that
    // the user can still input data if they haven't already)
    for (var i = 0; i <= locations.length + 2; i++) {
        var location = locations[i] || "";
        locationSelects.push(
            this.renderSelect('Location', location, this.data.locations)
        );
    }
    return locationSelects;
};


// Render function that takes in an array of supervisors and returns an array of 
// MDC Outlined TextFields with the correct values.
Tutorbook.prototype.renderSupervisorTextFieldsItem = function(supervisors) {
    var supervisorTextFields = [];
    // Always render one more empty textField than necessary (this ensures that
    // the user can still input data if they haven't already)
    for (var i = 0; i < supervisors.length + 1; i++) {
        var supervisor = supervisors[i] || "";
        supervisorTextFields.push(
            this.renderTextField('Supervisor', supervisor)
        );
    }

    const listItems = this.renderSplitTextFieldListItems(
        supervisorTextFields,
        'Supervisor',
    );
    const wrapper = this.renderTemplate('input-wrapper');

    listItems.forEach((el) => {
        wrapper.appendChild(el);
    });

    wrapper.setAttribute('id', 'Supervisors-Wrapper');
    return wrapper;
};


// Helper function that appends an empty supervisor textField item
Tutorbook.prototype.addSupervisorTextFieldItem = function() {
    var that = this;
    const wrapper = document.querySelector('#Supervisors-Wrapper');
    const supervisorTextFields = [
        this.renderTextField('Supervisor', ''),
        this.renderTextField('Supervisor', ''),
    ];
    const listItems = this.renderSplitTextFieldListItems(
        supervisorTextFields,
        'Supervisor',
    );
    listItems.forEach((el) => {
        wrapper.appendChild(el);
    });
};


// Render function that takes in an array of subjects and returns an array of 
// MDC Outlined TextFields.
Tutorbook.prototype.renderSubjectTextFieldsItem = function(subjects) {
    var subjectTextFields = [];
    // Always render one more empty select than necessary (this ensures that
    // the user can still input data if they haven't already)
    for (var i = 0; i <= subjects.length + 2; i++) {
        var subject = subjects[i] || "";
        subjectTextFields.push(
            this.renderTextField('Subject', subject)
        );
    }

    const listItems = this.renderSplitTextFieldListItems(
        subjectTextFields,
        'Subject',
    );
    const wrapper = this.renderTemplate('input-wrapper');

    listItems.forEach((el) => {
        wrapper.appendChild(el);
    });
    wrapper.setAttribute('id', 'Subjects-Wrapper');
    return wrapper;
};


// Render function that takes in an array of subjects and returns an array of 
// MDC Outlined Selects.
Tutorbook.prototype.renderSubjectSelectsItem = function(subjects) {
    var subjectSelects = [];
    // Always render one more empty select than necessary (this ensures that
    // the user can still input data if they haven't already)
    for (var i = 0; i <= subjects.length + 2; i++) {
        var subject = subjects[i] || "";
        subjectSelects.push(
            this.renderSelect('Subject', subject, [''].concat(this.data.subjects))
        );
    }

    const listItems = this.renderSplitSelectListItems(
        subjectSelects,
        'Subject',
        this.data.subjects
    );
    const wrapper = this.renderTemplate('input-wrapper');

    listItems.forEach((el) => {
        wrapper.appendChild(el);
    });
    wrapper.setAttribute('id', 'Subjects-Wrapper');
    return wrapper;
};


// Render function that takes in a time object and renders it in a MDC Outlined
// Select that either triggers an enhanced MDC Menu (when the times available
// are restricted by the selected location's supervisor) or a time select dialog
Tutorbook.prototype.renderTimeSelect = function(time) {
    // TODO: We want to show an error when this is clicked without a location
    // selected. Once a location is selected, we want to replace this element
    // with the correct selectEl that corresponds to the available times for
    // that location.
    // TODO: For the profile view, we want to just show the same time select
    // dialog as the supervisor's see when they edit their location's hours. We
    // then store those times as maps of strings:
    // times: {
    //   Monday: [
    //     { open: '10:00 AM', close: '2:00 PM' },
    //     { open: '4:00 PM', 'close: '5:00 PM' },
    //   ],
    //   Tuesday: ...,
    // }
    return this.renderTemplate('input-stub', {
        'id': 'Time'
    });
};


// Render function that takes in a label and value and returns a MDC Outlined
// TextArea with the label as the MDC Floating Label and the value as the
// TextArea input value.
Tutorbook.prototype.renderTextArea = function(label, val) {
    const textEl = this.renderTemplate('input-text-area', {
        'label': label,
        // NOTE: By adding this or statement, we can still render empty 
        // textAreas even when val is null, undefined, or false.
        'text': val || ''
    });
    return textEl;
};


// Render function that takes in a label and value and returns a MDC Outlined
// TextField with the label as the MDC Floating Label and the value as the
// TextField value.
Tutorbook.prototype.renderTextField = function(label, val) {
    const textEl = this.renderTemplate('input-text-field', {
        'label': label,
        // NOTE: By adding this or statement, we can still render empty 
        // textFields even when val is null, undefined, or false.
        'text': val || ''
    });
    return textEl;
};


// Render function that takes in a label, value, and the set of values from
// which the value was previously selected from and returns a MDC Outlined
// Select with the label as the MDC Floating Label and the value as the pre
// -selected MDC Select value.
Tutorbook.prototype.renderSelect = function(label, val, vals) {
    const selectEl = this.renderTemplate('input-select', {
        'label': label,
        'vals': vals,
        // NOTE: By adding this or statement, we can still render empty selects
        // even when val is null, undefined, or false.
        'val': val || '',
    });

    return selectEl;
};


// Helper function that attaches an MDCSelect to the given el and ensures that
// the mdc-select__selected-text matches the selectedIndex.
Tutorbook.prototype.attachSelect = function(selectEl) {
    // TODO: Is there a way to access the selectEl from the MDCSelect?
    var options = [];
    selectEl.querySelectorAll('.mdc-list-item').forEach((el) => {
        options.push(el.innerText);
    });
    const selected = selectEl
        .querySelector('.mdc-select__selected-text')
        .innerText;

    const select = MDCSelect.attachTo(selectEl);
    // NOTE: By adding this if statement, we can still render empty selects
    // even when val is null, undefined, or false.
    if (selected !== '') {
        select.selectedIndex = options.indexOf(selected);
    }

    return select;
};





// ============================================================================
// LOCAL DATA STRUCTURE
// ============================================================================


// Static data that is accessed throughout the app
Tutorbook.prototype.data = {
    payments: {
        types: ['Free', 'Paid'],
        hourlyChargeStrings: [],
        hourlyChargesMap: {},
    },
    prices: [
        'Free',
        'Paid',
    ],
    emptyProfile: {
        'name': "",
        'uid': "",
        'photo': "",
        'id': "", // Right now, we just use email for id
        'email': "",
        'phone': "",
        'type': "",
        'gender': "",
        'grade': "",
        'bio': "",
        'avgRating': 0,
        'numRatings': 0,
        'subjects': [],
        'cards': {},
        'settings': {},
        'availability': {},
        'payments': {
            hourlyChargeString: '$25.00',
            hourlyCharge: 25,
            totalChargedString: '$0.00',
            totalCharged: 0,
            currentBalance: 0,
            currentBalanceString: '$0.00',
            type: 'Free',
        },
        'authenticated': false,
        'secondsTutored': 0,
        'secondsPupiled': 0,
    },
    gunnSchedule: {
        // TODO: Actually populate this with the right daily schedule
        Monday: [
            'A Period',
            'B Period',
            'C Period',
            'F Period',
        ],
        Tuesday: [
            'D Period',
            'Flex',
            'E Period',
            'A Period',
            'G Period',
        ],
        Wednesday: [
            'B Period',
            'C Period',
            'D Period',
            'F Period',
        ],
        Thursday: [
            'E Period',
            'Flex',
            'B Period',
            'A Period',
            'G Period',
        ],
        Friday: [
            'C Period',
            'D Period',
            'E Period',
            'F Period',
            'G Period',
        ],
        Saturday: ['No school'],
        Sunday: ['No school'],
    },
    periods: [
        'A Period',
        'B Period',
        'C Period',
        'D Period',
        'E Period',
        'F Period',
        'G Period',
        'Flex',
    ],
    teachers: {
        'Algebra 1': ['Mr. Teacher', 'Ms. Teacher', 'Mr. Substitute'],
        'Algebra 1A': ['Mr. Stub', 'Ms. Stub', 'Mrs. Stub'],
        'French 1': ['Mr. Stub', 'Ms. Stub', 'Mrs. Stub'],
        'French 2': ['Mr. Stub', 'Ms. Stub', 'Mrs. Stub'],
    },
    locations: ['Gunn Academic Center'],
    cities: ['Palo Alto, CA', 'Mountain View, CA', 'East Palo Alto, CA'],
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday',
        'Saturday'
    ],
    // List of subjects taken directly from AC Application form
    mathSubjects: [
        'Algebra 1',
        'Algebra 1A',
        'Algebra 2',
        'Algebra 2/Trig A',
        'Algebra 2/Trig H',
        'Analysis H',
        'AP Calculus AB',
        'AP Calculus BC',
        'Geometry A',
        'Geometry A/Alg 1A',
        'Geometry H',
        'Geometry/ Alg 2A',
        'IAC',
        'Pre-Calculus',
        'Pre-Calculus A',
        'AP Statistics',
        'Applied Math',
        'Computer Science',
    ],
    scienceSubjects: [
        'Astrophysics',
        'Biology 1',
        'Biology 1A',
        'Biology H',
        'AP Biology',
        'Biotechnology',
        'Marine Biology',
        'Chemistry',
        'Chemistry H',
        'AP Chemistry',
        'Conceptual Physics',
        'Physics',
        'AP Physics 1',
        'AP Physics C',
        'APES Env Sci',
    ],
    historySubjects: [
        'World History',
        'Cont World History',
        'Government',
        'US History',
        'APUSH',
        'Economics',
        'AP Economics',
        'Psychology',
        'AP Psychology',
    ],
    languageSubjects: [
        'French 1',
        'French 2',
        'French 3',
        'AP French',
        'German 1',
        'German 2',
        'German 3',
        'AP German',
        'Japanese 1',
        'Japanese 2',
        'Japanese 3',
        'AP Japanese',
        'Mandarin 1',
        'Mandarin 2',
        'Mandarin 3',
        'AP Mandarin',
        'Spanish 1',
        'Spanish 2',
        'Spanish 3',
        'AP Spanish',
    ],
    englishSubjects: [
        'Western Lit',
        'Western Culture',
        'Communication',
        'World Lit',
        'World Classics H',
        'AP English Lit and Composition',
        'Fundamentals of Communication',
        'Advanced Communication',
        'American Lit',
        'Basic College Skills',
        'The Works of Shakespeare',
        'Escape Lit',
        'Classic Mythology',
        'Shakespeare in Performance',
        'Film as Composition in Lit',
        'Analysis of the Writers Craft',
        'Philosophy through Lit',
        'Reading Between the Lines',
        'The Art of Visual Storytelling',
        'Modern California Lit',
        'Women Writers',
    ],
    lifeSkills: [
        'Planning',
        'Organization',
        'Study Skills',
        'Other',
    ],
    // Subjects array is literally just all the sub-topics copy and pasted into one huge array
    // TODO: Implement subject chooser full-screen dialog for further optimization and configuration
    subjects: [
        'Algebra 1',
        'Algebra 1A',
        'Algebra 2',
        'Algebra 2/Trig A',
        'Algebra 2/Trig H',
        'Analysis H',
        'AP Calculus AB',
        'AP Calculus BC',
        'Geometry A',
        'Geometry A/Alg 1A',
        'Geometry H',
        'Geometry/ Alg 2A',
        'IAC',
        'Pre-Calculus',
        'Pre-Calculus A',
        'AP Statistics',
        'Applied Math',
        'Computer Science',
        'Astrophysics',
        'Biology 1',
        'Biology 1A',
        'Biology H',
        'AP Biology',
        'Biotechnology',
        'Marine Biology',
        'Chemistry',
        'Chemistry H',
        'AP Chemistry',
        'Conceptual Physics',
        'Physics',
        'AP Physics 1',
        'AP Physics C',
        'APES Env Sci',
        'World History',
        'Cont World History',
        'Government',
        'US History',
        'APUSH',
        'Economics',
        'AP Economics',
        'Psychology',
        'AP Psychology',
        'French 1',
        'French 2',
        'French 3',
        'AP French',
        'German 1',
        'German 2',
        'German 3',
        'AP German',
        'Japanese 1',
        'Japanese 2',
        'Japanese 3',
        'AP Japanese',
        'Mandarin 1',
        'Mandarin 2',
        'Mandarin 3',
        'AP Mandarin',
        'Spanish 1',
        'Spanish 2',
        'Spanish 3',
        'AP Spanish',
        'Western Lit',
        'Western Culture',
        'Communication',
        'World Lit',
        'World Classics H',
        'AP English Lit and Composition',
        'Fundamentals of Communication',
        'Advanced Communication',
        'American Lit',
        'Basic College Skills',
        'The Works of Shakespeare',
        'Escape Lit',
        'Classic Mythology',
        'Shakespeare in Performance',
        'Film as Composition in Lit',
        'Analysis of the Writers Craft',
        'Philosophy through Lit',
        'Reading Between the Lines',
        'The Art of Visual Storytelling',
        'Modern California Lit',
        'Women Writers',
        'Planning',
        'Organization',
        'Study Skills',
        'Other',
    ],
    genders: [
        'Male',
        'Female',
        'Other'
    ],
    grades: [
        'Adult',
        'Senior',
        'Junior',
        'Sophomore',
        'Freshman',
        '8th Grade',
        '7th Grade',
        '6th Grade',
        '5th Grade',
        '4th Grade',
        '3rd Grade',
        '2nd Grade',
        '1st Grade',
        'Kindergarten',
    ],
    types: [
        'Tutor',
        'Pupil',
        'Parent',
        'Supervisor',
    ],
};




// ============================================================================
// GENERAL FIRESTORE DATA FLOW FUNCTIONS
// ============================================================================


/*
 *FIRESTORE DATA FLOW:
 *- Joe creates request to Bob (new doc in requestsOut and new doc in Bob's requestsIn)
 *- Joe modifies the request he sent (new doc in Bob's modifiedRequestsIn and the existing docs in requestsOut and requestsIn changes)
 *- Bob sees "New Request" (from requestIn doc) and "Modified Request" (from modifiedRequestsIn doc) cards
 *- Bob rejects the request (docs in requestsOut, requestsIn, and modifiedRequestsIn are deleted (they should all have the same ID) New doc in Joe's rejectedRequests)
 *- Joe sees "Request Rejected" (from rejectedRequests doc) and dismisses it (doc deleted)
 *
 *OR
 *
 *- Bob approves request (docs in requestsOut, requestsIn, and modifiedRequestsIn are deleted (they should all have the same ID). New docs in Bob's and Joe's appointments collection)
 *- Joe then changes the appointment (original docs are changed and new doc is created in Bob's modifiedAppointments collection)
 *- Bob dismisses changes card (doc deleted)
 *- Joe's cancels appointment (original docs deleted and new doc in Bob's canceledAppointments)
 *
 *OR
 *
 *- Bob sees the request and edits it (original docs are changed and new modifiedRequestsOut doc in Joe's profile created)
 *- Joe sees changes (in a "Proposed Changes" card) and counters with his own changes (original docs changed, Bob gets new doc in modifiedRequestsIn)
 *
 *
 *USER DOC SUBCOLLECTIONS
 *
 *- requestsOut
 *- requestsIn
 *- modifiedRequestsOut
 *- rejectedRequestsOut
 *- approvedRequestsOut
 *- modifiedRequestsIn
 *- canceledRequestsIn
 *
 *- appointments
 *- modifiedAppointments
 *- canceledAppointments
 *
 *FIRESTORE HELPER FUNCTIONS
 *
 *- addRequestIn
 *        Takes the request map and an optional ID as parameters. It then creates a document in the
 *        toUser's requestsIn subcollection.
 *- addRequestOut
 *        Takes the request map and an optional ID as parameters. It then creates a document in the
 *        fromUser's requestsOut subcollection.
 *- addRejectedRequestOut
 *        Takes the request map and an optional ID as parameters. It then creates a document in the
 *        fromUser's rejectedRequestsOut subcollection.
 *- deleteRequestIn
 *        Takes the request map and an ID as parameters. It then deletes the document with that ID
 *        from the toUser's requestsIn subcollection.
 *- deleteRequestOut
 *        Takes the request map and an ID as parameters. It then deletes the document
 *        with that ID from the fromUser's requestsOut subcollection.
 *- modifyRequestIn
 *        Takes the (modified) request map and an ID as parameters. It then updates
 *        the document with that ID in the toUser's requestsIn subcollection.
 *- modifyRequestOut
 *        Takes the (modified) request map and an ID as parameters. It then updates
 *        the document with that ID in the fromUser's requestsOut subcollection.
 *- addModifiedRequestIn
 *        Takes the (modified) request map and an optional ID as parameters. It
 *        then creates a document in the toUser's modifiedRequestsIn subcollection.
 *- addModifiedRequestOut
 *        Takes the (modified) request map and an optional ID as parameters. It
 *        then creates a document in the fromUser's modifiedRequestsOut subcollection.
 *- addRejectedRequestOut
 *        Takes the request map and an optional ID as parameters. It then creates
 *        a document in the fromUser's rejectedRequestsOut subcollection.
 *- addApprovedRequestOut
 *        Takes the request map and an optional ID as parameters. It then creates
 *        a document in the fromUser's approvedRequestsOut subcollection.
 *- addCanceledRequestIn
 *        Takes the request map and an optional ID as parameters. It then creates
 *        a document in the toUser's canceledRequestsOut subcollection.
 *- deleteRejectedRequestOut
 *        Takes the request map and an ID as parameters. It then deletes the document
 *        with that ID from the fromUser's rejectedRequestsOut subcollection.
 *- deleteRejectedRequestIn
 *        Takes the request map and an ID as parameters. It then deletes the document
 *        with that ID from the toUser's canceledRequestsIn subcollection.
 *
 *- addAppointment
 *        Takes the appointment map and an optional ID as parameters. It then
 *        creates a document in each of the attendees appointments subcollections.
 *- modifyAppointment
 *        Takes the (modified) appointment map and an ID as parameters. It then
 *        updates the documents in each of the attendees appointments subcollections.
 *- addModifiedAppointment
 *        Takes the (modified) appointment map and an optional ID as parameters.
 *        It then creates a document in the modifiedAppointments subcollection of
 *        whichever attendee isn't making the modification.
 *- deleteAppointment
 *        Takes the appointment map and an ID as parameters. It then deletes all of the
 *        documents in both of the attendees appointments and modifiedAppointments
 *        subcollections that have that ID.
 *- addCanceledAppointment
 *        Takes the appointment map and an optional ID as parameters. It then creates
 *        a document in the canceledAppointments subcollection of the attendee who
 *        did not cancel the appointment.
 *
 *CALLABLE FUNCTIONS
 *- updateUser
 *        Takes the currentUser and updates it's Firestore profile document to
 *        match.
 *- initUser
 *        Takes the firebase.auth().currentUser and the Firestore profile document
 *        and updates the currentUser to match.
 *- deleteRequest
 *        Takes the request map and an ID as parameters. It then deletes all
 *        documents relating to that request by calling deleteRequestIn, deleteRequestOut,
 *        deleteModifiedRequestOut, and deleteModifiedRequestIn. (Note: this does
 *        not delete the rejectedRequestsOut document for the fromUser or the 
 *        canceledRequestsIn for the toUser if there is are such documents.)
 *- rejectRequestIn
 *        Takes the request map and an ID as parameters. It then calls addRejectedRequestOut to create a document
 *        in the fromUser's rejectedRequestsOut subcollection and calls deleteRequest
 *        to get rid of all other relating request documents.
 *- cancelRequestOut
 *        Takes the request map and an ID as parameters. It then calls addCanceledRequestIn to create a document
 *        in the toUser's canceledRequestsIn subcollection and calls deleteRequest
 *        to get rid of all other relating request documents.
 *- addRequest
 *        Takes the (new) request map and an optional ID as parameters. It then
 *        calls addRequestIn and addRequestOut to create documents for the request
 *        in both the toUser's and fromUser's request collections.
 *- updateRequest
 *        Takes the (modified) request map and an ID as parameters. It then calls
 *        modifyRequestIn, modifyRequestOut, and either addModifiedRequestOut or 
 *        addModifiedRequestIn depending on who is actually making the change.
 *        (i.e. so we don't notify the person who just made the change)
 *
 *- approveRequestIn
 *        Takes the (approved) request map and an ID as parameters. It then calls
 *        deleteRequest to remove all old request documents (Note: there shouldn't
 *        be a need to delete any documents from the rejectedRequestsOut or the
 *        canceledRequestsIn subcollections as this request just got approved). It
 *        will then call addApprovedRequestOut to notify the fromUser and addAppointment 
 *        to create appointment documents in both user's appointment subcollections.
 *- changeAppointment
 *        Takes the (changed) appointment map and an ID as parameters. It then calls
 *        modifyAppointment and addModifiedAppointment to notify the attendee who 
 *        did not make the change to the appointment.
 *- cancelAppointment
 *        Takes the appointment map and an ID as parameters. It then calls deleteAppointment
 *        and addCanceledAppointment to notify the attendee who did not cancel the
 *        appointment.
 */

// ADD REQUEST DOCUMENTS
function addRequestIn(options) {
    // Creates a new document in the toUser's requestsIn subcollection
    const request = options.request || false;
    const id = options.id || false;
    if (!request) {
        console.error("addRequestIn called without a request", options);
        return;
    }
    // Sanity check that the currentUser is also the fromUser
    if (firebase.auth().currentUser.email !== request.fromUser.email) {
        console.warn("addRequestIn expected fromUser (" + request.fromUser.email + ") and currentUser (" + firebase.auth().currentUser.email + ") to match.");
    }
    if (id) {
        var doc = firebase.firestore().collection('usersByEmail')
            .doc(request.toUser.email)
            .collection('requestsIn')
            .doc(id);
    } else {
        var doc = firebase.firestore().collection('usersByEmail')
            .doc(request.toUser.email)
            .collection('requestsIn')
            .doc();
    }
    return doc.set(request).then(() => {
        return doc.id;
    });
};


function addRequestOut(options) {
    // Creates a new document in the fromUser's requestsOut subcollection
    const request = options.request || false;
    const id = options.id || false;
    if (!request) {
        console.error("addRequestOut called without a request", options);
        return;
    }
    // Sanity check that the currentUser is also the fromUser
    if (firebase.auth().currentUser.email !== request.fromUser.email) {
        console.warn("addRequestOut expected fromUser (" + request.fromUser.email + ") and currentUser (" + firebase.auth().currentUser.email + ") to match.");
    }
    if (id) {
        var doc = firebase.firestore().collection('usersByEmail')
            .doc(request.fromUser.email)
            .collection('requestsOut')
            .doc(id);
    } else {
        var doc = firebase.firestore().collection('usersByEmail')
            .doc(request.fromUser.email)
            .collection('requestsOut')
            .doc();
    }
    return doc.set(request).then(() => {
        return doc.id;
    });
};


Tutorbook.prototype.addRejectedRequestOut = function(options) {
    // Creates a new document in the fromUser's rejectedRequestsOut subcollection
    const request = options.request || false;
    const id = options.id || false;
    if (!request) {
        console.error("addRejectedRequestOut called without a request", options);
        return;
    }
    // Sanity check that the currentUser is also the toUser
    if (firebase.auth().currentUser.email !== request.toUser.email) {
        console.warn("addRejectedRequestsOut expected toUser (" + request.toUser.email + ") and currentUser (" + firebase.auth().currentUser.email + ") to match.");
    }
    const rejectedRequest = {
        'rejectedBy': {
            name: firebase.auth().currentUser.displayName,
            email: firebase.auth().currentUser.email,
            type: this.user.type,
            photo: firebase.auth().currentUser.photoURL,
            proxy: this.user.proxy,
        },
        'for': request,
        'timestamp': new Date(),
    };

    if (id) {
        var doc = firebase.firestore().collection('usersByEmail')
            .doc(request.fromUser.email)
            .collection('rejectedRequestsOut')
            .doc(id);
    } else {
        var doc = firebase.firestore().collection('usersByEmail')
            .doc(request.fromUser.email)
            .collection('rejectedRequestsOut')
            .doc();
    }
    return doc.set(rejectedRequest).then(() => {
        return doc.id;
    });
};


function deleteCanceledRequestIn(options) {
    /*
     *Takes the request map and an ID as parameters. It then deletes the document
     *with that ID from the toUser's canceledRequestsIn subcollection.
     */
    const request = options.request || false;
    const id = options.id || false;
    if (!(request && id)) {
        console.error("deleteCanceledRequestIn called without an id or request", options);
        return;
    }
    // Sanity check that the currentUser is also the toUser
    if (firebase.auth().currentUser.email !== request.toUser.email) {
        console.warn("deleteCanceledRequestIn expected toUser (" + request.toUser.email + ") and currentUser (" + firebase.auth().currentUser.email + ") to match.");
    }
    var doc = firebase.firestore().collection('usersByEmail')
        .doc(request.toUser.email)
        .collection('canceledRequestsIn')
        .doc();
    return doc.delete().then(() => {
        return doc.id;
    });
};


function deleteRejectedRequestOut(options) {
    /*
     *Takes the request map and an ID as parameters. It then deletes the document
     *with that ID from the fromUser's rejectedRequestsOut subcollection.
     */
    const request = options.request || false;
    const id = options.id || false;
    if (!(request && id)) {
        console.error("deleteRejectedRequestOut called without an ID or request", options);
        return;
    }
    // Sanity check that the currentUser is also the fromUser
    if (firebase.auth().currentUser.email !== request.fromUser.email) {
        console.warn("deleteRejectedRequestOut expected fromUser (" + request.fromUser.email + ") and currentUser (" + firebase.auth().currentUser.email + ") to match.");
    }
    var doc = firebase.firestore().collection('usersByEmail')
        .doc(request.fromUser.email)
        .collection('rejectedRequestsOut')
        .doc();
    return doc.delete().then(() => {
        return doc.id;
    });
};


function deleteRequestIn(options) {
    // Deletes the existing document in the toUser's requestsIn subcollection
    const id = options.id || false;
    const user = options.user || false;
    if (!(id && user)) {
        console.error("deleteRequestIn called without id or user", options);
        return;
    }
    var doc = firebase.firestore().collection('usersByEmail')
        .doc(user.email)
        .collection('requestsIn')
        .doc(id);
    return doc.delete().then(() => {
        return doc.id;
    });
};


function deleteRequestOut(options) {
    // Deletes the existing document in the fromUser's requestsOut subcollection
    const id = options.id || false;
    const user = options.user || false;
    if (!(id && user)) {
        console.error("deleteRequestOut called without id or user", options);
        return;
    }
    var doc = firebase.firestore().collection('usersByEmail')
        .doc(user.email)
        .collection('requestsOut')
        .doc(id);
    return doc.delete().then(() => {
        return doc.id;
    });
};


// ADD APPOINTMENT DOCUMENTS
Tutorbook.prototype.addAppointment = function(options) {
    // Add appointment to both users's appointment subcollections and the given
    // location's appointment subcollection.
    const id = options.id || false;
    const appt = options.appt || false;
    if (!appt) {
        console.error("addAppointment called without an appointment", options);
        return;
    }

    function addUserAppt(user) {
        return firebase.firestore().collection('usersByEmail')
            .doc(user)
            .collection('appointments')
            .doc(id).set(appt).catch((err) => {
                console.error('Error while adding appt to ' + user + '\'s appointments subcollection:', err);
            });
    };

    function addLocationAppt(location) {
        return firebase.firestore().collection('locations')
            .doc(location)
            .collection('appointments')
            .doc(id).set(appt).catch((err) => {
                console.error('Error while adding appt to location ' +
                    location + '\'s appointments subcollection:', err);
            });
    };

    // NOTE: The appts must be processed in this order due to the way that
    // the Firestore rules are setup (i.e. first we check if there is an
    // approvedRequestOut doc, then we check if there is an appt doc
    // already created).
    return addUserAppt(appt.for.fromUser.email).then(() => {
        return addUserAppt(appt.for.toUser.email).then(() => {
            return addLocationAppt(appt.location.id).then(() => {
                return id;
            });
        });
    });
};


// MODIFY APPOINTMENT DOCUMENTS
Tutorbook.prototype.modifyAppointment = function(options) {
    // Updates the original document in both users's appointment subcollections
    const id = options.id || false;
    const appt = options.appt || false;
    if (!(id && appt)) {
        console.error("modifyAppointment called without an id or appointment", options);
        return;
    }
    return appt.attendees.forEach((user) => {
        var doc = firebase.firestore().collection('usersByEmail')
            .doc(user.email)
            .collection('appointments')
            .doc(id);
        return doc.update(appt).then(() => {
            return doc.id;
        });
    });
};


Tutorbook.prototype.addModifiedAppointment = function(options) {
    // Creates a new document in otherUser's modifiedAppointment subcollections
    const appt = options.appt || false;
    const otherUser = options.otherUser || false;
    const id = options.id || false;
    if (!(appt && otherUser && id)) {
        console.error("addModifiedAppointment called without an appt or otherUser", options);
        return;
    }
    // TODO: Create a map that shows exactly the differences between the original
    // and the modified appointment. Right now, we just use this to create a 
    // card pointing to the appointment and expect the user to see the differences
    // for themself.
    const modifiedAppointment = {
        'modifiedBy': {
            name: firebase.auth().currentUser.displayName,
            email: firebase.auth().currentUser.email,
            type: this.user.type,
            photo: firebase.auth().currentUser.photoURL,
            gender: this.user.gender,
            proxy: this.user.proxy,
        },
        'for': this.combineMaps({
            id: id
        }, appt),
        'timestamp': new Date(),
    };

    var doc = firebase.firestore().collection('usersByEmail')
        .doc(otherUser.email)
        .collection('modifiedAppointments')
        .doc(id);

    var locationDoc = firebase.firestore().collection('locations')
        .doc(appt.location.id)
        .collection('modifiedAppointments')
        .doc(id);

    return doc.set(modifiedAppointment).then(() => {
        return locationDoc.ste(modifiedAppointment).then(() => {
            return doc.id;
        });
    });
};


Tutorbook.prototype.addCanceledAppointment = async function(options) {
    // Creates a new document in the otherUser's canceledAppointment 
    // subcollections and in the location's canceledAppointments subcollection
    const id = options.id || false;
    const appt = options.appt || false;
    const otherUser = options.otherUser || false;
    if (!(id && appt && otherUser)) {
        console.error("addCanceledAppointment called without an id or appointment or otherUser", options);
        return;
    }
    const canceledAppointment = {
        'canceledBy': {
            name: firebase.auth().currentUser.displayName,
            email: firebase.auth().currentUser.email,
            type: this.user.type,
            photo: firebase.auth().currentUser.photoURL,
            gender: this.user.gender,
        },
        'for': this.combineMaps({
            id: id
        }, appt),
        'timestamp': new Date(),
    };

    var doc = firebase.firestore().collection('usersByEmail')
        .doc(otherUser.email)
        .collection('canceledAppointments')
        .doc(id);

    await doc.set(canceledAppointment);

    var doc = firebase.firestore().collection('locations')
        .doc(appt.location.id)
        .collection('canceledAppointments')
        .doc(id);

    return doc.set(canceledAppointment).then(() => {
        return doc.id;
    });
};


Tutorbook.prototype.deleteAppointment = async function(options) {
    // Deletes the existing documents in both users's appointment subcollections
    // and the location's subcollection.
    const id = options.id || false;
    const appt = options.appt || false;
    if (!(id && appt)) {
        console.error("deleteAppointment called without an id or appointment", options);
        return;
    }
    var doc = firebase.firestore().collection('locations')
        .doc(appt.location.id)
        .collection('appointments')
        .doc(id);
    await doc.delete();

    return appt.attendees.forEach((user) => {
        var doc = firebase.firestore().collection('usersByEmail')
            .doc(user.email)
            .collection('appointments')
            .doc(id);
        return doc.delete().then(() => {
            return doc.id;
        });
    });
};


// CALLABLE FUNCTIONS (these is what is actually going to be called throughout
// program workflow)
Tutorbook.prototype.deleteRequest = (id, request) => {
    // Delete request documents for both users
    return deleteRequestIn({
        'id': id,
        'user': request.toUser,
    }).then((id) => {
        return deleteRequestOut({
            'id': id,
            'user': request.fromUser,
        }).catch((err) => {
            console.error('Error while deleting requestOut:', err);
        });
    }).catch((err) => {
        console.error('Error while deleting requestIn:', err);
    });
};


Tutorbook.prototype.rejectRequest = async function(id, request) {
    const db = firebase.firestore();
    const requestIn = db.collection("users").doc(request.toUser.email)
        .collection('requestsIn')
        .doc(id);
    const requestOut = db.collection('usersByEmail').doc(request.fromUser.email)
        .collection('requestsOut')
        .doc(id);
    const rejectedRequestOut = db.collection('usersByEmail').doc(request.fromUser.email)
        .collection('rejectedRequestsOut')
        .doc(id);

    if (request.payment.type === 'Paid') {
        // Delete the authPayment docs as well
        const authPayments = [
            db.collection('usersByEmail').doc(request.fromUser.email)
            .collection('authPayments')
            .doc(id),
            db.collection('usersByEmail').doc(request.toUser.email)
            .collection('authPayments')
            .doc(id),
        ];
        authPayments.forEach(async (authPayment) => {
            await authPayment.delete();
        });
    }

    var that = this;
    await rejectedRequestOut.set({
        for: request,
        rejectedBy: that.conciseUser,
        rejectedTimestamp: new Date(),
    });
    await requestOut.delete();
    await requestIn.delete();
};


Tutorbook.prototype.cancelRequest = async function(id, request) {
    const db = firebase.firestore();
    const requestIn = db.collection("users").doc(request.toUser.email)
        .collection('requestsIn')
        .doc(id);
    const requestOut = db.collection('usersByEmail').doc(request.fromUser.email)
        .collection('requestsOut')
        .doc(id);

    if (request.payment.type === 'Paid') {
        // Delete the authPayment docs as well
        const authPayments = [
            db.collection('usersByEmail').doc(request.fromUser.email)
            .collection('authPayments')
            .doc(id),
            db.collection('usersByEmail').doc(request.toUser.email)
            .collection('authPayments')
            .doc(id),
        ];
        authPayments.forEach(async (authPayment) => {
            await authPayment.delete();
        });
    }

    const canceledRequests = [];
    if (request.toUser.email !== this.user.email) {
        canceledRequests.push(db.collection('usersByEmail').doc(request.toUser.email)
            .collection('canceledRequestsIn').doc(id));
    }
    if (request.fromUser.email !== this.user.email) {
        canceledRequests.push(db.collection('usersByEmail').doc(request.fromUser.email)
            .collection('canceledRequestsOut').doc(id));
    }

    var that = this;
    canceledRequests.forEach(async (canceledRequest) => {
        await canceledRequest.set({
            canceledBy: that.conciseUser,
            canceledTimestamp: new Date(),
            for: request,
        });
    });
    await requestOut.delete();
    await requestIn.delete();
};


Tutorbook.prototype.newRequest = async function(request, payment) {
    this.log('Adding newRequest:', request);
    this.log('Adding payment:', payment);

    const db = firebase.firestore();
    const requestIn = db.collection('usersByEmail').doc(request.toUser.email)
        .collection('requestsIn')
        .doc();
    const requestOut = db.collection('usersByEmail').doc(request.fromUser.email)
        .collection('requestsOut')
        .doc(requestIn.id);

    // Add request documents for both users
    await requestOut.set(request);
    await requestIn.set(request);
    // Add payment document for server to process
    if (request.payment.type === 'Paid') {
        await firebase.firestore().collection('usersByEmail').doc(request.fromUser.email)
            .collection('authPayments')
            .doc(requestIn.id)
            .set(payment);
        await firebase.firestore().collection('usersByEmail').doc(request.toUser.email)
            .collection('authPayments')
            .doc(requestIn.id)
            .set(payment);
    }

    this.log('Added newRequest and payment:', requestIn.id);
};


Tutorbook.prototype.newLocation = function(location) {
    // Modify the original location document
    this.updateUser();
    var that = this;
    const validUserTypes = ['Supervisor', 'Admin'];
    if (validUserTypes.indexOf(this.user.type) < 0) {
        console.error('newLocation expected the currentUser to be' +
            ' either a supervisor or admin:', this.user);
        return;
    }
    return firebase.firestore().collection('locations').doc()
        .set(location).then(() => {
            that.log('Created new location:', location);
        }).catch((err) => {
            console.error('Error while creating new location:', err);
        });
};


Tutorbook.prototype.updateLocation = function(location, id) {
    // Modify the original location document
    this.updateUser();
    const validUserTypes = ['Supervisor', 'Admin'];
    if (validUserTypes.indexOf(this.user.type) < 0) {
        console.error('updateLocation expected the currentUser to be' +
            ' either a supervisor or admin:', this.user);
        return;
    }
    return firebase.firestore().collection('locations').doc(id)
        .update(location);
};


Tutorbook.prototype.modifyRequest = async function(request, id) {
    const db = firebase.firestore();
    const requestIn = db.collection("users").doc(request.toUser.email)
        .collection('requestsIn')
        .doc(id);
    const requestOut = db.collection('usersByEmail').doc(request.fromUser.email)
        .collection('requestsOut')
        .doc(id);
    // We send modified requests to all users that aren't the currentUser
    const modifiedRequests = [];
    if (request.fromUser.email !== this.user.email) {
        modifiedRequests.push(db.collection('usersByEmail').doc(request.fromUser.email)
            .collection('modifiedRequestsOut')
            .doc(id));
    }
    if (request.toUser.email !== this.user.email) {
        modifiedRequests.push(db.collection('usersByEmail').doc(request.toUser.email)
            .collection('modifiedRequestsIn')
            .doc(id));
    }
    var that = this;
    modifiedRequests.forEach(async (modifiedRequest) => {
        await modifiedRequest.set({
            for: request,
            modifiedBy: that.conciseUser,
            modifiedTimestamp: new Date(),
        });
    });
    await requestOut.update(request);
    return requestIn.update(request);
};


// CALLABLE APPOINTMENT FUNCTIONS
Tutorbook.prototype.approveRequest = async function(request, id) {
    const db = firebase.firestore();
    const requestIn = db.collection("users").doc(request.toUser.email)
        .collection('requestsIn')
        .doc(id);
    const requestOut = db.collection('usersByEmail').doc(request.fromUser.email)
        .collection('requestsOut')
        .doc(id);
    // TODO: Right now we don't allow supervisors to approve requests.
    // Shoud we?
    const approvedRequestOut = db.collection('usersByEmail').doc(request.fromUser.email)
        .collection('approvedRequestsOut')
        .doc(id);
    // NOTE: The appts must be processed in this order due to the way that
    // the Firestore rules are setup (i.e. first we check if there is an
    // approvedRequestOut doc, then we check if there is an appt doc
    // already created).
    const appts = [
        db.collection('usersByEmail').doc(request.fromUser.email)
        .collection('appointments')
        .doc(id),
        db.collection('usersByEmail').doc(request.toUser.email)
        .collection('appointments')
        .doc(id),
        db.collection('locations').doc(request.location.id)
        .collection('appointments')
        .doc(id),
    ];

    var that = this;
    await approvedRequestOut.set({
        for: request,
        approvedBy: that.conciseUser,
        approvedTimestamp: new Date(),
    });
    await requestOut.delete();
    await requestIn.delete();
    for (var i = 0; i < appts.length; i++) {
        var appt = appts[i];
        await appt.set({
            attendees: [request.fromUser, request.toUser],
            location: request.location,
            for: request,
            time: request.time,
            timestamp: new Date(),
        });
    }
};


Tutorbook.prototype.modifyAppt = async function(apptData, id) {
    const db = firebase.firestore();
    const appts = [
        db.collection('usersByEmail').doc(apptData.attendees[0].email)
        .collection('appointments')
        .doc(id),
        db.collection('usersByEmail').doc(apptData.attendees[1].email)
        .collection('appointments')
        .doc(id),
        db.collection('locations').doc(apptData.location.id)
        .collection('appointments')
        .doc(id),
    ];
    const modifiedAppts = [];
    if (apptData.attendees[0].email !== this.user.email) {
        modifiedAppts.push(db.collection('usersByEmail').doc(apptData.attendees[0].email)
            .collection('modifiedAppointments').doc(id));
    }
    if (apptData.attendees[1].email !== this.user.email) {
        modifiedAppts.push(db.collection('usersByEmail').doc(apptData.attendees[1].email)
            .collection('modifiedAppointments').doc(id));
    }
    if (this.user.locations.indexOf(apptData.location.id) < 0) {
        modifiedAppts.push(db.collection('locations').doc(apptData.location.id)
            .collection('modifiedAppointments').doc(id));
    }

    var that = this;
    for (var i = 0; i < modifiedAppts.length; i++) {
        var modifiedAppt = modifiedAppts[i];
        await modifiedAppt.set({
            modifiedBy: that.conciseUser,
            modifiedTimestamp: new Date(),
            for: apptData,
        });
    }
    for (var i = 0; i < appts.length; i++) {
        var appt = appts[i];
        await appt.update(apptData);
    }
};


Tutorbook.prototype.cancelAppt = async function(apptData, id) {
    const db = firebase.firestore();
    const appts = [
        db.collection('usersByEmail').doc(apptData.attendees[0].email)
        .collection('appointments')
        .doc(id),
        db.collection('usersByEmail').doc(apptData.attendees[1].email)
        .collection('appointments')
        .doc(id),
        db.collection('locations').doc(apptData.location.id)
        .collection('appointments')
        .doc(id),
    ];
    const canceledAppts = [];
    if (apptData.attendees[0].email !== this.user.email) {
        canceledAppts.push(db.collection('usersByEmail').doc(apptData.attendees[0].email)
            .collection('canceledAppointments').doc(id));
    }
    if (apptData.attendees[1].email !== this.user.email) {
        canceledAppts.push(db.collection('usersByEmail').doc(apptData.attendees[1].email)
            .collection('canceledAppointments').doc(id));
    }
    if (this.user.locations.indexOf(apptData.location.id) < 0) {
        canceledAppts.push(db.collection('locations').doc(apptData.location.id)
            .collection('canceledAppointments').doc(id));
    }

    if (apptData.for.payment.type === 'Paid') {
        // Delete the authPayment docs as well
        const authPayments = [
            db.collection('usersByEmail').doc(apptData.attendees[0].email)
            .collection('authPayments')
            .doc(id),
            db.collection('usersByEmail').doc(apptData.attendees[1].email)
            .collection('authPayments')
            .doc(id),
        ];
        authPayments.forEach(async (authPayment) => {
            await authPayment.delete();
        });
    }

    var that = this;
    canceledAppts.forEach(async (appt) => {
        await appt.set({
            canceledBy: that.conciseUser,
            canceledTimestamp: new Date(),
            for: apptData,
        });
    });

    appts.forEach(async (appt) => {
        await appt.delete();
    });
};


// Data action function that fetches the given appt doc from the currentUser's
// appointments subcollection.
Tutorbook.prototype.getAppt = function(id) {
    return firebase.firestore().collection('usersByEmail').doc(this.user.email)
        .collection('appointments')
        .doc(id)
        .get();
};




// ============================================================================
// CALLABLE USER FUNCTIONS
// ============================================================================


// View function that shows or hides the Intercom messenger widget
Tutorbook.prototype.viewIntercom = function(show) {
    if (show) {
        window.intercomSettings.hide_default_launcher = false;
        return Intercom('boot');
    }
    window.intercomSettings.hide_default_launcher = true;
    Intercom('boot');
};


// Init function that initializes the Intercom user meta data
Tutorbook.prototype.initIntercom = function() {
    window.intercomSettings = {
        app_id: "faz7lcyb",
        name: this.user.name, // Full name
        email: this.user.email, // Email address
        created_at: this.user.timestamp, // Signup date as a Unix timestamp
        phone: this.user.phone,
        Type: this.user.type,
        Grade: this.user.grade,
        Gender: this.user.gender,
        Authenticated: this.user.authenticated,
        Subjects: this.user.subjects,
        'Business Type': this.user.payments.type,
        'Hourly Rate': this.user.payments.hourlyChargeString,
        'Current Balance': this.user.payments.currentBalanceString,
        'Total Charged': this.user.payments.totalChargedString,
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
};


// Init function that consumes the auth().currentUser data for the app
Tutorbook.prototype.initUser = function(log) {
    const tempUser = firebase.auth().currentUser;
    // This is a workaround for the setup screen to be able to set user info
    var that = this;
    return that.getUser(tempUser.email).then((doc) => {
        const userData = doc.data();
        if (!!userData) {
            // Translate currentUser object to JavaScript map
            that.user = {
                'name': tempUser.displayName || "",
                'uid': tempUser.uid || "",
                'photo': (!!userData.photo &&
                    userData.photo !== 'https://tutorbook.app/app/img/male.png' &&
                    userData.photo !== 'https://tutorbook.app/app/img/female.png'
                ) ? userData.photo : tempUser.photoURL,
                'id': tempUser.email || "", // Right now, we just use email for id
                'email': tempUser.email || userData.email || "",
                'phone': userData.phone || tempUser.phone || "",
                'type': userData.type || "",
                'gender': userData.gender || "",
                'grade': userData.gradeString || userData.grade || "",
                'bio': userData.bio || "",
                'avgRating': userData.avgRating || 0,
                'numRatings': userData.numRatings || 0,
                'subjects': that.getUserSubjects(userData) || [],
                'cards': userData.cards || {
                    setupNotifications: !that.notificationsEnabled
                },
                'settings': userData.settings || {},
                'config': userData.config || {
                    showSettings: false,
                    showPayments: false,
                },
                'availability': userData.availability || {},
                'payments': userData.payments || {
                    hourlyChargeString: '$25.00',
                    hourlyCharge: 25,
                    totalChargedString: '$0.00',
                    totalCharged: 0,
                    currentBalance: 0,
                    currentBalanceString: '$0.00',
                    type: 'Free',
                    policy: 'Hourly rate is $25.00 per hour. Will accept ' +
                        'lesson cancellations if given notice within 24 hours.' +
                        ' No refunds will be issued unless covered by a Tutorbook ' +
                        'guarantee.',
                },
                'authenticated': userData.authenticated || false,
                'locations': userData.locations || [],
                'secondsTutored': userData.secondsTutored || 0,
                'secondsPupiled': userData.secondsPupiled || 0,
                'proxy': userData.proxy || [],
                'created': userData.createdTimestamp || new Date(),
            };
            if (!!log) {
                that.log('Signed in with user:', that.user);
            }
            that.conciseUser = that.filterRequestUserData(that.user);
        } else {
            console.warn('User document did not exist, creating a new one:', that.user);
            if (!!!that.user) {
                that.user = {};
            }
            that.user.email = tempUser.email;
            that.user.id = tempUser.email;
            that.user.photo = tempUser.photoURL;
            that.user.name = tempUser.displayName;
            that.user.uid = tempUser.uid;
            // NOTE: We have to set these values to bootstrap new users due to our
            // Firestore rules the prevent users from creating docs without these
            // values set.
            that.user.payments = {
                hourlyChargeString: '$25.00',
                hourlyCharge: 25,
                totalChargedString: '$0.00',
                totalCharged: 0,
                currentBalance: 0,
                currentBalanceString: '$0.00',
                type: 'Free',
                policy: 'Hourly rate is $25.00 per hour. Will accept ' +
                    'lesson cancellations if given notice within 24 hours.' +
                    ' No refunds will be issued unless covered by a Tutorbook ' +
                    'guarantee.',
            };
            that.user.secondsTutored = 0;
            that.user.secondsPupiled = 0;
            // NOTE: We need to do this in order to send the right user email
            window.location.toString().split('?')
                .forEach((pairs) => {
                    var key = pairs.split('=')[0];
                    var val = pairs.split('=')[1];
                    if (key === 'type') {
                        that.user.type = val.replace('/', '');
                    }
                });
            if (!!!that.user.type || that.user.type === 'Tutor' || that.user.type === 'Pupil') {
                that.user.authenticated = true;
            } else {
                that.user.authenticated = false;
            }
            that.log('Current User before updating:', that.user);
            return that.updateUser().then(() => {
                return that.getUser(tempUser.email).then((doc) => {
                    const userData = doc.data();
                    // Translate currentUser object to JavaScript map
                    that.user = {
                        'name': tempUser.displayName || "",
                        'uid': tempUser.uid || "",
                        'photo': (!!userData.photo &&
                            userData.photo !== 'https://tutorbook.app/app/img/male.png' &&
                            userData.photo !== 'https://tutorbook.app/app/img/female.png'
                        ) ? userData.photo : tempUser.photoURL,
                        'id': tempUser.email || "", // Right now, we just use email for id
                        'email': tempUser.email || userData.email || "",
                        'phone': userData.phone || tempUser.phone || "",
                        'type': userData.type || "",
                        'gender': userData.gender || "",
                        'grade': userData.gradeString || userData.grade || "",
                        'bio': userData.bio || "",
                        'avgRating': userData.avgRating || 0,
                        'numRatings': userData.numRatings || 0,
                        'subjects': that.getUserSubjects(userData) || [],
                        'locations': userData.locations || [],
                        'cards': userData.cards || {
                            setupNotifications: !that.notificationsEnabled
                        },
                        'settings': userData.settings || {},
                        'config': userData.config || {
                            showSettings: false,
                        },
                        'availability': userData.availability || {},
                        'payments': userData.payments || {
                            hourlyChargeString: '$25.00',
                            hourlyCharge: 25,
                            totalChargedString: '$0.00',
                            totalCharged: 0,
                            currentBalance: 0,
                            currentBalanceString: '$0.00',
                            type: 'Free',
                            policy: 'Hourly rate is $25.00 per hour. Will accept ' +
                                'lesson cancellations if given notice within 24 hours.' +
                                ' No refunds will be issued unless covered by a Tutorbook ' +
                                'guarantee.',
                        },
                        'authenticated': userData.authenticated || false,
                        'secondsTutored': userData.secondsTutored || 0,
                        'secondsPupiled': userData.secondsPupiled || 0,
                        'proxy': userData.proxy || [],
                        'created': userData.createdTimestamp || new Date(),
                    };
                    if (!!log) {
                        that.updateUser().then(() => {
                            that.log('Created user:', that.user);
                        });
                    }
                    that.conciseUser = that.filterRequestUserData(that.user);
                });
            });
        }
    });
};


// Data action function that takes the currentUser and updates his/her Firestore
// doc to match.
Tutorbook.prototype.updateUser = function() {
    const id = this.user.email;
    var that = this;
    return firebase.firestore().collection('usersByEmail').doc(id)
        .update(this.user)
        .catch((err) => {
            that.log('Error while updating document, creating new doc:', err);
            // Doc does not exist, create the document
            return that.createUserDoc();
        });
};


Tutorbook.prototype.createUserDoc = function() {
    console.log('Creating new user doc:', this.user);
    const id = this.user.email;
    var that = this;
    return firebase.firestore().collection('usersByEmail').doc(id)
        .set(this.combineMaps(this.user, {
            createdTimestamp: new Date()
        }))
        .catch((err) => {
            that.log('Error while creating user profile doc:', err);
            that.viewSnackbar('Could not access profile.');
        });
};


// Data action function that returns userData within the user's Firestore doc
Tutorbook.prototype.getUser = function(id) {
    var that = this;
    return firebase.firestore().collection('usersByEmail').doc(id).get()
        .catch((err) => {
            console.error("Error while getting user profile " + id + ":", err);
            that.viewSnackbar("Could not load user " + id + ".");
        });
};

Tutorbook.prototype.dummyText = "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum. Why do we use it? It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like). Where does it come from? Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable s";



// ============================================================================
// ACTUALLY START TUTORBOOK
// ============================================================================


// Start the app onload
window.onload = function() {
    window.app = new Tutorbook(true);
};


module.exports = Tutorbook;