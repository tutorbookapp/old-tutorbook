import {
    MDCRipple
} from '@material/ripple/index';

import $ from 'jquery';

// Dialogs
const EditRequestDialog = require('dialogs').editRequest;
const ViewRequestDialog = require('dialogs').viewRequest;
const EditApptDialog = require('dialogs').editAppt;
const ViewApptDialog = require('dialogs').viewAppt;
const ViewPastApptDialog = require('dialogs').viewPastAppt;
const ViewActiveApptDialog = require('dialogs').viewActiveAppt;
const ConfirmationDialog = require('dialogs').confirm;
const NotificationDialog = require('dialogs').notify;

// Users
const EditProfile = require('profile').edit;
const User = require('user');

// Dependencies
const Data = require('data');
const Utils = require('utils');

// Class this renders each card based on the given doc, queryID, and type
class Card {

    constructor(doc, queryID, type, priority) {
        this.render = app.render;
        this.el = this.getCardFromType(type, doc);
        this.el.setAttribute('timestamp',
            (doc.data && doc.data().timestamp) ? doc.data().timestamp.toDate() : new Date()
        );
        this.el.setAttribute('priority', priority || 1);
        this.el.setAttribute('query', queryID);
        if (!!doc.id) { // Setup cards w/out IDs
            this.el.setAttribute('id', doc.id);
        }
    }

    getCardFromType(type, doc) {
        switch (type) {
            // PARENT CARDS
            case 'children':
                var card = Card.renderChildCard(doc);
                break;

                // TUTOR/PUPIL/PARENT CARDS
            case 'requestsIn':
                var card = Card.renderRequestInCard(doc);
                break;
            case 'modifiedRequestsIn':
                var card = Card.renderModifiedRequestInCard(doc);
                break;
            case 'canceledRequestsIn':
                var card = Card.renderCanceledRequestInCard(doc);
                break;
            case 'requestsOut':
                var card = Card.renderRequestOutCard(doc);
                break;
            case 'modifiedRequestsOut':
                var card = Card.renderModifiedRequestOutCard(doc);
                break;
            case 'rejectedRequestsOut':
                var card = Card.renderRejectedRequestOutCard(doc);
                break;
            case 'approvedRequestsOut':
                var card = Card.renderApprovedRequestOutCard(doc);
                break;
            case 'appointments':
                var card = Card.renderApptCard(doc);
                break;
            case 'activeAppointments':
                var card = Card.renderActiveApptCard(doc);
                break;
            case 'modifiedAppointments':
                var card = Card.renderModifiedApptCard(doc);
                break;
            case 'canceledAppointments':
                var card = Card.renderCanceledApptCard(doc);
                break;
            case 'needApprovalPayments':
                var card = Card.renderNeedApprovalPaymentCard(doc);
                break;

                // SUPERVISOR CARDS
            case 'users':
                var card = Card.renderUserCard(doc);
                break;
            case 'tutors':
                var card = Card.renderTutorsCard(doc);
                break;
            case 'pupils':
                var card = Card.renderPupilsCard(doc);
                break;
            case 'matches':
                var card = Card.renderMatchesCard(doc);
                break;
            case 'clockIns':
                var card = Card.renderClockInCard(doc);
                break;
            case 'clockOuts':
                var card = Card.renderClockOutCard(doc);
                break;
            case 'approvedClockIns':
                //var card = Card.renderApprovedClockInCard(doc);
                break;
            case 'approvedClockOuts':
                //var card = Card.renderApprovedClockOutCard(doc);
                break;

                // SETUP CARDS
                // NOTE: Cards this have pre-filled content (i.e. setup cards)
                // just appear as true/false in the app.user.cards map
            case 'setupStripe':
                if (doc) {
                    var card = Card.renderSetupStripeCard();
                }
                break;
            case 'searchTutors':
                if (doc) {
                    var card = Card.renderSearchTutorsCard();
                }
                break;
            case 'setupProfile':
                if (doc) {
                    var card = Card.renderSetupProfileCard();
                }
                break;
            case 'setupAvailability':
                if (doc) {
                    var card = Card.renderSetupAvailabilityCard();
                }
                break;
            case 'setupPayment':
                if (doc) {
                    var card = Card.renderSetupPaymentCard();
                }
                break;
            case 'setupCalendar':
                if (doc) {
                    var card = Card.renderSetupCalendarCard();
                }
                break;
            case 'setupDeposit':
                if (doc) {
                    var card = Card.renderSetupDepositCard();
                }
                break;
            case 'setupLocation':
                if (doc) {
                    var card = Card.renderSetupLocationCard();
                }
                break;
            case 'addChildren':
                if (doc) {
                    var card = Card.renderAddChildrenCard();
                }
                break;
            case 'setupNotifications':
                if (doc) {
                    var card = Card.renderSetupNotificationsCard();
                }
                break;
            case 'setupRestrictions':
                if (doc) {
                    var card = Card.renderSetupRestrictionsCard();
                }
                break;
                // TODO: Add other cases
            default:
                console.warn('Unsupported card subcollection:', type);
                break;
        };
        return card;
    }
};



