// This is the cleaned up version of the main app driver script.
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


// For some reason, "import" doesn't work for Navigo
// See: https://stackoverflow.com/questions/54314816/i-cant-use-or-import-
// navigo-in-typescript
const Navigo = require('navigo');


// Init function that launches the app
function Tutorbook() {

    // TODO: We probs want to hang off on some of these until the user sees
    // their dashboard screen.
    this.loggingOn = true;
    this.initTemplates();
    this.initDisplayPreferences();
    this.initRecyclers();
    this.initTimeStrings();
    this.initHourlyChargeStrings();
    this.initNotificationsKey();

    var that = this;
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // User is signed in, show app home screen.
            that.initUser(true).then(() => {
                if (this.user.authenticated) {
                    that.initWelcomeMessage(); // Welcome message is customized to
                    // each user.
                    that.initLastView();
                    // NOTE: We can't initUserViews or the nav-drawer-list without 
                    // a valid firebase.auth().currentUser
                    that.initFilters(); // We use this.user.subjects to customize 
                    // filters and thus cannot initFilters() without user data.
                    that.initNavDrawer(); // Certain items are hidden based on user
                    // type.
                    that.initRouter(); // Redirects to the correct screen that (most
                    that.initLocationData();
                    // likely) needs to have Firestore permissions.
                    that.initNotifications(); // TODO: Only show the notification
                    // prompt when the user submits a newRequest or clicks on the
                    // setup notifications card/dialog.
                    that.initUserViews(); // Needs Firestore permissions
                } else {
                    that.viewCodeSignInDialog();
                }
            });
        } else {
            that.viewLoader(false);
            that.viewLogin();
        }
    });
};


// Init function that bypasses an error we were getting when signing out and
// logging back in (we can only call this once).
Tutorbook.prototype.initNotificationsKey = function() {
    firebase.messaging().usePublicVapidKey(
        "BIEVpGqO_n9HSS_sGWdfXoOUpv3dWwB5P2-zRkUBUZH" +
        "OzvAvJ09nUL68hc5XpTjKZxb74_5DJlSs4oRdnJj8R4w"
    );
};


// View function that opens a schedule list all of all of the currentUser's
// pastAppts, activeAppts, and upcoming appts.
Tutorbook.prototype.viewSchedule = function() {
    const scheduleView = this.renderSchedule();
    const scheduleHeader = this.renderHeader('header-main', {
        title: 'Schedule'
    });

    history.pushState({}, null, '/app/schedule');
    this.navSelected = 'Schedule';
    this.view(scheduleHeader, scheduleView);

    this.viewScheduleEvents();
};


