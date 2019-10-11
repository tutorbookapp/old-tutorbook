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

// For some reason, "import" doesn't work for Navigo
// See: https://stackoverflow.com/questions/54314816/i-cant-use-or-import-navigo-in-typescript
const Navigo = require('navigo');

'use strict';

// =================================================
// Tutorbook.js
// =================================================

/**
 * Initializes the Tutorbook app.
 */
function Tutorbook() {
    this.filters = {
        grade: '',
        subject: '',
        gender: '',
        type: '',
        sort: 'Rating'
    };

    this.currentRequest = {
        subject: '',
        time: {},
        message: '',
        location: '',
        timestamp: new Date(),
        toUser: {},
        fromUser: {},
    };

    this.dialogs = {};
    this.renderers = {};
    this.navigation = {};
    this.currentUser = {};

    var that = this;
    var init = function() {
        document.querySelector('#loader').setAttribute('hidden', 'true');
        that.initHeaders();
        that.initNavDrawer();
        that.initRouter();
        that.initReviewDialog();
        that.initFilterDialog();
        /*
         *that.initSubjectSelectDialog();
         */
        /*
         *that.initNotifications();
         */

        // Redirect based on URL parameter
        console.log("Checking for redirect parameters...", window.location.toString());
        if (window.location.toString().indexOf('?redirect=') > 0) {
            const redirectLink = window.location.toString().split('?redirect=')[1];
            console.log("Redirecting...", redirectLink);
            that.router.navigate('/app/' + redirectLink);
        }

        // TODO: Have this run in the background somehow?
        that.initUserViews();
    };

    that.initTemplates();
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // User is signed in, add user document and init app.
            init();
            that.updateCurrentUser();
        } else {
            document.querySelector('#loader').setAttribute('hidden', 'true');
            that.viewWelcome();
        }
    });

};

Tutorbook.prototype.updateNavSelected = function(option) {
    var navEl = document.querySelector('#nav-drawer');
    // Reset navBar
    navEl.querySelectorAll('.mdc-list-item--activated').forEach((el) => {
        el.setAttribute('class', 'mdc-list-item');
    });
    switch (option) {
        case 'home':
            navEl.querySelector('.mdc-list #home').setAttribute('class', 'mdc-list-item mdc-list-item--activated');
            break;
        case 'search':
            navEl.querySelector('.mdc-list #search').setAttribute('class', 'mdc-list-item mdc-list-item--activated');
            break;
        case 'settings':
            navEl.querySelector('.mdc-list #settings').setAttribute('class', 'mdc-list-item mdc-list-item--activated');
            break;
        case 'tutors':
            navEl.querySelector('.mdc-list #tutors').setAttribute('class', 'mdc-list-item mdc-list-item--activated');
            break;
        case 'pupils':
            navEl.querySelector('.mdc-list #pupils').setAttribute('class', 'mdc-list-item mdc-list-item--activated');
            break;
        case 'profile':
            navEl.querySelector('.mdc-list #profile').setAttribute('class', 'mdc-list-item mdc-list-item--activated');
            break;
        default:
            navEl.querySelector('.mdc-list #home').setAttribute('class', 'mdc-list-item mdc-list-item--activated');
    };
};

/**
 * Initializes the router for the Tutorbook app.
 */
Tutorbook.prototype.initRouter = function() {
    this.router = new Navigo(null, false, '#');

    var that = this;
    this.router
        .on({
            '/app/pupils': function() {
                that.filters.type = 'Pupil';
                that.updateQuery(that.filters);
                that.updateNavSelected('pupils');
            },
            '/app/tutors': function() {
                that.filters.type = 'Tutor';
                that.updateQuery(that.filters);
                that.updateNavSelected('tutors');
            },
            '/app/search': function() {
                that.updateQuery(that.filters);
                that.updateNavSelected('search');
            },
            '/app/settings': function() {
                that.updateCurrentUser().then(() => {
                    that.viewSettings();
                });
            },
            '/app/dashboard': function() {
                that.updateCurrentUser().then(() => {
                    console.log("Viewing dashboard from router...");
                    that.viewDashboard();
                });
            },
            '/app/users/*': function() {
                var path = that.getCleanPath(document.location.pathname);
                var id = path.split('/')[3];
                that.showUser(id);
            },
            '/app/profile': function() {
                that.updateCurrentUser().then(function() {
                    that.viewProfile();
                    that.updateNavSelected('profile');
                });
            },
            '/app': function() {
                that.updateCurrentUser().then(() => {
                    console.log("Viewing dashboard from router...");
                    that.viewDashboard();
                });
            },
        })
        .resolve();
};

Tutorbook.prototype.getCleanPath = function(dirtyPath) {
    if (dirtyPath.startsWith('/app/index.html')) {
        const newPath = dirtyPath.split('/').slice(2).join('/');
        console.log("Dirty path " + dirtyPath + " became:", newPath);
        return newPath;
    } else {
        return dirtyPath;
    }
};

Tutorbook.prototype.getFirebaseConfig = function() {
    return firebase.app().options;
};

function getTimes(minutesInterval, startTime) {
    var x = minutesInterval; //minutes interval
    var times = []; // time array
    var tt = startTime; // start time
    var ap = [' AM', ' PM']; // AM-PM

    //loop to increment the time and push results in array
    for (var i = 0; tt < 24 * 60; i++) {
        var hh = Math.floor(tt / 60); // getting hours of day in 0-24 format
        var mm = (tt % 60); // getting minutes of the hour in 0-55 format
        times[i] = ("0" + (hh % 12)).slice(-2) + ':' + ("0" + mm).slice(-2) + ap[Math.floor(hh / 12)]; // pushing data in array in [00:00 - 12:00 AM/PM format]
        tt = tt + x;
    }
    return times;
}

Tutorbook.prototype.data = {
    periods: [
        'A Period Prep',
        'B Period Prep',
        'C Period Prep',
        'D Period Prep',
        'E Period Prep',
        'F Period Prep',
        'G Period Prep',
    ],
    times: {
        'Monday': ['A Period Prep', 'B Period Prep', 'C Period Prep', 'F Period Prep', '2:45 PM', '3:45 PM'],
        'Tuesday': ['D Period Prep', 'Flex 1', 'Flex 2', 'E Period Prep', 'A Period Prep', 'G Period Prep', '3:45 PM'],
        'Wednesday': ['B Period Prep', 'C Period Prep', 'D Period Prep', 'F Period Prep', '3:05 PM', '3:45 PM', '4:05 PM'],
        'Thursday': ['E Period Prep', 'Flex 1', 'Flex 2', 'B Period Prep', 'A Period Prep', 'G Period Prep', '3:45 PM'],
        'Friday': ['C Period Prep', 'D Period Prep', 'E Period Prep', 'F Period Prep', 'G Period Prep', '3:45 PM'],
        /*
         *'all': getTimes(0, 30),
         */
    },
    teachers: {
        'Algebra 1': ['Mr. Teacher', 'Ms. Teacher', 'Mr. Substitute'],
        'Algebra 1A': ['Mr. Stub', 'Ms. Stub', 'Mrs. Stub'],
        'French 1': ['Mr. Stub', 'Ms. Stub', 'Mrs. Stub'],
        'French 2': ['Mr. Stub', 'Ms. Stub', 'Mrs. Stub'],
    },
    locations: ['Gunn Academic Center', 'Mitchell Park Library', 'Gunn Library'],
    /*
     *times: ['2:45 PM', '3:45 PM', '3:05 PM', 'Flex'],
     */
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
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
    firstNames: [
        'Nicholas',
        'Luke',
        'Hudson',
        'Julia',
        'Catherine',
        'Katy',
        'Andrew',
        'Sam',
        'Bob',
        'Larry',
        'John'
    ],
    lastNames: [
        'Chiang',
        'Xu',
        'Matayoshi',
        'Hsiao',
        'Ballantyne',
        'Mondragon',
        'Lyon'
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
    ratings: [{
            rating: 1,
            text: 'Didn\'t even show up!'
        },
        {
            rating: 2,
            text: 'Not the greatest listener, wouldn\'t stop watching YouTube streams.'
        },
        {
            rating: 3,
            text: 'Exactly okay :/'
        },
        {
            rating: 4,
            text: 'Great person, would definitely be willing to meet again!'
        },
        {
            rating: 5,
            text: 'My favorite person. Literally.'
        }
    ],
    types: [
        'Tutor',
        'Pupil'
    ],

};

//=====================================
// Tutorbook.Data.js
//=====================================

// HELPER FUNCTIONS (to manipulate Firestore documents)
// NOTE: All Firestore database changes should be made in here.
// There should be no other references to firebase.firestore() outside of these
// helper functions.

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
 *
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
 *- changeRequest
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
        var doc = firebase.firestore().collection('users')
            .doc(request.toUser.email)
            .collection('requestsIn')
            .doc(id);
    } else {
        var doc = firebase.firestore().collection('users')
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
        var doc = firebase.firestore().collection('users')
            .doc(request.fromUser.email)
            .collection('requestsOut')
            .doc(id);
    } else {
        var doc = firebase.firestore().collection('users')
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
            type: this.currentUser.type,
            photo: firebase.auth().currentUser.photoURL,
        },
        'for': request,
        'timestamp': new Date(),
    };

    if (id) {
        var doc = firebase.firestore().collection('users')
            .doc(request.toUser.email)
            .collection('canceledRequestsIn')
            .doc(id);
    } else {
        var doc = firebase.firestore().collection('users')
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
            type: this.currentUser.type,
            photo: firebase.auth().currentUser.photoURL,
        },
        'for': request,
        'timestamp': new Date(),
    };

    if (id) {
        var doc = firebase.firestore().collection('users')
            .doc(request.fromUser.email)
            .collection('approvedRequestsOut')
            .doc(id);
    } else {
        var doc = firebase.firestore().collection('users')
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
            type: this.currentUser.type,
            photo: firebase.auth().currentUser.photoURL,
        },
        'for': request,
        'timestamp': new Date(),
    };

    if (id) {
        var doc = firebase.firestore().collection('users')
            .doc(request.fromUser.email)
            .collection('rejectedRequestsOut')
            .doc(id);
    } else {
        var doc = firebase.firestore().collection('users')
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
    var doc = firebase.firestore().collection('users')
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
    var doc = firebase.firestore().collection('users')
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
    var doc = firebase.firestore().collection('users')
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
    var doc = firebase.firestore().collection('users')
        .doc(user.email)
        .collection('requestsOut')
        .doc(id);
    return doc.delete().then(() => {
        return doc.id;
    });
};


// MODIFY REQUEST DOCUMENTS
function modifyRequestOut(options) {
    // Updates the original document in the fromUser's requestsOut subcollection
    const request = options.request || false;
    const id = options.id || false;
    if (!(id && request)) {
        console.error("modifyRequestOut called without id or request", options);
        return;
    }
    var doc = firebase.firestore().collection('users')
        .doc(request.fromUser.email)
        .collection('requestsOut')
        .doc(id);
    return doc.update(request).then(() => {
        return doc.id;
    });
};

function modifyRequestIn(options) {
    // Updates the original document in the toUser's requestsIn subcollection
    const request = options.request || false;
    const id = options.id || false;
    if (!(id && request)) {
        console.error("modifyRequestIn called without id or request", options);
        return;
    }
    var doc = firebase.firestore().collection('users')
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
            type: this.currentUser.type,
            photo: firebase.auth().currentUser.photoURL,
        },
        'original': {}, // TODO: Do we want to connect with Firestore to get the data of the original?
        'originalID': id,
        'current': request,
        'timestamp': new Date(),
    };

    var doc = firebase.firestore().collection('users')
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
            type: this.currentUser.type,
            photo: firebase.auth().currentUser.photoURL,
        },
        'original': {}, // TODO: Do we want to connect with Firestore to get the data of the original?
        'originalID': id,
        'current': request,
        'timestamp': new Date(),
    };

    var doc = firebase.firestore().collection('users')
        .doc(request.toUser.email)
        .collection('modifiedRequestsIn')
        .doc(id);
    return doc.set(modifiedRequest).then(() => {
        return doc.id;
    });
}


// ADD APPOINTMENT DOCUMENTS
function addAppointment(options) {
    // Add appointment to both users's appointment subcollections
    const id = options.id || false;
    const appt = options.appt || false;
    if (!appt) {
        console.error("addAppointment called without an appointment", options);
        return;
    }
    return appt.attendees.forEach((user) => {
        if (id) {
            var doc = firebase.firestore().collection('users')
                .doc(user.email)
                .collection('appointments')
                .doc(id);
        } else {
            var doc = firebase.firestore().collection('users')
                .doc(user.email)
                .collection('appointments')
                .doc(id);
        }
        return doc.set(appt).then(() => {
            return doc.id;
        });
    });
};


// MODIFY APPOINTMENT DOCUMENTS
function modifyAppointment(options) {
    // Updates the original document in both users's appointment subcollections
    const id = options.id || false;
    const appt = options.appt || false;
    if (!(id && appt)) {
        console.error("modifyAppointment called without an id or appointment", options);
        return;
    }
    return appt.attendees.forEach((user) => {
        var doc = firebase.firestore().collection('users')
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
            type: this.currentUser.type,
            photo: firebase.auth().currentUser.photoURL,
        },
        'original': {}, // TODO: See above todo statement.
        'current': appt,
        'timestamp': new Date(),
    };

    var doc = firebase.firestore().collection('users')
        .doc(otherUser.email)
        .collection('modifiedAppointments')
        .doc(id);

    return doc.set(modifiedAppointment).then(() => {
        return doc.id;
    });
};

Tutorbook.prototype.addCanceledAppointment = function(options) {
    // Creates a new document in the otherUser's canceledAppointment subcollections
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
            type: this.currentUser.type,
            photo: firebase.auth().currentUser.photoURL,
        },
        'original': appt, // TODO: See above todo statement.
        'timestamp': new Date(),
    };

    var doc = firebase.firestore().collection('users')
        .doc(otherUser.email)
        .collection('canceledAppointments')
        .doc(id);

    return doc.set(canceledAppointment).then(() => {
        return doc.id;
    });
};