// ============================================================================
// SUPERVISOR DASHBOARD CARDS
// ============================================================================


Card.renderUserCard = (doc) => {
    const p = doc.data();
    const title = p.name;
    const subtitle = p.grade + ' ' + p.type;
    var summary = p.bio;
    if (p.subjects.length === 0) {
        summary += ' Hasn\'t specified subjects.';
    } else {
        summary += ' ' + p.type + ' for ';
        p.subjects.forEach((subject) => {
            summary += subject + ', ';
        });
        summary = summary.substring(0, summary.length - 2) + '.';
    }
    if (Object.keys(p.availability).length > 0 &&
        p.availability[window.app.location]) {
        summary += ' Available on ';
        Object.entries(p.availability[window.app.location]).forEach((entry) => {
            var day = entry[0];
            var time = entry[1][0].open;
            summary += day + 's at ' + time + ', ';
        });
        summary = summary.substring(0, summary.length - 2) + '.';
    } else {
        summary += ' Does not have any availability.';
    }
    if (summary.length > 80) {
        summary = summary.substring(0, 80) + '...';
    }
    const actions = {
        primary: () => {
            User.viewUser(p.email);
        },
        view: () => {
            User.viewUser(p.email);
        },
        edit: () => {
            new EditProfile(p).view();
        },
    };
    const card = Card.renderCard(title, subtitle, summary, actions);
    $(card).addClass('mdc-layout-grid__cell--span-2');
    return card;
};


Card.renderTutorsCard = function(doc) {
    const summary = 'Manually edit user profiles to set availability, update ' +
        'subjects, add contact information, and much more. Soon, you\'ll even' +
        ' be able to manually update service hours all without leaving your ' +
        'dashboard.';
    const title = window.app.dashboard.tutors.num + ' ' +
        window.app.location.split(' ')[0] + ' Tutors';
    const subtitle = 'There are currently ' + window.app.dashboard.tutors.num +
        ' ' + window.app.location.split(' ')[0] + ' tutors on Tutorbook';
    const actions = {
        snooze: () => {
            $('#cards [card-id="tutors"]').remove();
        },
        primary: () => {
            return window.app.dashboard.tutors.view();
            new NotificationDialog('Profile Editing', 'Manual profile editing' +
                ' for tutors at your location is a feature currently in the' +
                ' works (but as soon as it goes live, you\'ll be the first to' +
                ' know). In the meantime, head over to "Manual Matching" to ' +
                'create and manage proxy profiles.', () => {}).view();
        },
        view: () => {
            return window.app.dashboard.tutors.view();
            new NotificationDialog('Profile Editing', 'Manual profile editing' +
                ' for tutors at your location is a feature currently in the' +
                ' works (but as soon as it goes live, you\'ll be the first to' +
                ' know). In the meantime, head over to "Manual Matching" to ' +
                'create and manage proxy profiles.', () => {}).view();
        },
    };
    const card = Card.renderCard(title, subtitle, summary, actions);
    $(card).attr('card-id', 'tutors');
    return card;
};