// View function that appends the schedule events as they are created and
// changed.
Tutorbook.prototype.viewScheduleEvents = function() {
    var that = this;

    if (this.user.type === 'Supervisor') {
        // Show the supervisors all the appointments at their location
        [
            'appointments',
            'activeAppointments',
            'pastAppointments'
        ].forEach((subcollection) => {
            this.getSupervisorSubcollectionData(subcollection).then((query) => {
                query.onSnapshot((snapshot) => {
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
        });
    } else {
        [
            'appointments',
            'activeAppointments',
            'pastAppointments'
        ].forEach((subcollection) => {
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


// View function that appends the given event/appt object into the correct
// location in the schedule list view (and adjusts the MDC List Dividers as
// necessary).
Tutorbook.prototype.viewScheduleListItem = function(listItem) {
    if (!!!listItem) {
        console.warn('Invalid card passed to viewScheduleListItem:', listItem);
        return;
    }

    const scheduleEl = document.querySelector('main .schedule .mdc-list');
    const timestamp = new Date(listItem.getAttribute('timestamp'));
    const id = listItem.getAttribute('id');

    // First, look to find the existing event listItem that has the closest
    // time (and the same date/day) that this new listItem has.
    var existingCard = scheduleEl.querySelector('#' + id);
    if (!!existingCard) {
        // modify
        scheduleEl.insertBefore(listItem, existingCard);
        scheduleEl.removeChild(existingCard);
    } else {
        // add
        // Find the first child that occured later than the child we're
        // trying to insert. Then insert this child right above it.
        for (var i = 0; i < scheduleEl.children.length; i++) {
            var child = scheduleEl.children[i];
            var time = new Date(child.getAttribute('timestamp'));

            // If we've found a child that occurred later, break and insert.
            if (time && time > timestamp) {
                break;
            }
        }
        if (!!child) {
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
                scheduleEl.insertBefore(listItem, child);
            } else {
                // Add a list divider with the correct label above the listItem
                // we just inserted
                scheduleEl.insertBefore(listItem, child);
                var listDivider = this.renderDateDivider(timestamp);
                scheduleEl.insertBefore(listDivider, listItem);
            }
        } else {
            scheduleEl.insertBefore(listItem, child);
            var listDivider = this.renderDateDivider(timestamp);
            scheduleEl.insertBefore(listDivider, listItem);
        }
    }

    MDCRipple.attachTo(listItem);
};


// Helper function that scrolls to an element smoothly within a given amount
// of time. See: https://stackoverflow.com/questions/51689653/how-to-smoothly-
// scroll-to-an-element-in-pure-javascript
Tutorbook.prototype.scrollToSmoothly = function(el, time) {
    const pos = el.offsetTop;
    /*Time is only applicable for scrolling upwards*/
    /*Code written by hev1*/
    /*pos is the y-position to scroll to (in pixels)*/
    if (isNaN(pos)) {
        throw "Position must be a number";
    }
    if (pos < 0) {
        throw "Position can not be negative";
    }
    var currentPos = window.scrollY || window.screenTop;
    if (currentPos < pos) {
        var t = 10;
        for (let i = currentPos; i <= pos; i += 10) {
            t += 10;
            setTimeout(function() {
                window.scrollTo(0, i);
            }, t / 2);
        }
    } else {
        time = time || 2;
        var i = currentPos;
        var x;
        x = setInterval(function() {
            window.scrollTo(0, i);
            i -= 10;
            if (i <= pos) {
                clearInterval(x);
            }
        }, time);
    }
};


// Helper function that returns the next date with the given day from the given 
// Date() and day
Tutorbook.prototype.getNextDateWithDay = function(date, day) {
    while (this.data.days[date.getDay()] !== day) {
        date.setDate(date.getDate() + 1);
    }
    return date;
};


// Render function that returns an MDC List Item for the transaction history view 
// populated that tells the user that they have no transactions.
Tutorbook.prototype.renderEmptyTransactionsListItem = function() {
    const now = new Date();
    const listItem = this.renderTemplate('transaction-list-item', {
        photo: this.user.photo,
        title: 'No Transactions',
        subtitle: 'You have no transactions. Go ahead and find a' +
            ((this.user.type === 'Tutor') ? ' pupil' : (this.user.type === 'Pupil') ?
                ' tutor' : 'nother user') + ' to create one.',
        meta_title: '$0.00',
        meta_subtitle: this.getDayAndDateString(now),
        timestamp: now,
        go_to_transaction: () => {},
    });
    MDCRipple.attachTo(listItem);
    listItem.setAttribute('class', listItem.getAttribute('class') + ' empty-payment');
    return listItem;
};


// Render function that returns an MDC List Item for the transaction history view 
// populated with the given documents transaction data.
Tutorbook.prototype.renderPendingPaymentListItem = function(doc) {
    const payment = doc.data();
    const time = payment.timestamp.toDate();
    const title = 'Pending Payment';
    const subtitle = payment.from.name + ' paid you $' + payment.amount +
        ' for a ' + this.getDurationStringFromDates(
            payment.for.clockIn.sentTimestamp.toDate(),
            payment.for.clockOut.sentTimestamp.toDate()
        ) + ' long lesson on ' + payment.for.for.subject + '.';
    const meta_title = '$' + payment.amount;
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
    listItem.setAttribute('class', listItem.getAttribute('class') + ' pending-payment');
    return listItem;
};


// Render function that returns an MDC List Item for the transaction history view 
// populated with the given documents transaction data.
Tutorbook.prototype.renderPastPaymentListItem = function(doc) {
    const payment = doc.data();
    const time = payment.timestamp.toDate();
    const title = 'Completed Payment';
    const subtitle = 'You paid ' + payment.to.name + ' $' + payment.amount +
        ' for a ' + this.getDurationStringFromDates(
            payment.for.clockIn.sentTimestamp.toDate(),
            payment.for.clockOut.sentTimestamp.toDate()
        ) + ' long lesson on ' + payment.for.for.subject + '.';
    const meta_title = '$' + payment.amount;
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
    listItem.setAttribute('class', listItem.getAttribute('class') + ' past-payment');
    return listItem;
};


// Render function that returns an MDC List Item for the transaction history view 
// populated with the given documents transaction data.
Tutorbook.prototype.renderAuthPaymentListItem = function(doc) {
    const payment = doc.data();
    const time = payment.timestamp.toDate();
    const title = 'Authorized Payment';
    const subtitle = 'You authorized a payment to ' + payment.to.name + '.' +
        " We won't process any money until after you're satisfied with " +
        this.getGenderPronoun(payment.to.gender) + ' lesson.';
    const meta_title = '$' + payment.amount;
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


// Render function that returns an MDC List Item for the schedule view populated
// with the given documents appt data.
Tutorbook.prototype.renderApptListItem = function(doc) {
    const appt = doc.data();
    const photo = this.getOtherUser(appt.attendees[0], appt.attendees[1]).photo;
    const title = "Upcoming Appointment with " + this.getOtherUser(
        appt.attendees[0],
        appt.attendees[1]).name;
    const subtitle = "Tutoring session for " + appt.for.subject + " at the " +
        appt.location.name + ".";
    const time = this.getNextDateWithDay(new Date(), appt.time.day);

    var that = this;
    return this.renderTemplate('appt-list-item', {
        photo: photo,
        title: title,
        subtitle: subtitle,
        timestamp: time,
        go_to_appt: () => {
            that.viewUpcomingApptDialog(appt, doc.id);
        },
    });
};


// Render function that returns an MDC List Item for the schedule view populated
// with the given documents activeAppt data.
Tutorbook.prototype.renderActiveApptListItem = function(doc) {
    const activeAppt = doc.data();
    const photo = this.getOtherUser(activeAppt.attendees[0], activeAppt.attendees[1]).photo;
    const title = "Active Appointment with " + this.getOtherUser(
        activeAppt.attendees[0],
        activeAppt.attendees[1]).name;
    const subtitle = "Tutoring session right now for " + activeAppt.for.subject +
        " at the " + activeAppt.location.name + ".";

    var that = this;
    return this.renderTemplate('appt-list-item', {
        photo: photo,
        title: title,
        subtitle: subtitle,
        timestamp: activeAppt.clockIn.sentTimestamp.toDate(),
        go_to_appt: () => {
            that.viewActiveApptDialog(activeAppt, doc.id);
        },
    });
};


// Render function that returns an MDC List Item for the schedule view populated
// with the given documents pastAppt data.
Tutorbook.prototype.renderPastApptListItem = function(doc) {
    const pastAppt = doc.data();
    const photo = this.getOtherUser(pastAppt.attendees[0], pastAppt.attendees[1]).photo;
    const title = "Past Appointment with " + this.getOtherUser(
        pastAppt.attendees[0],
        pastAppt.attendees[1]).name;
    const subtitle = "Tutoring session for " + pastAppt.for.subject + " at the " +
        pastAppt.location.name + ".";

    var that = this;
    return this.renderTemplate('appt-list-item', {
        photo: photo,
        title: title,
        subtitle: subtitle,
        timestamp: pastAppt.clockIn.sentTimestamp.toDate(),
        go_to_appt: () => {
            that.viewPastApptDialog(pastAppt, doc.id);
        },
    });
};


// Render function that returns a date label with an MDC List Divider
Tutorbook.prototype.renderDateDivider = function(date) {
    const dateString = this.getDayAndDateString(date);
    // NOTE: The dateDividers have to have the earliest possible timestamp
    // on a given date so that when we're inserting events in the calendar,
    // they always divide at the correct location.
    this.log('Rendering date divider for date:', date.toLocaleDateString());
    const earliestDateOnDate = new Date(date.getFullYear(), date.getMonth(),
        date.getDate(), 0, 0, 0, 0);
    this.log('Earliest date on that date:', earliestDateOnDate.toLocaleDateString());
    return this.renderTemplate('date-list-divider', {
        date: dateString,
        timestamp: earliestDateOnDate,
    });
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
    });
    if (this.onMobile) {
        // TODO: Render and append a welcome card that spans the whole top
        const welcomeCard = this.renderWelcomeCard({
            title: 'Appointments',
            // TODO: Actually sync appointments and show the correct status
            // message here.
            summary: 'View past tutoring sessions and edit upcoming ' +
                'appointments. These events are currently up-to-date on' +
                ' Google Calendar.',
            subtitle: 'View and edit events',
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


// View function that opens a js-full-calendar view showing all of the user's
// current and pastAppts.
Tutorbook.prototype.viewFullCalendar = function() {
    const calendarView = this.renderTemplate('full-calendar');
    const calendarEl = calendarView.querySelector('#fullcalendar');
    const calendarHeader = this.renderHeader('header-main', {
        title: 'Calendar'
    });

    history.pushState({}, null, '/app/calendar');
    this.navSelected = 'Calendar';
    this.view(calendarHeader, calendarView);

    const calendar = new Calendar(calendarEl, {
        plugins: [dayGridPlugin, timeGridPlugin, listPlugin],
        timeZone: 'UTC',
        header: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth'
        },
        weekNumbers: true,
        eventLimit: true, // allow "more" link when too many events
        events: 'https://fullcalendar.io/demo-events.json',
        defaultView: 'listMonth',
    });

    return calendar.render();
};


// Data flow function that adds a notification to the currentUser's Firestore
// doc
Tutorbook.prototype.addNotification = function(notification) {
    return firebase.firestore().collection('usersByEmail').doc(this.user.email)
        .collection('notifications')
        .doc()
        .set(notification)
        .catch((err) => {
            console.error('Error while sending ' + this.user.email +
                ' notification:', err);
        });
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


// Notification helper function this sends a welcome message
Tutorbook.prototype.sendNotificationWelcomeMessage = function() {
    const welcomeMessage = {
        notification: {
            title: 'Welcome, ' + this.user.name,
            body: "This is how we'll notify you of important app " +
                'activity.',
        },
        webpush: {
            headers: {
                'Urgency': 'high'
            },
            notification: {
                title: 'Welcome, ' + this.user.name,
                body: "This is how we'll notify you of important app " +
                    'activity.',
                requireInteraction: true,
                icon: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                    'on/logo.svg',
                badge: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                    'on/notification-badge.svg',
            },
        },
        token: this.user.notificationToken,
    };
    return this.addNotification(welcomeMessage);
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

        that.viewSnackbar(payload.notification.body);
    });
};


// View function to show snackbar with given message
Tutorbook.prototype.viewSnackbar = function(message) {
    this.closeSnackbar('snackbar');
    var el = document.getElementById('snackbar');
    var snackbar = MDCSnackbar.attachTo(el);
    snackbar.timeoutMs = 4000;
    snackbar.labelText = message;
    snackbar.open();
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
    var el = document.getElementById(id);
    var snackbar = MDCSnackbar.attachTo(el);
    // NOTE: Just calling close() won't work because we're not operating on the 
    // same snackbar instance that was created when the snackbar opened.
    snackbar.open();
    snackbar.close();
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


// View function that adjusts the current login view to require the user to
// input a supervisor code to access their supervisor account.
Tutorbook.prototype.viewSupervisorSignup = function() {
    // stub
}

// View function that adjusts the current login view to require the user to
// input a admin code to access their admin account.
Tutorbook.prototype.viewAdminSignup = function() {
    // stub
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
        info: () => {
            this.viewAboutDialog();
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
            this.user.cards.setupProfile = true;
            this.user.cards.setupNotifications = true;
            this.user.authenticated = true;
            /*
             *this.user.cards.setupCalendar = true;
             *this.user.cards.setupPayment = true;
             */
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
            /*
             *this.user.cards.setupCalendar = true;
             *this.user.cards.setupDeposit = true;
             */
            this.viewGoogleSignIn();
        },
        parent: () => {
            this.user.type = 'Parent';
            // Show setup cards in the dashboard for:
            // 1) Their profile (i.e. subjects, availability, locations)
            // 2) Linking Google Calendar or iCal to their account
            // 3) Setting up their first payment method
            // 4) Linking their account to their pupil's/child's account
            this.user.cards.setupProfile = true;
            this.user.cards.setupNotifications = true;
            this.user.authenticated = true;
            /*
             *this.user.cards.setupCalendar = true;
             *this.user.cards.setupPayment = true;
             *this.user.cards.setupChildren = true;
             */
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
            /*
             *this.user.cards.setupCalendar = true;
             *this.user.cards.setupLocation = true;
             */
            this.user.authenticated = false;
            this.viewGoogleSignIn();
        },
        admin: () => {
            this.user.type = 'Admin';
            // Show setup cards in the dashboard for:
            // 1) Setting up notifications for different type of app activity
            // 2) Applying restrictions to their user's (making the app a
            // tailored experience for their userbase)
            this.user.cards.setupNotifications = true;
            this.user.cards.setupRestrictions = true;
            this.user.authenticated = false;
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


// Helper function that retrieves the admin auth codes from the Firestore
// database (NOTE: Every code is unique to one email address and thus you have
// to be signing in with the right address to be able to use the code)
Tutorbook.prototype.getAdminCodes = function() {
    var that = this;
    return firebase.firestore().collection('auth').doc('admins').get().catch((err) => {
        that.log('Error while getting admin codes:', err);
        that.viewSnackbar('Could not fetch verification codes.');
    });
};


// View function that shows a dialog asking for their supervisor code
Tutorbook.prototype.viewCodeSignInDialog = function() {
    // First, we check if they have a valid supervisor code.
    const codes = (this.user.type === 'Admin') ? this.getAdminCodes() :
        this.getSupervisorCodes();

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
                    that.initWelcomeMessage(); // Welcome message is customized to
                    // each user.
                    that.initLastView();
                    // NOTE: We can't initUserViews or the nav-drawer-list without 
                    // a valid firebase.auth().currentUser
                    that.initFilters(); // We use this.user.subjects to customize 
                    // filters and thus cannot initFilters() without user data.
                    that.initUserViews(); // Needs Firestore permissions
                    that.initNavDrawer(); // Certain items are hidden based on user
                    // type.
                    that.initNotifications(); // TODO: Only show the notification
                    // prompt when the user submits a newRequest or clicks on the
                    // setup notifications card/dialog.
                    that.initRouter(); // Redirects to the correct screen that (most
                    // likely) needs to have Firestore permissions.
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


// Render function that returns a MDC Card that shows a setup children dialog
// showing a list of existing pupils and the option to create a new pupil
// account for your child.
Tutorbook.prototype.renderSetupChildrenCard = function() {
    var that = this;
    const card = this.renderTemplate('setup-children-card', {
        open_dialog: () => {
            that.log('TODO: Implement children setup dialog');
        },
        search: () => {
            that.log('TODO: Implement search pupils for children dialog');
        },
        create: () => {
            that.log('TODO: Implement new child/pupil account dialog');
        },
        dismiss: () => {
            this.user.cards.setupChildren = false;
            this.updateUser();
            $('main #cards #setup-children-card').remove();
        }
    });

    // Setting the id allows to locating the individual user card
    card.setAttribute('id', 'setup-children-card');
    card.setAttribute('timestamp', new Date());
    card
        .querySelectorAll('.mdc-button, .mdc-card__primary-action, .mdc-icon-button')
        .forEach((el) => {
            MDCRipple.attachTo(el);
        });

    return card;
};


// stub
Tutorbook.prototype.renderSetupPaymentCard = function() {
    var that = this;
    const card = this.renderTemplate('setup-deposit-card', {
        open_dialog: () => {
            that.log('TODO: Implement deposit setup dialog');
        },
        dismiss: () => {
            this.user.cards.setupPayment = false;
            this.updateUser();
            $('main #cards #setup-deposit-card').remove();
        },
    });

    // Setting the id allows to locating the individual user card
    card.setAttribute('id', 'setup-deposit-card');
    card.setAttribute('timestamp', new Date());
    card
        .querySelectorAll('.mdc-button, .mdc-card__primary-action, .mdc-icon-button')
        .forEach((el) => {
            MDCRipple.attachTo(el);
        });

    return card;
};


// stub
Tutorbook.prototype.renderSetupDepositCard = function() {
    const card = this.renderTemplate('setup-deposit-card', {
        open_dialog: () => {
            that.log('TODO: Implement deposit setup dialog');
        },
        dismiss: () => {
            this.user.cards.setupDeposit = false;
            this.updateUser();
            $('main #cards #setup-deposit-card').remove();
        },
    });

    // Setting the id allows to locating the individual user card
    card.setAttribute('id', 'setup-deposit-card');
    card.setAttribute('timestamp', new Date());
    card
        .querySelectorAll('.mdc-button, .mdc-card__primary-action, .mdc-icon-button')
        .forEach((el) => {
            MDCRipple.attachTo(el);
        });

    return card;
};


// Render function that returns a MDC Card that shows a notification request
// prompt when clicked.
Tutorbook.prototype.renderSetupNotificationsCard = function() {
    var that = this;
    const card = this.renderCard(
        'setup-notifications-card', {}, 'setup-notifications-card',
        'Setup Notifications', 'Enable push notifications',
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
            $('main #cards #setup-profile-card').remove();
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


// Render function that returns a MDC Card that shows a Google Calendar sync
// dialog
Tutorbook.prototype.renderSetupCalendarCard = function() {
    var that = this;
    const card = this.renderTemplate('setup-calendar-card', {
        open_dialog: () => {
            that.log('TODO: Implement calendar sync setup dialog');
        },
        google: () => {
            that.log('TODO: Implement Google Calendar sync setup dialog');
        },
        ical: () => {
            that.log('TODO: Implement iCal sync setup dialog');
        },
        dismiss: () => {
            this.user.cards.setupCalendar = false;
            this.updateUser();
            $('main #cards #setup-calendar-card').remove();
        }
    });

    // Setting the id allows to locating the individual user card
    card.setAttribute('id', 'setup-calendar-card');
    card.setAttribute('timestamp', new Date());
    card
        .querySelectorAll('.mdc-button, .mdc-card__primary-action, .mdc-icon-button')
        .forEach((el) => {
            MDCRipple.attachTo(el);
        });

    return card;
};


// View function that shows an About App dialog
Tutorbook.prototype.viewAboutDialog = function() {
    return MDCDialog.attachTo(document.querySelector('#dialog-about')).open();
};


// View function that shows a Google Sign-In Popup
Tutorbook.prototype.viewGoogleSignIn = function() {
    var that = this;
    const provider = new firebase.auth.GoogleAuthProvider();
    return firebase.auth().signInWithRedirect(provider).then((result) => {
        // Show loader again
        that.viewSnackbar('Sign in successful.');
        var token = result.credential.accessToken;
        var user = result.user;
        that.log("Signed in with user:", user);
    }).catch((error) => {
        var errorCode = error.code;
        var errorMessage = error.message;
        var email = error.email;
        that.viewSnackbar(error.message);
        console.error("Error while signing in with Google Popup:", error);
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
            '/app/calendar': function() {
                that.viewSchedule();
            },
            /*
             *'/app/payments': function() {
             *    that.initUser().then(() => {
             *        that.viewPayments();
             *    });
             *},
             */
            /*
             *'/app/settings': function() {
             *    that.initUser().then(() => {
             *        that.viewSettings();
             *    });
             *},
             */
            '/app/users/*': function() {
                var path = that.getCleanPath(document.location.pathname);
                var id = path.split('/')[3];
                that.viewUser(id);
            },
            '/app/users/': function() {
                that.viewSearch();
            },
            '/app/profile': function() {
                that.initUser().then(function() {
                    that.viewProfile();
                });
            },
            '/app/locations': function() {
                if (that.user.type === 'Supervisor') {
                    that.viewLocationManager();
                } else {
                    that.router.navigate('/app/home');
                }
            },
            '/app/dashboard': function() {
                that.initUser().then(() => {
                    that.viewDashboard();
                });
            },
            '/app/home': function() {
                that.initUser().then(() => {
                    that.viewDashboard();
                });
            },
            '/app/feedback': function() {
                that.viewFeedback();
            },
            '/app/help': function() {
                that.viewFeedback();
            },
            '/app': function() {
                that.initUser().then(() => {
                    that.viewDashboard();
                });
            },
            '/app/*': function() {
                that.initUser().then(() => {
                    that.viewDashboard();
                });
            },
        }); // NOTE: Do not add the .resolve() as it will automatically redirect

    // Redirect based on URL parameter
    if (window.location.toString().indexOf('?redirect=') > 0) {
        const redirectLink = window.location.toString().split('?redirect=')[1];
        that.router.navigate('/app/' + redirectLink);
        that.viewLoader(false);
    } else {
        that.router.navigate('/app/home');
        that.viewLoader(false);
    }
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


// Render function that returns an MDC List Item for a given user document
Tutorbook.prototype.renderUserListItem = function(doc) {
    var that = this;
    const user = doc.data();
    var listItemData = this.cloneMap(user);
    listItemData['id'] = 'doc-' + doc.id;
    listItemData['go_to_user'] = () => {
        that.viewUser(doc.id);
    };
    const el = this.renderTemplate('search-result-user', listItemData);
    this.replaceElement(
        el.querySelector('.rating__meta'),
        that.renderRating(user.avgRating)
    );
    MDCRipple.attachTo(el);
    return el;
};


// View function that shows the settings screen
Tutorbook.prototype.viewSettings = function() {
    history.pushState({}, null, '/app/settings');
    this.navSelected = 'Settings';
    const settingsHeader = this.renderHeader('header-main', {
        title: 'Settings',
    });
    const settingsView = this.renderSettings();
    this.addSettingsDataManager(settingsView);
    this.view(settingsHeader, settingsView);
};


// Helper function that adds listeners to the settings view and updates the 
// currentUser and his/her profile document as necessary.
Tutorbook.prototype.addSettingsDataManager = function(settingsView) {
    // TODO: Clean this up and only keep what's necessary.
    // Add event listeners to MDCListItems and their corresponding for fields
    var el = settingsView.querySelector('#max-message .mdc-switch');
    const maxMessageSwitch = MDCSwitch.attachTo(el);
    if (this.user.maxMessageLength === true) {
        maxMessageSwitch.checked = true;
    }
    maxMessageSwitch.listen('change', () => {
        this.user.maxMessageLength = maxMessageSwitch.checked;
        this.updateUser(this.user);
    });
    // TODO: Actually max out messages

    var el = settingsView.querySelector('#auto-response .mdc-switch');
    const autoResponseSwitch = MDCSwitch.attachTo(el);
    if (this.user.autoResponse === true) {
        autoResponseSwitch.checked = true;
    }
    autoResponseSwitch.listen('change', () => {
        this.user.autoResponse = autoResponseSwitch.checked;
        this.updateUser(this.user);
    });
    // TODO: Actually respond to requests that have expired

    var el = settingsView.querySelector('#show-description .mdc-switch');
    const showDescriptionSwitch = MDCSwitch.attachTo(el);
    if (this.user.showDescription === true) {
        showDescriptionSwitch.checked = true;
    }
    showDescriptionSwitch.listen('change', () => {
        this.user.showDescription = showDescriptionSwitch.checked;
        this.updateUser(this.user);
    });

    var el = settingsView.querySelector('#show-gender .mdc-switch');
    const showGenderSwitch = MDCSwitch.attachTo(el);
    if (this.user.showGender === true) {
        showGenderSwitch.checked = true;
    }
    showGenderSwitch.listen('change', () => {
        this.user.showGender = showGenderSwitch.checked;
        this.updateUser(this.user);
    });

    var el = settingsView.querySelector('#show-phone .mdc-switch');
    const showPhoneSwitch = MDCSwitch.attachTo(el);
    if (this.user.showPhone === true) {
        showPhoneSwitch.checked = true;
    }
    showPhoneSwitch.listen('change', () => {
        this.user.showPhone = showPhoneSwitch.checked;
        this.updateUser(this.user);
    });
};


// Render function that returns the settings view
Tutorbook.prototype.renderSettings = function() {
    // TODO: Sync user settings with Firestore and show current preferences here:
    var that = this;
    const settingsData = {
        'preferred-contact-method': this.user.preferredContactMethod,
        'preferred-message-length': 'Messages must be less than 500 characters',
        'auto-reject-deadline': 'Automatically reject messages after 5 days',
        'connect-google-calendar': 'Sync tutoring sessions with Google Calendar',
        'manage-accounts': 'Sign out or delete accounts',
        'manage-visibility': 'Manage who can view your profile',
        'show-description': 'Allow others to view your bio',
        'show-gender': 'Allow others to view your gender',
        'show-phone': 'Allow others to view your phone number',
        'set_preferred_contact_method': () => {
            var dialogEl = document.querySelector('#dialog-set-contact-method');
            const setContactDialog = MDCDialog.attachTo(dialogEl);
            dialogE.querySelectorAll('.mdc-radio').forEach((el) => {
                MDCRadio.attachTo(el);
            });
            // TODO: Actually make this dialog do stuff
            setContactDialog.open();
        },
        'connect_calendar': () => {
            that.log("TODO: Implement connect Google Calendar dialog.");
        },
        'manage_accounts': () => {
            that.log("TODO: Implement manage accounts dialog.");
        },
        'manage_visibility': () => {
            that.log("TODO: Implement manage visibility dialog.");
        },
        welcome: !this.onMobile,
    };
    const mainEl = this.renderTemplate('settings-view', settingsData);
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
    mainEl.querySelectorAll('.mdc-icon-button i').forEach((el) => {
        MDCRipple.attachTo(el);
    });
    return mainEl;
};


// View function that shows the given user's profile
Tutorbook.prototype.viewUser = function(id) {
    history.pushState({}, null, '/app/users/' + id);
    const userHeader = this.renderHeader('header-back', {
        'title': 'View User',
    });
    const userView = !!this.userViews ? this.userViews[id] : false;
    if (!!!userView) {
        return this.getUser(id).then((doc) => {
            return this.view(userHeader, this.renderUserView(doc));
        });
    }
    return this.view(userHeader, userView);
};


// Init function that renders userViews and appends them to this.userViews
Tutorbook.prototype.initUserViews = function() {
    var that = this;
    this.userViews = {};
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
    const results = document.querySelector('.main .search #results');
    var existingLocationCard = results.querySelector(
        "[id=" + "'" + listItem.getAttribute('id') + "']"
    );
    if (existingLocationCard) {
        // modify
        results.insertBefore(listItem, existingLocationCard);
        results.removeChild(existingLocationCard);
    } else {
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
// type are must-haves)
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
    }
    return true;
};


// Render function that returns the userView for a given user Firestore document
Tutorbook.prototype.renderUserView = function(doc) {
    var user = doc.data();
    user.subjects = this.getUserSubjects(user);
    const userView = this.renderTemplate('user-view', user);

    this.addUserViewDataManager(userView, user);
    return userView;
};


// Helper function that adds listeners to the user view (i.e. to open the
// newRequest dialog when the user hits a subject or to open the newReview
// dialog when the user hits that review button).
Tutorbook.prototype.addUserViewDataManager = function(userView, user) {
    var that = this;
    // SUBJECTS
    userView.querySelectorAll('#subjects .mdc-list-item').forEach((el) => {
        MDCRipple.attachTo(el);
        el.addEventListener('click', () => {
            that.viewNewRequestDialog(
                el.querySelector('.mdc-list-item__text').innerText,
                user
            );
        });
    });
};


// Init function that defines all recyclers (I know this is way over the 20 line
// limit, but screw it...)
Tutorbook.prototype.initRecyclers = function() {
    this.cards = {};
    var that = this;
    this.locationRecycler = {
        remove: (doc) => {
            if (that.navSelected === 'Locations') {
                $('main #doc-' + doc.id).remove();
            }
        },
        display: (doc) => {
            if (that.navSelected === 'Locations') {
                that.viewCard(that.renderLocationCard(doc));
            }
        },
        empty: () => {
            if (that.navSelected === 'Locations') {
                $('main #cards .location-card').remove();
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

    this.transactionRecycler = {
        remove: (doc, type) => {
            if (that.navSelected === 'Payments') {
                return $('main #doc-' + type + '-' + doc.id).remove();
            }
        },
        display: (doc, type) => {
            switch (type) {
                case 'authorizedPayments':
                    that.cards.noAuthPayments = false;
                    var listItem = that.renderAuthPaymentListItem(doc);
                    break;
                case 'pastPayments':
                    that.cards.noPastPayments = false;
                    var listItem = that.renderPastPaymentListItem(doc);
                    break;
                case 'pendingPayments':
                    that.cards.noPendingPayments = false;
                    var listItem = that.renderPendingPaymentListItem(doc);
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
                case 'authorizedPayments':
                    that.cards.noAuthPayments = true;
                    $('main .payments #history ul .auth-payment').remove();
                    break;
                case 'pastPayments':
                    that.cards.noPastPayments = true;
                    $('main .payments #history ul .past-payment').remove();
                    break;
                case 'pendingPayments':
                    that.cards.noPendingPayments = true;
                    $('main .payments #history ul .pending-payment').remove();
                    break;
            };
            if (that.cards.noAuthPayments &&
                that.cards.noPastPayments &&
                that.cards.noPendingPayments) {
                $('main .payments #history ul').empty().append(
                    that.renderEmptyTransactionsListItem()
                );
                that.log('No transactions.');
            }
        },
    };

    this.searchRecycler = {
        remove: (doc) => {
            if (that.navSelected === 'Search' || that.navSelected === 'Tutors' ||
                that.navSelected === 'Pupils') {
                return $("main #results [id='doc-" + doc.id + "']").remove();
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
                return $('main #results').empty().append(that.renderEmptySearch());
            }
        },
    };

    this.scheduleRecycler = {
        remove: (doc, type) => {
            if (that.navSelected === 'Schedule') {
                return $('main #doc-' + type + '-' + doc.id).remove();
            }
        },
        display: (doc, type) => {
            switch (type) {
                case 'appointments':
                    that.cards.noAppointments = false;
                    var listItem = that.renderApptListItem(doc);
                    break;
                case 'pastAppointments':
                    that.cards.noPastAppointments = false;
                    var listItem = that.renderPastApptListItem(doc);
                    break;
                case 'activeAppointments':
                    that.cards.noActiveAppointments = false;
                    var listItem = that.renderActiveApptListItem(doc);
                    break;
            };
            if (that.navSelected === 'Schedule') {
                return that.viewScheduleListItem(listItem);
            }
        },
        empty: (type) => {
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
            if (that.cards.noAppointments && that.cards.noPastAppointments &&
                that.cards.noActiveAppointments) {
                $('main .mdc-list').empty();
                $('main').append(that.renderEmptySchedule());
            }
        },
    };

    this.dashboardRecycler = {
        remove: function(doc, type) {
            if (that.navSelected === 'Home' || that.navSelected === 'Tutorbook') {
                return $('main #doc-' + type + '-' + doc.id).remove();
            }
        },
        display: function(doc, type) {
            switch (type) {
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
                    var card = that.renderAppointmentCard(doc);
                    break;
                case 'modifiedAppointments':
                    that.cards.noModifiedAppointments = false;
                    var card = that.renderModifiedAppointmentCard(doc);
                    break;
                case 'canceledAppointments':
                    that.cards.noCanceledAppointments = false;
                    var card = that.renderCanceledAppointmentCard(doc);
                    break;

                    // SUPERVISOR CARDS
                case 'pendingClockIns':
                    that.cards.noPendingClockIns = false;
                    var card = that.renderPendingClockInCard(doc);
                    break;
                case 'pendingClockOuts':
                    that.cards.noPendingClockOuts = false;
                    var card = that.renderPendingClockOutCard(doc);
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
                case 'setupProfile':
                    if (doc) {
                        var card = that.renderSetupProfileCard();
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
                case 'setupChildren':
                    if (doc) {
                        var card = that.renderSetupChildrenCard();
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
            if (that.navSelected === 'Home' || that.navSelected === 'Tutorbook') {
                that.viewCard(card);
            }
        },
        empty: function(type) {
            if (that.navSelected === 'Home' || that.navSelected === 'Tutorbook') {
                // TODO: Make this render a unique "no upcoming" el like GMail does
                switch (type) {

                    // TUTOR/PUPIL/PARENT CARDS
                    case 'requestsIn':
                        that.cards.noRequestsIn = true;
                        $('main #cards .card-requestsIn').remove();
                        break;
                    case 'modifiedRequestsIn':
                        that.cards.noModifiedRequestsIn = true;
                        $('main #cards .card-modifiedRequestsIn').remove();
                        break;
                    case 'canceledRequestsIn':
                        that.cards.noCanceledRequestsIn = true;
                        $('main #cards .card-canceledRequestsIn').remove();
                        break;
                    case 'requestsOut':
                        that.cards.noRequestsOut = true;
                        $('main #cards .card-requestsOut').remove();
                        break;
                    case 'modifiedRequestsOut':
                        that.cards.noModifiedRequestsOut = true;
                        $('main #cards .card-modifiedRequestsOut').remove();
                        break;
                    case 'rejectedRequestsOut':
                        that.cards.noRejectedRequestsOut = true;
                        $('main #cards .card-rejectedRequestsOut').remove();
                        break;
                    case 'approvedRequestsOut':
                        that.cards.noApprovedRequestsOut = true;
                        $('main #cards .card-approvedRequestsOut').remove();
                        break;
                    case 'appointments':
                        that.cards.noAppointments = true;
                        $('main #cards .card-appointments').remove();
                        break;
                    case 'modifiedAppointments':
                        that.cards.noModifiedAppointments = true;
                        $('main #cards .card-modifiedAppointments').remove();
                        break;
                    case 'canceledAppointments':
                        that.cards.noCanceledAppointments = true;
                        $('main #cards .card-canceledAppointments').remove();
                        break;

                        // SUPERVISOR CARDS
                    case 'pendingClockIns':
                        that.cards.noPendingClockIns = true;
                        $('main #cards .card-pendingClockIns').remove();
                        break;
                    case 'pendingClockOuts':
                        that.cards.noPendingClockOuts = true;
                        $('main #cards .card-pendingClockOuts').remove();
                        break;
                    case 'approvedClockIns':
                        that.cards.noApprovedClockIns = true;
                        $('main #cards .card-approvedClockIns').remove();
                        break;
                    case 'approvedClockOuts':
                        that.cards.noApprovedClockOuts = true;
                        $('main #cards .card-approvedClockOuts').remove();
                        break;

                    default:
                        console.warn("Invalid type passed to dashboardRenderer " +
                            "empty:", type);
                        break;
                };

                // Helper function to check if this.user.cards is empty from cards
                // that need to be rendered in the dashboard display
                function emptySetupCards() {
                    const cards = that.user.cards;
                    var empty = true;
                    ['setupPayment', 'setupCalendar', 'setupProfile',
                        'setupLocation', 'setupNotifications', 'welcomeMessage',
                    ].forEach((card) => {
                        if (!!that.user.cards[card]) {
                            empty = false;
                        }
                    });
                    return empty;
                };

                // Only show empty screen when all card types show up empty
                if (emptySetupCards() && that.cards.noRequestsIn && that.cards.noRequestsOut && that.cards.noAppointments) {
                    $('.main #cards').empty();
                }
            }
        }
    };
};


// Render functiont that returns an empty message screen
Tutorbook.prototype.renderEmptySchedule = function() {
    return this.renderTemplate('centered-text', {
        text: 'No events.'
    });
};


// Helper function to clone maps
Tutorbook.prototype.cloneMap = function(map) {
    var clone = {};
    for (var i in map) {
        clone[i] = map[i];
    }
    return clone;
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


// Helper function to sign the user out
Tutorbook.prototype.signOut = function() {
    firebase.auth().signOut();
    this.router.navigate('/');
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
            'settings': () => {
                that.router.navigate('/app/settings');
            },

        }));
    MDCTopAppBar.attachTo(headerEl);
    headerEl.querySelectorAll('.mdc-button').forEach((el) => {
        MDCRipple.attachTo(el);
    });
    return headerEl;
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
            that.viewDashboard();
        },
        showSchedule: function() {
            that.viewSchedule();
        },
        showAppts: function() {
            that.log("TODO: Implement appointment view");
        },
        showProfile: function() {
            that.viewProfile();
        },
        showSettings: function() {
            that.initUser().then(() => {
                that.viewSettings();
            });
        },
        showHelp: function() {
            that.viewFeedback();
        },
        /*
         *showHistory: function() {
         *    that.viewHistory();
         *},
         */
        // Some app destinations are exclusive to certain user types
        payments: that.user.type === 'Tutor' || that.user.type === 'Pupil',
        showPayments: function() {
            that.initUser().then(() => {
                that.viewPayments();
            });
        },
        locations: that.user.type === 'Supervisor',
        showLocations: () => {
            that.viewLocationManager();
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
    var that = this;
    const paymentsHeader = this.renderHeader('header-main', {
        title: 'Payments'
    });
    const paymentsView = this.renderPayments();

    this.view(paymentsHeader, paymentsView);
    this.viewTransactionHistory();
    this.addPaymentsManager();
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
    // stub
    return ['authorizedPayments', 'pendingPayments', 'pastPayments'];
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
        welcomeTitle: 'Payments.',
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
    view.appendChild(this.renderSplitInputItem(
        this.renderSelect('Hourly charge', this.user.payments.hourlyChargeString,
            this.data.payments.hourlyChargeStrings),
        this.renderTextField('Current balance', this.user.payments.currentBalanceString),
    ));
    view.appendChild(this.renderTextFieldItem('Total hours worked',
        this.getDurationStringFromSecs(this.user.secondsTutored || 0)
    ));
    return view;
};


// Helper function that returns a duration string (hrs:min:sec) given two Date
// objects.
Tutorbook.prototype.getDurationStringFromDates = function(start, end) {
    const secs = (end.getTime() - start.getTime()) / 1000;
    return this.getDurationStringFromSecs(secs);
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
            return firebase.firestore().collection('processingPayments')
                .doc(that.user.email)
                .set({
                    timestamp: new Date()
                }).then(() => {
                    that.viewSnackbar('Sent payment request.');
                }).catch((err) => {
                    console.error('Error while adding processingPayment doc:', err);
                    that.viewSnackbar('Could not open payment request. Note ' +
                        'that we can only process one request at a time.');
                });
        }
    });
    return dialog.open();
};


// Render function that returns an add payment method card
Tutorbook.prototype.renderAddPaymentMethodCard = function() {
    var that = this;
    const card = this.renderCard('add-method', {}, 'paymentMethod', 'Add Method',
        'Tap to add a payment method',
        'Connect to a PayPal or bank account for direct, breath-easy payment ' +
        'management.', {
            primary: () => {
                that.log('TODO: Implement add payment method dialog.');
            },
            add: () => {
                that.log('TODO: Implement add payment method dialog.');
            },
        }
    );
    return card;
};


// View function that enables supervisors to manage their locations
Tutorbook.prototype.viewLocationManager = function() {
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


// View function that shows comprehensive history of all app activity related to
// the currentUser.
Tutorbook.prototype.viewHistory = function() {
    history.pushState({}, null, '/app/history');
    this.navSelected = 'History';
    var that = this;
    /*
     *this.initHistoryFilterDescription();
     */
    // TODO: Implement search/filter-able content
    const historyHeader = this.renderHeader('header-main', {
        'title': 'History',
        /*
         *'show_filter_dialog': () => {
         *    that.viewHistoryFilterDialog();
         *},
         *'filter_description': "a stub.",
         *'clear_filters': () => {
         *    that.initHistoryFilters();
         *    // NOTE: For some callback reason, I can't nest viewSearch calls
         *    window.app.viewHistory();
         *},
         */
    });
    const historyView = this.renderTemplate('history');
    this.view(historyHeader, historyView);

    return this.viewHistoryResults();
};


// View function that shows the search view
Tutorbook.prototype.viewSearch = function() {
    history.pushState({}, null, '/app/search');
    var that = this;
    this.initFilterDescription();
    this.setSearchNavSelected();
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
                type: 'Any',
                sort: 'Rating'
            };
            // NOTE: For some callback reason, I can't nest viewSearch calls
            window.app.viewSearch();
        },
    });
    const searchView = this.renderTemplate('search');
    this.view(searchHeader, searchView);

    return this.viewSearchResults();
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


// Helper function that empties the current transactions to display new ones
Tutorbook.prototype.emptyTransactions = function() {
    return $('main .payments #history ul').empty();
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
        query = query.where('gradeString', '==', this.filters.grade);
    }

    if (this.filters.subject !== 'Any') {
        query = query
            .where('subjects', 'array-contains', this.filters.subject);
    }

    if (this.filters.gender !== 'Any') {
        query = query.where('gender', '==', this.filters.gender);
    }

    if (this.filters.type !== 'Any') {
        query = query.where('type', '==', this.filters.type);
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

    return dialog.open();
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
            sort: 'Rating'
        };
        renderAllList();
    });

    this.replaceElement(
        dialog.querySelector('#grade-list'),
        this.renderTemplate('dialog-filter-item-list', {
            items: ['Any'].concat(this.data.grades)
        })
    );

    this.replaceElement(
        dialog.querySelector('#subject-list'),
        this.renderTemplate('dialog-filter-item-list', {
            items: ['Any'].concat(this.data.subjects)
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

    function clearFilters(filters) {
        // Helper function to get rid of the 'Any' selected option for
        // better rendering.
        var result = {};
        for (var filter in filters) {
            if (filters[filter] !== 'Any') {
                result[filter] = filters[filter];
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
                displaySection(id);
            });
        });
    };

    function displaySection(id) {
        if (id === 'page-all') {
            renderAllList();
        }

        pages.forEach(function(sel) {
            if (sel.id === id) {
                sel.style.display = 'inherit';
            } else {
                sel.style.display = 'none';
            }
        });
    };

    pages.forEach(function(sel) {
        var key = sel.id.split('-')[1];
        if (key === 'all') {
            return;
        }

        sel.querySelectorAll('.mdc-list-item').forEach(function(el) {
            el.addEventListener('click', function() {
                that.filters[key] = el.innerText.trim();
                displaySection('page-all');
            });
        });
    });

    displaySection('page-all');
    dialog.querySelectorAll('.back').forEach(function(el) {
        el.addEventListener('click', function() {
            displaySection('page-all');
        });
    });

    return dialog;
};


// Init function that sets this.filterDescription to match this.this.filters
Tutorbook.prototype.initFilterDescription = function() {
    this.filterDescription = '';

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
            this.filterDescription += ' all users';
        } else if (this.filters.grade !== 'Freshman') {
            // "Freshman" is weird as it is the plural and singular
            this.filterDescription += 's';
        }
    }


    if (this.filters.subject !== 'Any') {
        this.filterDescription += ' for ' + this.filters.subject;
    }

    if (this.filters.sort === 'Rating') {
        this.filterDescription += ' sorted by rating';
    } else if (this.filters.sort === 'Reviews') {
        this.filterDescription += ' sorted by # of reviews';
    }
};


// Init function that resets this.filters to the default config
Tutorbook.prototype.initFilters = function() {
    this.filters = {
        grade: 'Any',
        subject: 'Any',
        gender: 'Any',
        type: 'Any',
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
            type: 'Any',
            sort: 'Rating'
        };
    }

    this.initFilterDescription();
};


// View function that shows profile view
Tutorbook.prototype.viewProfile = function() {
    history.pushState({}, null, '/app/profile');
    this.navSelected = 'Profile';
    const profileView = this.renderProfile();
    const profileHeader = this.renderHeader('header-main', {
        'title': 'Profile'
    });
    this.view(profileHeader, profileView);
    // NOTE: We have to attach MDC Components after the view is shown or they
    // do not render correctly.
    this.addProfileDataManager(profileView);
};


// Render function that renders the profile view with the currentUser's info
Tutorbook.prototype.renderProfile = function() {
    const mainEl = this.renderTemplate('profile');

    // Ensure that inputs are appended in correct order w/ list dividers
    mainEl.appendChild(this.renderUserHeader(this.user));

    // ABOUT YOU
    // Type can be changed only once
    if (!!this.user.type && this.user.type !== '') {
        var typeEl = this.renderTextField('Type', this.user.type);
    } else {
        var typeEl = this.renderSelect('Type', this.user.type, this.data.types);
    }
    mainEl.appendChild(this.renderListDivider('About you'));
    mainEl.appendChild(this.renderSplitInputItem(
        this.renderTextField('Bio', this.user.bio),
        typeEl,
    ));
    mainEl.appendChild(this.renderSplitInputItem(
        this.renderSelect('Grade', this.user.grade, this.data.grades),
        this.renderSelect('Gender', this.user.gender, this.data.genders)
    ));

    // CONTACT INFO
    mainEl.appendChild(this.renderListDivider('Contact info'));
    mainEl.appendChild(this.renderSplitInputItem(
        this.renderTextField('Phone', this.user.phone),
        this.renderTextField('Email', this.user.email)
    ));

    // TUTOR/PUPIL FOR
    // Just in case the user hasn't set a user type yet
    var userTypeString = this.user.type || 'User';
    mainEl.appendChild(this.renderListDivider(
        userTypeString + ' for'
    ));
    mainEl.appendChild(this.renderSubjectSelectsItem(this.user.subjects));

    // AVAILABILITY
    mainEl.appendChild(this.renderListDivider('Availability'));
    mainEl.appendChild(this.renderAvailabilityItem(this.user.availability));

    return mainEl;
};


// Helper function that adds listeners to the profile view and updates the 
// currentUser and his/her profile document as necessary.
Tutorbook.prototype.addProfileDataManager = function(profileView) {
    var that = this;

    // ABOUT YOU (bio text field, type select, gender select, grade select)
    const bioEl = profileView.querySelector('#Bio');
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
        // TODO: Do we want to move gradeString to just grade? 
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
    var subjectSelects = [];
    profileView.querySelectorAll('#Subject').forEach((subjectEl) => {
        var subjectSelect = that.attachSelect(subjectEl);
        subjectSelects.push(subjectSelect);
        subjectSelect.listen('MDCSelect:change', function() {
            // Read in all current subject select values
            that.user.subjects = [];
            subjectSelects.forEach((select) => {
                if (select.value !== "") {
                    that.user.subjects.push(select.value);
                }
            });
            updateUser();
            that.viewSnackbar('Subjects updated.');
        });
    });

    // AVAILABILITY (time, day, and location selects)
    var availabilityTextFields = [];
    profileView.querySelectorAll('#Available').forEach((el) => {
        // TODO: Disable these text fields in some way so that they don't allow
        // keyboard input.
        const textField = MDCTextField.attachTo(el);
        el.addEventListener('click', () => {
            that.viewEditAvailabilityDialog(textField);
        });
        availabilityTextFields.push(textField);
    });


    function updateUser() {
        that.user.bio = bioTextField.value || "";
        that.user.phone = phoneTextField.value || "";

        // Update the user's profile to match all existing values
        that.updateProfileAvailability(availabilityTextFields);

        // If the profile is populated, dismiss the setupProfileCard
        that.user.cards.setupProfile = !that.userProfile();

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


// Helper function that returns true if and only if the user's profile is fully
// populated.
Tutorbook.prototype.userProfile = function() {
    // NOTE: We don't care if they don't have a phone # or bio
    return (!!this.user.type && !!this.user.grade && !!this.user.gender &&
        !!this.user.email && !!this.user.subjects && !!this.user.availability);
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


// Helper function to capitalize the first letter of any given string
Tutorbook.prototype.capitalizeFirstLetter = function(string) {
    if (typeof string == undefined) return;
    var firstLetter = string[0] || string.charAt(0);
    return firstLetter ? firstLetter.toUpperCase() + string.substr(1) : '';
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


// View function that opens a dialog asking for approval for a clockIn
Tutorbook.prototype.viewClockInDialog = function(doc) {
    const data = doc.data();
    const title = 'Approve Clock In?';
    const summary = data.sentBy.name + ' clocked in at ' +
        this.getTimeString(data.sentTimestamp) + ' for ' +
        this.getGenderPronoun(data.sentBy.gender) + ' appointment with ' +
        this.getOtherAttendee(data.sentBy, data.for.attendees).name + ' at ' +
        data.for.time.from + '. Approve this clock in?';

    const dialogEl = this.renderTemplate('dialog-confirmation');
    dialogEl.querySelector('.mdc-dialog__title').innerText = title;
    dialogEl.querySelector('.mdc-dialog__content').innerText = summary;
    this.viewDialog(dialogEl);

    var that = this;
    const dialog = MDCDialog.attachTo(dialogEl);
    dialog.listen('MDCDialog:closing', (event) => {
        if (event.detail.action === 'yes') {
            return that.approveClockIn(data, doc.id);
        } else if (event.detail.action === 'no') {
            return that.rejectClockIn(data, doc.id);
        }
    });
    dialog.scrimClickAction = '';
    dialog.escapeKeyAction = '';
    dialog.autoStackButtons = false;

    return dialog.open();
};


// View function that opens a dialog asking for approval for a clockOut
Tutorbook.prototype.viewClockOutDialog = function(doc) {
    const data = doc.data();
    const title = 'Approve Clock Out?';
    const summary = data.sentBy.name + ' clocked out at ' +
        this.getTimeString(data.sentTimestamp) + ' for his appointment with ' +
        this.getOtherAttendee(data.sentBy, data.for.attendees).name + ' ending at ' +
        data.for.time.to + '. Approve this clock out?';

    const dialogEl = this.renderTemplate('dialog-confirmation');
    dialogEl.querySelector('.mdc-dialog__title').innerText = title;
    dialogEl.querySelector('.mdc-dialog__content').innerText = summary;
    this.viewDialog(dialogEl);

    var that = this;
    const dialog = MDCDialog.attachTo(dialogEl);
    dialog.listen('MDCDialog:closing', (event) => {
        if (event.detail.action === 'yes') {
            return that.approveClockOut(data, doc.id);
        } else if (event.detail.action === 'no') {
            return that.rejectClockOut(data, doc.id);
        }
    });
    dialog.scrimClickAction = '';
    dialog.escapeKeyAction = '';
    dialog.autoStackButtons = false;
    return dialog.open();
};


// Render function that returns a populated pendingClockIn dashboard card
// asking for approval or rejection. This should also open a confirmation
// dialog that forces an action before the rest of the app can be used.
Tutorbook.prototype.renderPendingClockInCard = function(doc) {
    const data = doc.data();
    var that = this;
    var card = this.renderCard(doc.id, data, 'pendingClockIns',
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
    this.log('Viewing clock in approval dialog...');
    this.viewClockInDialog(doc);
    return card;
};


// Data action function that deletes the pendingClockIn document and creates an
// approvedClockIn document within the currentUser's (i.e. the supervisor's)
// subcollections.
Tutorbook.prototype.approveClockIn = function(clockIn, id) {
    var that = this;
    // NOTE: The doc.id of the pending ClockIn will be the same as the id of
    // the original appt. This is b/c there will only ever be one pendingClockIn 
    // for every appt doc.
    // 1) Delete the pendingClockIn doc and create an approvedClockIn doc
    this.movePendingClockInToApproved(clockIn, id).then(() => {
        // 2) Create activeAppt docs in both users and the location's 
        // subcollections (with the same id as the original appt)
        that.copyApptToActive(clockIn.for, id);
    });
};


// Data flow function that copies the appt document to the activeAppointment
// subcollections of both the tutor, student, and the location.
Tutorbook.prototype.copyApptToActive = function(appt, id) {
    // TUTOR and PUPIL
    var that = this;
    appt.attendees.forEach((user) => {
        // NOTE: The id of the activeAppt is the same as the id of the original
        // appt document. This is b/c there will only ever be one activeAppt
        // doc for every appt document.
        firebase.firestore().collection('usersByEmail').doc(user.email)
            .collection('activeAppointments')
            .doc(id)
            .set(appt).catch((err) => {
                that.log('Error while copying appt to ' + user.email +
                    ' activeAppts subcollection:', err);
            });
    });

    // LOCATION
    return firebase.firestore().collection('locations').doc(appt.location.id)
        .collection('activeAppointments')
        .doc(id)
        .set(appt).catch((err) => {
            that.log('Error while copying appt to ' + doc.id +
                ' activeAppts subcollection:', err);
        });
};


// Data flow function that moves the pendingClockIn document to the 
// approvedClockIns subcollection.
Tutorbook.prototype.movePendingClockInToApproved = function(clockIn, id) {
    var that = this;
    clockIn = this.combineMaps(clockIn, {
        approvedTimestamp: new Date(),
        approvedBy: this.filterApptUserData(this.user),
    });
    return this.deletePendingClockIn(id).then(() => {
        // NOTE: The approvedClockIn document does not share an id with the
        // pendingCLockIn or original appt doc as we want to keep a history
        // of all the approvedClockIns for this supervisor.
        return firebase.firestore().collection('usersByEmail').doc(this.user.email)
            .collection('approvedClockIns').doc().set(clockIn).then(() => {
                that.viewSnackbar('Approved clock in from ' + clockIn.sentBy.email + '.');
            }).catch((err) => {
                that.log('Error while approving clockIn:', err);
                that.viewSnackbar('Could not approve clock in.');
            });
    });
};


// Data action function that deletes the pendingClockIn document and creates a
// rejectedClockIn document within the currentUser's (i.e. the supervisor's)
// subcollections.
Tutorbook.prototype.rejectClockIn = function(clockIn, id) {
    var that = this;
    clockIn = this.combineMaps(clockIn, {
        rejectedTimestamp: new Date(),
        rejectedBy: this.filterApptUserData(this.user),
    });
    return this.deletePendingClockIn(id).then(() => {
        return firebase.firestore().collection('usersByEmail').doc(this.user.email)
            .collection('rejectedClockIns').doc(id).set(clockIn).then(() => {
                that.viewSnackbar('Rejected clock in from ' + clockIn.sentBy.email + '.');
            }).catch((err) => {
                that.log('Error while rejecting clockIn:', err);
                that.viewSnackbar('Could not reject clock in.');
            });
    });
};


// Data flow function that deletes the given pendingClockIn document
Tutorbook.prototype.deletePendingClockIn = function(id) {
    return this.removeCardDoc('pendingClockIns', id);
};


// Data flow function that deletes the given pendingClockOut document
Tutorbook.prototype.deletePendingClockOut = function(id) {
    return this.removeCardDoc('pendingClockOuts', id);
};


// Data action function that:
// 1) Deletes the pendingClockOut document and
// 2) Creates an approvedClockOut document within the currentUser's (i.e. the 
// supervisor's) subcollections.
// 3) Deletes the activeAppointment documents in the location's, the tutor's and
// the pupil's subcollections.
// 4) Creates a pastAppointment document in the tutor's, the pupil's, and the 
// location's 'pastAppointments' subcollections.
Tutorbook.prototype.approveClockOut = function(clockOut, id) {
    var that = this;
    clockOut = this.combineMaps(clockOut, {
        approvedTimestamp: new Date(),
        approvedBy: this.filterApptUserData(this.user),
    });
    const pastAppt = clockOut.for;
    // 1) Deletes the pendingClockOut document and
    return this.deletePendingClockOut(id).then(() => {
        // 2) Creates an approvedClockOut document within the currentUser's (i.e. the 
        // supervisor's) subcollections.
        return that.createApprovedClockOut(clockOut).then(() => {
            // 3) Deletes the activeAppointment documents in the location's, the tutor's and
            // the pupil's subcollections.
            // 4) Creates a pastAppointment document in the tutor's, the pupil's, and the 
            // location's 'pastAppointments' subcollections.
            return that.moveActiveApptToPast(clockOut.for, id).then(() => {
                that.viewSnackbar('Approved clock out from ' +
                    clockOut.sentBy.email + '.');
            });
        });
    });
};


// Data action function that creates an approvedClockOut document within the 
// currentUser's (i.e. the supervisor's) subcollections.
Tutorbook.prototype.createApprovedClockOut = function(clockOut) {
    return firebase.firestore().collection('usersByEmail').doc(this.user.email)
        .collection('approvedClockOuts').doc().set(clockOut);
};


// Data flow function that deletes the activeAppointment documents in the 
// location's, the tutor's and the pupil's subcollections. And creates a 
// pastAppointment document in the tutor's, the pupil's, and the location's 
// 'pastAppointments' subcollections.
Tutorbook.prototype.moveActiveApptToPast = function(appt, id) {
    // Create pastAppt doc(s) (in the tutor, the pupil, and the 
    // location subcollections)

    var that = this;
    // PUPIL'S and TUTOR'S SUBCOLLECTIONS
    appt.attendees.forEach((user) => {
        firebase.firestore().collection('usersByEmail')
            .doc(user.email)
            .collection('activeAppointments')
            .doc(id)
            .delete();

        // NOTE: We can't use the same id as we want to be able to have as many
        // pastAppt docs for the same original appt as possible.
        firebase.firestore().collection('usersByEmail')
            .doc(user.email)
            .collection('pastAppointments')
            .doc()
            .set(appt);
    });

    // LOCATION'S SUBCOLLECTIONS
    return firebase.firestore().collection('locations')
        .doc(appt.location.id)
        .collection('activeAppointments')
        .doc(id)
        .delete().then(() => {
            // NOTE: We can't use the same id as we want to be able to have as many
            // pastAppt docs for the same original appt as possible.
            return firebase.firestore().collection('locations')
                .doc(appt.location.id)
                .collection('pastAppointments')
                .doc()
                .set(appt);
        });
};


// Data action function that deletes the pendingClockOut document and creates a
// rejectedClockOut document within the currentUser's (i.e. the supervisor's)
// subcollections.
Tutorbook.prototype.rejectClockOut = function(clockOut, id) {
    var that = this;
    clockOut = this.combineMaps(clockOut, {
        rejectedTimestamp: new Date(),
        rejectedBy: this.filterApptUserData(this.user),
    });
    return this.deletePendingClockOut(id).then(() => {
        return firebase.firestore().collection('usersByEmail').doc(this.user.email)
            .collection('rejectedClockOuts').doc(id).set(clockOut).then(() => {
                that.viewSnackbar('Rejected clock out from ' + clockOut.sentBy.email + '.');
            }).catch((err) => {
                that.log('Error while rejecting clockOut:', err);
                that.viewSnackbar('Could not reject clock out.');
            });
    });
};


// Render function that returns a populated pendingClockOut dashboard card
// askoutg for approval or rejection. This should also open a confirmation
// dialog that forces an action before the rest of the app can be used.
Tutorbook.prototype.renderPendingClockOutCard = function(doc) {
    const data = doc.data();
    var that = this;
    var card = this.renderCard(doc.id, data, 'pendingClockOuts',
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


// Render function that returns a populated modifiedRequestsIn dashboard card
Tutorbook.prototype.renderModifiedRequestInCard = function(doc) {
    const data = doc.data();
    const pronoun = this.getGenderPronoun(data.modifiedBy.gender);
    var that = this;
    return this.renderCard(doc.id, data, 'modifiedRequestsIn', 'Modified Request',
        data.modifiedBy.name + ' modified ' + pronoun + ' request to you',
        data.modifiedBy.name.split(' ')[0] + ' modified ' + pronoun + ' request' +
        ' to you. Please ensure to addresss these changes as necessary.', {
            primary: () => {
                that.viewViewRequestDialog(that.combineMaps(data.current, {
                    id: doc.id
                }));
            },
        });
};


// Render function that returns a populated canceledRequestsIn dashboard card
Tutorbook.prototype.renderCanceledRequestInCard = function(doc) {
    const data = doc.data();
    const pronoun = this.getGenderPronoun(data.canceledBy.gender);
    return this.renderCard(doc.id, data, 'canceledRequestsIn', 'Canceled Request',
        data.canceledBy.name + ' canceled ' + pronoun + ' request to you',
        data.canceledBy.name.split(' ')[0] + ' canceled ' + pronoun +
        ' request to you. Please ensure to addresss these changes as ' +
        'necessary.', {});
};


// Render function that returns a populated modifiedRequestsOut dashboard card
Tutorbook.prototype.renderModifiedRequestOutCard = function(doc) {
    const data = doc.data();
    var that = this;
    return this.renderCard(doc.id, data, 'modifiedRequestsOut', 'Modified Request',
        data.modifiedBy.name + ' modified your request',
        data.modifiedBy.name.split(' ')[0] + ' modified the ' +
        'request you sent. Please ensure to addresss these changes as necessary.', {
            primary: () => {
                that.viewViewRequestDialog(that.combineMaps(data.current, {
                    id: doc.id
                }));
            },
        });
};


// Render function that returns a populated rejectedRequestsOut dashboard card
Tutorbook.prototype.renderRejectedRequestOutCard = function(doc) {
    const data = doc.data();
    return this.renderCard(doc.id, data, 'rejectedRequestsOut', 'Rejected Request',
        data.rejectedBy.name + ' rejected your request',
        data.rejectedBy.name.split(' ')[0] + ' rejected the ' +
        'request you sent. Please ensure to addresss these changes as necessary.', {});
};


// Render function that returns a populated approvedRequestsOut dashboard card
Tutorbook.prototype.renderApprovedRequestOutCard = function(doc) {
    const data = doc.data();
    var that = this;
    return this.renderCard(doc.id, data, 'approvedRequestsOut', 'Approved Request',
        data.approvedBy.name.split(' ')[0] + ' approved ' +
        'the request you sent', data.approvedBy.name + ' approved the ' +
        'request you sent. Please ensure to addresss these changes as necessary.', {
            primary: () => {
                // Show appointment
                that.getAppt(doc.id).then((doc) => {
                    that.viewUpcomingApptDialog(that.combineMaps(
                        doc.data(), {
                            id: doc.id
                        }));
                });
            }
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


// Render function that returns a populated modifiedAppointments dashboard card
Tutorbook.prototype.renderModifiedAppointmentCard = function(doc) {
    const data = doc.data();
    return this.renderCard(doc.id, data, 'modifiedAppointments', 'Modified Appointment',
        data.modifiedBy.name.split(' ')[0] + ' modified ' +
        'your appointment', data.modifiedBy.name + ' modified your ' +
        'appointment together. Please ensure to addresss these changes as necessary.', {});
};


// Render function that returns a populated canceledAppointments dashboard card
Tutorbook.prototype.renderCanceledAppointmentCard = function(doc) {
    const data = doc.data();
    return this.renderCard(doc.id, data, 'canceledAppointments', 'Canceled Appointment',
        data.canceledBy.name.split(' ')[0] + ' canceled ' +
        'your appointment', data.canceledBy.name + ' canceled your ' +
        'appointment together. Please ensure to addresss these changes as necessary.', {});
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
            .listen('MDCDialog:closing', (event) => {
                if (event.detail.action === 'yes') {
                    that.rejectRequestIn(doc.id, request).then(() => {
                        that.log('Rejected request from ' + request.fromUser.email +
                            ':', request);
                        that.viewSnackbar('Rejected request from ' +
                            request.fromUser.email + '.');
                    }).catch((err) => {
                        that.log('Error while rejecting request:', err);
                        that.viewSnackbar('Could not reject request.');
                    });
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
        that.back();
        updateTextData();
        that.updateLocationHours();
        that.newLocation(
            that.filterLocationData(location)
        ).then(() => {
            that.viewSnackbar('Location created.');
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
            return;
        } else if (isEmpty(inputs.hour.value) && isNotEmpty(inputs.day.value)) {
            inputs.hour.required = true;
            return;
        } else {
            inputs.hour.valid = true;
            inputs.day.valid = true;
        }

        // Otherwise, empty the existing values
        location.hours = {};
        location.hours[inputs.day.value] = [];
    }

    hourInputs.forEach((inputs) => {
        const hourInput = inputs.hour;
        const daySelect = inputs.day;
        // NOTE: Time is formatted like '10:00 AM to 2:00 PM'
        const timeString = hourInput.value;
        const split = timeString.split(' ');
        const openTime = split[0] + ' ' + split[1];
        const closeTime = split[3] + ' ' + split[4];

        try {
            // Push the final time map to hours on that day
            location.hours[daySelect.value].push({
                open: openTime,
                close: closeTime
            });
        } catch (e) {
            console.warn('Caught error while pushing new location times:', e);
            location.hours[daySelect.value] = [{
                open: openTime,
                close: closeTime,
            }];
        }
    });
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

    const openSelect = this.attachSelect(dialogEl.querySelector('#Open'));
    const closeSelect = this.attachSelect(dialogEl.querySelector('#Close'));

    dialog.listen('MDCDialog:closing', (event) => {
        if (event.detail.action === 'accept') {
            // First, parse dialog input into a formatted string.
            const newTimeString = openSelect.value + ' to ' + closeSelect.value;
            // Then, replace the original input el's value with that new
            // formatted string.
            input.value = newTimeString;
        }
    });

    return dialog.open();
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
    var hourInputs = [];
    dialog.querySelectorAll('#Hours-Wrapper .input-list-item').forEach((el) => {
        var dayEl = el.querySelector('#Day');
        var daySelect = this.attachSelect(dayEl);
        daySelect.listen('MDCSelect:change', () => {
            updateLocationHours();
        });

        // NOTE: hourInputs are just textFields that open a dialog when clicked
        var hourEl = el.querySelector('#Open');
        var hourInput = this.attachHourInput(hourEl);

        hourInputs.push({
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
        that.back();
        updateTextData();
        that.updateLocationHours();
        that.updateLocation(
            that.filterLocationData(location),
            location.id
        ).then(() => {
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
        this.renderInputListItem(
            this.renderTextArea('Description', location.description)
        )
    );

    var that = this;
    mainEl.appendChild(this.renderActionListDivider('Hours', {
        add: () => {
            that.addHourInputItem();
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
        // NOTE: renderSplitInputItem just appends them together such that each
        // input is allotted 50% of available screen space.
        listItems.push(this.renderSplitInputItem(map.day, map.hour));
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

    var cardData = this.cloneMap(doc.data());
    cardData['todays-hours'] = getTodaysHours(cardData.hours);
    cardData['edit'] = () => {
        this.viewEditLocationDialog(this.combineMaps(doc.data(), {
            id: doc.id
        }));
    };
    cardData['delete'] = () => {
        return that.viewConfirmationDialog('Permanently Delete Location?', 'You are about to permanently delete ' +
                'the ' + cardData.name + ' from app data. This action cannot be undone.' +
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
    };
    cardData['schedule'] = () => {
        that.log('TODO: Implement appointment schedule and history');
    };
    const card = this.renderTemplate('card-location', cardData);
    card
        .querySelectorAll('.mdc-button, .mdc-card__primary-action, .mdc-icon-button')
        .forEach((el) => {
            MDCRipple.attachTo(el);
        });

    // Setting the id allows to locating the individual user card
    card.setAttribute('id', 'doc-' + doc.id);
    card.setAttribute('timestamp', doc.data().timestamp);
    card.setAttribute('class', 'location-card ' + card.getAttribute('class'));

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


// Data action function that removes the dashboard card document from the user's
// subcollection.
Tutorbook.prototype.removeCardDoc = function(type, id) {
    return firebase.firestore().collection('usersByEmail').doc(this.user.email)
        .collection(type).doc(id).delete();
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
        dismiss: () => {
            that.removeCardDoc(cardType, id).then(() => {
                return $('main #cards #doc-' + cardType + '-' + id).remove();
            });
        },
    });

    card
        .querySelectorAll('.mdc-button, .mdc-card__primary-action, .mdc-icon-button')
        .forEach((el) => {
            MDCRipple.attachTo(el);
        });
    // NOTE: Setting the class allows the dashboardRecycler to remove all cards 
    // of a given type when they turn up empty from the Firestore query.
    card.setAttribute('class', card.getAttribute('class') + ' card-' + cardType);

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
    cardData['subtitle'] = 'To ' + request.toUser.name;
    cardData['summary'] = 'You requested ' + request.toUser.name.split(' ')[0] +
        ' as a ' + request.toUser.type.toLowerCase() + ' for ' +
        request.subject + ' on ' + request.time.day + 's at the ' +
        request.location.name + '. Tap to learn more and edit your request.';
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
    cardData['cancel_request'] = function() {
        const summary = "Cancel request to " + request.toUser.name + " for " +
            request.subject + " at " + request.time.from + " on " +
            request.time.day + "s.";
        that.viewConfirmationDialog('Cancel Request?', summary)
            .listen('MDCDialog:closing', (event) => {
                if (event.detail.action === 'yes') {
                    that.cancelRequestOut(doc.id, request).then((id) => {
                        that.log('Canceled request to ' + request.toUser.email + ':',
                            request);
                        that.viewSnackbar('Canceled request to ' +
                            request.toUser.email + '.');
                    }).catch((err) => {
                        that.log('Error while canceling request:', err);
                        that.viewSnackbar('Could not cancel request.');
                    });
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


Tutorbook.prototype.renderAppointmentCard = function(doc) {
    const appt = doc.data();
    var cardData = this.cloneMap(appt);

    if (appt.attendees[0].email == firebase.auth().currentUser.email) {
        var withUser = appt.attendees[1];
    } else {
        var withUser = appt.attendees[0];
    }

    var that = this;
    cardData['subtitle'] = "With " + withUser.name;
    cardData['summary'] = "You have tutoring sessions with " + withUser.name +
        " for " + appt.for.subject + " on " + appt.time.day + "s at " +
        appt.time.from + ".";
    cardData['go_to_appt'] = function() {
        var data = that.cloneMap(appt);
        data.id = doc.id;
        that.viewUpcomingApptDialog(data);
    };
    cardData['cancel_appt'] = function() {
        const summary = "Cancel sessions with " + withUser.name + " for " +
            appt.for.subject + " at " + appt.time.from + " on " +
            appt.time.day + "s.";
        that.viewConfirmationDialog('Cancel Appointment?', summary)
            .listen('MDCDialog:closing', (event) => {
                if (event.detail.action === 'yes') {
                    that.cancelAppointment(appt, doc.id).then(() => {
                        that.log('Canceled appointment with ' + withUser.email +
                            ':', appt);
                        that.viewSnackbar('Canceled appointment with ' + withUser.email + '.');
                    }).catch((err) => {
                        that.log('Error while canceling appointment:', err);
                        that.viewSnackbar('Could not cancel appointment.');
                    });
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
Tutorbook.prototype.filterActiveApptData = function(data) {
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
        location: data.location,
        timestamp: data.timestamp,
        id: data.id || '', // NOTE: We use this to be able to access and update the
        // Firestore document across different functions within the app all
        // using the same `this.currentRequest` map.
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
            clocked: data.time.clocked,
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
            clocked: data.time.clocked,
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
            clocked: data.time.clocked,
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
        'fromUser': {
            name: data.fromUser.name,
            email: data.fromUser.email,
            phone: data.fromUser.phone,
            id: data.fromUser.id,
            photo: data.fromUser.photo,
            type: data.fromUser.type,
            gender: data.fromUser.gender,
        },
        'toUser': {
            name: data.toUser.name,
            email: data.toUser.email,
            phone: data.toUser.phone,
            id: data.toUser.id,
            photo: data.toUser.photo,
            type: data.toUser.type,
            gender: data.toUser.gender,
            hourlyCharge: data.toUser.hourlyCharge,
        },
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


// Helper function that returns the correct subject array from Firestore user
// data
Tutorbook.prototype.getUserSubjects = function(userData) {
    // If they already have the updated subject array, just use that
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

    // If we are viewing anything that needs a recycler or a data manager, make
    // sure to rerender those items.
    const headerTitle = this.currentView.header
        .querySelector('.mdc-top-app-bar__title').innerText;
    this.navSelected = headerTitle;
    switch (headerTitle) {
        case 'Tutorbook':
            this.viewDashboardCards();
            break;
        case 'Search':
            this.viewSearchResults();
            break;
        case 'View Request':
            this.addViewRequestDataManager();
            break;
        case 'Edit Request':
            this.addUpdateRequestDataManager();
            break;
        case 'New Request':
            this.addNewRequestDataManager();
            break;
        case 'View Appointment':
            this.addViewRequestDataManager();
            break;
        case 'Edit Appointment':
            this.addUpdateApptDataManager();
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
            title: this.user.cards.welcomeMessage.title,
            subtitle: this.user.cards.welcomeMessage.summary,
        }),
        url: '/app/home',
    };
    this.lastView = {
        header: this.renderHeader('header-main', {
            title: 'Tutorbook'
        }),
        main: this.renderTemplate('dashboard'),
        url: '/app/home',
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
            title: this.user.cards.welcomeMessage.title,
            subtitle: this.user.cards.welcomeMessage.summary,
        }),
        url: '/app/home',
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
        url: this.getCleanPath(document.location.pathname)
    };
    $('.main').empty().append(mainEl);
    $('.header').empty().append(headerEl);
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
    };
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
        ok: () => { // The actual clickListener is added with the dataManager.
        },
        cancel: () => {
            this.back();
        },
    });
    const newRequestView = this.renderNewRequestDialog(request, user);
    this.view(newRequestHeader, newRequestView);
    this.currentRequest = this.filterRequestData(request);
    this.addNewRequestDataManager();
};


// Essentially the same as the renderEditRequestDialog, but this dialog includes
// a payment method section if the tutor in question is a paid tutor.
Tutorbook.prototype.renderNewRequestDialog = function(request, user) {
    const mainEl = this.renderTemplate('dialog-input');

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
        mainEl.appendChild(this.renderListDivider('Payment'));
        mainEl.appendChild(this.renderTextFieldItem('Amount', '$0.00'));
        mainEl.appendChild(this.renderPayPalButtonsItem());
    }

    return mainEl;
};


// Render function that returns a paypal button div for the newRequest dialog
Tutorbook.prototype.renderPayPalButtonsItem = function() {
    const listEl = this.renderTemplate('input-list-item');
    listEl.setAttribute('id', 'paypal-buttons');
    listEl.setAttribute('style', 'height:auto!important;');
    return listEl;
};


// View function that takes in a map of labels and values and shows a
// full-screen dialog with MDC Outlined Inputs using the labels keys as the
// floating label text and values as the input values.
Tutorbook.prototype.viewEditRequestDialog = function(request, user) {
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
    const editRequestView = this.renderEditRequestDialog(request, user);
    this.view(editRequestHeader, editRequestView);
    this.currentRequest = this.filterRequestData(request);
    this.addUpdateRequestDataManager();
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


// View function that is almost the same as the viewUpcoming appt dialog except
// it shows the times that the tutor clocked in and out, the supervisor who
// approved those clockIns/Outs, the duration of the appt, and a link to the
// appointment's payment.
Tutorbook.prototype.viewPastApptDialog = function(appt) {
    var that = this;
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
    this.currentAppt = this.filterPastApptData(appt);
    this.addApptDataManager();
};


// View function that is almost hte same as the viewUpcoming appt dialog except
// it shows an active timer based on the currentClockIn time.
Tutorbook.prototype.viewActiveApptDialog = function(appt) {
    var that = this;
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
    this.currentAppt = this.filterActiveApptData(appt);
    this.addActiveApptDataManager();
};


// View function that is almost like the viewRequest function but shows a 
// different header.
Tutorbook.prototype.viewUpcomingApptDialog = function(appt) {
    var that = this;
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
        print: () => {
            this.printPage();
        },
        cancel: () => {
            this.back();
        },
    });
    const viewApptView = this.renderUpcomingApptDialog(appt);
    this.view(viewApptHeader, viewApptView);
    this.currentAppt = this.filterApptData(appt);
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
        mainEl.insertBefore(this.renderSplitInputItem(
            this.renderTextField('Current', '0:0:0.00'),
            this.renderTextField('Total', appt.time.clocked || '0:0:0.00'),
        ), atListDivider);
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
    view.insertBefore(this.renderSplitInputItem(
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
    const otherUser = this.findOtherUser(request.fromUser, request.toUser);

    view.appendChild(this.renderUserHeader(otherUser));
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
                label: 'Get Paid',
            });
        case 'scrollToUpcoming':
            return this.renderTemplate('fab-labeled', {
                id: 'scrollButton',
                icon: 'arrow_downward',
                label: 'Upcoming',
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


// View function that is practically the same as the viewEditRequest function
Tutorbook.prototype.viewEditApptDialog = function(appt, user) {
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
    this.log('And user:', user);
    const editApptView = this.renderEditRequestDialog(appt.for, user);
    this.view(editApptHeader, editApptView);
    this.currentAppt = appt;
    this.addUpdateApptDataManager();
};


// View function that takes in a map of labels and values and shows a
// full-screen dialog with disabled MDC Outlined TextFields using the labels 
// keys as the floating label text and values as the input values.
Tutorbook.prototype.viewViewRequestDialog = function(request) {
    /*
     *history.pushState({}, null, '/app/requests/' + request.id + '?d=view');
     */
    var that = this;
    const viewRequestHeader = this.renderHeader('header-action', {
        title: 'View Request',
        edit: () => {
            that.getUser(
                that.getOtherUser(request.fromUser, request.toUser).email
            ).then((doc) => {
                // NOTE: We always want to retrieve the latest profile doc
                const user = doc.data();
                that.viewEditRequestDialog(request, user);
            });
        },
        print: () => {
            this.printPage();
        },
        showApprove: request.toUser.email === this.user.email,
        approve: () => {
            that.back();
            that.approveRequest(request, request.id).then(() => {
                that.viewSnackbar('Approved request from ' + request.fromUser.email + '.');
            });
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


// Helper function that sets the current clocked time and total time based on
// the currentClockInTimer.
Tutorbook.prototype.addActiveApptDataManager = function() {
    const appt = this.filterActiveApptData(this.currentAppt);
    const dialog = this.addApptDataManager();
    const currentTimeDisplay = dialog.querySelector('#Current input');
    const totalTimeDisplay = dialog.querySelector('#Total input');

    currentTimeDisplay.value = this.getDurationFromDates(
        currentAppt.clockIn.sentTimestamp.toDate(),
        new Date()
    );

    // TODO: Add the value of the totalTimeDisplay with the currentTimeDisplay
    // value
    this.clock();
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


// TODO: CLOCK-IN DATA FLOW:
// 1) Tutor adds a pendingClockIn document to the supervisor of the given 
// location's subcollection.
//
// 2) Supervisor then sees a dialog asking for their approval of the clockIn
// 2a) Once approved, pendingClockIn document is deleted and approvedClockIn
// document is created within the supervisor's subcollections.
// 2b) Supervisor creates an activeAppointment document in both the tutor's and
// the location's subcollections
// 
// 3) Tutor adds a pendingClockOut document to the supervisor of the given
// location's subcollection.
// 
// 4) Supervisor then sees a dialog asking for their approval of the clockOut
// 4a) Once approved, pendingClockOut doc is deleted and approvedClockOut doc is
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


// Helper function to start a timer and create a pendingClockIn doc in the
// supervisor's subcollections
Tutorbook.prototype.clockIn = function() {
    // We use the window.setInterval() function to update the current time
    // every 10 milliseconds.
    var that = this;
    this.currentClockIn = {
        sentTimestamp: new Date(),
        sentBy: that.filterApptUserData(that.user),
    };
    const locationID = this.currentAppt.location.id;
    return this.getLocationSupervisor(locationID).then((supervisor) => {
        that.currentAppt.supervisor = supervisor;
        // NOTE: We can't have this as reference to the original as it causes an 
        // infinite loop.
        that.currentAppt.clockIn = that.cloneMap(that.currentClockIn);
        that.currentClockIn.for = that.cloneMap(that.currentAppt);
        that.addPendingClockIn();
        that.watchClockInStatus();
        that.currentClockInTimer = window.setInterval(that.updateTimes, 10);
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
                ' shown here is not up-to-date. The location shown here may ' +
                'no longer be open at these times. Please cancel this appointment and ' +
                'create a new one.')
            .listen('MDCDialog:closing', (event) => {
                that.back();
            });
    }
};


// Data action function that creates a pendingClockIn document based on the
// currentAppt and current date and time.
Tutorbook.prototype.addPendingClockIn = function() {
    // First, determine where to send this clockIn request (i.e. what location
    // is the appt at and what supervisors are at that location)
    var that = this;
    const supervisor = that.currentAppt.supervisor;
    return firebase.firestore().collection('usersByEmail').doc(supervisor)
        // NOTE: The id of the pendingClockIn document is the same as the id of
        // the original appt. This is b/c there will only ever be one pendingClockIn
        // at a time for a given appt document.
        .collection('pendingClockIns').doc(that.currentAppt.id)
        .set(that.currentClockIn).then(() => {
            that.viewSnackbar('Sent clock in request to ' + supervisor + '.');
        }).catch((err) => {
            that.log('Error while adding pendingClockIn doc:', err);
            that.viewSnackbar('Could not send clock in request.');
        });
};


// Data action function that watches for an activeAppointment document to be
// created with the same id as the currentClockIn (which has the same id as the
// original appointment document).
Tutorbook.prototype.watchClockInStatus = function() {
    var that = this;

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
                        // Stop the timer
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
    firebase.firestore().collection('usersByEmail').doc(this.user.email)
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
        firebase.firestore().collection('usersByEmail').doc(this.currentAppt.supervisor)
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


// Data action function that creates a pendingClockOut document based on the
// currentAppt and current date and time.
Tutorbook.prototype.addPendingClockOut = function() {
    // First, determine where to send this clockOut request (i.e. what location
    // is the appt at and what supervisors are at that location)
    var that = this;
    const supervisor = that.currentAppt.supervisor;
    // NOTE: The id of the pendingClockOut document is the same as the id of
    // the original appt. This is b/c there will only ever be one pendingClockOut
    // at a time for a given appt document.
    return firebase.firestore().collection('usersByEmail').doc(supervisor)
        .collection('pendingClockOuts').doc(that.currentAppt.id)
        .set(that.currentClockOut).then(() => {
            that.viewSnackbar('Sent clock out request to ' + supervisor + '.');
        }).catch((err) => {
            that.log('Error while adding pendingClockOut doc:', err);
            that.viewSnackbar('Could not send clock out request.');
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
    var currentMilli = new Number(current.split('.')[1]);

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


// Helper function that stops the timers and creates a pendingClockOut doc in
// the supervisor's subcollections
Tutorbook.prototype.clockOut = function() {
    var that = this;
    window.clearInterval(this.currentClockInTimer);
    this.currentClockOut = {
        sentTimestamp: new Date(),
        sentBy: that.filterApptUserData(that.user),
    };
    // NOTE: We can't have this as reference to the original as it causes an 
    // infinite loop.
    this.currentAppt.clockOut = this.cloneMap(this.currentClockOut);
    this.currentClockOut.for = this.cloneMap(this.currentAppt);
    this.addPendingClockOut();
    this.watchClockOutStatus();
    /*
     *this.currentAppt.time.hours = document.querySelector('#Total input').value;
     *this.updateAppt(this.filterApptData(this.currentAppt), this.currentAppt.id);
     */
    this.currentClockInTimer = undefined;
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


// Helper function to replace one HTML Node with another
Tutorbook.prototype.replaceElement = function(parent, content) {
    parent.innerHTML = '';
    parent.append(content);
};


// Helper function to essientially reload the current view/page
Tutorbook.prototype.rerender = function() {
    this.router.navigate(document.location.pathname + '?' + new Date().getTime());
};


// Render function that returns a full screen dialog of disabled MDC Outlined
// TextFields.
Tutorbook.prototype.renderViewRequestDialog = function(data) {
    const mainEl = this.renderTemplate('dialog-input');
    const otherUser = this.findOtherUser(data.fromUser, data.toUser);

    // Ensure that inputs are appended in correct order w/ list dividers
    mainEl.appendChild(this.renderUserHeader(otherUser))
    mainEl.appendChild(this.renderListDivider('At'))
    mainEl.appendChild(this.renderTextFieldItem('Location', data.location.name))
    mainEl.appendChild(this.renderTextFieldItem('Day', data.time.day))
    mainEl.appendChild(this.renderTextFieldItem('From', data.time.from))
    mainEl.appendChild(this.renderTextFieldItem('To', data.time.to))
    mainEl.appendChild(this.renderListDivider('For'))
    mainEl.appendChild(this.renderTextFieldItem('Subject', data.subject))
    mainEl.appendChild(this.renderTextAreaItem('Message', data.message));

    // Add payment views if needed
    if (data.payment.type === 'Paid') {
        mainEl.appendChild(this.renderListDivider('Payment'))
        mainEl.appendChild(this.renderTextFieldItem('Amount', '$' + data.payment.amount));
        mainEl.appendChild(this.renderTextFieldItem('Payment method', data.payment.method));
    }

    return mainEl;
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
        console.warn('Error while getting userAvailableDaysForLocation:', e);
        var that = this;
        this.viewNotificationDialog('Update Availability?', 'The availability ' +
                ' shown here is not up-to-date. The ' + location + ' may ' +
                'no longer be open at these times. Please cancel this request and ' +
                'create a new one.')
            .listen('MDCDialog:closing', (event) => {
                that.back();
            });
        return this.getUserAvailableDays(availability);
    }
};


// Helper function to return a user's available times for a given day and location
Tutorbook.prototype.getUserAvailableTimesForDay = function(availability, day, location) {
    this.log('Getting userAvailabileTimes for day:', day);
    this.log('And location:', location);
    this.log('And availability:', availability);
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
        console.warn('Error while getting userAvailableTimesForDay:', e);
        var that = this;
        this.viewNotificationDialog('Update Availability?', 'The availability ' +
                ' shown here is not up-to-date. The ' + location + ' may ' +
                'no longer be open at these times. Please cancel this request and ' +
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


// Render function that takes in a map of labels and values and returns a
// full-screen dialog with MDC Outlined Inputs using the labels keys as the
// floating label text and values as the input values.
Tutorbook.prototype.renderEditRequestDialog = function(request, user) {
    const mainEl = this.renderTemplate('dialog-input');
    this.log('Rendering edit request dialog for request:', request);
    this.log('And user:', user);
    // First, parse the user's availability map into location, day, and time arrays
    const userLocations = this.getUserAvailableLocations(user.availability);
    this.log('And user locations:', userLocations);
    // If we already have a location filled, we want to limit the days to
    const userDays = (!!request.location && !!request.location.name) ?
        this.getUserAvailableDaysForLocation(
            user.availability,
            request.location.name
        ) : this.getUserAvailableDays(user.availability);
    this.log('And user days:', userDays);
    const userTimes = (!!request.time && !!request.time.day && !!request.location &&
        !!request.location.name) ? this.getUserAvailableTimesForDay(
        user.availability,
        request.time.day,
        request.location.name,
    ) : this.getUserAvailableTimes(user.availability);
    this.log('And user times:', userTimes);

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

    return mainEl;
};


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


// Helper function that returns the duration (in hrs:min:sec) between two Date
// objects
Tutorbook.prototype.getDurationFromDates = function(startDate, endDate) {
    // stub
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

    this.currentPayment.amount = getPaymentAmount();

    $('main .dialog-input #Amount input').attr('value', '$' + this.currentPayment.amount);
};


// Helper function that adds listeners to the profile view and updates the 
// currentUser and his/her profile document as necessary.
Tutorbook.prototype.addNewRequestDataManager = function() {
    var that = this;
    const dialog = document.querySelector('.main');
    var request = this.filterRequestData(this.currentRequest);

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
        var payment = this.currentPayment;

        if (user.payments.type === 'Paid') {

            const amountEl = document.querySelector('main .dialog-input #Amount');
            const amountTextField = MDCTextField.attachTo(amountEl);
            amountEl.querySelector('input').setAttribute('disabled', 'true');

            $('#paypal-buttons').css('margin-top', '20px');
            paypal.Buttons({
                createOrder: (data, actions) => {
                    // Set up the transaction
                    return actions.order.create({
                        purchase_units: [{
                            amount: {
                                // TODO: Right now, we're only going to authorize for
                                // one, one hour lesson and then show another prompt once
                                // the tutor clocksOut asking if they want another.
                                value: payment.amount
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
                        payment.transaction = auth;
                        payment.authID = authID;
                        that.log('Order was authorized w/ id:', authID);
                        that.viewSnackbar('Added payment method.')
                        // Call your server to save the transaction
                        // We'll use Firestore here to process the transaction
                        // by adding a payment document in this user's
                        // subcollections.
                    });
                },
            }).render('#paypal-buttons');
        }


        // Add a requestsIn, requestsOut, and an authorizedPayment doc
        function newRequest() {
            if (user.payments.type === 'Paid' && !!!payment.transaction) {
                // Payment was not completed, don't do anything
                that.viewSnackbar('Please add a valid payment method.');
                return;
            }
            that.back();
            request.message = messageTextField.value;
            request.payment = {
                amount: payment.amount || 0,
                type: user.payments.type || 'Free',
                method: 'PayPal',
            };

            // NOTE: There is no *easy* way to get around using the then() callback
            that.newRequest(that.filterRequestData(request)).then((id) => {
                that.log('Request sent to ' + request.toUser.email + ':', request);

                if (user.payments.type === 'Paid') {
                    // NOTE: The ID passed here is the same ID as the request 
                    // (and thus the appointment document when the request 
                    // is approved). We can do this b/c there will only ever 
                    // be one authorizedPayment per appointment.
                    that.newAuthPayment(payment, id).then(() => {
                        that.log('Authorized payment details added:', payment);
                    }).catch((err) => {
                        that.log('Error while sending payment details to server:', err);
                        that.viewSnackbar('Could not process payment.');
                    });
                }

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
            });
        };

        // Only add the new request when the check button is clicked
        document.querySelector('.header #ok').addEventListener('click', () => {
            newRequest();
        });
    });
};


// Data flow function that creates a new authorized payment document
Tutorbook.prototype.newAuthPayment = function(payment, id) {
    var that = this;
    // NOTE: The ID passed here is the same ID as the request (and thus the
    // appointment document when the request is approved). We can do this
    // b/c there will only ever be one authorizedPayment per appointment.
    return firebase.firestore().collection('usersByEmail').doc(this.user.email)
        .collection('authorizedPayments')
        .doc(id)
        .set(payment)
        .catch((err) => {
            that.log('Error while adding auth payment doc:', err);
        });
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

    function updateAppt() {
        that.back();
        that.log(that.filterApptData(appt));
        appt.for.message = messageTextField.value;
        that.updateAppt(
            that.filterApptData(appt),
            id
        ).then(() => {
            that.viewSnackbar('Appointment updated.');

            // Once the appt is updated, check if the lastView is an outdated
            // rendering of the viewAppt dialog or dashboard for this appt.
            const lastHeaderTitle = that.lastView.header
                .querySelector('.mdc-top-app-bar__title').innerText;
            if (lastHeaderTitle === 'View Appointment') {
                // Rerender that view to match the updated appt.
                that.lastView.main = that.renderViewRequestDialog(appt.for);
            }

        });
    };

    // Only update appt when the check button is clicked
    document.querySelector('.header #ok').addEventListener('click', () => {
        updateAppt();
    });
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

        function updateRequest() {
            that.back();
            request.message = messageTextField.value;
            that.updateRequest(
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
            updateRequest();
        });
    });
};


// Render function that returns a MDC List Divider
Tutorbook.prototype.renderActionListDivider = function(text, actions) {
    return this.renderTemplate('action-list-divider', {
        'text': text,
        'add_field': actions.add,
    });
};


// Render function that returns a MDC List Divider
Tutorbook.prototype.renderListDivider = function(text) {
    return this.renderTemplate('input-list-divider', {
        'text': text
    });
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


// Render function that returns a MDC List Item with the user's profile as the
// avatar, the user's name as the primary text, and the user's email as the
// secondary text.
Tutorbook.prototype.renderUserHeader = function(user) {
    // TODO: Add viewUser click listener
    const userData = {
        'pic': user.photo || user.photoURL,
        'name': user.name || user.displayName,
        'email': user.email,
        'type': user.type || "",
    };
    return this.renderTemplate('user-header', userData);
};


// Render function that returns a MDC TextField within a MDC List Item.
Tutorbook.prototype.renderTextFieldItem = function(label, val) {
    return this.renderInputListItem(this.renderTextField(label, val));
};


// Render function that returns a MDC TextArea within a MDC List Item.
Tutorbook.prototype.renderTextAreaItem = function(label, val) {
    return this.renderInputListItem(this.renderTextArea(label, val));
};


// Render function that returns a MDC Select within a MDC List Item.
Tutorbook.prototype.renderSelectItem = function(label, val, vals) {
    return this.renderInputListItem(this.renderSelect(label, val, vals));
};


// Render function that returns an input el within a MDC List Item.
Tutorbook.prototype.renderInputListItem = function(inputEl) {
    const inputListItemEl = this.renderTemplate('input-list-item');

    // Make sure not to cut off the message or description textareas
    const id = inputEl.getAttribute('id');
    if (id === 'Message' || id === 'Description') {
        inputListItemEl.setAttribute('style', 'min-height: 290px;');
    }

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


// Helper function to return an array of all possible locations based on a user
// profile.
Tutorbook.prototype.getUserLocations = function(user) {
    // stub
};


// Helper function to return an array of all possible days based on a user 
// profile.
Tutorbook.prototype.getUserDays = function(user) {
    // stub

};


// Helper function to return an array of all possible times based on a user
// profile.
Tutorbook.prototype.getUserTimes = function(user) {
    // stub

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


// Helper function that takes in a map of day, location, fromTime, and toTime
// values and returns a string for the profile availability textFields.
Tutorbook.prototype.getAvailabilityString = function(data) {
    return data.day + ' at the ' + data.location + ' from ' + data.fromTime +
        ' to ' + data.toTime;
};


// Helper function to parse a profile availability string into a map of day,
// location, fromTime, and toTime values.
Tutorbook.prototype.parseAvailabilityString = function(string) {
    // NOTE: The string is displayed in the textField as such:
    // 'Friday at the Gunn Library from 11:00 AM to 12:00 PM'

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
    const day = split[0];
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


// Helper function to read in and parse all of the populated availableTime
// MDC TextFields and to update the user's document with the correct data in the
// correct data structure.
Tutorbook.prototype.updateProfileAvailability = function(textFields) {
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

    this.user.availability = result;
};


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
            var oldToTimeEl = document.querySelector('#dialog-form')
                .querySelector('#To');
            oldToTimeEl.parentNode.insertBefore(toTimeEl, oldToTimeEl);
            oldToTimeEl.parentNode.removeChild(oldToTimeEl);
            var toTimeSelect = that.attachSelect(toTimeEl);
            toTimeSelect.listen('MDCSelect:change', function() {
                availableTime.toTime = toTimeSelect.value;
            });

            var fromTimeEl = that
                .renderSelect('From', availableTime.fromTime || '', times);
            var oldFromTimeEl = document.querySelector('#dialog-form')
                .querySelector('#From');
            oldFromTimeEl.parentNode.insertBefore(fromTimeEl, oldFromTimeEl);
            oldFromTimeEl.parentNode.removeChild(oldFromTimeEl);
            var fromTimeSelect = that.attachSelect(fromTimeEl);
            fromTimeSelect.listen('MDCSelect:change', function() {
                availableTime.fromTime = fromTimeSelect.value;
            });

            var dayEl = that
                .renderSelect('Day', availableTime.day || '', days);
            var oldDayEl = document.querySelector('#dialog-form')
                .querySelector('#Day');
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
            var oldToTimeEl = document.querySelector('#dialog-form')
                .querySelector('#To');
            oldToTimeEl.parentNode.insertBefore(toTimeEl, oldToTimeEl);
            oldToTimeEl.parentNode.removeChild(oldToTimeEl);
            var toTimeSelect = that.attachSelect(toTimeEl);
            toTimeSelect.listen('MDCSelect:change', function() {
                availableTime.toTime = toTimeSelect.value;
            });

            var fromTimeEl = that
                .renderSelect('From', availableTime.fromTime || '', times);
            var oldFromTimeEl = document.querySelector('#dialog-form')
                .querySelector('#From');
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


// View function that opens a dialog to set a day, location, fromTime, and 
// toTime. It then replaces the textFieldVal with the correct new value.
Tutorbook.prototype.viewEditAvailabilityDialog = function(textField) {
    // First, parse the val into the correct format
    var availableTime = this.parseAvailabilityString(textField.value);

    // Then, render a dialog with those values pre-filled and allow the user to
    // change them.
    return this.renderEditAvailabilityDialog(availableTime).then((dialogEl) => {
        const dialog = MDCDialog.attachTo(dialogEl);

        var that = this;
        dialog.listen('MDCDialog:closing', (event) => {
            if (event.detail.action === 'accept') {
                // Update the textField value to match the new value
                textField.value = that.getAvailabilityString(availableTime);
            }
        });

        dialog.open();

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
        const times = this.data.periods.concat(this.data.times.concat(this.data.timeStrings));
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

    wrapper.setAttribute('id', 'Availability');
    return wrapper;
};


// Render function that takes in an array of time maps and returns an array of
// MDC Outlined Select maps.
Tutorbook.prototype.renderTimeSelects = function(times) {
    var timeSelects = [];
    // Always render one more empty select than necessary (this ensures that
    // the user can still input data if they haven't already)
    for (var i = 0; i < times.length + 1; i++) {
        var time = times[i] || {
            'time': '',
            'day': ''
        };
        timeSelects.push({
            // TODO: Ensure that when the daySelect changes, the timeSelect
            // options change to reflect the new available times for that
            // day.
            'time': this.renderSelect('Time', time.time, this.data.times),
            'day': this.renderSelect('Day', time.day, this.data.days)
        });
    }
    return timeSelects;
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


// View function to open a hour select dialog that allows the user to choose
// between using a clock face to set an hourly time or a MDC Outlined Select to
// choose a specialty time (e.g. B Period Prep).
Tutorbook.prototype.viewSetHourDialog = function() {
    this.log('TODO: Implement setHour dialog');
};


// Render function that takes in an array of timeSelect maps and returns an
// array of timeSelect list items.
Tutorbook.prototype.renderTimeSelectListItems = function(timeSelectMaps) {
    var listItems = [];
    timeSelectMaps.forEach((map) => {
        listItems.push(this.renderSplitInputItem(map.day, map.time));
    });
    return listItems;
};


// Render function that takes in an array of two inputEls and returns a MDC List
// Item with both elements.
Tutorbook.prototype.renderSplitInputItem = function(inputA, inputB) {
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
            this.renderSplitInputItem(
                textFields[index],
                textFields[index + 1])
        );
    }
    // Just in case there is an odd number of textFields
    if (listItems[index] !== undefined) {
        listItems.push(
            this.renderSplitInputItem(
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
            this.renderSplitInputItem(
                selects[index],
                selects[index + 1])
        );
    }
    // Just in case there is an odd number of selects
    if (listItems[index] !== undefined) {
        listItems.push(
            this.renderSplitInputItem(
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
    wrapper.setAttribute('id', 'Subjects');
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


// View function that adds the given card to the .main #cards list based on 
// timestamp
Tutorbook.prototype.viewCard = function(card, mainListEl) {
    if (!!!card) {
        console.warn('Invalid card passed to viewCard:', card);
        return;
    }

    var mainEl = document.querySelector('.main');
    var mainListEl = mainListEl || mainEl.querySelector('#cards');
    var id = card.getAttribute('id');
    var timestamp = card.getAttribute('timestamp');

    var existingCard = mainListEl.querySelector('#' + id);
    if (!!existingCard) {
        // modify
        mainListEl.insertBefore(card, existingCard);
        mainListEl.removeChild(existingCard);
    } else {
        // add
        for (var i = 0; i < mainListEl.children.length; i++) {
            var child = mainListEl.children[i];
            var time = child.getAttribute('timestamp');
            // If there is a request that was sent later (more recently)
            // Then this request will appear after that request
            if (time && time < timestamp) {
                break;
            }
        }
        // We don't want to insert any cards in front of the welcome card
        if (card.getAttribute('id') === 'welcome-card') {
            mainListEl.insertBefore(card, mainListEl.firstElementChild);
        } else if (!!child && child.getAttribute('id') === 'welcome-card') {
            mainListEl.insertBefore(card, child.previousElementSibling);
        } else {
            // Append it normally
            mainListEl.insertBefore(card, child);
        }
    }

    // Attach MDCRipple if the card is a list-item
    if (card.getAttribute('class').split(' ').indexOf('mdc-list-item') >= 0) {
        MDCRipple.attachTo(card);
    }
};


// View function that shows dashboard
Tutorbook.prototype.viewDashboard = function() {
    history.pushState({}, null, '/app/home');
    this.navSelected = 'Home';
    const dashboardHeader = this.renderHeader('header-main', {
        'title': 'Tutorbook'
    });
    const dashboardView = this.renderTemplate('dashboard', {
        // If the user is viewing on mobile, we don't
        // want to show the welcome message in huge text.
        welcome: !this.onMobile,
        title: this.user.cards.welcomeMessage.title,
        subtitle: this.user.cards.welcomeMessage.summary,
    });
    this.view(dashboardHeader, dashboardView);

    return this.viewDashboardCards();
};


// Helper function that returns an array of all the user subcollections that
// should be displayed in the given user's dashboard (e.g. only show the 
// pendingClockIns/Outs to supervisors)
Tutorbook.prototype.getDashboardSubcollections = function() {
    switch (this.user.type) {
        case 'Supervisor':
            return [
                'pendingClockIns',
                'pendingClockOuts',
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
                'modifiedAppointments',
                'canceledAppointments'
            ];
    };
};


// View function that shows dashboard cards as Firestore documents change
Tutorbook.prototype.viewDashboardCards = function() {
    var that = this;
    this.emptyCards();

    // First, render setup cards based on the this.user.cards map
    Object.entries(this.user.cards).forEach((entry) => {
        const cardType = entry[0];
        const cardData = entry[1];
        this.dashboardRecycler.display(cardData, cardType);
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


// Helper function that empties the current dashboard cards to display new ones
Tutorbook.prototype.emptyCards = function() {
    this.cards = {};
    return $('main #cards').empty();
};


Tutorbook.prototype.getSupervisorLocationID = function() {
    return firebase.firestore().collection('locations').where('supervisors', 'array-contains', this.user.email).get().then((snapshot) => {
        var locationID;
        snapshot.forEach((doc) => {
            // TODO: Build some way of merging data from multiple collectionGroup
            // queries such that we can show data for multiple locations at the 
            // same time. Right now, we just take the last location.
            locationID = doc.id;
        });
        return locationID;
    }).catch((err) => {
        console.error('Error while getting the current supervisor ' +
            that.user.email + '\'s locationIDs:', err);
    });
};


// Data flow function that returns a query for a certain user subcollection
Tutorbook.prototype.getSupervisorSubcollectionData = function(subcollection) {
    // NOTE: Each of these subcollections have different data structures
    // and thus we have to check if the appt is at this location in different
    // ways.
    return this.getSupervisorLocationID.then((locationID) => {
        const db = firebase.firestore().collectionGroup(subcollection);
        switch (subcollection) {
            case 'appointments':
                return db.where('location.id', ' == ', locationID);
            case 'pastAppointments':
                return db.where('location.id', ' == ', locationID);
            case 'activeAppointments':
                return db.where('location.id', ' == ', locationID);
        };
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


// Init function that sets this.data.payments.hourlyChargeStrings to $ amounts from
// 5 to 100 in intervals of 5.
Tutorbook.prototype.initHourlyChargeStrings = function() {
    for (var i = 5; i <= 100; i += 5) {
        var chargeString = '$' + i + '.00';
        this.data.payments.hourlyChargeStrings.push(chargeString);
        this.data.payments.hourlyChargesMap[chargeString] = i;
    }
};


// Static data that is accessed throughout the app
Tutorbook.prototype.data = {
    payments: {
        types: ['Free', 'Paid'],
        hourlyChargeStrings: [],
        hourlyChargesMap: {},
    },
    gunnSchedule: {
        // TODO: Actually populate this with the right daily schedule
        Monday: [
            'A Period',
            'B Period',
            'C Period',
            'D Period',
            'E Period',
            'F Period',
            'G Period',
            'Flex',
        ],
        Tuesday: [
            'A Period',
            'B Period',
            'C Period',
            'D Period',
            'E Period',
            'F Period',
            'G Period',
            'Flex',
        ],
        Wednesday: [
            'A Period',
            'B Period',
            'C Period',
            'D Period',
            'E Period',
            'F Period',
            'G Period',
            'Flex',
        ],
        Thursday: [
            'A Period',
            'B Period',
            'C Period',
            'D Period',
            'E Period',
            'F Period',
            'G Period',
            'Flex',
        ],
        Friday: [
            'A Period',
            'B Period',
            'C Period',
            'D Period',
            'E Period',
            'F Period',
            'G Period',
            'Flex',
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
    times: [
        'Custom'
    ],
    /*
     *times: {
     *    'Monday': ['A Period Prep', 'B Period Prep', 'C Period Prep', 'F Period Prep', '2:45 PM', '3:45 PM'],
     *    'Tuesday': ['D Period Prep', 'Flex 1', 'Flex 2', 'E Period Prep', 'A Period Prep', 'G Period Prep', '3:45 PM'],
     *    'Wednesday': ['B Period Prep', 'C Period Prep', 'D Period Prep', 'F Period Prep', '3:05 PM', '3:45 PM', '4:05 PM'],
     *    'Thursday': ['E Period Prep', 'Flex 1', 'Flex 2', 'B Period Prep', 'A Period Prep', 'G Period Prep', '3:45 PM'],
     *    'Friday': ['C Period Prep', 'D Period Prep', 'E Period Prep', 'F Period Prep', 'G Period Prep', '3:45 PM'],
     *},
     */
    teachers: {
        'Algebra 1': ['Mr. Teacher', 'Ms. Teacher', 'Mr. Substitute'],
        'Algebra 1A': ['Mr. Stub', 'Ms. Stub', 'Mrs. Stub'],
        'French 1': ['Mr. Stub', 'Ms. Stub', 'Mrs. Stub'],
        'French 2': ['Mr. Stub', 'Ms. Stub', 'Mrs. Stub'],
    },
    locations: ['Gunn Academic Center', 'Gunn Library'],
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
    // Subjects array is literally just all the sub-topics copy and pasted into one huge array
    // TODO: Implement subject chooser full-screen dialog for further optimization and configuration
    subjects: [
        'Organization',
        'Planning',
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
        'World History',
        'Cont World History',
        'Government',
        'US History',
        'APUSH',
        'Economics',
        'AP Economics',
        'Psychology',
        'AP Psychology',
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
    genders: [
        'Male',
        'Female',
        'Other'
    ],
    grades: [
        'Freshman',
        'Sophomore',
        'Junior',
        'Senior'
    ],
    types: [
        'Tutor',
        'Pupil',
        'Supervisor',
        'Parent',
        'Admin'
    ],

};


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


Tutorbook.prototype.addCanceledRequestIn = function(options) {
    // Creates a new document in the toUser's cancledRequestsIn subcollection
    const request = options.request || false;
    const id = options.id || false;
    if (!request) {
        console.error("addCanceledRequestIn called without a request", options);
        return;
    }
    // Sanity check that the currentUser is also the fromUser
    if (firebase.auth().currentUser.email !== request.fromUser.email) {
        console.warn("addRejectedRequestsOut expected fromUser (" + request.fromUser.email + ") and currentUser (" + firebase.auth().currentUser.email + ") to match.");
    }
    const canceledRequest = {
        'canceledBy': {
            name: firebase.auth().currentUser.displayName,
            email: firebase.auth().currentUser.email,
            type: this.user.type,
            gender: this.user.gender, // NOTE: We need this to be able to 
            // render some dashboard cards correctly
            photo: firebase.auth().currentUser.photoURL,
        },
        'for': request,
        'timestamp': new Date(),
    };

    if (id) {
        var doc = firebase.firestore().collection('usersByEmail')
            .doc(request.toUser.email)
            .collection('canceledRequestsIn')
            .doc(id);
    } else {
        var doc = firebase.firestore().collection('usersByEmail')
            .doc(request.toUser.email)
            .collection('canceledRequestsIn')
            .doc();
    }
    return doc.set(canceledRequest).then(() => {
        return doc.id;
    });
};


Tutorbook.prototype.addApprovedRequestOut = function(options) {
    /*
     *Takes the request map and an optional ID as parameters. It then creates
     *a document in the fromUser's approvedRequestsOut subcollection.
     */
    const request = options.request || false;
    const id = options.id || false;
    if (!request) {
        console.error("addApprovedRequestOut called without a request", options);
        return;
    }
    // Sanity check that the currentUser is also the toUser
    if (firebase.auth().currentUser.email !== request.toUser.email) {
        console.warn("addApprovedRequestsOut expected toUser (" + request.toUser.email + ") and currentUser (" + firebase.auth().currentUser.email + ") to match.");
    }
    const approvedRequest = {
        'approvedBy': {
            name: firebase.auth().currentUser.displayName,
            email: firebase.auth().currentUser.email,
            type: this.user.type,
            photo: firebase.auth().currentUser.photoURL,
        },
        'for': request,
        'timestamp': new Date(),
    };

    if (id) {
        var doc = firebase.firestore().collection('usersByEmail')
            .doc(request.fromUser.email)
            .collection('approvedRequestsOut')
            .doc(id);
    } else {
        var doc = firebase.firestore().collection('usersByEmail')
            .doc(request.fromUser.email)
            .collection('approvedRequestsOut')
            .doc();
    }
    return doc.set(approvedRequest).then(() => {
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


// MODIFY REQUEST DOCUMENTS
Tutorbook.prototype.modifyRequestOut = function(options) {
    // Updates the original document in the fromUser's requestsOut subcollection
    const request = options.request || false;
    const id = options.id;
    if (!request) {
        console.error("modifyRequestOut called without a request", options);
        return;
    }
    if (!!!id) {
        console.warn("modifyRequestOut called without an id", options);
    }
    var doc = firebase.firestore().collection('usersByEmail')
        .doc(request.fromUser.email)
        .collection('requestsOut')
        .doc(id);
    return doc.update(request).then(() => {
        return doc.id;
    });
};


Tutorbook.prototype.modifyRequestIn = function(options) {
    // Updates the original document in the toUser's requestsIn subcollection
    const request = options.request || false;
    const id = options.id || false;
    if (!request) {
        console.error("modifyRequestIn called without a request", options);
        return;
    }
    if (!!!id) {
        console.warn("modifyRequestIn called without an id", options);
    }
    var doc = firebase.firestore().collection('usersByEmail')
        .doc(request.toUser.email)
        .collection('requestsIn')
        .doc(id);
    return doc.update(request).then(() => {
        return doc.id;
    });
};


Tutorbook.prototype.addModifiedRequestOut = function(options) {
    // Creates a new document in the fromUser's modifiedRequestsOut subcollection
    // (is triggered when the toUser changes the options)
    const request = options.request || false;
    const id = options.id || false;
    if (!(request && id)) {
        console.error("addModifiedRequestsOut called without a request or id", options);
        return;
    }

    // Sanity check that the currentUser is also the toUser
    if (firebase.auth().currentUser.email !== request.toUser.email) {
        console.warn("addModifiedRequestsOut expected toUser (" + request.toUser.email + ") and currentUser (" + firebase.auth().currentUser.email + ") to match.");
    }
    const modifiedRequest = {
        'modifiedBy': {
            name: firebase.auth().currentUser.displayName,
            email: firebase.auth().currentUser.email,
            type: this.user.type,
            photo: firebase.auth().currentUser.photoURL,
        },
        'original': {}, // TODO: Do we want to connect with Firestore to get the data of the original?
        'originalID': id,
        'current': request,
        'timestamp': new Date(),
    };

    var doc = firebase.firestore().collection('usersByEmail')
        .doc(request.fromUser.email)
        .collection('modifiedRequestsOut')
        .doc(id);

    return doc.set(modifiedRequest).then(() => {
        return doc.id;
    });
};


Tutorbook.prototype.addModifiedRequestIn = function(options) {
    // Creates a new document in the toUser's modifiedRequestsIn subcollection
    // (is triggered when the fromUser changes the options --> I'm not sure if we 
    // actually want this though...)
    const request = options.request || false;
    const id = options.id || false;
    if (!(request && id)) {
        console.error("addModifiedRequestsIn called without a request or id", options);
        return;
    }

    // Sanity check that the currentUser is also the fromUser
    if (firebase.auth().currentUser.email !== request.fromUser.email) {
        console.warn("addModifiedRequestsOut expected fromUser (" + request.fromUser.email + ") and currentUser (" + firebase.auth().currentUser.email + ") to match.");
    }
    const modifiedRequest = {
        'modifiedBy': {
            name: firebase.auth().currentUser.displayName,
            email: firebase.auth().currentUser.email,
            type: this.user.type,
            gender: this.user.gender, // NOTE: We need this to be able to 
            // render some dashboard cards correctly
            photo: firebase.auth().currentUser.photoURL,
        },
        'original': {}, // TODO: Do we want to connect with Firestore to get the data of the original?
        'originalID': id,
        'current': request,
        'timestamp': new Date(),
    };

    var doc = firebase.firestore().collection('usersByEmail')
        .doc(request.toUser.email)
        .collection('modifiedRequestsIn')
        .doc(id);
    return doc.set(modifiedRequest).then(() => {
        return doc.id;
    });
}


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
    appt.attendees.forEach((user) => {
        if (id) {
            var doc = firebase.firestore().collection('usersByEmail')
                .doc(user.email)
                .collection('appointments')
                .doc(id);
        } else {
            var doc = firebase.firestore().collection('usersByEmail')
                .doc(user.email)
                .collection('appointments')
                .doc(id);
        }
        doc.set(appt);
    });

    var doc = firebase.firestore().collection('locations')
        .doc(appt.location.id)
        .collection('appointments')
        .doc(id);
    return doc.set(appt).then(() => {
        return doc.id;
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
        'originalID': id,
        'modifiedBy': {
            name: firebase.auth().currentUser.displayName,
            email: firebase.auth().currentUser.email,
            type: this.user.type,
            photo: firebase.auth().currentUser.photoURL,
        },
        'original': {}, // TODO: See above todo statement.
        'current': appt,
        'timestamp': new Date(),
    };

    var doc = firebase.firestore().collection('usersByEmail')
        .doc(otherUser.email)
        .collection('modifiedAppointments')
        .doc(id);

    return doc.set(modifiedAppointment).then(() => {
        return doc.id;
    });
};


Tutorbook.prototype.addCanceledAppointment = function(options) {
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
        'originalID': id,
        'canceledBy': {
            name: firebase.auth().currentUser.displayName,
            email: firebase.auth().currentUser.email,
            type: this.user.type,
            photo: firebase.auth().currentUser.photoURL,
        },
        'original': appt, // TODO: See above todo statement.
        'timestamp': new Date(),
    };

    var doc = firebase.firestore().collection('locations')
        .doc(appt.location.id)
        .collection('canceledAppointments')
        .doc(id);
    doc.set(canceledAppointment);

    var doc = firebase.firestore().collection('usersByEmail')
        .doc(otherUser.email)
        .collection('canceledAppointments')
        .doc(id);

    return doc.set(canceledAppointment).then(() => {
        return doc.id;
    });
};


Tutorbook.prototype.deleteAppointment = function(options) {
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
    doc.delete();

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
        });
    });
};


Tutorbook.prototype.rejectRequestIn = function(id, request) {
    // Delete existing request documents for both users and add 
    // rejectedRequest document for the fromUser
    var options = {
        'id': id,
        'request': request,
    };
    // Sanity check that the currentUser is also the toUser
    if (firebase.auth().currentUser.email !== request.toUser.email) {
        console.warn("rejectRequestIn expected toUser (" +
            request.toUser.email + ") and currentUser (" +
            firebase.auth().currentUser.email + ") to match.");
    }

    return this.deleteRequest(id, request).then((id) => {
        return this.addRejectedRequestOut(options);
    });
};


Tutorbook.prototype.cancelRequestOut = function(id, request) {
    /*
     *Takes the request map and an ID as parameters. It then calls addCanceledRequestIn to create a document
     * in the toUser's canceledRequestsIn subcollection and calls deleteRequest
     * to get rid of all other relating request documents.
     */
    var options = {
        'id': id,
        'request': request,
    };

    // Sanity check that the currentUser is also the fromUser
    if (firebase.auth().currentUser.email !== request.fromUser.email) {
        console.warn("cancelRequestOut expected fromUser (" + request.fromUser.email + ") and currentUser (" + firebase.auth().currentUser.email + ") to match.");
    }

    return this.deleteRequest(id, request).then((id) => {
        return this.addCanceledRequestIn(options);
    });
};


Tutorbook.prototype.newRequest = (request) => {
    // Add request documents for both users
    var options = {
        'request': request
    };
    return addRequestIn(options).then((id) => {
        options.id = id;
        return addRequestOut(options).then((id) => {
            return id;
        });
    });
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


Tutorbook.prototype.updateRequest = function(request, id) {
    // Modify the original request documents and add a modifiedRequest doc
    // in the other user's subcollection
    var options = {
        'request': request,
        'id': id
    };
    if (firebase.auth().currentUser.email === request.fromUser.email) {
        var otherUser = request.toUser;
    } else {
        var otherUser = request.fromUser;
    }
    var that = this;
    return that.modifyRequestOut(options).then((id) => {
        return that.modifyRequestIn(options).then((id) => {
            if (otherUser.email === request.fromUser.email) {
                // The person who the request was originally sent
                // to modified the document. Thus, we need to notify
                // the fromUser in his modifiedRequestsOut collection.
                return that.addModifiedRequestOut(options);
            } else {
                // Notify the toUser that the request was changed.
                return that.addModifiedRequestIn(options);
            }
        });
    });
};


// CALLABLE APPOINTMENT FUNCTIONS
Tutorbook.prototype.approveRequest = function(request, id) {
    // Deletes the existing request documents and adds a new appointment docs
    // TODO: Make the locationID part of the request document from the get-go
    var request = this.filterRequestData(request);
    var appointment = {
        'attendees': [request.toUser, request.fromUser],
        'for': this.filterRequestData(request),
        'time': {
            day: request.time.day,
            from: request.time.from,
            to: request.time.to,
            clocked: '0:0:0.00',
        },
        'location': {
            name: request.location.name,
            id: request.location.id,
        },
        'timestamp': new Date(),
    };
    var options = {
        'request': request,
        'id': id,
        'appt': appointment
    };
    return this.deleteRequest(id, request).then((id) => {
        return this.addApprovedRequestOut(options).then((id) => {
            return this.addAppointment(options);
        });
    });
};


Tutorbook.prototype.updateAppt = function(appt, id) {
    // Updates the existing docs and adds a modifiedAppointment doc in the other
    // user's subcollection
    var options = {
        'appt': appt,
        'id': id
    };
    if (appt.attendees[0].email === firebase.auth().currentUser.email) {
        options.otherUser = appt.attendees[1];
    } else {
        options.otherUser = appt.attendees[0];
    }
    this.modifyAppointment(options);
    return this.addModifiedAppointment(options);
};


Tutorbook.prototype.cancelAppointment = function(appt, id) {
    this.log('Canceling appointment ' + id + ':', appt);
    var options = {
        'appt': appt,
        'id': id
    };
    if (appt.attendees[0].email === firebase.auth().currentUser.email) {
        options.otherUser = appt.attendees[1];
    } else {
        options.otherUser = appt.attendees[0];
    }
    this.deleteAppointment(options);
    return this.addCanceledAppointment(options);
};


// CALLABLE USER FUNCTIONS
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
                'photo': tempUser.photoURL || "",
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
                'availability': userData.availability || {},
                'payments': userData.payments || {
                    hourlyChargeString: '$25.00',
                    hourlyCharge: 25,
                    totalChargedString: '$0.00',
                    totalCharged: 0,
                    currentBalance: 0,
                    currentBalanceString: '$0.00',
                    type: 'Free',
                },
                'authenticated': userData.authenticated || false,
                'secondsTutored': userData.secondsTutored || 0,
                'secondsPupiled': userData.secondsPupiled || 0,
            };
            if (!!log) {
                that.log('Signed in with user:', that.user);
            }
        } else {
            console.warn('User document did not exist, creating a new one.');
            if (!!!that.user) {
                that.user = {};
            }
            that.user.email = tempUser.email;
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
            };
            that.user.secondsTutored = 0;
            that.user.secondsPupiled = 0;
            if (!!!that.user.type || that.user.type === 'Tutor' || that.user.type === 'Pupil') {
                that.user.authenticated = true;
            } else {
                that.user.authenticated = false;
            }
            return that.updateUser().then(() => {
                return that.getUser(tempUser.email).then((doc) => {
                    const userData = doc.data();
                    // Translate currentUser object to JavaScript map
                    that.user = {
                        'name': tempUser.displayName || "",
                        'uid': tempUser.uid || "",
                        'photo': tempUser.photoURL || "",
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
                        'availability': userData.availability || {},
                        'payments': userData.payments || {
                            hourlyChargeString: '$25.00',
                            hourlyCharge: 25,
                            totalChargedString: '$0.00',
                            totalCharged: 0,
                            currentBalance: 0,
                            currentBalanceString: '$0.00',
                            type: 'Free',
                        },
                        'authenticated': userData.authenticated || false,
                        'secondsTutored': userData.secondsTutored || 0,
                        'secondsPupiled': userData.secondsPupiled || 0,
                    };
                    if (!!log) {
                        that.updateUser().then(() => {
                            that.log('Created user:', that.user);
                        });
                    }
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
        .set(this.user)
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


// Logging that can be turned off and on
Tutorbook.prototype.log = function(message, item) {
    if (this.loggingOn) {
        (!!item) ? console.log(message, item): console.log(message);
    }
};


// Start the app onload
window.onload = function() {
    window.app = new Tutorbook();
};