function deleteAppointment(options) {
    // Deletes the existing documents in both users's appointment subcollections
    const id = options.id || false;
    const appt = options.appt || false;
    if (!(id && appt)) {
        console.error("deleteAppointment called without an id or appointment", options);
        return;
    }

    return appt.attendees.forEach((user) => {
        var doc = firebase.firestore().collection('users')
            .doc(user.email)
            .collection('appointments')
            .doc(id);
        return doc.delete.then(() => {
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
        console.warn("rejectRequestIn expected toUser (" + request.toUser.email + ") and currentUser (" + firebase.auth().currentUser.email + ") to match.");
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

Tutorbook.prototype.addRequest = (request) => {
    // Add request documents for both users
    var options = {
        'request': request
    };
    return addRequestIn(options).then((id) => {
        options.id = id;
        return addRequestOut(options);
    });
};

Tutorbook.prototype.changeRequest = function(request, id) {
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
    return modifyRequestOut(options).then((id) => {
        return modifyRequestIn(options).then((id) => {
            if (otherUser.email === request.fromUser.email) {
                // The person who the request was originally sent
                // to modified the document. Thus, we need to notify
                // the fromUser in his modifiedRequestsOut collection.
                return this.addModifiedRequestOut(options);
            } else {
                // Notify the toUser that the request was changed.
                return this.addModifiedRequestIn(options);
            }
        });
    });
};

// CALLABLE APPOINTMENT FUNCTIONS
Tutorbook.prototype.approveRequestIn = function(request, id) {
    // Deletes the existing request documents and adds a new appointment docs
    var appointment = {
        'attendees': [request.toUser, request.fromUser],
        'for': request,
        'time': request.time,
        'timestamp': new Date(),
        'editors': [request.toUser.email, request.fromUser.email].concat(getAdminEmails()),
        'viewers': [request.toUser.email, request.fromUser.email].concat(getAdminEmails()),
    };
    var options = {
        'request': request,
        'id': id,
        'appt': appointment
    };
    return this.deleteRequest(id, request).then((id) => {
        return this.addApprovedRequestOut(options).then((id) => {
            return addAppointment(options);
        });
    });
};

Tutorbook.prototype.changeAppointment = (appt, id) => {
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
    return modifyAppointment(options).then((id) => {
        return this.addModifiedAppointment(options);
    });
};

Tutorbook.prototype.cancelAppointment = (appt, id) => {
    var options = {
        'appt': appt,
        'id': id
    };
    if (appt.attendees[0].email === firebase.auth().currentUser.email) {
        options.otherUser = appt.attendees[1];
    } else {
        options.otherUser = appt.attendees[0];
    }
    return deleteAppointment(options).then((id) => {
        return this.addCanceledAppointment(options);
    });
};






Tutorbook.prototype.updateCurrentUser = function() {
    // Get user data from firestore database
    this.currentUser = {
        grade: '',
        gradeString: '',
        proficientStudies: [],
        neededStudies: [],
        allStudies: [],
        availableTimes: [],
        availableLocations: [],
        type: '',
        numRatings: 0,
        avgRating: 0,
        gender: '',
        name: firebase.auth().currentUser.displayName,
        email: firebase.auth().currentUser.email,
        phone: '',
        bio: '',
        showWelcome: false,
        photo: firebase.auth().currentUser.photoURL,
        preferredContactMethod: 'Phone',
        maxMessageLength: false,
        showDescription: false,
        showGender: true,
        showPhone: true,
        visibility: 'public',
        autoResponse: false,
        numTimeSelects: 2, // Store these numbers to correctly render the profile view
        numSubjectSelects: 2, // based on previous "Add Fields" button clicks
        numLocationSelects: 2, // (defualt is to just show the two list items)
    };

    var that = this;
    return this.getUser(this.currentUser.email).then(function(doc) {
        var data = doc.data();
        Object.keys(that.currentUser).forEach(function(attr) {
            if (data[attr] != null && data[attr] != undefined) {
                that.currentUser[attr] = data[attr];
            }
        });
    }).catch(function(error) {
        // Set user data to database
        console.error("Error while updating user profile, adding new doc:", error);
        that.currentUser.showWelcome = true;
        that.addUser(that.currentUser);
    });
};

Tutorbook.prototype.updateUser = function(data) {
    var doc = firebase.firestore().collection('users').doc(data.email);
    return doc.update(data).catch((err) => {
        console.log("Error while updating user " + data.email + ":", err);

        // Snackbar
        var el = document.querySelector('#snackbar');
        var snackbar = MDCSnackbar.attachTo(el);
        snackbar.labelText = "Could not update user profile. Make sure you're signed in.";
        snackbar.open();
    });

};

Tutorbook.prototype.clearStudies = function(id) {
    return firebase.firestore().collection('users').doc(firebase.auth().currentUser.email).collection(id).get().then((snapshot) => {
        snapshot.forEach((doc) => {
            doc.ref.delete();
        });
    });
};

Tutorbook.prototype.addStudy = function(data, id) {
    var doc = firebase.firestore().collection('users').doc(this.currentUser.email).collection(id).doc();
    return doc.set(data).catch((err) => {
        console.log("Error while adding study " + data.name + " for user " + id + ":", err);

        // Snackbar
        var el = document.querySelector('#snackbar');
        var snackbar = MDCSnackbar.attachTo(el);
        snackbar.labelText = "Could not add study to user profile.";
        snackbar.open();
    });
};

Tutorbook.prototype.addUser = function(data) {
    var doc = firebase.firestore().collection('users').doc(data.email);
    return doc.set(data).catch((err) => {
        console.log("Error while adding user " + data.email + ":", err);

        // Snackbar
        var el = document.querySelector('#snackbar');
        var snackbar = MDCSnackbar.attachTo(el);
        snackbar.labelText = "Could not add user profile. Make sure you're signed in.";
        snackbar.open();
    });
};

Tutorbook.prototype.getAllUsers = function(renderer) {
    var query = firebase.firestore()
        .collection('users')
        .orderBy('avgRating', 'desc')
        .limit(50);

    this.getDocumentsInQuery(query, renderer);
};

Tutorbook.prototype.getAdminDashboardData = function() {
    // Function to get all pending requestsOut, requestsIn, and upcoming events
    const types = ['requestsOut', 'upcoming'];

    var that = this;
    types.forEach((type) => {
        var query = firebase.firestore()
            .collectionGroup(type)
            .orderBy('timestamp', 'desc')
            .limit(30) // TODO: Do we really want to limit requests by 30?

        query.onSnapshot(function(snapshot) {

            if (!snapshot.size) {
                return that.renderers.adminDashboardRenderer.empty(type);
            }

            snapshot.docChanges().forEach(function(change) {
                console.log("Change detected, re-rendering admin dashboard...");
                if (change.type === 'removed') {
                    that.renderers.adminDashboardRenderer.remove(change.doc);
                } else {
                    that.renderers.adminDashboardRenderer.display(change.doc, type);
                }
            });
        });
    });
};

Tutorbook.prototype.getDashboardData = function(userID) {
    const types = ['requestsIn', 'requestsOut', 'upcoming'];
    // TODO: Implement modifiedAppointments, canceledAppointments, modifiedRequestsOut,
    // modifiedRequestsIn, and rejectedReqestsOut cards. (Also, change the name
    // of upcoming to appointments)

    var that = this;
    types.forEach(function(type) {
        var query = firebase.firestore()
            .collection('users')
            .doc(userID)
            .collection(type)
            .orderBy('timestamp', 'desc')
            .limit(30) // TODO: Do we really want to limit requests by 30?

        query.onSnapshot(function(snapshot) {

            if (!snapshot.size) {
                return that.renderers.dashboardRenderer.empty(type);
            }

            snapshot.docChanges().forEach(function(change) {
                if (change.type === 'removed') {
                    that.renderers.dashboardRenderer.remove(change.doc);
                } else {
                    that.renderers.dashboardRenderer.display(change.doc, type);
                }
            });
        });
    });
};

Tutorbook.prototype.getDocumentsInQuery = function(query, renderer) {
    var that = this;
    query.onSnapshot(function(snapshot) {
        if (!snapshot.size) {
            console.log("Query " + that.filters + " is empty, showing no user screen.");
            return renderer.empty(); // Display "There are no users".
        }

        snapshot.docChanges().forEach(function(change) {
            if (change.type === 'removed') {
                renderer.remove(change.doc);
            } else {
                renderer.display(change.doc);
            }
        });
    });
};

Tutorbook.prototype.getUser = function(id) {
    return firebase.firestore().collection('users').doc(id).get().catch((err) => {
        console.error("Error while getting user profile " + id + ":", err);

        // Snackbar
        var el = document.querySelector('#snackbar');
        var snackbar = MDCSnackbar.attachTo(el);
        snackbar.labelText = "Could not load user " + id + ".";
        snackbar.open();
    });
};

Tutorbook.prototype.getFilteredUsers = function(filters, renderer) {
    var query = firebase.firestore().collection('users');

    if (filters.grade !== 'Any') {
        query = query.where('gradeString', '==', filters.grade);
    }

    if (filters.subject !== 'Any') {
        if (filters.type === 'Tutor') {
            query = query.where('proficientStudies', 'array-contains', filters.subject);
        } else if (filters.type === 'Pupil') {
            query = query.where('neededStudies', 'array-contains', filters.subject);
        } else {
            // Check both
            query = query.where('allStudies', 'array-contains', filters.subject);
        }
    }

    if (filters.gender !== 'Any') {
        query = query.where('gender', '==', filters.gender);
    }

    if (filters.type !== 'Any') {
        query = query.where('type', '==', filters.type);
    }

    if (filters.sort === 'Rating') {
        query = query.orderBy('avgRating', 'desc');
    } else if (filters.sort === 'Reviews') {
        query = query.orderBy('numRatings', 'desc');
    }

    console.log("Getting documents for " + this.filters + "...");
    this.getDocumentsInQuery(query, renderer);
};

Tutorbook.prototype.addRating = function(userID, rating) {
    var collection = firebase.firestore().collection('users');
    var document = collection.doc(userID);
    var newRatingDocument = document.collection('ratings').doc();

    return firebase.firestore().runTransaction(function(transaction) {
        return transaction.get(document).then(function(doc) {
            var data = doc.data();

            var newAverage =
                (data.numRatings * data.avgRating + rating.rating) /
                (data.numRatings + 1);

            transaction.update(document, {
                numRatings: data.numRatings + 1,
                avgRating: newAverage
            });
            return transaction.set(newRatingDocument, rating);
        }).catch((err) => {
            console.error("Error while adding rating:", err);

            // Snackbar
            var el = document.querySelector('#snackbar');
            var snackbar = MDCSnackbar.attachTo(el);
            snackbar.labelText = "Could not add rating. Try creating a profile first.";
            snackbar.open();
        });
    });
};

Tutorbook.prototype.newRequest = function(request) {
    console.log("Adding new request...", request);
    // Calls helper function and shows snackbar
    var that = this;
    return this.addRequest(request).then((id) => {

        // Snackbar
        var el = document.querySelector('#undo-snackbar');
        var snackbar = MDCSnackbar.attachTo(el);
        snackbar.labelText = "Request sent to " + request.toUser.email + ".";
        el.querySelector('#undo-button').addEventListener('click', () => {
            return that.deleteRequest(id, request).then(() => {
                snackbar.close();
                // Snackbar
                var canceledSnackbarEl = document.querySelector('#snackbar');
                var canceledSnackbar = MDCSnackbar.attachTo(canceledSnackbarEl);
                canceledSnackbar.labelText = "Request to " + request.toUser.email + " canceled.";
                canceledSnackbar.open();
            });
        });
        snackbar.open();

    }).catch((error) => {
        console.error("Error writing request to inbox:", error);

        // Snackbar
        var el = document.querySelector('#snackbar');
        var snackbar = MDCSnackbar.attachTo(el);
        snackbar.labelText = "Could not add request. Try creating a profile first.";
        snackbar.open();
    });
};

Tutorbook.prototype.cancelEvent = function(options) {
    // Call helper function (cancelAppointment) and show snackbar
    console.log("Canceling event...", options);
    const id = options.id;
    const appt = options.event;
    const notify = options.snackbar || false;
    const message = options['snackbar-label'] || "Appointment for " + appt.for.subject + " canceled.";

    return this.cancelAppointment(appt, id).then((id) => {
        if (notify) {
            // Snackbar
            var el = document.querySelector('#snackbar');
            var snackbar = MDCSnackbar.attachTo(el);
            snackbar.labelText = message;
            snackbar.open();
        }
    });
};

Tutorbook.prototype.cancelRequest = function(options) {
    // Call helper function (cancelRequestOut) and show snackbar
    console.log("Canceling request...", options);
    const id = options.id;
    const request = options.request;
    const notify = options.snackbar || false;
    const message = options['snackbar-label'] || "Request to " + request.toUser.email + " canceled.";

    return this.cancelRequestOut(id, request).then((id) => {
        if (notify) {
            // Snackbar
            var el = document.querySelector('#snackbar');
            var snackbar = MDCSnackbar.attachTo(el);
            snackbar.labelText = message;
            snackbar.open();
        }
    });
};

Tutorbook.prototype.rejectRequest = function(options) {
    // Call helper function (rejectRequestIn) and show snackbar
    console.log("Rejecting request...", options);
    const id = options.id;
    const request = options.request;
    const notify = options.snackbar || false;
    const message = options['snackbar-label'] || "Request from " + request.fromUser.email + " rejected.";

    return this.rejectRequestIn(id, request).then((id) => {
        if (notify) {
            // Snackbar
            var el = document.querySelector('#snackbar');
            var snackbar = MDCSnackbar.attachTo(el);
            snackbar.labelText = message;
            snackbar.open();
        }
    }).catch((e) => {
        console.error("Error rejecting request:", e);

        if (notify === true) {
            // Snackbar
            var el = document.querySelector('#snackbar');
            var snackbar = MDCSnackbar.attachTo(el);
            snackbar.labelText = "Could not reject request. Try creating a profile first.";
            snackbar.open();
        }
    });
};

Tutorbook.prototype.approveRequest = function(options) {
    // Call helper function (approveRequestIn) and show snackbar
    console.log("Approving request...", options);
    const request = options.request;
    const id = options.id;
    const notify = options.snackbar || false;

    return this.approveRequestIn(request, id).then((id) => {
        if (notify === true) {
            // Snackbar
            var el = document.querySelector('#snackbar');
            var snackbar = MDCSnackbar.attachTo(el);
            snackbar.labelText = "Request from " + request.fromUser.email + " approved.";
            snackbar.open();
        }
    }).catch((e) => {
        console.error("Error approving request:", e);

        if (notify === true) {
            // Snackbar
            var el = document.querySelector('#snackbar');
            var snackbar = MDCSnackbar.attachTo(el);
            snackbar.labelText = "Could not approve request. Try creating a profile first.";
            snackbar.open();
        }
    });
};

Tutorbook.prototype.updateRequest = function(options) {
    // Call helper function (changeRequest) and show snackbar
    console.log("Updating request...", options);
    const id = options.id;
    const request = options.request;
    const notify = options.snackbar;

    return this.changeRequest(request, id).then((id) => {
        if (notify === true) {
            // Snackbar
            var el = document.querySelector('#snackbar');
            var snackbar = MDCSnackbar.attachTo(el);
            snackbar.labelText = "Request to " + request.toUser.email + " updated.";
            snackbar.open();
        }
    }).catch((e) => {
        console.error("Error updating request:", e);

        if (notify === true) {
            // Snackbar
            var el = document.querySelector('#snackbar');
            var snackbar = MDCSnackbar.attachTo(el);
            snackbar.labelText = "Could not update request. Try creating a profile first.";
            snackbar.open();
        }
    });
};

//====================================
// Tutorbook.View.Welcome.js
// ===================================

Tutorbook.prototype.viewWelcome = function() {
    // Show initial welcome and setup screens
    var mainData = {
        'show_google_popup': function() {
            // No user is signed in, start Google Pop-up
            // TODO: Start sign-in dialog/window if they are not signed in
            var provider = new firebase.auth.GoogleAuthProvider();
            firebase.auth().signInWithPopup(provider).then(function(result) {
                var token = result.credential.accessToken;
                var user = result.user;
                // TODO: Create user info Firestore Document here
            }).catch(function(error) {
                var errorCode = error.code;
                var errorMessage = error.message;
                var email = error.email;
                console.log(error);
            });
        },
        'info': function() {
            // Show about dialog
            var aboutEl = document.querySelector('#dialog-about');
            var aboutDialog = MDCDialog.attachTo(aboutEl);
            aboutDialog.open();
        },
    };
    var mainEl = this.renderTemplate('welcome-screen', mainData);

    // Material components
    mainEl.querySelectorAll('.mdc-button').forEach((el) => {
        MDCRipple.attachTo(el);
    });

    var pages = mainEl.querySelectorAll('.page');
    var displaySection = function(id) {
        pages.forEach(function(sel) {
            if (sel.id === id) {
                sel.style.display = 'inherit';
            } else {
                sel.style.display = 'none';
            }
        });
    };

    displaySection('page-login');

    // Display final views
    this.replaceElement(document.querySelector('main'), mainEl);
};

//=====================================
//Tutorbook.Notifications.js
//=====================================

Tutorbook.prototype.initNotifications = function() {
    function getPermission() {
        // TODO: Implement notification explanation view or dialog.
        messaging.requestPermission().then(function() {
            console.log('Notification permission granted.');
            // TODO(developer): Retrieve an Instance ID token for use with FCM.
            // ...
        }).catch(function(err) {
            console.log('Unable to get permission to notify.', err);
        });
    };

    function sendTokenToServer(token) {
        // Right now, tokens are stored in the currentUser's Firestore document
        var docRef = firebase.firestore().collection('users').doc(firebase.auth().currentUser.email);
        console.log("Setting token of " + docRef.id + " to be:", token);

        return docRef.get().then((doc) => {
            return doc.data().notificationTokens || [];
        }).then((oldTokens) => {
            return docRef.update({
                'notificationTokens': oldTokens.concat([token]),
            });
        });
    };

    function showToken(message, err) {
        console.error(message, err);
        console.log("currentToken:", messaging.getToken());
    };

    function updateUIForPushEnabled(token) {
        console.log("Push notifications are now enabled:", token);
    };

    const messaging = firebase.messaging();
    messaging.usePublicVapidKey("BIEVpGqO_n9HSS_sGWdfXoOUpv3dWwB5P2-zRkUBUZHOzvAvJ09nUL68hc5XpTjKZxb74_5DJlSs4oRdnJj8R4w");

    // Get Instance ID token. Initially this makes a network call, once retrieved
    // subsequent calls to getToken will return from cache.
    messaging.getToken().then(function(currentToken) {
        if (currentToken) {
            // Right now, tokens are stored in the currentUser's Firestore document
            sendTokenToServer(currentToken);
            updateUIForPushEnabled(currentToken);
        } else {
            // Show permission request.
            console.log('No Instance ID token available. Request permission to generate one.');
            // Show permission UI.
            getPermission();
        }
    }).catch(function(err) {
        console.log('An error occurred while retrieving token. ', err);
        showToken('Error retrieving Instance ID token. ', err);
    });


    // Callback fired if Instance ID token is updated.
    messaging.onTokenRefresh(function() {
        messaging.getToken().then(function(refreshedToken) {
            console.log('Token refreshed.');
            // Send Instance ID token to app server.
            // Right now, tokens are stored in the currentUser's Firestore document
            sendTokenToServer(refreshedToken);
            // ...
        }).catch(function(err) {
            console.log('Unable to retrieve refreshed token ', err);
            showToken('Unable to retrieve refreshed token ', err);
        });
    });

    messaging.onMessage(function(payload) {
        console.log('[bundle.min.js] Received message ', payload);

        self.addEventListener('notificationclick', function(e) {
            console.log('[bundle.min.js] Click detected, opening website ', e);
            var notification = e.notification;
            var primaryKey = notification.data.primaryKey;
            var action = e.action;

            if (action === 'view_request') {
                // TODO: Actually show individual request (i.e. make our router
                // recognize certain query links.)
                clients.openWindow('https://tutorbook-779d8.firebaseapp.com/dashboard');
                notification.close();
            } else if (action === 'reject_request') {
                // TODO: Make this work
                clients.openWindow('https://tutorbook-779d8.firebaseapp.com/dashboard');
                notification.close();
            } else {
                clients.openWindow('https://tutorbook-779d8.firebaseapp.com/dashboard');
                notification.close();
            }
        });

    });

};

// ======================================
// Tutorbook.Mock.js
// ======================================

Tutorbook.prototype.getGradeString = function(grade) {
    switch (grade) {
        case 9:
            return "Freshman";
            break;
        case 10:
            return "Sophomore";
            break;
        case 11:
            return "Junior";
            break;
        case 12:
            return "Senior";
            break;
        default:
            console.log("Invalid grade passed to getGradeString.");
            return "Freshman";
            break;
    }
};

/**
 * Adds a set of mock Users to the Cloud Firestore.
 */
Tutorbook.prototype.addMockUsers = function() {
    var promises = [];

    for (var i = 0; i < 20; i++) {
        var firstName = this.getRandomItem(this.data.firstNames);
        var lastName = this.getRandomItem(this.data.lastNames);
        var name = firstName + ' ' + lastName;
        var email = firstName + '.' + lastName + '@gmail.com';
        var grade = this.getRandomGrade();
        var phone = this.getRandomPhone();
        var gradeString = this.getGradeString(grade);
        var gender = this.getRandomItem(this.data.genders);
        var neededStudies = this.getRandomItem(this.data.subjects);
        var proficientStudies = this.getRandomItem(this.data.subjects);
        var photoID = Math.floor(Math.random() * 22) + 1;
        var photo = 'https://storage.googleapis.com/firestorequickstarts.appspot.com/food_' + photoID + '.png';
        var numRatings = 0;
        var avgRating = 0;

        var promise = this.addUser({
            email: email,
            phone: phone,
            gender: gender,
            grade: grade,
            gradeString: gradeString,
            name: name,
            neededStudies: neededStudies,
            proficientStudies: proficientStudies,
            numRatings: numRatings,
            avgRating: avgRating,
            photo: photo
        });

        if (!promise) {
            alert('addUser() is not implemented yet!');
            return Promise.reject();
        } else {
            promises.push(promise);
        }
    }

    return Promise.all(promises);
};

/**
 * Adds a set of mock Ratings to the given Restaurant.
 */
Tutorbook.prototype.addMockRatings = function(userID) {
    var ratingPromises = [];
    for (var r = 0; r < 5 * Math.random(); r++) {
        var rating = this.data.ratings[
            parseInt(this.data.ratings.length * Math.random())
        ];
        rating.userName = 'Bot';
        rating.userPhoto = 'https://cdn.mee6.xyz/assets/logo.png';
        rating.userEmail = 'web.bot@example.com';
        rating.timestamp = new Date();
        rating.userId = firebase.auth().currentUser.uid;
        ratingPromises.push(this.addRating(userID, rating));
    }
    return Promise.all(ratingPromises);
};

// ======================================
// Tutorbook.View.js
// ======================================

Tutorbook.prototype.initTemplates = function() {
    this.templates = {};

    var that = this;
    document.querySelectorAll('.template').forEach(function(el) {
        that.templates[el.getAttribute('id')] = el;
    });
};

Tutorbook.prototype.viewLoader = function() {
    this.initTemplates();

    var loaderEl = this.renderTemplate('loader');

    this.replaceElement(document.querySelector('main'), loaderEl);
};

Tutorbook.prototype.renderTemplate = function(id, data) {
    var template = this.templates[id];
    var el = template.cloneNode(true);
    el.removeAttribute('hidden');
    this.render(el, data);
    return el;
};

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
            if (!that.getDeepItem(data, field)) {
                tel.style.display = 'none';
            }
        },
        'data-fir-if-not': function(tel) {
            var field = tel.getAttribute('data-fir-if-not');
            if (that.getDeepItem(data, field)) {
                tel.style.display = 'none';
            }
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

Tutorbook.prototype.useModifier = function(el, selector, modifier) {
    el.querySelectorAll('[' + selector + ']').forEach(modifier);
};

Tutorbook.prototype.getDeepItem = function(obj, path) {
    path.split('/').forEach(function(chunk) {
        obj = obj[chunk];
    });
    return obj;
};

Tutorbook.prototype.renderRating = function(rating) {
    var el = this.renderTemplate('rating', {});
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

Tutorbook.prototype.replaceElement = function(parent, content) {
    parent.innerHTML = '';
    parent.append(content);
};

Tutorbook.prototype.rerender = function() {
    this.router.navigate(document.location.pathname + '?' + new Date().getTime());
};

// ======================================
// Tutorbook.View.Home.js
// ======================================

Tutorbook.prototype.viewAdminDashboard = function() {
    // TODO: Change the name of upcoming to appointments

    this.updateNavSelected('home');
    // TODO: Show cards for every appointment, request, and message between everyone on the app
    // Maybe filter by the user email domain (i.e. only emails @pausd.us or @pausd.org, not @gmail.com)
    var that = this;
    try {
        const headerEl = document.querySelector('.header #header-base');
        headerEl.querySelector('.mdc-top-app-bar__title').innerHTML = "Tutorbook";
        headerEl.querySelector('#section-header').innerHTML = '';
    } catch (e) {
        console.log("Could not find headerEl, re-initializing...", e);
        that.replaceElement(document.querySelector('.header'), that.headerBase);
        const headerEl = document.querySelector('.header #header-base');
        headerEl.querySelector('.mdc-top-app-bar__title').innerHTML = "Tutorbook";
        headerEl.querySelector('#section-header').innerHTML = '';
    }

    const mainEl = this.renderTemplate('dashboard-grid-view');

    this.replaceElement(document.querySelector('main'), mainEl);

    function cloneMap(map) {
        // Helper function to clone a map so we can modify the clone
        // without touching the original.
        var clone = {};
        for (var i in map) {
            clone[i] = map[i];
        }
        return clone;
    }

    this.renderers.adminDashboardRenderer = {
        remove: function(doc) {
            var locationCardToDelete = mainEl.querySelector('#doc-' + doc.id);
            if (locationCardToDelete) {
                mainEl.querySelector('#cards').removeChild(locationCardToDelete);
            }

            return;
        },
        display: function(doc, type) {
            var request = doc.data();
            var cardData = cloneMap(request);
            cardData['.id'] = doc.id;

            // TODO: Add canceledRequests and deletedUpcoming cards here too
            if (type === 'requestsOut') {
                console.log("Rendering pending request for admin dashboard...");
                // TODO: Maybe add these attributes when the
                // request is initiated the first time (i.e. write
                // them to the database)
                cardData['subtitle'] = 'From ' + request.fromUser.name + ' to ' + request.toUser.name;
                cardData['summary'] = request.fromUser.name + ' requested ' + request.toUser.name + ' as a ' + request.toUser.type + ' for ' + request.subject + '.';
                cardData['go_to_fromUser'] = function() {
                    that.showUser(request.fromUser.email);
                };
                cardData['go_to_toUser'] = function() {
                    that.showUser(request.toUser.email);
                };
                cardData['go_to_request'] = function() {
                    that.viewAdminRequestDialog({
                        'data': doc.data(),
                        'id': doc.id
                    });
                };
                cardData['cancel_request'] = function() {
                    var summary = "Cancel request from " + request.fromUser.name + " to " + request.toUser.name + " for " + request.subject + " at " + request.time.time + " on " + request.time.day + "s.";
                    const cancelDialogEl = document.querySelector('#dialog-confirm-request-cancel');
                    cancelDialogEl.querySelector('.mdc-dialog__content').innerText = summary;
                    const cancelDialog = MDCDialog.attachTo(cancelDialogEl);
                    cancelDialog.listen('MDCDialog:closing', (event) => {
                        if (event.detail.action == 'yes') {
                            that.cancelRequest({
                                'id': cardData['.id'],
                                'request': request,
                                'snackbar': true,
                            }).then((id) => {
                                that.rerender();
                            });
                        }
                    });
                    cancelDialog.open();

                };

                var card = that.renderTemplate('dashboard-admin-pending-request-card', cardData);
                card.querySelectorAll('.mdc-button, .mdc-card__primary-action, .mdc-icon-button').forEach((el) => {
                    MDCRipple.attachTo(el);
                });
            } else if (type === 'upcoming') {
                var event = doc.data();
                console.log("Rendering upcoming appointment for admin dashboard...");

                // TODO: Add upcoming card templates, etc.
                cardData['subtitle'] = "Between " + event.attendees[0].name + " and " + event.attendees[1].name;
                cardData['summary'] = event.attendees[0].name + " has tutoring sessions with " + event.attendees[1].name + " for " + event.for.subject + " on " + event.time.day + "s at " + event.time.time + ".";
                cardData['go_to_event'] = function() {
                    that.viewAdminRequestDialog({
                        'data': doc.data().for,
                        'id': doc.id,
                        'headerTitle': 'View Appointment',
                        'appt': true,
                    });
                };
                cardData['cancel_event'] = function() {
                    var summary = "Cancel tutoring sessions with " + event.attendees[0].name + " and " + event.attendees[1].name + " for " + event.for.subject + " at " + event.time.time + " on " + event.time.day + "s.";
                    const cancelDialogEl = document.querySelector('#dialog-confirm-appt-cancel');
                    cancelDialogEl.querySelector('.mdc-dialog__content').innerText = summary;
                    const cancelDialog = MDCDialog.attachTo(cancelDialogEl);
                    cancelDialog.listen('MDCDialog:closing', (action) => {
                        if (action.detail.action == 'yes') {
                            that.cancelEvent({
                                'id': doc.id,
                                'event': event,
                                'snackbar': true,
                                'snackbar-label': "Event with " + withUser.name + " for " + event.for.subject + " canceled.",
                            }).then(() => {
                                that.rerender();
                            }).catch((err) => {
                                console.error("Error while canceling event " + id + ":", err);
                                if (notify) {
                                    // Snackbar
                                    var el = document.querySelector('#snackbar');
                                    var snackbar = MDCSnackbar.attachTo(el);
                                    snackbar.labelText = "Could not cancel appointment.";
                                    snackbar.open();
                                }
                            });
                        }
                    });
                    cancelDialog.open();

                };

                var card = that.renderTemplate('dashboard-admin-upcoming-card', cardData);
                card.querySelectorAll('.mdc-button, .mdc-card__primary-action, .mdc-icon-button').forEach((el) => {
                    MDCRipple.attachTo(el);
                });
            } else {
                console.error("Invalid type passed to dashboardRenderer:", type);
            }


            // Setting the id allows to locating the individual user card
            card.setAttribute('id', 'doc-' + doc.id);
            card.setAttribute('timestamp', doc.data().timestamp);

            var mainListEl = mainEl.querySelector('#cards');
            // Add final render of card to the mainEl in order by timestamp
            // (By rendering all card types with the same renderer, we are able to 
            // sort all card types by timestamp)
            try {
                var existingCard = mainListEl.querySelector('#doc-' + doc.id);
            } catch (e) {
                // add
                console.warn('Caught ' + e + ' while querying for #doc-' + doc.id + ', adding card.');
                for (var i = 0; i < mainListEl.children.length; i++) {
                    var child = mainListEl.children[i];
                    var time = child.getAttribute('timestamp');
                    // If there is a request that was sent later (more recently)
                    // Then this request will appear right before that request
                    if (time && time > doc.data().timestamp) {
                        break;
                    }
                }
                mainListEl.insertBefore(card, child);
                /*
                 *mainEl.querySelector('#cards').append(el);
                 */
            }
            if (existingCard) {
                // modify
                existingCard.before(card);
                mainListEl.removeChild(existingCard);
            } else {
                // add
                for (var i = 0; i < mainListEl.children.length; i++) {
                    var child = mainListEl.children[i];
                    var time = child.getAttribute('timestamp');
                    // If there is a request that was sent later (more recently)
                    // Then this request will appear right before that request
                    if (time && time > doc.data().timestamp) {
                        break;
                    }
                }
                mainListEl.insertBefore(card, child);
                /*
                 *mainEl.querySelector('#cards').append(el);
                 */
            }

            // enable MDCRipple animations on click

        },
        empty: function(type) {
            // TODO: Make this render a unique "no upcoming" el like GMail does
        }
    };

    var id = firebase.auth().currentUser.email; // TODO: Actually use the uid
    // (By rendering all card types with the same renderer, we are able to 
    // sort all card types by timestamp)
    this.getAdminDashboardData();
};

Tutorbook.prototype.isAdminUser = function() {
    const adminUserEmails = ['lcollart@pausd.org', 'psteward@pausd.org'];

    console.log("Checking if user " + firebase.auth().currentUser.email + " is an admin:", adminUserEmails);
    return !(adminUserEmails.indexOf(firebase.auth().currentUser.email) < 0);
};

Tutorbook.prototype.viewDashboard = function() {
    // TODO: Implement modifiedAppointments, canceledAppointments, modifiedRequestsOut,
    // modifiedRequestsIn, and rejectedReqestsOut cards. (Also, change the name
    // of upcoming to appointments)

    if (this.isAdminUser()) {
        console.log("Admin user " + firebase.auth().currentUser.email + " detected. Showing admin home screen...");
        return this.viewAdminDashboard();
    }
    this.updateNavSelected('home');
    // TODO: Do we really want this type of top nav?
    try {
        const headerEl = document.querySelector('.header #header-base');
        headerEl.querySelector('.mdc-top-app-bar__title').innerHTML = "Tutorbook";
        headerEl.querySelector('#section-header').innerHTML = '';
    } catch (e) {
        console.log("Could not find headerEl, re-initializing...", e);
        this.replaceElement(document.querySelector('.header'), this.headerBase);
        const headerEl = document.querySelector('.header #header-base');
        headerEl.querySelector('.mdc-top-app-bar__title').innerHTML = "Tutorbook";
        headerEl.querySelector('#section-header').innerHTML = '';
    }

    const mainEl = this.renderTemplate('dashboard-grid-view');

    this.replaceElement(document.querySelector('main'), mainEl);

    if (this.currentUser.showWelcome === true) {
        console.log("Showing welcome for:", this.currentUser);
        var welcomeData = {
            'go_to_about': () => {
                var aboutEl = document.querySelector('#dialog-about');
                var aboutDialog = MDCDialog.attachTo(aboutEl);
                aboutDialog.open();
            },
            'dismiss': () => {
                var locationCard = mainEl.querySelector('#dashboard-welcome-card');
                mainEl.querySelector('#cards').removeChild(locationCard);
                this.currentUser.showWelcome = false;
                this.updateUser(this.currentUser);
            },
            'go_to_help': () => {
                console.log("TODO: Implement help view.");
            },
        };

        var card = this.renderTemplate('dashboard-welcome-card', welcomeData);
        card.setAttribute('timestamp', new Date());
        card.querySelectorAll('.mdc-button, .mdc-card__primary-action, .mdc-icon-button').forEach((el) => {
            MDCRipple.attachTo(el);
        });
        mainEl.querySelector('#cards').append(card);
    }

    function cloneMap(map) {
        // Helper function to clone a map so we can modify the clone
        // without touching the original.
        var clone = {};
        for (var i in map) {
            clone[i] = map[i];
        }
        return clone;
    }

    var that = this;
    this.renderers.dashboardRenderer = {
        remove: function(doc) {
            var locationCardToDelete = mainEl.querySelector('#doc-' + doc.id);
            if (locationCardToDelete) {
                mainEl.querySelector('#cards').removeChild(locationCardToDelete);
            }

            return;
        },
        display: function(doc, type) {
            var request = doc.data();
            var cardData = cloneMap(request);
            cardData['.id'] = doc.id;

            // TODO: Add canceledRequests and deletedUpcoming cards here too
            if (type === 'requestsIn') {
                // TODO: Maybe add these attributes when the
                // request is initiated the first time (i.e. write
                // them to the database)
                cardData['subtitle'] = 'From ' + request.fromUser.name;
                cardData['summary'] = request.fromUser.name + ' requested you as a ' + request.toUser.type + ' for ' + request.subject + '.';
                cardData['go_to_user'] = function() {
                    that.showUser(request.fromUser.email);
                };
                cardData['go_to_request'] = function() {
                    that.viewViewRequestDialog({
                        'data': doc.data(),
                        'id': doc.id
                    });
                };
                cardData['reject_request'] = function() {
                    var summary = "Reject request from " + request.fromUser.name + " for " + request.subject + " at " + request.time.time + " on " + request.time.day + "s.";
                    const rejectDialogEl = document.querySelector('#dialog-confirm-request-reject');
                    rejectDialogEl.querySelector('.mdc-dialog__content').innerText = summary;
                    const rejectDialog = MDCDialog.attachTo(rejectDialogEl);
                    rejectDialog.listen('MDCDialog:closing', (event) => {
                        if (event.detail.action == 'yes') {
                            that.rejectRequest({
                                'id': cardData['.id'],
                                'request': request,
                                'snackbar': true,
                            }).then(() => {
                                that.rerender();
                            });
                        }
                    });
                    rejectDialog.open();

                };

                var card = that.renderTemplate('dashboard-request-in-card', cardData);
                card.querySelectorAll('.mdc-button, .mdc-card__primary-action, .mdc-icon-button').forEach((el) => {
                    MDCRipple.attachTo(el);
                });
            } else if (type === 'requestsOut') {
                // TODO: Maybe add these attributes when the
                // request is initiated the first time (i.e. write
                // them to the database)
                cardData['subtitle'] = 'To ' + request.toUser.name;
                cardData['summary'] = 'You requested ' + request.toUser.name + ' as a ' + request.toUser.type + ' for ' + request.subject + '.';
                cardData['go_to_user'] = function() {
                    that.showUser(request.toUser.email);
                };
                cardData['go_to_request'] = function() {
                    that.viewViewRequestDialog({
                        'data': doc.data(),
                        'id': doc.id
                    });
                };
                cardData['edit_request'] = function() {
                    that.currentRequest = request;
                    that.getUser(request.toUser.email).then((doc) => {
                        // Get user data and set currentRequest to match the selected request parameters
                        var user = doc.data();
                        if (user.type == 'Tutor') {
                            user.subjects = user.proficientStudies;
                        } else {
                            user.subjects = user.neededStudies;
                        }
                        var title = "Edit Request";
                        var update_request = function() {
                            console.log("Updating user request...", that.currentRequest);

                            // Get the current message
                            const messageTextField = document.querySelector('main #message-text-field textarea');
                            that.currentRequest.message = messageTextField.value;

                            // Update the request doc in question
                            that.updateRequest({
                                'id': cardData['.id'],
                                'request': {
                                    subject: that.currentRequest.subject,
                                    message: that.currentRequest.message,
                                    location: that.currentRequest.location,
                                    time: that.currentRequest.time,
                                    toUser: that.currentRequest.toUser,
                                    fromUser: {
                                        name: firebase.auth().currentUser.displayName,
                                        email: firebase.auth().currentUser.email,
                                        type: that.currentUser.type,
                                        photo: firebase.auth().currentUser.photoURL,
                                    },
                                    timestamp: new Date(),
                                },
                                'snackbar': true,
                            });
                            // And, clear the currentRequest.
                            that.currentRequest = {
                                subject: '',
                                time: {},
                                message: '',
                                location: '',
                                timestamp: new Date(),
                                toUser: {},
                                fromUser: {},
                            };

                            return that.rerender();
                        };
                        that.viewRequestDialog({
                            'title': title,
                            'userData': user,
                            'displayUser': user,
                            'onSubmit': update_request
                        });
                    }).catch((e) => {
                        console.error("Error while showing edit request dialog:", e);
                    });
                };
                cardData['cancel_request'] = function() {
                    var summary = "Cancel request to " + request.toUser.name + " for " + request.subject + " at " + request.time.time + " on " + request.time.day + "s.";
                    const cancelDialogEl = document.querySelector('#dialog-confirm-request-cancel');
                    cancelDialogEl.querySelector('.mdc-dialog__content').innerText = summary;
                    const cancelDialog = MDCDialog.attachTo(cancelDialogEl);
                    cancelDialog.listen('MDCDialog:closing', (event) => {
                        if (event.detail.action == 'yes') {
                            that.cancelRequest({
                                'id': cardData['.id'],
                                'request': request,
                                'snackbar': true,
                            }).then((id) => {
                                that.rerender();
                            });
                        }
                    });
                    cancelDialog.open();

                };

                var card = that.renderTemplate('dashboard-request-out-card', cardData);
                card.querySelectorAll('.mdc-button, .mdc-card__primary-action, .mdc-icon-button').forEach((el) => {
                    MDCRipple.attachTo(el);
                });
            } else if (type === 'upcoming') {
                var event = doc.data();
                if (event.attendees[0].email == firebase.auth().currentUser.email) {
                    var withUser = event.attendees[1];
                } else {
                    var withUser = event.attendees[0];
                }

                // TODO: Add upcoming card templates, etc.
                console.log("TODO: Implement upcoming cards in dashboard.");
                cardData['subtitle'] = "With " + withUser.name;
                cardData['summary'] = "You have tutoring sessions with " + withUser.name + " for " + event.for.subject + " on " + event.time.day + "s at " + event.time.time + ".";
                cardData['go_to_event'] = function() {
                    that.viewViewRequestDialog({
                        'data': doc.data().for,
                        'id': doc.id,
                        'headerTitle': 'View Appointment',
                        'appt': true,
                    });
                };
                cardData['cancel_event'] = function() {
                    var summary = "Cancel sessions with " + withUser.name + " for " + event.for.subject + " at " + event.time.time + " on " + event.time.day + "s.";
                    const cancelDialogEl = document.querySelector('#dialog-confirm-appt-cancel');
                    cancelDialogEl.querySelector('.mdc-dialog__content').innerText = summary;
                    const cancelDialog = MDCDialog.attachTo(cancelDialogEl);
                    cancelDialog.listen('MDCDialog:closing', (action) => {
                        if (action.detail.action == 'yes') {
                            that.cancelEvent({
                                'id': doc.id,
                                'event': event,
                                'snackbar': true,
                                'snackbar-label': "Event with " + withUser.name + " for " + event.for.subject + " canceled.",
                            }).then(() => {
                                that.rerender();
                            }).catch((err) => {
                                console.error("Error while canceling event " + id + ":", err);
                                if (notify) {
                                    // Snackbar
                                    var el = document.querySelector('#snackbar');
                                    var snackbar = MDCSnackbar.attachTo(el);
                                    snackbar.labelText = "Could not cancel appointment.";
                                    snackbar.open();
                                }
                            });
                        }
                    });
                    cancelDialog.open();

                };

                var card = that.renderTemplate('dashboard-upcoming-card', cardData);
                card.querySelectorAll('.mdc-button, .mdc-card__primary-action, .mdc-icon-button').forEach((el) => {
                    MDCRipple.attachTo(el);
                });

            } else {
                console.error("Invalid type passed to dashboardRenderer:", type);
            }


            // Setting the id allows to locating the individual user card
            card.setAttribute('id', 'doc-' + doc.id);
            card.setAttribute('timestamp', doc.data().timestamp);

            var mainListEl = mainEl.querySelector('#cards');
            // Add final render of card to the mainEl in order by timestamp
            // (By rendering all card types with the same renderer, we are able to 
            // sort all card types by timestamp)
            try {
                var existingCard = mainListEl.querySelector('#doc-' + doc.id);
            } catch (e) {
                // add
                console.warn('Caught ' + e + ' while querying for #doc-' + doc.id + ', adding card.');
                for (var i = 0; i < mainListEl.children.length; i++) {
                    var child = mainListEl.children[i];
                    var time = child.getAttribute('timestamp');
                    // If there is a request that was sent later (more recently)
                    // Then this request will appear right before that request
                    if (time && time > doc.data().timestamp) {
                        break;
                    }
                }
                mainListEl.insertBefore(card, child);
                /*
                 *mainEl.querySelector('#cards').append(el);
                 */
            }
            if (existingCard) {
                // modify
                existingCard.before(card);
                mainListEl.removeChild(existingCard);
            } else {
                // add
                for (var i = 0; i < mainListEl.children.length; i++) {
                    var child = mainListEl.children[i];
                    var time = child.getAttribute('timestamp');
                    // If there is a request that was sent later (more recently)
                    // Then this request will appear right before that request
                    if (time && time > doc.data().timestamp) {
                        break;
                    }
                }
                mainListEl.insertBefore(card, child);
                /*
                 *mainEl.querySelector('#cards').append(el);
                 */
            }

            // enable MDCRipple animations on click

        },
        empty: function(type) {
            // TODO: Make this render a unique "no upcoming" el like GMail does
            if (type == 'requestsIn') {
                var noRequestsIn = true;
            } else if (type == 'requestsOut') {
                var noRequestsOut = true;
            } else if (type == 'upcoming') {
                var noUpcoming = true;
            } else {
                console.warn("Invalid type passed to dashboardRenderer empty:", type);
            }
            // Only show empty screen when all card types show up empty
            if (noRequestsIn && noRequestsOut && noUpcoming && !that.currentUser.showWelcome) {
                var noResultsEl = that.renderTemplate('no-results');
                that.replaceElement(document.querySelector('main'), noResultsEl);
                return;
            }
        }
    };

    var id = firebase.auth().currentUser.email; // TODO: Actually use the uid
    // (By rendering all card types with the same renderer, we are able to 
    // sort all card types by timestamp)
    this.getDashboardData(id);
};

// ======================================
// Tutorbook.View.Settings.js
// ======================================

Tutorbook.prototype.viewSettings = function() {
    this.updateNavSelected('settings');
    try {
        var headerEl = document.querySelector('.header');
        headerEl.querySelector('.mdc-top-app-bar__title').innerHTML = "Settings";
        headerEl.querySelector('#section-header').innerHTML = '';
    } catch (e) {
        this.replaceElement(document.querySelector('.header'), this.headerBase);
        var headerEl = document.querySelector('.header');
        headerEl.querySelector('.mdc-top-app-bar__title').innerHTML = "Settings";
        headerEl.querySelector('#section-header').innerHTML = '';
    }
    // TODO: Sync user settings with Firestore and show current preferences here:
    var settingsData = {
        'preferred-contact-method': this.currentUser.preferredContactMethod,
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
            console.log("TODO: Implement connect Google Calendar dialog.");
        },
        'manage_accounts': () => {
            console.log("TODO: Implement manage accounts dialog.");
        },
        'manage_visibility': () => {
            console.log("TODO: Implement manage visibility dialog.");
        },
    };
    var mainEl = this.renderTemplate('settings-view', settingsData);

    this.replaceElement(document.querySelector('main'), mainEl);

    // Add event listeners to MDCListItems and their corresponding for fields
    var el = mainEl.querySelector('#max-message .mdc-switch');
    const maxMessageSwitch = MDCSwitch.attachTo(el);
    if (this.currentUser.maxMessageLength === true) {
        maxMessageSwitch.checked = true;
    }
    maxMessageSwitch.listen('change', () => {
        this.currentUser.maxMessageLength = maxMessageSwitch.checked;
        this.updateUser(this.currentUser);
    });
    // TODO: Actually max out messages

    var el = mainEl.querySelector('#auto-response .mdc-switch');
    const autoResponseSwitch = MDCSwitch.attachTo(el);
    if (this.currentUser.autoResponse === true) {
        autoResponseSwitch.checked = true;
    }
    autoResponseSwitch.listen('change', () => {
        this.currentUser.autoResponse = autoResponseSwitch.checked;
        this.updateUser(this.currentUser);
    });
    // TODO: Actually respond to requests that have expired

    var el = mainEl.querySelector('#show-description .mdc-switch');
    const showDescriptionSwitch = MDCSwitch.attachTo(el);
    if (this.currentUser.showDescription === true) {
        showDescriptionSwitch.checked = true;
    }
    showDescriptionSwitch.listen('change', () => {
        this.currentUser.showDescription = showDescriptionSwitch.checked;
        this.updateUser(this.currentUser);
    });

    var el = mainEl.querySelector('#show-gender .mdc-switch');
    const showGenderSwitch = MDCSwitch.attachTo(el);
    if (this.currentUser.showGender === true) {
        showGenderSwitch.checked = true;
    }
    showGenderSwitch.listen('change', () => {
        this.currentUser.showGender = showGenderSwitch.checked;
        this.updateUser(this.currentUser);
    });

    var el = mainEl.querySelector('#show-phone .mdc-switch');
    const showPhoneSwitch = MDCSwitch.attachTo(el);
    if (this.currentUser.showPhone === true) {
        showPhoneSwitch.checked = true;
    }
    showPhoneSwitch.listen('change', () => {
        this.currentUser.showPhone = showPhoneSwitch.checked;
        this.updateUser(this.currentUser);
    });

    mainEl.querySelectorAll('.mdc-icon-button i').forEach((el) => {
        MDCRipple.attachTo(el);
    });

};

// ======================================
// Tutorbook.View.Profile.js
// ======================================

Tutorbook.prototype.viewProfile = function() {
    var that = this;

    try {
        const headerEl = document.querySelector('.header #header-base');
        headerEl.querySelector('#section-header').innerHTML = '';
        headerEl.querySelector('.mdc-top-app-bar__title').innerHTML = "Profile";
        headerEl.querySelectorAll('.material-icons').forEach((el) => {
            el.addEventListener('click', () => {
                console.log("Updating user bio and phone...");
                // Update text-field inputs
                var textField = document.querySelector('main #bio-text-field input');
                this.currentUser.bio = textField.value;

                var textField = document.querySelector('main #phone-text-field input');
                this.currentUser.phone = textField.value;
                this.updateUser(this.currentUser)
                    .catch(function(error) {
                        console.warn("Document for currentUser" + that.currentUser.email + " doesn't exist yet, creating one...");
                        that.addUser(that.currentUser)
                            .catch(function(error) {
                                console.error("Unable to create currentUser profileViewEl for " + currentUser + ":", error);
                            });
                    });
            });
        });
    } catch (e) {
        console.log("Could not find headerEl, re-initializing...", e);
        this.replaceElement(document.querySelector('.header'), this.headerBase);
        const headerEl = document.querySelector('.header #header-base');
        headerEl.querySelector('.mdc-top-app-bar__title').innerHTML = "Profile";
        headerEl.querySelector('#section-header').innerHTML = '';
        headerEl.querySelectorAll('.material-icons').forEach((el) => {
            el.addEventListener('click', () => {
                console.log("Updating user bio and phone...");
                // Update text-field inputs
                var textField = document.querySelector('main #bio-text-field input');
                this.currentUser.bio = textField.value;

                var textField = document.querySelector('main #phone-text-field input');
                this.currentUser.phone = textField.value;
                this.updateUser(this.currentUser)
                    .catch(function(error) {
                        console.warn("Document for currentUser" + that.currentUser.email + " doesn't exist yet, creating one...");
                        that.addUser(that.currentUser)
                            .catch(function(error) {
                                console.error("Unable to create currentUser profileViewEl for " + currentUser + ":", error);
                            });
                    });
            });
        });
    }

    function updateUserSubjects() {
        if (that.currentUser.type == 'Tutor') {
            var studies = 'proficientStudies';
        } else {
            var studies = 'neededStudies';
        }

        // Look for all available subject selectors and update currentUser to match
        that.currentUser[studies] = [];
        that.clearStudies(studies).then(() => {
            profileViewEl.querySelectorAll('#subject-select input').forEach((el) => {
                if (el.value != '') {
                    that.currentUser[studies].push(el.value);
                    console.log("Adding study to " + studies + " with name " + el.value);
                    that.addStudy({
                            'name': el.value,
                            'teacher': '',
                        }, studies)
                        .catch(function(error) {
                            console.error("Unable to add subject doc for " + currentUser + ":", error);
                        });
                }
            });
            that.currentUser.allStudies = that.currentUser.proficientStudies.concat(that.currentUser.neededStudies);

            // TODO: Have subjects reference a database of teachers, etc.
            that.updateUser(that.currentUser);

            if (that.currentUser.type == 'Tutor') {
                snackbar.labelText = "Proficient subjects updated.";
            } else {
                snackbar.labelText = "Needed subjects updated.";
            }
            snackbar.open();
        });
    };

    // Listen for changes in data and update profile accordingly
    var addMaterialListeners = function(profileViewEl) {
        // Snackbar
        var el = profileViewEl.querySelector('.mdc-snackbar');
        var snackbar = MDCSnackbar.attachTo(el);
        snackbar.timeoutMs = 4000;

        // User Type Select
        var el = profileViewEl.querySelector('#type-select');
        var typeSelect = MDCSelect.attachTo(el);
        if (!!that.currentUser.type && that.currentUser.type != '') {
            console.log("Updating type select", that.currentUser.type);
            var index = that.data.types.indexOf(that.currentUser.type);
            typeSelect.selectedIndex = index;
        }
        typeSelect.listen('MDCSelect:change', function() {
            console.log("Updating currentUser for type...");
            that.currentUser.type = typeSelect.value;
            that.updateUser(that.currentUser)
                .catch(function(error) {
                    console.warn("Document for currentUser" + that.currentUser.email + " doesn't exist yet, creating one...");
                    that.addUser(that.currentUser)
                        .catch(function(error) {
                            console.error("Unable to create currentUser profileViewEl for " + currentUser + ":", error);
                        });
                });
            snackbar.labelText = "Type updated to " + typeSelect.value.toLowerCase() + ".";
            snackbar.open();
        });

        // Gender Select
        var el = profileViewEl.querySelector('#gender-select');
        var genderSelect = MDCSelect.attachTo(el);
        if (!!that.currentUser.gender && that.currentUser.gender != '') {
            console.log("Updating gender select", that.currentUser.gender);
            var index = that.data.genders.indexOf(that.currentUser.gender);
            genderSelect.selectedIndex = index;
        }
        genderSelect.listen('MDCSelect:change', function() {
            var id = genderSelect.root_.getAttribute('id');
            console.log("Updating currentUser for", id);
            that.currentUser[id.split('-')[0]] = genderSelect.value;
            that.updateUser(that.currentUser)
                .catch(function(error) {
                    console.warn("Document for currentUser" + that.currentUser.email + " doesn't exist yet, creating one...");
                    that.addUser(that.currentUser)
                        .catch(function(error) {
                            console.error("Unable to create currentUser profileViewEl for " + currentUser + ":", error);
                        });
                });
            snackbar.labelText = "Gender updated to " + genderSelect.value.toLowerCase() + ".";
            snackbar.open();
        });

        // Grade Select
        var el = profileViewEl.querySelector('#gradeString-select');
        var gradeSelect = MDCSelect.attachTo(el);
        if (!!that.currentUser.gradeString && that.currentUser.gradeString != '') {
            console.log("Updating gradeString select", that.currentUser.gradeString);
            var index = that.data.grades.indexOf(that.currentUser.gradeString);
            gradeSelect.selectedIndex = index;
        }
        gradeSelect.listen('MDCSelect:change', function() {
            var id = gradeSelect.root_.getAttribute('id');
            console.log("Updating currentUser for", id);
            that.currentUser[id.split('-')[0]] = gradeSelect.value;
            that.updateUser(that.currentUser)
                .catch(function(error) {
                    console.warn("Document for currentUser" + that.currentUser.email + " doesn't exist yet, creating one...");
                    that.addUser(that.currentUser)
                        .catch(function(error) {
                            console.error("Unable to create currentUser profileViewEl for " + currentUser + ":", error);
                        });
                });
            snackbar.labelText = "Grade updated to " + gradeSelect.value.toLowerCase() + ".";
            snackbar.open();
        });

        // Time Select(s)
        var els = profileViewEl.querySelectorAll('.available-select');
        var index = -1;
        els.forEach(function(el) {
            index += 1;
            var timeSelect = MDCSelect.attachTo(el.querySelector('#time-select'));
            const daySelect = MDCSelect.attachTo(el.querySelector('#day-select'));

            if (!!that.currentUser['availableTimes'] && that.currentUser['availableTimes'] != [] && !!that.currentUser['availableTimes'][index]) {
                console.log("Detected currentUser data, updating select set #" + index + " for time...", that.currentUser);
                var selectedIndex = that.data.days.indexOf(that.currentUser['availableTimes'][index].day);
                daySelect.selectedIndex = selectedIndex;

                // Replace time select el to match the day selected
                var newTimeSelectEl = that.renderTemplate('option-select', {
                    items: that.data.times[daySelect.value],
                    labelText: 'Time',
                });

                newTimeSelectEl.setAttribute('id', 'time-select');
                newTimeSelectEl.setAttribute('class', 'profile-input-item set-width');
                newTimeSelectEl.querySelector('.mdc-select').setAttribute('class', 'mdc-select mdc-select--outlined set-width');
                newTimeSelectEl.querySelector('.mdc-select').setAttribute('style', 'width: 100% !important;');

                // Right now, replace element still leaves the parent node's classes, which we don't want
                var oldTimeSelectEl = el.querySelector('#time-select');
                el.removeChild(oldTimeSelectEl);
                el.append(newTimeSelectEl);

                var timeSelect = MDCSelect.attachTo(el.querySelector('#time-select .mdc-select'));
                var selectedIndex = that.data.times[daySelect.value].indexOf(that.currentUser['availableTimes'][index].time);
                timeSelect.selectedIndex = selectedIndex;
            }

            daySelect.listen('MDCSelect:change', function() {
                console.log("Detected change in daySelect, updating currentUser...", that.currentUser);

                // Replace time select el to match the day selected
                var newTimeSelectEl = that.renderTemplate('option-select', {
                    items: that.data.times[daySelect.value],
                    labelText: 'Time',
                });

                newTimeSelectEl.setAttribute('id', 'time-select');
                newTimeSelectEl.setAttribute('class', 'profile-input-item set-width');
                newTimeSelectEl.querySelector('.mdc-select').setAttribute('class', 'mdc-select mdc-select--outlined set-width');
                newTimeSelectEl.querySelector('.mdc-select').setAttribute('style', 'width: 100% !important;');

                // If there is only one time for a given day, set it as the pre-selected time
                if (that.data.times[daySelect.value].length == 1) {
                    newTimeSelectEl.querySelector('.mdc-list-item').setAttribute('class', 'mdc-list-item mdc-list-item--selected');
                    newTimeSelectEl.querySelector('.mdc-list-item').setAttribute('aria-selected', 'true');
                }

                // Right now, replace element still leaves the parent node's classes, which we don't want
                var oldTimeSelectEl = el.querySelector('#time-select');
                el.removeChild(oldTimeSelectEl);
                el.append(newTimeSelectEl);
                var timeSelect = MDCSelect.attachTo(el.querySelector('#time-select .mdc-select'));

                // Re-init timeSelect listener for new time select
                timeSelect.listen('MDCSelect:change', function() {
                    console.log("Detected change in timeSelect, updating currentUser for time...");
                    if (daySelect.value == '') {
                        console.warn("Must enter valid day, not updating currentUser profile.");
                        daySelect.valid = false;
                        daySelect.required = true;
                        return;
                    }

                    // Look for all available selectors and update currentUser to match
                    that.currentUser.availableTimes = [];
                    profileViewEl.querySelectorAll('.available-select').forEach((el) => {
                        var dayEl = el.querySelector('#day-select input');
                        var timeEl = el.querySelector('#time-select input');
                        console.log("Adding available time for " + dayEl.value + " " + timeEl.value, el);

                        if (dayEl.value != '' && timeEl.value != '') {
                            that.currentUser.availableTimes.push({
                                day: dayEl.value,
                                time: timeEl.value
                            });
                        }
                    });

                    that.updateUser(that.currentUser);

                    snackbar.labelText = "Available times updated.";
                    snackbar.open();
                });

                if (timeSelect.value == '') {
                    console.warn("Must enter valid time, not updating currentUser profile.");
                    timeSelect.valid = false;
                    timeSelect.required = true;
                    return;
                }

                // Look for all available selectors and update currentUser to match
                that.currentUser.availableTimes = [];
                profileViewEl.querySelectorAll('.available-select').forEach((el) => {
                    var dayEl = el.querySelector('#day-select input');
                    var timeEl = el.querySelector('#time-select input');
                    console.log("Adding available time for " + dayEl.value + " " + timeEl.value, el);

                    if (dayEl.value != '' && timeEl.value != '') {
                        that.currentUser.availableTimes.push({
                            day: dayEl.value,
                            time: timeEl.value
                        });
                    }
                });

                that.updateUser(that.currentUser);

                snackbar.labelText = "Available times updated.";
                snackbar.open();

            });
        });


        // Subject Select(s)
        // TODO: Open subject select dialog for teacher select accessibility
        var els = profileViewEl.querySelectorAll('#subject-select');
        var index = -1;
        els.forEach(function(el) {
            index += 1;
            var subjectSelect = MDCSelect.attachTo(el);
            if (that.currentUser.type == 'Tutor') {
                var studies = 'proficientStudies';
            } else {
                var studies = 'neededStudies';
            }
            if (!!that.currentUser[studies] && that.currentUser[studies] != []) {
                var selectedIndex = that.data.subjects.indexOf(that.currentUser[studies][index]);
                subjectSelect.selectedIndex = selectedIndex;
            }

            // TODO: Remove stub
            /*
             *el.addEventListener('click', () => {
             *    that.currentSubjectSelectData = {
             *        subject: subjectSelect.value,
             *        teacher: '',
             *        year: '',
             *    };
             *    that.dialogs.subjectSelect.open();
             *});
             */

            subjectSelect.listen('MDCSelect:change', function() {
                updateUserSubjects();
            });

        });

        // Location Select(s)
        var els = profileViewEl.querySelectorAll('#location-select');
        var index = -1;
        els.forEach(function(el) {
            index += 1;
            var locationSelect = MDCSelect.attachTo(el);
            if (!!that.currentUser.availableLocations && that.currentUser.availableLocations != []) {
                var selectedIndex = that.data.locations.indexOf(that.currentUser.availableLocations[index]);
                locationSelect.selectedIndex = selectedIndex;
            }

            locationSelect.listen('MDCSelect:change', function() {
                // Look for all available location selectors and update currentUser to match
                that.currentUser.availableLocations = [];
                profileViewEl.querySelectorAll('#location-select input').forEach((el) => {
                    if (el.value != '') {
                        that.currentUser.availableLocations.push(el.value);
                    }
                });
                that.updateUser(that.currentUser);

                snackbar.labelText = "Available locations updated.";
                snackbar.open();
            });
        });

        // Bio Text-Field
        var el = profileViewEl.querySelector('#bio-text-field');
        const bioTextField = MDCTextField.attachTo(el);
        if (!!that.currentUser.bio && that.currentUser.bio != '') {
            console.log("Updating bio text-field", that.currentUser.bio);
            bioTextField.value = that.currentUser.bio;
        }

        // Email Text-Field
        var el = profileViewEl.querySelector('#email-text-field');
        const emailTextField = MDCTextField.attachTo(el);
        // TODO: Do we want to allow the user to change the email that others see?
        el.querySelector('input').setAttribute('disabled', 'true');
        if (!!that.currentUser.email && that.currentUser.email != '') {
            console.log("Updating email text-field", that.currentUser.email);
            emailTextField.value = that.currentUser.email;
        }

        // Phone Text-Field
        var el = profileViewEl.querySelector('#phone-text-field');
        const phoneTextField = MDCTextField.attachTo(el);
        if (!!that.currentUser.phone && that.currentUser.phone != '') {
            console.log("Updating phone text-field", that.currentUser.phone);
            phoneTextField.value = that.currentUser.phone;
        }
    };

    var profileData = {
        name: firebase.auth().currentUser.displayName,
        photo: firebase.auth().currentUser.photoURL,
        email: firebase.auth().currentUser.email,
        types: this.data.types,
        grades: this.data.grades,
        subjects: this.data.subjects,
        locations: this.data.locations,
        // TODO: Do we even want this at all?
        times: this.data.times['Monday'],
        days: this.data.days,
        genders: this.data.genders,
        // Functions for floating button menu
        add_subject_field: () => {
            that.currentUser.numSubjectSelects++;
            that.updateUser(that.currentUser);
            that.rerender();
        },
        add_time_field: () => {
            that.currentUser.numTimeSelects++;
            that.updateUser(that.currentUser);
            that.rerender();
        },
        add_location_field: () => {
            that.currentUser.numLocationSelects++;
            that.updateUser(that.currentUser);
            that.rerender();
        },
        remove_subject_field: () => {
            that.currentUser.numSubjectSelects--;
            that.updateUser(that.currentUser);
            that.rerender();
            updateUserSubjects();
        },
        remove_time_field: () => {
            that.currentUser.numTimeSelects--;
            that.updateUser(that.currentUser);
            that.rerender();
            updateUserSubjects();
        },
        remove_location_field: () => {
            that.currentUser.numLocationSelects--;
            that.updateUser(that.currentUser);
            that.rerender();
            updateUserSubjects();
        },
        numSubjectSelects: this.currentUser.numSubjectSelects,
        numTimeSelects: this.currentUser.numTimeSelects,
        numLocationSelects: this.currentUser.numLocationSelects,
    };
    console.log("Rendering profile view with data:", profileData);
    const profileViewEl = this.renderTemplate('profile-view', profileData);

    this.replaceElement(document.querySelector('main'), profileViewEl);
    addMaterialListeners(profileViewEl);
};

Tutorbook.prototype.initSubjectSelectDialog = function() {
    // Sets up subject select dialog where the first page is a list of subjects
    // (Divided by type (i.e. Math, Hist, Science)) and the second page is a 
    // list of teachers for the selected subject.
    // TODO: Reset filter dialog to init state on close.
    this.dialogs.subjectSelect = new MDCDialog(document.querySelector('#dialog-subject-select'));
    this.dialogs.subjectSelect.autoStackButtons = false;

    var that = this;
    var subjectSelectData = this.currentSubjectSelectData;
    this.dialogs.subjectSelect.listen('MDCDialog:opening', () => {
        subjectSelectData = this.currentSubjectSelectData;
    });
    this.dialogs.subjectSelect.listen('MDCDialog:opened', () => {
        subjectSelectData = this.currentSubjectSelectData;
    });
    this.dialogs.subjectSelect.listen('MDCDialog:closing', function(event) {
        if (event.detail.action == 'accept') {
            // TODO: Somehow return information that can be used to set the 
            // select value within the user's profile
            this.currentSubjectSelectData = subjectSelectData;
            return;
        }
    });

    var dialog = document.querySelector('#dialog-subject-select');
    var pages = dialog.querySelectorAll('.page');

    // Years array is just grades with year attached (e.g. Freshman Year)
    var years = [];
    this.data.grades.forEach((grade) => {
        years.push(grade + " Year");
    });
    this.replaceElement(
        dialog.querySelector('#year-list'),
        this.renderTemplate('item-list', {
            items: years
        })
    );

    // Set the selected year to be the user's current grade
    years.forEach((year) => {
        if (year.startsWith(that.currentUser.gradeString)) {
            console.log("Target grade: ", that.currentUser.gradeString);
            console.log("Testing year: ", year);
            subjectSelectData.year = year;
            console.log("Current subject select data: ", subjectSelectData);
            dialog.querySelectorAll('#year-list .mdc-list-item').forEach((el) => {
                if (el.innerText == subjectSelectData.year) {
                    el.setAttribute('class', 'mdc-list-item mdc-list-item--selected');
                }
            });
        }
    });

    this.replaceElement(
        dialog.querySelector('#subject-list'),
        this.renderTemplate('item-list', {
            items: this.data.subjects
        })
    );

    // Set the first subject as selected and then show the corresponding teachers
    // in the teacher select dialog page
    if (subjectSelectData.subject == '' || subjectSelectData == null) {
        var selectedSubjectEl = dialog.querySelector('#subject-list .mdc-list-item');
        selectedSubjectEl.setAttribute('class', 'mdc-list-item mdc-list-item--selected');
        subjectSelectData.subject = selectedSubjectEl.innerText;
    } else {
        var selectedSubjectEl = dialog.querySelectorAll('#subject-list .mdc-list-item').forEach((el) => {
            if (el.innerText == subjectSelectData.subject) {
                el.setAttribute('class', 'mdc-list-item mdc-list-item--selected');
            }
        });
    }

    this.replaceElement(
        dialog.querySelector('#teacher-list'),
        this.renderTemplate('item-list', {
            items: this.data.teachers[subjectSelectData.subject],
        })
    );

    var renderAllList = function() {
        that.replaceElement(
            dialog.querySelector('#all-subject-select-list'),
            that.renderTemplate('all-subject-select-list', subjectSelectData)
        );

        dialog.querySelectorAll('#page-all .mdc-list-item').forEach(function(el) {
            el.addEventListener('click', function() {
                var id = el.id.split('-').slice(1).join('-');
                displaySection(id);
            });
        });
    };

    var displaySection = function(id) {
        if (id === 'page-all') {
            renderAllList();
            that.dialogs.subjectSelect.layout();
        }

        pages.forEach(function(sel) {
            if (sel.id === id) {
                sel.style.display = 'inherit';
                that.dialogs.subjectSelect.layout();
            } else {
                sel.style.display = 'none';
                that.dialogs.subjectSelect.layout();
            }
        });
    };

    pages.forEach(function(sel) {
        var type = sel.id.split('-')[1];
        if (type === 'all') {
            return;
        }

        sel.querySelectorAll('.mdc-list-item').forEach(function(el) {
            el.addEventListener('click', function() {
                // Reset selected items and set the new selected item
                el.parentNode.querySelectorAll('.mdc-list-item').forEach((el) => {
                    el.setAttribute('class', 'mdc-list-item');
                });
                el.setAttribute('class', 'mdc-list-item mdc-list-item--selected');

                // Update subjectSelectData
                var newVal = el.innerText.trim();
                console.log("Updating subjectSelectData " + type + " to be " + newVal + "...");
                subjectSelectData[type] = newVal;
                displaySection('page-all');
                console.log(subjectSelectData);
            });
        });
    });

    displaySection('page-all');
    dialog.querySelectorAll('.back').forEach(function(el) {
        el.addEventListener('click', function() {
            displaySection('page-all');
        });
    });
};

// ======================================
// Tutorbook.View.Search.js
// ======================================

Tutorbook.prototype.initHeaders = function() {
    var that = this;
    this.headerBase = this.renderTemplate('header-base', {
        title: 'Tutorbook',
        hasSectionHeader: true,
        showMenu: function() {
            var menu = MDCMenu.attachTo(document.querySelector('#menu'));
            if (menu.open) {
                menu.open = false;
            } else {
                menu.open = true;
            }
        },
        signOut: function() {
            document.querySelector('main').innerHTML = '';
            document.querySelector('.header').innerHTML = '';
            document.querySelector('#loader').setAttribute('hidden', 'false');
            firebase.auth().signOut();
            window.location.replace('/');
        },
        showSettings: function() {
            history.pushState({}, null, '/app/settings');
            that.updateCurrentUser().then(() => {
                that.viewSettings();
            });
        },
        showNav: function() {
            const drawer = MDCDrawer.attachTo(document.querySelector('#nav-drawer'));
            const listEl = document.querySelector('#nav-drawer .mdc-list');

            listEl.addEventListener('click', (event) => {
                drawer.open = false;
            });

            drawer.open = true;

        }
    });

    MDCTopAppBar.attachTo(this.headerBase.querySelector('.mdc-top-app-bar'));
    this.headerBase.querySelectorAll('.material-icons').forEach((el) => {
        MDCRipple.attachTo(el);
    });

    this.headerBack = this.renderTemplate('back-toolbar', {
        title: "View User",
        showMenu: function() {
            var menu = MDCMenu.attachTo(document.querySelector('#back-toolbar-menu'));
            menu.root_.querySelectorAll('.mdc-list-item').forEach(function(el) {
                MDCRipple.attachTo(el);
            });
            if (menu.open) {
                menu.open = false;
            } else {
                menu.open = true;
            }
        },
        signOut: function() {
            firebase.auth().signOut();
            window.location.replace('/');
        },
        showSettings: function() {
            history.pushState({}, null, '/app/settings');
            that.updateCurrentUser().then(() => {
                that.viewSettings();
            });
        },
        back: function() {
            history.pushState({}, null, '/app');
            that.replaceElement(document.querySelector('.header'), that.headerBase);
            that.updateQuery(that.filters);
            that.updateNavSelected('search');
        }
    });

    MDCTopAppBar.attachTo(this.headerBack.querySelector('.mdc-top-app-bar'));
    this.headerBack.querySelectorAll('.material-icons').forEach((el) => {
        MDCRipple.attachTo(el);
    });

};

Tutorbook.prototype.initNavDrawer = function() {
    var that = this;
    const destinations = {
        showSearch: function() {
            history.pushState({}, null, '/app/search');
            that.filters = {
                grade: '',
                subject: '',
                gender: '',
                type: '',
                sort: 'Rating'
            };
            that.updateQuery(that.filters);
        },
        showTutors: function() {
            history.pushState({}, null, '/app/tutors');
            that.filters.type = 'Tutor';
            that.updateQuery(that.filters);
        },
        showPupils: function() {
            history.pushState({}, null, '/app/pupils');
            that.filters.type = 'Pupil';
            that.updateQuery(that.filters);
        },
        showHome: function() {
            history.pushState({}, null, '/app');
            console.log("Viewing dashboard from navigation drawer...");
            that.viewDashboard();
        },
        showAppts: function() {
            console.log("TODO: Implement appointment view");
        },
        showProfile: function() {
            history.pushState({}, null, '/app/profile');
            that.viewProfile();
        },
        showSettings: function() {
            history.pushState({}, null, '/app/settings');
            that.updateCurrentUser().then(() => {
                that.viewSettings();
            });
        },
        showHelp: function() {
            history.pushState({}, null, '/app/help');
            console.log("TODO: Implement help view");
        }
    }

    var navListEl = that.renderTemplate('nav-drawer-list', destinations);
    var drawerEl = document.querySelector('#nav-drawer');
    var navList = navListEl.querySelector('.mdc-list');

    that.replaceElement(drawerEl.querySelector('.mdc-drawer__content'), navList);

    that.navigation.drawer = MDCDrawer.attachTo(document.querySelector('.mdc-drawer'));
    drawerEl.querySelectorAll('.mdc-list-item').forEach((el) => {
        MDCRipple.attachTo(el);
    });

};

Tutorbook.prototype.initFilterDialog = function() {
    // TODO: Reset filter dialog to init state on close.
    this.dialogs.filter = new MDCDialog(document.querySelector('#dialog-filter-all'));
    this.dialogs.filter.autoStackButtons = false;

    var that = this;
    this.dialogs.filter.listen('MDCDialog:closing', function(event) {
        if (event.detail.action == 'accept') {
            that.updateQuery(that.filters);
        }
    });
    // Reset the filters to match current (this.filters)
    this.dialogs.filter.listen('MDCDialog:opening', (event) => {
        renderAllList();
    });

    var dialog = document.querySelector('#dialog-filter-all');
    var pages = dialog.querySelectorAll('.page');

    this.replaceElement(
        dialog.querySelector('#grade-list'),
        this.renderTemplate('item-list', {
            items: ['Any'].concat(this.data.grades)
        })
    );

    this.replaceElement(
        dialog.querySelector('#subject-list'),
        this.renderTemplate('item-list', {
            items: ['Any'].concat(this.data.subjects)
        })
    );

    this.replaceElement(
        dialog.querySelector('#gender-list'),
        this.renderTemplate('item-list', {
            items: ['Any'].concat(this.data.genders)
        })
    );

    this.replaceElement(
        dialog.querySelector('#type-list'),
        this.renderTemplate('item-list', {
            items: ['Any'].concat(this.data.types)
        })
    );

    var renderAllList = function() {
        that.replaceElement(
            dialog.querySelector('#all-filters-list'),
            that.renderTemplate('all-filters-list', that.filters)
        );

        dialog.querySelectorAll('#page-all .mdc-list-item').forEach(function(el) {
            el.addEventListener('click', function() {
                var id = el.id.split('-').slice(1).join('-');
                displaySection(id);
            });
        });
    };

    var displaySection = function(id) {
        if (id === 'page-all') {
            renderAllList();
            that.dialogs.filter.layout();
        }

        pages.forEach(function(sel) {
            if (sel.id === id) {
                sel.style.display = 'inherit';
                that.dialogs.filter.layout();
            } else {
                sel.style.display = 'none';
                that.dialogs.filter.layout();
            }
        });
    };

    pages.forEach(function(sel) {
        var type = sel.id.split('-')[1];
        if (type === 'all') {
            return;
        }

        sel.querySelectorAll('.mdc-list-item').forEach(function(el) {
            el.addEventListener('click', function() {
                var newVal = el.innerText.trim() === 'Any' ? '' : el.innerText.trim();
                console.log("Updating filter " + type + " to be " + newVal + "...");
                that.filters[type] = newVal;
                displaySection('page-all');
                console.log(that.filters);
            });
        });
    });

    displaySection('page-all');
    dialog.querySelectorAll('.back').forEach(function(el) {
        el.addEventListener('click', function() {
            displaySection('page-all');
        });
    });
};

Tutorbook.prototype.updateQuery = function(filters) {
    console.log("Updating query...", filters);
    var query_description = '';

    if (filters.gender !== '') {
        query_description += filters.gender.toLowerCase() + ' ';
    }

    if (filters.grade !== '') {
        query_description += filters.grade.toLowerCase();
    } else if (filters.gender === '') {
        query_description += 'all';
    }

    if (filters.type !== '') {
        query_description += ' ' + filters.type.toLowerCase() + 's';
    } else {
        if (filters.grade === '') {
            query_description += ' users';
        } else if (filters.grade !== 'Freshman') {
            // "Freshman" is weird as it is the plural and singular
            query_description += 's';
        }
    }


    if (filters.subject !== '') {
        query_description += ' for ' + filters.subject;
    }

    if (filters.sort === 'Rating') {
        query_description += ' sorted by rating';
    } else if (filters.sort === 'Reviews') {
        query_description += ' sorted by # of reviews';
    }

    this.viewList(filters, query_description);
};

Tutorbook.prototype.viewList = function(filters, filter_description) {
    console.log("Viewing list...", filters);
    // TODO: Only display relevant subjects
    // (i.e. proficientStudy for Tutors and neededStudy for Pupils)
    if (!filter_description) {
        filter_description = 'all users sorted by rating';
        this.updateNavSelected('search');
    }

    var that = this;
    var mainEl = this.renderTemplate('main-adjusted');

    try {
        var headerEl = document.querySelector('.header #header-base');
        headerEl.querySelector('.mdc-top-app-bar__title').innerHTML = "Search";
        var headerData = {
            filter_description: filter_description,
            showFilterDialog: function() {
                that.dialogs.filter.open();
            },
            clearFilters: function() {
                // TODO: Make this click override the existing listener to open the filter dialog
                that.filters = {
                    grade: '',
                    subject: '',
                    gender: '',
                    type: '',
                    sort: 'Rating'
                };
                that.rerender();
                that.dialogs.filter.close();
            },
        };
        this.replaceElement(
            headerEl.querySelector('#section-header'),
            that.renderTemplate('filter-display', headerData));
    } catch (e) {
        console.log("Could not find headerEl, re-initializing...", e);
        this.replaceElement(document.querySelector('.header'), this.headerBase);
        var headerEl = document.querySelector('.header #header-base');
        headerEl.querySelector('.mdc-top-app-bar__title').innerHTML = "Search";
        var headerData = {
            filter_description: filter_description,
            showFilterDialog: function() {
                that.dialogs.filter.open();
            },
            clearFilters: function() {
                // TODO: Make this click override the existing listener to open the filter dialog
                that.filters = {
                    grade: '',
                    subject: '',
                    gender: '',
                    type: '',
                    sort: 'Rating'
                };
                that.rerender();
                that.dialogs.filter.close();
            },
        };
        this.replaceElement(headerEl.querySelector('#section-header'), that.renderTemplate('filter-display', headerData));
    }

    this.replaceElement(document.querySelector('main'), mainEl);

    this.renderers.userListRenderer = {
        remove: function(doc) {
            var locationCardToDelete = mainEl.querySelector('#doc-' + doc.id);
            if (locationCardToDelete) {
                mainEl.querySelector('#cards').removeChild(locationCardToDelete.parentNode);
            }

            return;
        },
        display: function(doc) {
            // Don't display the user's own card
            if (doc.id == that.currentUser.email || doc.id == firebase.auth().currentUser.email) {
                console.log("Skipping user doc of the currentUser...");
                return;
            }

            // Don't display cards that do not include essential information (i.e. profile is incomplete)
            // - User Type
            // - Grade
            var data = doc.data();
            if (data.gradeString === '' || data.gradeString === undefined || data.type === '' || data.type === undefined) {
                console.log("Skipping user doc of user without grade and type:", doc.id);
                return;
            }

            data['.id'] = doc.id;
            data['go_to_user'] = function() {
                that.showUser(doc.id);
            };

            var el = that.renderTemplate('user-card', data);
            that.replaceElement(el.querySelector('.rating__meta'), that.renderRating(data.avgRating));
            // Setting the id allows to locating the individual user card
            el.querySelector('.location-card').id = 'doc-' + doc.id;
            try {
                var existingLocationCard = mainEl.querySelector('#doc-' + doc.id);
            } catch (e) {
                // add
                /*
                 *console.warn('Caught ' + e + ' while querying for #doc-' + doc.id + ', adding card.');
                 */
                mainEl.querySelector('#cards').append(el);
            }
            if (existingLocationCard) {
                // modify
                existingLocationCard.parentNode.before(el);
                mainEl.querySelector('#cards').removeChild(existingLocationCard.parentNode);
            } else {
                // add
                mainEl.querySelector('#cards').append(el);
            }
            MDCRipple.attachTo(el.querySelector('.mdc-list-item'));
        },
        empty: function() {
            var noResultsEl = that.renderTemplate('no-results');
            that.replaceElement(document.querySelector('main'), noResultsEl);
            return;
        }
    };

    if (filters.grade || filters.subject || filters.gender || filters.type || filters.sort !== 'Rating') {
        this.getFilteredUsers({
            grade: filters.grade || 'Any',
            subject: filters.subject || 'Any',
            gender: filters.gender || 'Any',
            type: filters.type || 'Any',
            sort: filters.sort
        }, this.renderers.userListRenderer);
    } else {
        this.getAllUsers(this.renderers.userListRenderer);
    }
};

// =====================================
// Tutorbook.View.User.js
// =====================================

Tutorbook.prototype.initUserViews = function() {
    // This should actively "viewUser" with replace=False so as to increase loading speeds
    // (i.e. use onSnapshot() callback to ensure that all users are rendered ahead of time.
    var query = firebase.firestore().collection('users');

    // TODO: Instead of having to re-get the user data in "viewUser"
    // Add an option to just use the data passed in {options}.
    var that = this;
    query.onSnapshot(function(snapshot) {
        if (!snapshot.size) {
            console.log("User's Firestore database collection is empty, not rendering any user views.");
            return;
        }

        snapshot.docChanges().forEach(function(change) {
            if (change.type === 'added' || change.type === 'modified') {
                that.viewUser({
                    id: change.doc.id,
                    replace: false
                });
            }
        });
    });
};

Tutorbook.prototype.showUser = function(id) {
    // This should look up the user's template and if it does not exist, it should call "viewUser"
    try {
        var selector = '' + id + '__user-list-view';
        const mainEl = document.getElementById(selector);

        if (mainEl == null) {
            console.warn("Error while showing user, viewing user instead.");
            this.viewUser({
                id: id
            }).catch((err) => {
                console.error("Error while viewing user, trying again to show user:", err);
                this.showUser(id);
            });
        }

        history.pushState({}, null, '/app/users/' + id);
        this.replaceElement(document.querySelector('.header'), this.headerBack);
        this.replaceElement(document.querySelector('main'), mainEl);

        // Re-render that element as it is now being used
        this.viewUser({
            id: id,
            replace: false,
        });
    } catch (e) {
        console.warn("Error while showing user, viewing user instead:", e);
        this.viewUser({
            id: id
        }).catch((err) => {
            console.error("Error while viewing user, trying again to show user:", err);
            this.showUser(id);
        });
    }
};

Tutorbook.prototype.viewUser = function(options) {
    // Parse options object
    if (!(options.replace === undefined)) {
        var replace = options.replace;
    } else {
        var replace = true;
    }
    var id = options.id;

    var mainEl;
    var userDocument;

    var that = this;

    return this.getUser(id)
        .then(function(doc) {
            var data = doc.data();
            userDocument = doc;
            mainEl = that.renderTemplate('user-list-view', data);

            if (data.type == 'Tutor') {
                return userDocument.ref.collection('proficientStudies').get();
            } else {
                return userDocument.ref.collection('neededStudies').get();
            }

        })
        .then(function(studies) {
            // Iterate over every study found in studies
            // and add a list item for every one
            // If there are no studies found, do not show list at all
            // (i.e. don't append it to mainEl)
            var title = userDocument.data().type + " for"
            var studiesEl = that.renderTemplate('studies', {
                title: title
            });

            // Make a list of studies for rendering request dialog
            var validStudies = [];
            if (studies.size) {
                studies.forEach(function(study) {
                    validStudies.push(study.data().name);
                });
            }

            if (studies.size) {
                studies.forEach(function(study) {
                    var data = study.data();
                    data.show_request_dialog = function() {
                        that.currentRequest.toUser = {};
                        that.currentRequest.toUser.email = userDocument.data().email;
                        that.currentRequest.toUser.name = userDocument.data().name;
                        that.currentRequest.toUser.type = userDocument.data().type;
                        that.currentRequest.toUser.photo = userDocument.data().photo;
                        that.currentRequest.subject = data.name;

                        var userData = userDocument.data();
                        userData.subjects = validStudies;
                        console.log("Opening request dialog for user", userData);
                        var title = "New Request";
                        var add_request = function() {
                            console.log("Adding user request...", that.currentRequest);

                            return that.newRequest({
                                subject: that.currentRequest.subject,
                                message: that.currentRequest.message,
                                location: that.currentRequest.location,
                                time: that.currentRequest.time,
                                toUser: that.currentRequest.toUser,
                                fromUser: {
                                    name: firebase.auth().currentUser.displayName,
                                    email: firebase.auth().currentUser.email,
                                    type: that.currentUser.type,
                                    photo: firebase.auth().currentUser.photoURL,
                                },
                                timestamp: new Date(),
                            }).then((id) => {
                                // And, clear the currentRequest.
                                that.currentRequest = {
                                    subject: '',
                                    time: {},
                                    message: '',
                                    location: '',
                                    timestamp: new Date(),
                                    toUser: {},
                                    fromUser: {},
                                };

                                return that.rerender();
                            });
                        };
                        that.viewRequestDialog({
                            'title': title,
                            'userData': userData,
                            'displayUser': userData,
                            'onSubmit': add_request
                        });
                    }
                    var el = that.renderTemplate('subject-card', data);
                    that.replaceElement(el.querySelector('.rating__meta'), that.renderRating(data.avgRating));
                    studiesEl.querySelector('#study-cards').append(el);
                });
                studiesEl.querySelectorAll('.mdc-list-item').forEach((el) => {
                    MDCRipple.attachTo(el);
                });
                mainEl.querySelector('#user-info').append(studiesEl);

                return userDocument.ref.collection('ratings').orderBy('timestamp', 'desc').get();
            }
        })
        .then(function(ratings) {
            var ratingsEl;
            var dialog = that.dialogs.add_review;
            var reviewActions = {
                show_add_review: function() {
                    // Reset the state before showing the dialog            
                    dialog.root_.querySelector('#text').value = '';
                    dialog.root_.querySelectorAll('.star-input i').forEach(function(el) {
                        el.innerText = 'star_border';
                    });

                    dialog.open();
                },
                add_mock_data: function() {
                    that.addMockRatings(id).then(function() {
                        that.rerender();
                    });
                }
            };

            if (ratings === undefined || !ratings.size) {
                ratingsEl = that.renderTemplate('no-reviews', reviewActions);
            } else {
                ratingsEl = that.renderTemplate('user-reviews', reviewActions);

                ratings.forEach(function(rating) {
                    var data = rating.data();
                    var el = that.renderTemplate('review-card', data);
                    that.replaceElement(el.querySelector('.rating__meta'), that.renderRating(data.rating));
                    ratingsEl.querySelector('#review-cards').append(el);
                });
            }
            mainEl.querySelector('#user-info').append(ratingsEl);
        })
        .then(function() {
            // Save the final renders for the "go_to_user" click
            var elID = userDocument.id + '__user-list-view';
            mainEl.setAttribute('id', elID);
            document.querySelector('#rendered-users-container').append(mainEl);
            if (replace) {
                // Replace the current view with the final renders
                history.pushState({}, null, '/app/users/' + id);
                that.replaceElement(document.querySelector('.header'), that.headerBack);
                that.replaceElement(document.querySelector('main'), mainEl);
            }

        }).then(function() {
            that.router.updatePageLinks();
        })
        .catch(function(err) {
            console.warn('Error rendering page', err);
        });
};

Tutorbook.prototype.initReviewDialog = function() {
    var dialog = document.querySelector('#dialog-add-review');
    this.dialogs.add_review = MDCDialog.attachTo(dialog);
    this.dialogs.add_review.autoStackButtons = false;

    var that = this;
    this.dialogs.add_review.listen('MDCDialog:closing', function(event) {
        if (event.detail.action == 'accept') {
            console.log("Adding rating...");
            var pathname = that.getCleanPath(document.location.pathname);
            var id = pathname.split('/')[3];

            that.addRating(id, {
                rating: rating,
                text: dialog.querySelector('#text').value,
                userName: firebase.auth().currentUser.displayName,
                userPhoto: firebase.auth().currentUser.photoURL,
                userEmail: firebase.auth().currentUser.email,
                timestamp: new Date(),
                userId: firebase.auth().currentUser.uid
            }).then(function() {
                that.showUser({
                    'id': id,
                    'replace': true
                });
            });
        }
    });

    var rating = 0;

    MDCTextField.attachTo(dialog.querySelector('.mdc-text-field'));
    dialog.querySelectorAll('.star-input i').forEach(function(el) {
        var rate = function() {
            var after = false;
            rating = 0;
            [].slice.call(el.parentNode.children).forEach(function(child) {
                if (!after) {
                    rating++;
                    child.innerText = 'star';
                } else {
                    child.innerText = 'star_border';
                }
                after = after || child.isSameNode(el);
            });
        };
        el.addEventListener('mouseover', rate);
    });
};

Tutorbook.prototype.viewAdminRequestDialog = function(options) {
    var request = options.data;
    var id = options.id;
    var headerTitle = options.headerTitle || 'View Request';
    var appt = options.appt || false;

    console.log("Viewing request:", request);
    // This should render the full screen request dialog based off of the 
    // currentRequest (which will be determined by clicking on a subject or
    // filling out the basic request dialog)
    var that = this;
    var headerData = {
        title: headerTitle,
        cancel: function() {
            that.rerender();
        },
        print: function() {
            var w = window.open();

            var printScreenEl = that.renderTemplate('print-request', request);
            var html = "<!DOCTYPE HTML>";
            html += '<html lang="en-us">';
            html += '<head><link rel="stylesheet" href="/styles/bundle.min.css" type="text/css"></head>';
            html += '<body>';
            html += printScreenEl.innerHTML;
            html += '</body>';

            console.log("Adding HTML to print-friendly page:", html);
            w.document.write(html);
            // Init material design stuff so it looks nice
            w.document.querySelectorAll('.mdc-text-field').forEach((el) => {
                var textField = MDCTextField.attachTo(el);
                textField.disabled = false;
                try {
                    el.querySelector('input').setAttribute('disabled', 'true');
                } catch (e) {
                    el.querySelector('textarea').setAttribute('disabled', 'true');
                }
            });
            w.document.close();
            w.focus();
            // Print final window and close
            w.print();
            w.close();
        },
        show_approve: ((firebase.auth().currentUser.email == request.toUser.email) && !appt), // Only show approve if request is to the currentUser
        approve: function() {
            that.approveRequest({
                'id': id,
                'request': request,
                'snackbar': true,
            }).then(() => {
                console.log("Viewing dashboard from viewAdminRequestDialog...");
                that.viewDashboard();
            });
        },
    };

    headerData.edit = function() {
        that.currentRequest = request;
        that.getUser(request.fromUser.email).then((doc) => {
            // Get user data and set currentRequest to match the selected request parameters
            var user = doc.data();
            if (user.type == 'Tutor') {
                user.subjects = user.proficientStudies;
            } else {
                user.subjects = user.neededStudies;
            }
            var title = "Edit Request";
            var update_request = function() {
                console.log("Updating user request...", that.currentRequest);

                // Get the current message
                const messageTextField = document.querySelector('main #message-text-field textarea');
                that.currentRequest.message = messageTextField.value;

                // Update the request doc in question
                that.updateRequest({
                    'id': id,
                    'request': {
                        subject: that.currentRequest.subject,
                        message: that.currentRequest.message,
                        location: that.currentRequest.location,
                        time: that.currentRequest.time,
                        toUser: that.currentRequest.toUser,
                        fromUser: that.currentRequest.fromUser,
                        timestamp: new Date(),
                    },
                    'snackbar': true,
                });
                // And, clear the currentRequest.
                that.currentRequest = {
                    subject: '',
                    time: {},
                    message: '',
                    location: '',
                    timestamp: new Date(),
                    toUser: {},
                    fromUser: {},
                };

                return that.viewViewRequestDialog({
                    'data': request,
                    'id': id
                });
            };
            var on_exit = function() {
                // And, clear the currentRequest.
                that.currentRequest = {
                    subject: '',
                    time: {},
                    message: '',
                    location: '',
                    timestamp: new Date(),
                    toUser: {},
                    fromUser: {},
                };

                that.viewViewRequestDialog({
                    'data': request,
                    'id': id
                });
            };
            that.viewRequestDialog({
                'title': title,
                'userData': user,
                'displayUser': user,
                'onSubmit': update_request,
                'onExit': on_exit,
            });
        }).catch((e) => {
            console.error("Error while showing edit request dialog:", e);
        });
    };

    function cloneMap(map) {
        // Helper function to clone a map so we can modify the clone
        // without touching the original.
        var clone = {};
        for (var i in map) {
            clone[i] = map[i];
        }
        return clone;
    }

    var mainData = cloneMap(request);
    // Show the user that the currentUser isn't (obviously)
    mainData['go_to_toUser'] = () => {
        this.showUser(mainData.toUser.email);
    };
    mainData['go_to_fromUser'] = () => {
        this.showUser(mainData.fromUser.email);
    };


    var headerEl = this.renderTemplate('view-request-toolbar', headerData);
    if (appt) {
        var mainEl = this.renderTemplate('admin-view-appointment', mainData);
    } else {
        var mainEl = this.renderTemplate('admin-view-request', mainData);
    }

    // Display final views
    that.replaceElement(document.querySelector('.header'), headerEl);
    that.replaceElement(document.querySelector('main'), mainEl);

    // Material Design
    MDCTopAppBar.attachTo(headerEl.querySelector('.mdc-top-app-bar'));
    headerEl.querySelectorAll('.mdc-button').forEach((el) => {
        MDCRipple.attachTo(el);
    });
    mainEl.querySelectorAll('.mdc-text-field').forEach((el) => {
        var textField = MDCTextField.attachTo(el);
        textField.disabled = false;
        try {
            el.querySelector('input').setAttribute('disabled', 'true');
        } catch (e) {
            el.querySelector('textarea').setAttribute('disabled', 'true');
        }
    });
};

Tutorbook.prototype.viewViewRequestDialog = function(options) {
    const request = options.data;
    const id = options.id;
    const headerTitle = options.headerTitle || 'View Request';
    const appt = options.appt || false;

    // Show the user that the currentUser isn't (obviously)
    if (request.toUser.email != firebase.auth().currentUser.email) {
        var otherUser = request.toUser;
    } else {
        var otherUser = request.fromUser;
    }
    options.otherUser = otherUser;

    console.log("Viewing request...", options);
    // This should render the full screen request dialog based off of the 
    // currentRequest (which will be determined by clicking on a subject or
    // filling out the basic request dialog)
    var that = this;
    var headerData = {
        title: headerTitle,
        cancel: function() {
            that.rerender();
        },
        print: function() {
            var w = window.open();

            var printScreenEl = that.renderTemplate('print-request', request);
            var html = "<!DOCTYPE HTML>";
            html += '<html lang="en-us">';
            html += '<head><link rel="stylesheet" href="/styles/bundle.min.css" type="text/css"></head>';
            html += '<body>';
            html += printScreenEl.innerHTML;
            html += '</body>';

            console.log("Adding HTML to print-friendly page:", html);
            w.document.write(html);
            // Init material design stuff so it looks nice
            w.document.querySelectorAll('.mdc-text-field').forEach((el) => {
                var textField = MDCTextField.attachTo(el);
                textField.disabled = false;
                try {
                    el.querySelector('input').setAttribute('disabled', 'true');
                } catch (e) {
                    el.querySelector('textarea').setAttribute('disabled', 'true');
                }
            });
            w.document.close();
            w.focus();
            // Print final window and close
            w.print();
            w.close();
        },
        show_approve: ((firebase.auth().currentUser.email == request.toUser.email) && !appt), // Only show approve if request is to the currentUser
        approve: function() {
            that.approveRequest({
                'id': id,
                'request': request,
                'snackbar': true,
            }).then(() => {
                that.viewDashboard();
                console.log("Viewing dashboard from viewViewRequestDialog...");
            });
        },
    };

    headerData.edit = function() {
        that.currentRequest = request;
        that.getUser(otherUser.email).then((doc) => {
            // Get user data and set currentRequest to match the selected request parameters
            var user = doc.data();
            if (user.type == 'Tutor') {
                user.subjects = user.proficientStudies;
            } else {
                user.subjects = user.neededStudies;
            }
            var title = "Edit Request";
            var update_request = function() {
                console.log("Updating user request...", that.currentRequest);

                // Get the current message
                const messageTextField = document.querySelector('main #message-text-field textarea');
                that.currentRequest.message = messageTextField.value;

                // Update the request doc in question
                that.updateRequest({
                    'id': id,
                    'request': {
                        subject: that.currentRequest.subject,
                        message: that.currentRequest.message,
                        location: that.currentRequest.location,
                        time: that.currentRequest.time,
                        toUser: that.currentRequest.toUser,
                        fromUser: that.currentRequest.fromUser,
                        timestamp: new Date(),
                    },
                    'snackbar': true,
                });
                // And, clear the currentRequest.
                that.currentRequest = {
                    subject: '',
                    time: {},
                    message: '',
                    location: '',
                    timestamp: new Date(),
                    toUser: {},
                    fromUser: {},
                };

                return that.viewViewRequestDialog({
                    'data': request,
                    'id': id
                });
            };
            var on_exit = function() {
                // And, clear the currentRequest.
                that.currentRequest = {
                    subject: '',
                    time: {},
                    message: '',
                    location: '',
                    timestamp: new Date(),
                    toUser: {},
                    fromUser: {},
                };

                return that.viewViewRequestDialog({
                    'data': request,
                    'id': id
                });
            };
            that.viewRequestDialog({
                'title': title,
                'userData': user,
                'displayUser': user,
                'onSubmit': update_request,
                'onExit': on_exit,
            });
        }).catch((e) => {
            console.error("Error while showing edit request dialog:", e);
        });
    };

    function cloneMap(map) {
        // Helper function to clone a map so we can modify the clone
        // without touching the original.
        var clone = {};
        for (var i in map) {
            clone[i] = map[i];
        }
        return clone;
    }

    var mainData = cloneMap(request);
    mainData.targetUser = otherUser;
    mainData['go_to_user'] = () => {
        this.showUser(mainData.targetUser.email);
    };


    var headerEl = this.renderTemplate('view-request-toolbar', headerData);
    var mainEl = this.renderTemplate('view-request', mainData);

    // Display final views
    that.replaceElement(document.querySelector('.header'), headerEl);
    that.replaceElement(document.querySelector('main'), mainEl);

    // Material Design
    MDCTopAppBar.attachTo(headerEl.querySelector('.mdc-top-app-bar'));
    headerEl.querySelectorAll('.mdc-button').forEach((el) => {
        MDCRipple.attachTo(el);
    });
    mainEl.querySelectorAll('.mdc-text-field').forEach((el) => {
        var textField = MDCTextField.attachTo(el);
        textField.disabled = false;
        try {
            el.querySelector('input').setAttribute('disabled', 'true');
        } catch (e) {
            el.querySelector('textarea').setAttribute('disabled', 'true');
        }
    });
};

Tutorbook.prototype.viewRequestDialog = function(options) {
    const title = options.title || "Edit Request";
    const userData = options.userData;
    const on_check = options.onSubmit;
    const on_exit = options.onExit || function() {
        that.rerender();
    };
    const displayUserData = options.displayUser || userData;

    console.log("Viewing request dialog...", options);
    // This should render the full screen request dialog based off of the 
    // currentRequest (which will be determined by clicking on a subject or
    // filling out the basic request dialog)
    var that = this;
    var headerData = {
        title: title,
        cancel: on_exit,
    };

    function getDays(times) {
        var days = [];
        times.forEach((map) => {
            if (days.indexOf(map.day) == -1) {
                days.push(map.day);
            }
        });
        return days;
    };

    function filterTimes(times) {
        var result = [];
        times.forEach((map) => {
            if (map.day == that.currentRequest.time.day && result.indexOf(map.time) == -1) {
                result.push(map.time);
            }
        });
        return result;
    };

    // We set these in order to render the request-user template with a valid day and time selects
    userData.days = getDays(userData.availableTimes);

    // Set the first day as pre-selected and set the correlating times as available
    this.currentRequest.time.day = userData.days[0];
    userData.times = filterTimes(userData.availableTimes);

    // Set what user is displayed at the top
    userData.targetUser = displayUserData;

    var headerEl = this.renderTemplate('request-user-toolbar', headerData);
    var mainEl = this.renderTemplate('request-user', userData);

    // Set the first day to be selected and then show only those times that
    // occur on that selected day.
    const selectedDayEl = mainEl.querySelector('#day-select .mdc-list-item');
    selectedDayEl.setAttribute('class', 'mdc-list-item set-width mdc-list-item--selected');

    // If there is only one day, set it as the pre-selected day
    if (userData.times.length == 1) {
        this.currentRequest.time.time = filterTimes(userData.availableTimes)[0];
    }

    // Material Design
    MDCTopAppBar.attachTo(headerEl.querySelector('.mdc-top-app-bar'));
    headerEl.querySelectorAll('.mdc-button').forEach((el) => {
        MDCRipple.attachTo(el);
    });
    mainEl.querySelectorAll('.mdc-select .mdc-list-item').forEach((el) => {
        MDCRipple.attachTo(el);
    });

    // Display final views
    that.replaceElement(document.querySelector('.header'), headerEl);
    that.replaceElement(document.querySelector('main'), mainEl);

    // Init material listen for changes in data and update profile accordingly
    // Location Select
    var el = mainEl.querySelector('#location-select');
    const locationSelect = MDCSelect.attachTo(el);
    if (!!that.currentRequest.location && that.currentRequest.location != '') {
        console.log("Updating location select", that.currentRequest.location);
        var index = userData.availableLocations.indexOf(that.currentRequest.location);
        locationSelect.selectedIndex = index;
    }
    locationSelect.listen('MDCSelect:change', function() {
        console.log("Updating currentRequest for location", locationSelect.value);
        that.currentRequest.location = locationSelect.value;
    });

    // Subject Select
    var el = mainEl.querySelector('#subject-select');
    const subjectSelect = MDCSelect.attachTo(el);
    if (!!that.currentRequest.subject && that.currentRequest.subject != '') {
        console.log("Updating subject select", that.currentRequest.subject);
        var index = userData.subjects.indexOf(that.currentRequest.subject);
        subjectSelect.selectedIndex = index;
    }
    subjectSelect.listen('MDCSelect:change', function() {
        console.log("Updating currentRequest for subject", subjectSelect.value);
        that.currentRequest.subject = subjectSelect.value;
    });

    // Day Select
    var el = mainEl.querySelector('#day-select');
    const daySelect = MDCSelect.attachTo(el);
    if (!!that.currentRequest.time.day && that.currentRequest.time.day != '') {
        console.log("Updating day select", that.currentRequest.time.day);
        var index = getDays(userData.availableTimes).indexOf(that.currentRequest.time.day);
        daySelect.selectedIndex = index;
    }
    daySelect.listen('MDCSelect:change', function() {
        console.log("Updating currentRequest for day", daySelect.value);
        that.currentRequest.time.day = daySelect.value;

        var newTimeSelectEl = that.renderTemplate('option-select', {
            items: filterTimes(userData.availableTimes),
            labelText: 'Time',
        });
        newTimeSelectEl.setAttribute('style', 'width: 100% !important;');
        newTimeSelectEl.querySelector('.mdc-select').setAttribute('style', 'width: 100% !important');

        // If there is only one time, set it as the pre-selected time
        if (filterTimes(userData.availableTimes).length == 1) {
            that.currentRequest.time.time = filterTimes(userData.availableTimes)[0];
        }

        that.replaceElement(
            document.querySelector('#time-select-list-item'),
            newTimeSelectEl
        );

        // Time Select
        var el = document.querySelector('main #time-select-list-item .mdc-select');
        const timeSelect = MDCSelect.attachTo(el);
        if (!!that.currentRequest.time.time && that.currentRequest.time.time != '') {
            console.log("Updating time select", that.currentRequest.time.time);
            var index = filterTimes(userData.availableTimes).indexOf(that.currentRequest.time.time);
            timeSelect.selectedIndex = index;
        }
        timeSelect.listen('MDCSelect:change', function() {
            console.log("Updating currentRequest for toTime", timeSelect.value);
            that.currentRequest.time.time = timeSelect.value;
        });

    });

    // Time Select
    var el = document.querySelector('main #time-select-list-item .mdc-select');
    const timeSelect = MDCSelect.attachTo(el);
    if (!!that.currentRequest.time.time && that.currentRequest.time.time != '') {
        console.log("Updating time select", that.currentRequest.time.time);
        var index = filterTimes(userData.availableTimes).indexOf(that.currentRequest.time.time);
        timeSelect.selectedIndex = index;
    }
    timeSelect.listen('MDCSelect:change', function() {
        console.log("Updating currentRequest for toTime", timeSelect.value);
        that.currentRequest.time.time = timeSelect.value;
    });

    // Message Text-Field
    var el = mainEl.querySelector('#message-text-field');
    const messageTextField = MDCTextField.attachTo(el);
    messageTextField.required = false;
    if (!!that.currentRequest.message && that.currentRequest.message != '') {
        console.log("Updating message text-field", that.currentRequest.message);
        messageTextField.value = that.currentRequest.message;
    }

    // Add onSubmit() method
    headerEl.querySelector('#check-button').addEventListener('click', () => {
        console.log("Current request before updating:", that.currentRequest);

        // First, make sure all values are valid
        if (locationSelect.value == undefined || locationSelect.value == '') {
            locationSelect.required = true;
            locationSelect.valid = false;
            return;
        }
        that.currentRequest.location = locationSelect.value;

        if (subjectSelect.value == undefined || subjectSelect.value == '') {
            subjectSelect.required = true;
            subjectSelect.valid = false;
            return;
        }
        that.currentRequest.subject = subjectSelect.value;

        if (daySelect.value == undefined || daySelect.value == '') {
            daySelect.required = true;
            daySelect.valid = false;
            return;
        }
        that.currentRequest.time.day = daySelect.value;

        if (timeSelect.value == undefined || timeSelect.value == '') {
            timeSelect.required = true;
            timeSelect.valid = false;
            return;
        }
        that.currentRequest.time.time = timeSelect.value;

        // Get the current message
        var messageTextField = document.querySelector('main #message-text-field textarea');
        that.currentRequest.message = messageTextField.value;

        // Then, run the on_check method
        console.log("Current request after updating:", that.currentRequest);
        on_check();
    });
};

window.onload = function() {
    window.app = new Tutorbook();
};