Card.renderPupilsCard = function(doc) {
    const summary = 'Manually edit user profiles to set availability, update ' +
        'subjects, add contact information, and much more. Soon, you\'ll be ' +
        'able to create job posts (that tutors can respond to) for unmatched ' +
        'pupils.';
    const title = window.app.dashboard.pupils.num + ' ' +
        window.app.location.split(' ')[0] + ' Pupils';
    const subtitle = 'There are currently ' + window.app.dashboard.pupils.num +
        ' ' + window.app.location.split(' ')[0] + ' pupils on Tutorbook';
    const actions = {
        snooze: () => {
            $('#cards [card-id="pupils"]').remove();
        },
        primary: () => {
            return window.app.dashboard.pupils.view();
            new NotificationDialog('Profile Editing', 'Manual profile editing' +
                ' for pupils at your location is a feature currently in the' +
                ' works (but as soon as it goes live, you\'ll be the first to' +
                ' know). In the meantime, head over to "Manual Matching" to ' +
                'create and manage proxy profiles.', () => {}).view();
        },
        view: () => {
            return window.app.dashboard.pupils.view();
            new NotificationDialog('Profile Editing', 'Manual profile editing' +
                ' for pupils at your location is a feature currently in the' +
                ' works (but as soon as it goes live, you\'ll be the first to' +
                ' know). In the meantime, head over to "Manual Matching" to ' +
                'create and manage proxy profiles.', () => {}).view();
        },
    };
    const card = Card.renderCard(title, subtitle, summary, actions);
    $(card).attr('card-id', 'pupils');
    return card;
};


Card.renderMatchesCard = function(doc) {
    const actions = {
        snooze: () => {
            $('#cards [card-id="matches"]').remove();
        },
        view: () => {},
    };
    const summary = "Quia voluptatem harum temporibus. Ea culpa eum " +
        "reprehenderit. Corporis perferendis id tempora voluptates neque " +
        "praesentium et deserunt.";
    const title = "Manual Matches";
    const subtitle = "You have a bunch of manual matches";
    const card = Card.renderCard(title, subtitle, summary, actions);
    $(card).attr('card-id', 'matches');
    return card;
};


// ============================================================================
// SETUP CARDS
// ============================================================================


// Open the Stripe Connected Accounts onboarding Express flow
Card.renderSetupStripeCard = function() {
    const actions = {
        snooze: () => {
            $('#cards #setup-payments-card').remove();
        },
        setup: () => {
            window.location = window.app.payments.setupURL;
        },
        primary: () => {
            window.location = window.app.payments.setupURL;
        },
    };
    const card = Card.renderCard(
        'Setup Payments',
        'Add bank info to receive secure payouts',
        'Connect with Stripe to manage and receive simple, secure' +
        ' payments for your tutoring services.',
        actions
    );
    $(card)
        .attr('id', 'setup-payments-card')
        .attr('priority', 10)
        .attr('timestamp', new Date());
    return card;
};


// Render function that returns a MDC Card that shows a setup location dialog
// showing a list of existing locations and the option to create a new location.
Card.renderSetupLocationCard = function() {
    const card = window.app.render.template('setup-location-card', {
        open_dialog: () => {
            console.log('TODO: Implement location setup dialog');
        },
        search: () => {
            console.log('TODO: Implement existing locations dialog');
        },
        create: () => {
            console.log('TODO: Implement new location dialog');
        },
        dismiss: () => {
            window.app.user.cards.setupLocation = false;
            window.app.updateUser();
            $('main #cards #setup-location-card').remove();
        }
    });

    // Setting the id allows to locating the individual user card
    card.setAttribute('id', 'setup-location-card');

    return card;
};


