// Class that manages Firestore data flow along with any local app data
// See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/
// Classes#Instance_properties
class Data {
    constructor() {
        this.initTimes();
        this.initHourlyCharges();
        this.initLocations();
    }

    static requestPayout() {
        return firebase.firestore().collection('users')
            .doc(window.app.user.id).collection('requestedPayouts').doc().set({
                timestamp: new Date(),
            });
    }

    static requestPaymentFor(appt, id) {
        const user = Data.getOther(appt.attendees);
        return firebase.firestore().collection('users').doc(user.email)
            .collection('requestedPayments').doc(id).set({
                from: Data.getOther(appt.attendees),
                to: window.app.conciseUser,
                amount: appt.for.payment.amount,
                for: appt,
                timestamp: new Date(),
            });
    }

    static async approvePayment(approvedPayment, id) {
        const db = firebase.firestore();
        const payments = [
            db.collection('users').doc(approvedPayment.to.email)
            .collection('approvedPayments').doc(id),
            db.collection('users').doc(approvedPayment.from.email)
            .collection('approvedPayments').doc(id),
        ];
        const requestedPayment = db.collection('users')
            .doc(window.app.user.email)
            .collection('requestedPayments').doc(id);
        await requestedPayment.delete();
        return payments.forEach(async (payment) => {
            await payment.set(approvedPayment);
        });
    }

    static async denyPayment(deniedPayment, id) {
        const db = firebase.firestore();
        const payments = [
            db.collection('users').doc(approvedPayment.appt.attendees[0].email)
            .collection('deniedPayments').doc(id),
            db.collection('users').doc(approvedPayment.appt.attendees[1].email)
            .collection('deniedPayments').doc(id),
        ];
        const approvedPaymentRef = db.collection('users')
            .doc(window.app.user.email)
            .collection('needApprovalPayments').doc(id);
        await approvedPaymentRef.delete();
        payments.forEach(async (payment) => {
            await payment.set({
                for: deniedPayment,
                deniedBy: that.conciseUser,
                deniedTimestamp: new Date(),
            });
        });
    }

    static async getUser(id) {
        if (!id) {
            throw new Error('Could not get user data b/c id was undefined.');
        } else if (id.indexOf('@') < 0) {
            throw new Error('Invalid ID was passed to getUser. This is ' +
                'probably a Firebase UID (which is not fully supported yet).');
        }
        const ref = await firebase.firestore().collection('users').doc(id).get();
        if (ref.exists) {
            return ref.data();
        } else {
            console.error('User (' + id + ') did not exist.');
            throw new Error('User (' + id + ') did not exist.');
        }
    }

    static updateUser(user) {
        if (!user) {
            throw new Error('Could not update user b/c id was undefined.');
        }
        return firebase.firestore().collection('users').doc(user.id)
            .update(user);
    }

    static deleteUser(id) {
        if (!id) {
            throw new Error('Could not delete user b/c id was undefined.');
        }
        return firebase.firestore().collection('users').doc(id)
            .delete();
    }

    static createUser(user) {
        if (!user || !user.id) {
            throw new Error('Could not create user b/c id was undefined.');
        }
        return firebase.firestore().collection('users').doc(user.id)
            .set(user);
    }

    static async approveClockIn(clockIn, id) {
        const db = firebase.firestore();
        const ref = db.collection('users').doc(window.app.user.id)
            .collection('clockIns').doc(id);
        const approvedClockIn = db.collection('users').doc(window.app.user.id)
            .collection('approvedClockIns').doc();
        const activeAppts = [
            db.collection('users').doc(clockIn.for.attendees[0].email)
            .collection('activeAppointments')
            .doc(id),
            db.collection('users').doc(clockIn.for.attendees[1].email)
            .collection('activeAppointments')
            .doc(id),
            db.collection('locations').doc(clockIn.for.location.id)
            .collection('activeAppointments')
            .doc(id),
        ];
        await ref.delete();
        await approvedClockIn.set(Data.combineMaps(clockIn, {
            approvedTimestamp: new Date(),
            approvedBy: window.app.conciseUser,
        }));
        // Tedious work around of the infinite loop
        const activeApptData = Data.cloneMap(clockIn.for);
        activeApptData.clockIn = Data.combineMaps(clockIn, {
            approvedTimestamp: new Date(),
            approvedBy: window.app.conciseUser,
        });
        for (var i = 0; i < activeAppts.length; i++) {
            var activeAppt = activeAppts[i];
            await activeAppt.set(activeApptData);
        }
    }