// Render function that returns a MDC Card that enables parents to edit their
// children's profiles
Card.renderChildCard = function(doc) {
    var that = this;
    const child = doc.data();
    const card = Card.renderCard(
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
    return card;
};


// Render function that returns a MDC Card that asks parents to create profiles
// for their children.
Card.renderAddChildrenCard = function() {
    var that = this;
    const card = Card.renderCard(
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
    return card;
};


// Render function that returns a MDC Card that shows a notification request
// prompt when clicked.
Card.renderSetupNotificationsCard = function() {
    var that = this;
    const card = Card.renderCard(
        'Enable Notifications', 'Enable push notifications',
        (app.user.type === 'Tutor') ? 'Enable push notifications to be ' +
        'notified when you recieve a new lesson request and authorized ' +
        'payment, when a pupil modifies their request, or when a pupil ' +
        'cancels their request.' : (app.user.type === 'Pupil') ? 'Enable' +
        ' push notifications to be notified when a tutor approves, rejects' +
        ', or modifies your request.' : 'Enable push notifications to be ' +
        'notified about important app activity.', {
            primary: () => {
                window.app.notify.getPermission();
                $('#setup-notifications-card').remove();
            },
            snooze: () => {
                window.app.user.cards.setupNotifications = false;
                window.app.updateUser();
                $('#setup-notifications-card').remove();
            },
            enable: () => {
                window.app.notify.getPermission();
                $('#setup-notifications-card').remove();
            },
        });
    card.setAttribute('id', 'setup-notifications-card');

    return card;
};


// Render function that returns a card that makes it really easy for a new pupil
// without any tech experience to see the search view.
Card.renderSearchTutorsCard = function() {
    const card = Card.renderCard('Find a Tutor', 'Search for your perfect tutor',
        'Filter by subject, grade, gender, rating, and reviews. Find your ' +
        'perfect mentor from our plethora of qualified student tutors.', {
            dismiss: () => {
                window.app.user.cards.searchTutors = false;
                window.app.updateUser();
                $('main #cards #setup-tutors-card').remove();
            },
            primary: () => {
                window.app.search.view({
                    type: 'Tutor',
                });
            },
            search: () => {
                window.app.search.view({
                    type: 'Tutor',
                });
            },
        });

    card.setAttribute('id', 'setup-tutors-card');

    return card;
};


// Render function that returns a card that asks pupil's to set their availability
// in case a tutor has to edit their request or appointment.
Card.renderSetupAvailabilityCard = function(subtitle, summary) {
    var that = this;
    const card = Card.renderCard(
        'Set Availability', 'Enable tutors to modify your requests',
        'Setting your availability allows tutors to modify your requests ' +
        'to best fit within their schedule and yours. Once you setup availability,' +
        ' you\'ll never have to worry about an appointment not fitting into' +
        ' your day.', {
            primary: () => {
                window.app.profile.view();
                document.querySelector('.profile #Availability').scrollIntoView({
                    behavior: 'smooth'
                });
            },
            snooze: () => {
                window.app.user.cards.setupAvailability = false;
                window.app.updateUser();
                $('#setup-availability-card').remove();
            },
            setup: () => {
                window.app.profile.view();
                document.querySelector('.profile #Availability').scrollIntoView({
                    behavior: 'smooth'
                });
            },
        });
    card.setAttribute('id', 'setup-availability-card');

    return card;
};


// Render function that returns a MDC Card that shows a profile setup dialog (i.e.
// the profile view but with select helper text and the header-action headerEl)
Card.renderSetupProfileCard = function() {
    const subtitle = 'Help us find the right people for you';
    const summary = 'Customize your profile to help ' +
        'others find, message, and request you as their tutor or pupil.';
    const actions = {
        snooze: () => {
            window.app.user.cards.setupProfile = false;
            window.app.updateUser();
            $('main #cards #setup-profile-card').remove();
        },
        setup: () => {
            window.app.profile.view();
        },
        primary: () => {
            window.app.profile.view();
        },
    };
    const card = Card.renderCard('Setup Profile', subtitle, summary, actions);
    // Setting the id allows to locating the individual user card
    card.setAttribute('id', 'setup-profile-card');

    return card;
};




// ============================================================================
// DASHBOARD CARDS RENDER FUNCTIONS
// ============================================================================


// Render function that returns a populated modifiedRequestsIn dashboard card
Card.renderModifiedRequestInCard = function(doc) {
    const data = doc.data();
    const pronoun = Utils.getPronoun(data.modifiedBy.gender);
    var that = this;
    if (app.user.type === 'Supervisor') {
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
    return Card.renderCard('Modified Request', subtitle, summary, {
        primary: () => {
            new ViewModifiedRequestDialog(data, doc.id).view();
        },
        dismiss: () => {
            Card.remove(doc, 'modifiedRequestsIn');
        }
    });
};


// Render function that returns a populated canceledRequestsIn dashboard card
Card.renderCanceledRequestInCard = function(doc) {
    const data = doc.data();
    const pronoun = Utils.getPronoun(data.canceledBy.gender);
    if (app.user.type === 'Supervisor') {
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
    return Card.renderCard('Canceled Request', subtitle, summary, {
        primary: () => {
            new ViewCanceledRequestDialog(data, doc.id).view();
        },
        dismiss: () => {
            Card.remove(doc, 'canceledRequestsIn');
        }
    });
};


// Render function that returns a populated modifiedRequestsOut dashboard card
Card.renderModifiedRequestOutCard = function(doc) {
    const data = doc.data();
    var that = this;
    if (app.user.type === 'Supervisor') {
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
    return Card.renderCard('Modified Request', subtitle, summary, {
        primary: () => {
            new ViewModifiedRequestDialog(data, doc.id).view();
        },
        dismiss: () => {
            Card.remove(doc, 'modifiedRequestsOut');
        }
    });
};


// Render function that returns a populated rejectedRequestsOut dashboard card
Card.renderRejectedRequestOutCard = function(doc) {
    const data = doc.data();
    if (window.app.user.type === 'Supervisor') {
        var subtitle = data.rejectedBy.name + ' rejected ' + data.for.fromUser.name + '\'s request';
        var summary = data.rejectedBy.name.split(' ')[0] + ' rejected ' +
            data.for.fromUser.name.split(' ')[0] +
            '\'s lesson request. Please ensure to addresss these changes as necessary.';
    } else {
        var subtitle = data.rejectedBy.name + ' rejected your request';
        var summary = data.rejectedBy.name.split(' ')[0] + ' rejected the ' +
            'request you sent. Please ensure to addresss these changes as necessary.';
    }
    const actions = {
        primary: () => {
            new ViewRejectedRequestDialog(data, doc.id).view();
        },
        dismiss: () => {
            Card.remove(doc, 'rejectedRequestsOut');
        }
    };
    window.app.cards.rejectedRequestsOut[doc.id] = actions;
    return Card.renderCard('Rejected Request', subtitle, summary, actions);
};


// Render function that returns a populated approvedRequestsOut dashboard card
Card.renderApprovedRequestOutCard = function(doc) {
    const data = doc.data();
    const otherUser = data.for.fromUser;
    const subtitle = (app.user.type === 'Supervisor') ? data.approvedBy.name.split(' ')[0] +
        ' approved a request from ' + otherUser.name.split(' ')[0] :
        data.approvedBy.name.split(' ')[0] + ' approved the request you sent';
    const summary = data.approvedBy.name + ((app.user.type === 'Supervisor') ? ' approved a ' +
            'request from ' + otherUser.name : ' approved the request you sent') +
        '. Please ensure to addresss these changes as necessary.';
    const actions = {
        primary: () => {
            // Show appointment
            if (window.app.user.type === 'Supervisor') {
                // First, try the fromUser's collections
                return firebase.firestore().collection('users')
                    .doc(data.for.fromUser.email)
                    .collection('appointments')
                    .doc(doc.id).get().then((doc) => {
                        if (doc.exists) {
                            new ViewApptDialog(doc.data(), doc.id).view();
                        }
                        // Then, if that doc doesn't exist yet, try
                        // the toUser's collections
                        return firebase.firestore().collection('users')
                            .doc(data.for.toUser.email)
                            .collection('appointments')
                            .doc(doc.id).get().then((doc) => {
                                if (doc.exists) {
                                    new ViewApptDialog(doc.data(), doc.id).view();
                                }
                                console.error('Could not find appt document for ' +
                                    'approvedRequest:', doc.id);
                            });
                    });
            } else {
                that.getAppt(doc.id).then((doc) => {
                    new ViewApptDialog(doc.data(), doc.id).view();
                });
            }
        },
        dismiss: () => {
            Card.remove(doc, 'approvedRequestsOut');
        },
    };
    window.app.cards.approvedRequestsOut[doc.id] = actions;
    return Card.renderCard('Approved Request', subtitle, summary, actions);
};


// Render function that returns a populated modifiedAppointments dashboard card
Card.renderModifiedApptCard = function(doc) {
    const data = doc.data();
    var subtitle = data.modifiedBy.name.split(' ')[0] + ' modified ' +
        'your appointment';
    var summary = data.modifiedBy.name + ' modified your ' +
        'appointment together. Please ensure to addresss these changes as necessary.';
    return Card.renderCard('Modified Appointment', subtitle, summary, {
        dismiss: () => {
            Card.remove(doc, 'modifiedAppointments');
        }
    });
};


// Render function that returns a populated canceledAppointments dashboard card
Card.renderCanceledApptCard = function(doc) {
    const data = doc.data();
    if (data.canceledBy.email !== data.for.attendees[0].email) {
        var otherUser = data.for.attendees[0];
    } else {
        var otherUser = data.for.attendees[1];
    }
    const summary = (app.user.type === 'Supervisor') ? data.canceledBy.name +
        ' canceled ' + Utils.getPronoun(data.canceledBy.gender) +
        ' tutoring appointment with ' + otherUser.name + '. Please ' +
        'ensure to address these changes as necessary.' :
        ([data.for.attendees[0].email, data.for.attendees[1].email].indexOf(data.canceledBy.email) < 0) ?
        data.canceledBy.name + ' canceled your ' +
        'appointment with ' + otherUser.name + '. Please ensure to addresss these changes as necessary.' :
        data.canceledBy.name + ' canceled your ' +
        'appointment together. Please ensure to addresss these changes as necessary.';
    const subtitle = data.canceledBy.name.split(' ')[0] + ' canceled ' +
        ((app.user.type === 'Supervisor') ? Utils.getPronoun(data.canceledBy.gender) : 'your') +
        ' appointment';
    return Card.renderCard('Canceled Appointment', subtitle, summary, {
        primary: () => {
            new ViewCanceledApptDialog(data).view();
        },
        dismiss: () => {
            Card.remove(doc, 'canceledAppointments');
        },
    });
};


// Render function this returns a populated requestIn dashboard card
Card.renderRequestInCard = function(doc) {
    const request = doc.data();
    var cardData = Utils.cloneMap(request);
    var subtitle = 'From ' + request.fromUser.name;
    var summary = request.fromUser.name.split(' ')[0] +
        ' requested you as a ' + request.toUser.type.toLowerCase() +
        ' for ' + request.subject + ' on ' + request.time.day + 's at the ' +
        request.location.name + '. Tap to learn more and setup an appointment.';
    var actions = {};
    actions.reject = function() {
        const summary = "Reject request from " + request.fromUser.name +
            " for " + request.subject + " at " +
            request.time.from + " on " + request.time.day +
            "s.";
        new ConfirmationDialog('Reject Request?', summary, async () => {
                Card.remove(doc, 'requestsIn');
                await Data.rejectRequest(request, doc.id);
                window.app.snackbar.view('Rejected request from ' +
                    request.fromUser.email + '.');
            })
            .view();
    };
    actions.view = function() {
        new ViewRequestDialog(request, doc.id).view();
    };
    actions.primary = function() {
        new ViewRequestDialog(request, doc.id).view();
    };

    return Card.renderCard('New Request', subtitle, summary, actions);
};


// Render function that returns a populated requestOut dashboard card
Card.renderRequestOutCard = function(doc) {
    const request = doc.data();
    if (app.user.type === 'Supervisor') {
        var subtitle = 'From ' + request.fromUser.name +
            ' to ' + request.toUser.name;
        var summary = request.fromUser.name.split(' ')[0] +
            ' requested ' + request.toUser.name.split(' ')[0] +
            ' as a ' + request.toUser.type.toLowerCase() + ' for ' +
            request.subject + ' on ' + request.time.day + 's at the ' +
            request.location.name + '. Tap to learn more and view this request.';
    } else {
        var subtitle = 'To ' + request.toUser.name;
        var summary = 'You requested ' + request.toUser.name.split(' ')[0] +
            ' as a ' + request.toUser.type.toLowerCase() + ' for ' +
            request.subject + ' on ' + request.time.day + 's at the ' +
            request.location.name + '. Tap to learn more and edit your request.';
    }
    const actions = {};
    actions.primary = function() {
        new ViewRequestDialog(request).view();
    };
    actions.cancel = function() {
        const summary = "Cancel request to " + request.toUser.name + " for " +
            request.subject + " at " + request.time.from + " on " +
            request.time.day + "s.";
        new ConfirmationDialog('Cancel Request?', summary, async () => {
            Card.remove(doc, 'requestsOut');
            await Data.cancelRequest(request, doc.id);
            app.snackbar.view('Canceled request to ' +
                request.toUser.email + '.');
        }).view();
    };
    actions.edit = function() {
        new EditRequestDialog(request, doc.id).view();
    };
    window.app.cards.requestsOut[doc.id] = actions; // Store actions & dialogs

    return Card.renderCard('Pending Request', subtitle, summary, actions);
};


// Render function that returns a populated modifiedAppointments dashboard card
Card.renderActiveApptCard = function(doc) {
    const appt = doc.data();

    if (appt.attendees[0].email == firebase.auth().currentUser.email) {
        var withUser = appt.attendees[1];
    } else {
        var withUser = appt.attendees[0];
    }

    if (app.user.type === 'Supervisor') {
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

    const actions = {
        primary: () => {
            new ViewActiveApptDialog(appt, doc.id).view();
        },
        delete: () => {
            return new ConfirmationDialog('Delete Appointment?', summary, async () => {
                Card.remove(doc, 'activeAppointments');
                await Data.deleteActiveAppt(appt, doc.id);
                window.app.snackbar.view('Active appointment deleted.');
            }).view();
        },
    };
    if (app.user.type === 'Tutor') {
        actions.clockout = async () => {
            await Data.clockOut(appt, doc.id);
            window.app.snackbar.view('Sent clock out request.');
        };
    }

    return Card.renderCard('Active Appointment', subtitle, summary, actions);
};


Card.renderApptCard = function(doc) {
    const appt = doc.data();

    if (appt.attendees[0].email == firebase.auth().currentUser.email) {
        var withUser = appt.attendees[1];
    } else {
        var withUser = appt.attendees[0];
    }

    if (app.user.type === 'Supervisor') {
        var subtitle = "Between " + appt.attendees[0].name + ' and ' +
            appt.attendees[1].name;
        var summary = appt.attendees[0].name + ' and ' +
            appt.attendees[1].name + ' have tutoring sessions for ' +
            appt.for.subject + " on " + appt.time.day + "s at " +
            appt.time.from + ".";
    } else {
        var subtitle = "With " + withUser.name;
        var summary = "You have tutoring sessions with " + withUser.name +
            " for " + appt.for.subject + " on " + appt.time.day + "s at " +
            appt.time.from + ".";
    }
    const actions = {};
    actions.cancel = function() {
        var summary = "Cancel sessions with " + withUser.name + " for " +
            appt.for.subject + " at " + appt.time.from + " on " +
            appt.time.day + "s.";
        new ConfirmationDialog('Cancel Appointment?', summary, async () => {
            Card.remove(doc, 'appointments');
            await Data.cancelAppt(appt, doc.id);
            app.snackbar.view('Canceled appointment with ' + withUser.email + '.');
        }).view()
    };
    actions.view = function() {
        new ViewApptDialog(appt, doc.id).view();
    };
    actions.primary = function() {
        new ViewApptDialog(appt, doc.id).view();
    };

    var card = Card.renderCard('Upcoming Appointment', subtitle, summary, actions);
    return card;
};


// ============================================================================
// PAYMENTS CARDS
// ============================================================================


// Render function that returns a needed payment card (asking the pupil to setup
// recurring PayPal subscription payments).
Card.renderNeededPaymentCard = function(doc) {
    const payment = doc.data();
    const title = 'Approve Payment';
    const subtitle = 'Send $' + payment.amount + ' to ' +
        payment.to.name + '.';
    const summary = 'Approve and send payment ($' + payment.amount +
        ') to ' + payment.to.name.split(' ')[0] +
        ' for your tutoring lesson on ' +
        payment.appt.time.day + '. If you were not satisfied, do not click approve.';
    const actions = {
        deny: () => {
            return new ConfirmationDialog('Deny Payment?',
                'Only deny payment to your tutor if they did not provide ' +
                'you with a satisfactory lesson. By denying payment, you ' +
                'will cancel all upcoming appointments with ' +
                payment.to.name + '. Still sure you want ' +
                'to deny payment and cancel those appointments?', async () => {
                    $('#doc-needApprovalPayments-' + doc.id).remove();
                    await Data.denyPayment(payment, doc.id);
                    window.app.snackbar.view('Denied payment to ' +
                        approvedPayment.to.email + '.');
                }).view();
        },
        approve: async () => {
            $('#cards [id="' + doc.id + '"][type="neededPayments"]').remove();
            await Data.approvePayment(payment, doc.id);
            window.app.snackbar.view('Approved payment to ' +
                approvedPayment.to.email + '.');
        },
    };
    const card = Card.renderCard(title, subtitle, summary, actions);
    $(card).attr('type', 'neededPayments').attr('id', doc.id);
    return card;
};


// Render function that returns a needed approval payment card (asking the pupil
// to approve a payment to a tutor).
Card.renderNeedApprovalPaymentCard = function(doc) {
    const payment = doc.data();
    const title = 'Approve Payment';
    const subtitle = 'Send $' + payment.amount.toFixed(2) + ' to ' +
        payment.to.name + '.';
    const summary = 'Approve and send payment ($' + payment.amount.toFixed(2) +
        ') to ' + payment.to.name.split(' ')[0] +
        ' for your tutoring lesson on ' +
        payment.appt.time.day + '. If you were not satisfied, do not click approve.';
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
            Card.remove(doc, 'needApprovalPayments');
            Data.approvePayment(payment, doc.id);
        },
        primary: () => {
            new ViewNeedApprovalPaymentDialog(doc.data(), doc.id).view();
        },
    };
    const card = Card.renderCard(title, subtitle, summary, actions);
    $(card).attr('type', 'needApprovalPayments').attr('id', doc.id);
    return card;
};


Card.renderCard = function(title, subtitle, summary, actions) {
    const card = app.render.template('card-empty', {
        title: title,
        subtitle: subtitle,
        summary: summary,
        actions: actions,
    });
    const buttons = card.querySelector('.mdc-card__actions'); // Actions
    Object.entries(actions).forEach((entry) => {
        var label = entry[0];
        var action = entry[1];
        if (label !== 'primary') {
            buttons.insertBefore(
                Card.button(label, action),
                buttons.firstElementChild
            );
        }
    });
    $(card)
        .find('.mdc-button, .mdc-card__primary-action, .mdc-icon-button')
        .each(function() {
            MDCRipple.attachTo($(this)[0]);
        });
    return card;
};


Card.button = function(label, action) {
    return app.render.template('card-button', {
        label: label,
        action: action,
    });
};


Card.remove = function(doc, type) {
    $('[id="' + doc.id + '"][type="' + type + '"]').remove();
    if (window.app.user.type === 'Supervisor') {
        return firebase.firestore().collection('users').doc(window.app.user.id)
            .collection('dismissedCards').doc(doc.id).set({
                type: type,
                timestamp: new Date(),
            });
    }
    return firebase.firestore().collection('users').doc(window.app.user.id)
        .collection(type).doc(doc.id).delete();
};


Card.prototype.removeCardDoc = function(type, id) {
    if (app.user.type === 'Supervisor' || app.user.type === 'Parent') {
        // To enable supervisor's to dismiss cards, we add a dismissedCards
        // subcollection that is synced locally. Cards in this collection
        // are not shown in the dashboard view.
        this.dismissedCards.push(type + '-' + id);
        return firebase.firestore().collection('users').doc(app.user.email)
            .collection('dismissedCards').doc(type + '-' + id).set({
                timestamp: new Date()
            });
    } else {
        return firebase.firestore().collection('users').doc(app.user.email)
            .collection(type).doc(id).delete();
    }
};


module.exports = Card;