    static getOther(notThisUser, attendees) { // Don't create dependency loops
        if (!notThisUser.email && !!notThisUser.length) {
            if (notThisUser[0].email === window.app.user.email) {
                return notThisUser[1];
            }
            return notThisUser[0];
        }
        if (attendees[0].email === notThisUser.email) {
            return attendees[1];
        }
        return attendees[0];
    }

    static async approveClockOut(clockOutData, id) {
        // Tedious work around of the infinite loop
        const approvedClockOutData = Data.combineMaps(clockOutData, {
            approvedTimestamp: new Date(),
            approvedBy: window.app.conciseUser,
        });
        const appt = Data.cloneMap(approvedClockOutData.for);
        appt.clockOut = Data.cloneMap(approvedClockOutData);

        // Define Firestore doc locations
        const db = firebase.firestore();
        const clockOut = db.collection('users').doc(window.app.user.id)
            .collection('clockOuts').doc(id);
        const approvedClockOut = db.collection('users').doc(window.app.user.id)
            .collection('approvedClockOuts').doc();
        const activeAppts = [
            db.collection('users').doc(appt.attendees[0].email)
            .collection('activeAppointments')
            .doc(id),
            db.collection('users').doc(appt.attendees[1].email)
            .collection('activeAppointments')
            .doc(id),
            db.collection('locations').doc(appt.location.id)
            .collection('activeAppointments')
            .doc(id),
        ];
        const pastAppts = [
            db.collection('users').doc(appt.attendees[0].email)
            .collection('pastAppointments')
            .doc(),
        ];
        const pastApptID = pastAppts[0].id;
        pastAppts.push(
            db.collection('users').doc(appt.attendees[1].email)
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
    }

    static combineMaps(mapA, mapB) { // Avoid dependency loops with Utils
        // NOTE: This function gives priority to mapB over mapA
        var result = {};
        for (var i in mapA) {
            result[i] = mapA[i];
        }
        for (var i in mapB) {
            result[i] = mapB[i];
        }
        return result;
    }

    static cloneMap(map) { // Don't create dependency loops by require('utils')
        var clone = {};
        for (var i in map) {
            clone[i] = map[i];
        }
        return clone;
    }

    static async getLocationSupervisor(id) {
        try {
            const doc = await firebase.firestore().collection('locations')
                .doc(id).get();
            const supervisors = doc.data().supervisors;
            return supervisors[0]; // TODO: How do we check to see if a given
            // supervisor is actually active on the app right now?
        } catch (e) {
            console.warn('Error while getting a location supervisor:', e);
            /*
             *new NotificationDialog('Update Availability?', 'The availability ' +
             *    ' shown here is not up-to-date. The ' + location + ' may ' +
             *    'no longer be open at these times or this user may no longer ' +
             *    'be available (they can change their availability from their ' +
             *    'profile). Please cancel this request and ' +
             *    'create a new one.').view();
             *    TODO: Show a notification dialog without creating a dependency loop
             */
            window.app.snackbar.view('Could not find location supervisor.');
            window.app.nav.back();
        }
    }

    static async clockIn(appt, id) {
        const clockIn = {
            sentTimestamp: new Date(),
            sentBy: window.app.conciseUser,
        };

        const db = firebase.firestore();
        const supervisor = await Data.getLocationSupervisor(appt.location.id);
        const ref = db.collection('users').doc(supervisor)
            .collection('clockIns').doc(id);

        appt.supervisor = supervisor; // Avoid infinite reference loop
        appt.clockIn = Data.cloneMap(clockIn);
        clockIn.for = Data.cloneMap(appt);

        await ref.set(clockIn);
        return db.collection('users').doc(window.app.user.id).update({
            clockedIn: true
        });
    }

    static async clockOut(appt, id) {
        const clockOut = {
            sentTimestamp: new Date(),
            sentBy: window.app.conciseUser,
        };

        const db = firebase.firestore();
        const ref = db.collection('users').doc(appt.supervisor)
            .collection('clockOuts').doc(id);

        appt.clockOut = Data.cloneMap(clockOut); // Avoid infinite ref loop
        clockOut.for = Data.cloneMap(appt);

        await ref.set(clockOut);
        return db.collection('users').doc(window.app.user.id).update({
            clockedOut: true
        });
    }

    static async approveRequest(request, id) {
        const db = firebase.firestore();
        const requestIn = db.collection("users").doc(request.toUser.email)
            .collection('requestsIn')
            .doc(id);
        const requestOut = db.collection('users').doc(request.fromUser.email)
            .collection('requestsOut')
            .doc(id);
        // TODO: Right now we don't allow supervisors to approve requests.
        // Shoud we?
        const approvedRequestOut = db.collection('users').doc(request.fromUser.email)
            .collection('approvedRequestsOut')
            .doc(id);
        // NOTE: The appts must be processed in this order due to the way that
        // the Firestore rules are setup (i.e. first we check if there is an
        // approvedRequestOut doc, then we check if there is an appt doc
        // already created).
        const appts = [
            db.collection('users').doc(request.fromUser.email)
            .collection('appointments')
            .doc(id),
            db.collection('users').doc(request.toUser.email)
            .collection('appointments')
            .doc(id),
            db.collection('locations').doc(request.location.id)
            .collection('appointments')
            .doc(id),
        ];

        await approvedRequestOut.set({
            for: request,
            approvedBy: app.conciseUser,
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
    }

    static async modifyAppt(apptData, id) {
        const db = firebase.firestore();
        apptData = Data.trimObject(apptData);
        const appts = [
            db.collection('users').doc(apptData.attendees[0].email)
            .collection('appointments')
            .doc(id),
            db.collection('users').doc(apptData.attendees[1].email)
            .collection('appointments')
            .doc(id),
            db.collection('locations').doc(apptData.location.id)
            .collection('appointments')
            .doc(id),
        ];
        const modifiedAppts = [];
        if (apptData.attendees[0].email !== app.user.email) {
            modifiedAppts.push(db.collection('users').doc(apptData.attendees[0].email)
                .collection('modifiedAppointments').doc(id));
        }
        if (apptData.attendees[1].email !== app.user.email) {
            modifiedAppts.push(db.collection('users').doc(apptData.attendees[1].email)
                .collection('modifiedAppointments').doc(id));
        }
        if (app.user.locations.indexOf(apptData.location.id) < 0) {
            modifiedAppts.push(db.collection('locations').doc(apptData.location.id)
                .collection('modifiedAppointments').doc(id));
        }

        for (var i = 0; i < modifiedAppts.length; i++) {
            var modifiedAppt = modifiedAppts[i];
            await modifiedAppt.set({
                modifiedBy: app.conciseUser,
                modifiedTimestamp: new Date(),
                for: apptData,
            });
        }
        for (var i = 0; i < appts.length; i++) {
            var appt = appts[i];
            await appt.update(apptData);
        }
    }

    static async cancelAppt(apptData, id) {
        const db = firebase.firestore();
        const appts = [
            db.collection('users').doc(apptData.attendees[0].email)
            .collection('appointments')
            .doc(id),
            db.collection('users').doc(apptData.attendees[1].email)
            .collection('appointments')
            .doc(id),
            db.collection('locations').doc(apptData.location.id)
            .collection('appointments')
            .doc(id),
        ];
        const canceledAppts = [];
        if (apptData.attendees[0].email !== app.user.email) {
            canceledAppts.push(db.collection('users').doc(apptData.attendees[0].email)
                .collection('canceledAppointments').doc(id));
        }
        if (apptData.attendees[1].email !== app.user.email) {
            canceledAppts.push(db.collection('users').doc(apptData.attendees[1].email)
                .collection('canceledAppointments').doc(id));
        }
        if (app.user.locations.indexOf(apptData.location.id) < 0) {
            canceledAppts.push(db.collection('locations').doc(apptData.location.id)
                .collection('canceledAppointments').doc(id));
        }

        if (apptData.for.payment.type === 'Paid') {
            // Delete the authPayment docs as well
            const authPayments = [
                db.collection('users').doc(apptData.attendees[0].email)
                .collection('authPayments')
                .doc(id),
                db.collection('users').doc(apptData.attendees[1].email)
                .collection('authPayments')
                .doc(id),
            ];
            authPayments.forEach(async (authPayment) => {
                await authPayment.delete();
            });
        }

        canceledAppts.forEach(async (appt) => {
            await appt.set({
                canceledBy: app.conciseUser,
                canceledTimestamp: new Date(),
                for: apptData,
            });
        });

        appts.forEach(async (appt) => {
            await appt.delete();
        });
    }

    static async rejectRequest(request, id) {
        const db = firebase.firestore();
        const requestIn = db.collection("users").doc(request.toUser.email)
            .collection('requestsIn')
            .doc(id);
        const requestOut = db.collection('users').doc(request.fromUser.email)
            .collection('requestsOut')
            .doc(id);
        const rejectedRequestOut = db.collection('users').doc(request.fromUser.email)
            .collection('rejectedRequestsOut')
            .doc(id);

        if (request.payment.type === 'Paid') {
            // Delete the authPayment docs as well
            const authPayments = [
                db.collection('users').doc(request.fromUser.email)
                .collection('authPayments')
                .doc(id),
                db.collection('users').doc(request.toUser.email)
                .collection('authPayments')
                .doc(id),
            ];
            authPayments.forEach(async (authPayment) => {
                await authPayment.delete();
            });
        }

        await rejectedRequestOut.set({
            for: request,
            rejectedBy: app.conciseUser,
            rejectedTimestamp: new Date(),
        });
        await requestOut.delete();
        await requestIn.delete();
    }

    static async cancelRequest(request, id) {
        const db = firebase.firestore();
        const requestIn = db.collection("users").doc(request.toUser.email)
            .collection('requestsIn')
            .doc(id);
        const requestOut = db.collection('users').doc(request.fromUser.email)
            .collection('requestsOut')
            .doc(id);

        if (request.payment.type === 'Paid') {
            // Delete the authPayment docs as well
            const authPayments = [
                db.collection('users').doc(request.fromUser.email)
                .collection('authPayments')
                .doc(id),
                db.collection('users').doc(request.toUser.email)
                .collection('authPayments')
                .doc(id),
            ];
            authPayments.forEach(async (authPayment) => {
                await authPayment.delete();
            });
        }

        const canceledRequests = [];
        if (request.toUser.email !== app.user.email) {
            canceledRequests.push(db.collection('users').doc(request.toUser.email)
                .collection('canceledRequestsIn').doc(id));
        }
        if (request.fromUser.email !== app.user.email) {
            canceledRequests.push(db.collection('users').doc(request.fromUser.email)
                .collection('canceledRequestsOut').doc(id));
        }

        canceledRequests.forEach(async (canceledRequest) => {
            await canceledRequest.set({
                canceledBy: app.conciseUser,
                canceledTimestamp: new Date(),
                for: request,
            });
        });
        await requestOut.delete();
        await requestIn.delete();
    }

    static async modifyRequest(request, id) {
        const db = firebase.firestore();
        request = Data.trimObject(request);
        const requestIn = db.collection("users").doc(request.toUser.email)
            .collection('requestsIn')
            .doc(id);
        const requestOut = db.collection('users').doc(request.fromUser.email)
            .collection('requestsOut')
            .doc(id);
        // We send modified requests to all users that aren't the currentUser
        const modifiedRequests = [];
        if (request.fromUser.email !== app.user.email) {
            modifiedRequests.push(db.collection('users')
                .doc(request.fromUser.email)
                .collection('modifiedRequestsOut')
                .doc(id));
        }
        if (request.toUser.email !== app.user.email) {
            modifiedRequests.push(db.collection('users')
                .doc(request.toUser.email)
                .collection('modifiedRequestsIn')
                .doc(id));
        }
        modifiedRequests.forEach(async (modifiedRequest) => {
            await modifiedRequest.set({
                for: request,
                modifiedBy: app.conciseUser,
                modifiedTimestamp: new Date(),
            });
        });
        await requestOut.update(request);
        await requestIn.update(request);
    }

    static trimObject(ob) {
        const result = {};
        Object.entries(ob).forEach((entry) => {
            switch (typeof entry[1]) {
                case 'string':
                    result[entry[0]] = entry[1].trim();
                    break;
                case 'object': // Yay recursion!
                    if (!entry[1].getTime) {
                        result[entry[0]] = Data.trimObject(entry[1]);
                    } else { // It's a timestamp (don't try to trim it)
                        result[entry[0]] = entry[1];
                    }
                    break;
                default:
                    result[entry[0]] = entry[1];
            };
        });
        return result;
    }

    static async newRequest(request, payment) {
        const db = firebase.firestore();
        request = Data.trimObject(request);
        const requestIn = db.collection('users').doc(request.toUser.email)
            .collection('requestsIn')
            .doc();
        const requestOut = db.collection('users').doc(request.fromUser.email)
            .collection('requestsOut')
            .doc(requestIn.id);

        // Add request documents for both users
        await requestOut.set(request);
        await requestIn.set(request);
        // Add payment document for server to process
        if (!!payment && request.payment.type === 'Paid') {
            switch (payment.method) {
                case 'PayPal':
                    // Authorize payment for capture (after the tutor clocks
                    // out and the pupil approves payment).
                    await firebase.firestore().collection('users')
                        .doc(request.fromUser.email)
                        .collection('authPayments')
                        .doc(requestIn.id)
                        .set(payment);
                    await firebase.firestore().collection('users')
                        .doc(request.toUser.email)
                        .collection('authPayments')
                        .doc(requestIn.id)
                        .set(payment);
                    break;
                case 'Stripe':
                    // Authorize payment for capture (after the tutor clocks
                    // out and the pupil approves payment).
                    await firebase.firestore().collection('users')
                        .doc(request.fromUser.email)
                        .collection('sentPayments')
                        .doc(requestIn.id)
                        .set(payment);
                    break;
                default:
                    console.warn('Invalid payment method (' + payment.method +
                        '). Defaulting to PayPal...');
                    // Authorize payment for capture (after the tutor clocks
                    // out and the pupil approves payment).
                    await firebase.firestore().collection('users')
                        .doc(request.fromUser.email)
                        .collection('authPayments')
                        .doc(requestIn.id)
                        .set(payment);
                    await firebase.firestore().collection('users')
                        .doc(request.toUser.email)
                        .collection('authPayments')
                        .doc(requestIn.id)
                        .set(payment);
                    break; // Not necessary (see: https://bit.ly/2AILLZj)
            };
        }
    }

    async initLocations() { // Different formats of the same location data
        this.locationsByName = {};
        this.locationsByID = {};
        this.locationDataByName = {};
        this.locationDataByID = {};
        this.locationNames = [];
        this.locationIDs = [];
        const snap = await firebase.firestore().collection('locations').get();
        snap.docs.forEach((doc) => {
            this.locationsByName[doc.data().name] = doc.id;
            this.locationDataByName[doc.data().name] = doc.data();
            this.locationsByID[doc.id] = doc.data().name;
            this.locationDataByID[doc.id] = doc.data();
            this.locationNames.push(doc.data().name);
            this.locationIDs.push(doc.id);
        });
    }

    initTimes() {
        // First, iterate over 'AM' vs 'PM'
        this.timeStrings = [];
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
                this.timeStrings.push('12:' + minString + ' ' + suffix);
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
                    this.timeStrings.push(hour + ':' + minString + ' ' + suffix);
                }
            }
        });
    }

    initHourlyCharges() {
        for (var i = 5; i <= 100; i += 5) {
            var chargeString = '$' + i + '.00';
            this.payments.hourlyChargeStrings.push(chargeString);
            this.payments.hourlyChargesMap[chargeString] = i;
        }
    }

};

Data.setupCards = [
    'searchTutors',
    'setupNotifications',
    'setupProfile',
    'setupAvailability',
    'addChildren'
];

// This is not static and thus has to include `prototype` in it's definition
Data.prototype.payments = {
    types: ['Free', 'Paid'],
    hourlyChargeStrings: [],
    hourlyChargesMap: {},
};

Data.prices = [
    'Free',
    'Paid',
];

Data.emptyProfile = {
    name: '',
    uid: '',
    photo: '',
    id: '', // Right now, we just use email for id
    email: '',
    phone: '',
    type: '',
    gender: '',
    grade: '',
    bio: '',
    avgRating: 0,
    numRatings: 0,
    subjects: [],
    cards: {},
    config: {
        showPayments: false,
    },
    settings: {},
    availability: {},
    payments: {
        hourlyChargeString: '$25.00',
        hourlyCharge: 25,
        totalChargedString: '$0.00',
        totalCharged: 0,
        currentBalance: 0,
        currentBalanceString: '$0.00',
        type: 'Free',
    },
    authenticated: false,
    secondsTutored: 0,
    secondsPupiled: 0,
    clockedIn: false,
    clockedOut: false,
};

Data.gunnSchedule = {
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
};

Data.periods = [
    'A Period',
    'B Period',
    'C Period',
    'D Period',
    'E Period',
    'F Period',
    'G Period',
    'Flex',
];

Data.locations = ['Gunn Academic Center', 'Paly Peer Tutoring Center'];

Data.cities = ['Palo Alto, CA', 'Mountain View, CA', 'East Palo Alto, CA'];

Data.days = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
];

// List of subjects taken directly from AC Application form
Data.mathSubjects = [
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
];

Data.scienceSubjects = [
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
];

Data.historySubjects = [
    'World History',
    'Cont World History',
    'Government',
    'US History',
    'APUSH',
    'Economics',
    'AP Economics',
    'Psychology',
    'AP Psychology',
];

Data.languageSubjects = [
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
];

Data.englishSubjects = [
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
];

Data.lifeSkills = [
    'Planning',
    'Organization',
    'Study Skills',
    'Other',
];

Data.subjects = [
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
];

Data.genders = [
    'Male',
    'Female',
    'Other'
];

Data.grades = [
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
];

Data.types = [
    'Tutor',
    'Pupil',
    'Parent',
    'Supervisor',
];

module.exports = Data;