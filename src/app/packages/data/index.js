import to from 'await-to-js';
const axios = require('axios');

// Class that manages Firestore data flow along with any local app data
// See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/
// Classes#Instance_properties
class Data {
    constructor() {
        this.initTimes();
        this.initHourlyCharges();
        this.initLocations();
    }

    static get grades() {
        const highSchool = ['Senior', 'Junior', 'Sophomore', 'Freshman'];
        const middleSchool = ['8th Grade', '7th Grade', '6th Grade'];
        const elementarySchool = [
            '5th Grade',
            '4th Grade',
            '3rd Grade',
            '2nd Grade',
            '1st Grade',
            'Kindergarten',
        ];
        switch (window.app.location.name.split(' ')[0]) {
            case 'Gunn':
                return highSchool;
            case 'Paly':
                return highSchool;
            case 'JLS':
                return middleSchool;
            default:
                return ['Adult']
                    .concat(highSchool)
                    .concat(middleSchool)
                    .concat(elementarySchool);
        };
    }

    static async getUser(id) {
        if (!id) {
            throw new Error('Could not get user data b/c id was undefined.');
        } else if (id.indexOf('@') >= 0) {
            console.warn('Using an email as a user ID is deprecated.');
            var ref = await firebase.firestore().collection('usersByEmail').doc(id)
                .get();
        } else if (firebase.auth().currentUser) {
            var ref = await firebase.firestore().collection('users').doc(
                (await firebase.firestore().collection('search').doc(id).get())
                .data().id).get();
        } else {
            var ref = await firebase.firestore().collection('users').doc(id)
                .get();
        }
        if (ref.exists) {
            return ref.data();
        } else {
            console.error('User (' + id + ') did not exist.');
            throw new Error('User (' + id + ') did not exist.');
        }
    }

    static updateUser(user) {
        if (!user || !(user.id || user.email))
            throw new Error('Could not update user b/c id was undefined.');
        return firebase.firestore().collection('usersByEmail').doc(user.id || user.email)
            .update(user);
    }

    static deleteUser(id) {
        if (!id) {
            throw new Error('Could not delete user b/c id was undefined.');
        }
        return firebase.firestore().collection('usersByEmail').doc(id)
            .delete();
    }

    static createUser(user) {
        if (!user) {
            throw new Error('Could not create user b/c profile was undefined.');
        } else if (!user.id && !user.uid) {
            throw new Error('Could not create user b/b id was undefined.');
        } else if (user.uid && user.uid !== '') {
            return firebase.firestore().collection('users').doc(user.uid)
                .set(user);
        } else {
            if (user.id.indexOf('@') > 0) console.warn('Using an email as a ' +
                'user ID is deprecated.');
            return firebase.firestore().collection('usersByEmail').doc(user.id)
                .set(user);
        }
        return firebase.firestore().collection('users').doc(user.id)
            .set(user);
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

    static async notifyAppt(day, tutor, pupil) {
        return axios({
            method: 'get',
            url: window.app.functionsURL + '/apptNotification',
            params: {
                token: (await firebase.auth().currentUser.getIdToken(true)),
                location: window.app.location.id,
                day: day,
                tutor: tutor || false,
                pupil: pupil || false,
            },
        }).then((res) => {
            if (typeof res.data === 'string' && res.data.indexOf('ERROR') > 0)
                throw new Error(res.data.replace('[ERROR]', ''));
            return res.data;
        });
    }

    // This post function calls a REST API that will:
    // 1) perform the given action using information given
    // 2a) axios will throw a "Network Error" for uncaught errors server-side
    // 2b) res.data will be "ERROR" for known errors server-side
    // 2c) res.data will be "SUCCESS" when there are no errors server-side
    // Whenever a data function is called, the app will wait for a "SUCCESS" 
    // before showing the user a snackbar. If an error is thrown, we show the 
    // user an error message snackbar.
    static async post(action, data) {
        return axios({
            method: 'post',
            url: window.app.functionsURL + '/data',
            params: {
                user: window.app.user.id || window.app.user.email,
                action: action,
                token: (await firebase.auth().currentUser.getIdToken(true)),
            },
            data: data,
        }).then((res) => {
            if (typeof res.data === 'string' && res.data.indexOf('ERROR') > 0)
                throw new Error(res.data.replace('[ERROR] ', ''));
            return res.data;
        }).catch((err) => {
            console.error('Error during ' + action + ' REST API call.', err);
            throw err;
        });
    }

    static requestPayout() {
        return Data.post('requestPayout');
    }

    static requestPaymentFor(appt, id) {
        return Data.post('requestPaymentFor', {
            appt: appt,
            id: id,
        });
    }

    static approvePayment(approvedPayment, id) {
        return Data.post('approvePayment', {
            approvedPayment: approvedPayment,
            id: id,
        });
    }

    static denyPayment(deniedPayment, id) {
        return Data.post('denyPayment', {
            deniedPayment: deniedPayment,
            id: id,
        });
    }

    static approveClockIn(clockIn, id) {
        return Data.post('approveClockIn', {
            clockIn: clockIn,
            id: id,
        });
    }

    static approveClockOut(clockOut, id) {
        return Data.post('approveClockOut', {
            clockOut: clockOut,
            id: id,
        });
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

    static cloneMap(map) { // Don't create dependency loops by require('@tutorbook/utils')
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

    static instantClockIn(appt, id) { // Sends and approves clock in request
        return Data.post('instantClockIn', {
            appt: appt,
            id: id,
        });
    }

    static instantClockOut(appt, id) { // Sends and approves clock out request
        return Data.post('instantClockOut', {
            appt: appt,
            id: id,
        });
    }

    static clockIn(appt, id) {
        return Data.post('clockIn', {
            appt: appt,
            id: id,
        });
    }

    static clockOut(appt, id) {
        return Data.post('clockOut', {
            appt: appt,
            id: id,
        });
    }

    static approveRequest(request, id) {
        return Data.post('approveRequest', {
            request: request,
            id: id,
        });
    }

    static modifyAppt(appt, id) {
        return Data.post('modifyAppt', {
            appt: appt,
            id: id,
        });
    }

    static deletePastAppt(appt, id) {
        return Data.post('deletePastAppt', {
            appt: appt,
            id: id,
        });
    }

    static cancelAppt(appt, id) {
        return Data.post('cancelAppt', {
            appt: appt,
            id: id,
        });
    }

    static rejectRequest(request, id) {
        return Data.post('rejectRequest', {
            request: request,
            id: id,
        });
    }

    static cancelRequest(request, id) {
        return Data.post('cancelRequest', {
            request: request,
            id: id,
        });
    }

    static modifyRequest(request, id) {
        return Data.post('modifyRequest', {
            request: request,
            id: id,
        });
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

    static newRequest(request, payment) {
        return Data.post('newRequest', {
            request: request,
            payment: payment,
        });
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
            if (window.app.location.name === 'Any' ||
                window.app.location.id === doc.id) {
                this.locationsByName[doc.data().name] = doc.id;
                this.locationDataByName[doc.data().name] = doc.data();
                this.locationsByID[doc.id] = doc.data().name;
                this.locationDataByID[doc.id] = doc.data();
                this.locationNames.push(doc.data().name);
                this.locationIDs.push(doc.id);
            }
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
        for (var i = 5; i <= 200; i += 5) {
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
        showProfile: true,
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
        policy: 'Hourly rate is $25.00 per hour. Will accept ' +
            'lesson cancellations if given notice within 24 hours.' +
            ' No refunds will be issued unless covered by a Tutorbook ' +
            'guarantee.',
    },
    authenticated: false,
    secondsTutored: 0,
    secondsPupiled: 0,
    location: (window.app) ? window.app.location.name : 'Gunn Academic Center',
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

Data.addresses = {
    'Any': '780 Arastradero Rd, Palo Alto, CA 94306',
    'Gunn Academic Center': '780 Arastradero Rd, Palo Alto, CA 94306',
    'Paly Peer Tutoring Center': '50 Embarcadero Rd, Palo Alto, CA 94301',
};

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
    'Algebra 1', // Gunn
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
    'Pre-Algebra', // JLS
    'Math 6',
    'Math 7',
    'Math 7A',
    'Math 8',
    'Algebra 8',
];

Data.techSubjects = [
    'Computer Science', // Gunn
    'AP Comp Sci A',
    'AP Comp Sci P',
    'FOOP',
    'Industrial Tech 1A', // JLS
    'Industrial Tech 1B',
    'Keyboarding',
    'Computer Programming',
    'Web Design 1A',
    'Web Design 1B',
    'Design and Technology',
    'Yearbook',
    'Multimedia Art',
    'Video Production',
];

Data.artSubjects = [
    'Art Spectrum', // Gunn
    'AP Art History',
    'Photography 1',
    'Video 1',
    'Yearbook', // JLS
    'Video Production',
    'Art 1A',
    'Art 1B',
    'Ceramics and Sculpture',
    'Multimedia Art',
    'Drama 1A',
    'Drama 1B',
];

Data.scienceSubjects = [
    'Astrophysics', // Gunn
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
    'Science 6', // JLS
    'Science 7',
    'Science 8',
];

Data.historySubjects = [
    'World History', // Gunn
    'Cont World History',
    'Government',
    'US History',
    'APUSH',
    'Economics',
    'AP Economics',
    'Psychology',
    'AP Psychology',
    'Social Studies 6', // JLS
    'Social Studies 7',
    'Social Studies 8',
];

Data.languageSubjects = [
    'French 1', // Gunn
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
    'French 1A', // JLS
    'French 1B',
    'Japanese 1A',
    'Japanese 1B',
    'Spanish 1A',
    'Spanish 1B',
    'Mandarin 1A',
    'German 1A',
];

Data.englishSubjects = [
    'Western Lit', // Gunn
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
    'English 6', // JLS
    'English 7',
    'English 8',
];

Data.lifeSkills = [
    'Planning', // Gunn
    'Organization',
    'Study Skills',
    'Other',
    'Leadership', // JLS
    'Public Speaking',
];

Data.subjects = [
    // MATH
    'Algebra 1', // Gunn
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
    'Pre-Algebra', // JLS
    'Math 6',
    'Math 7',
    'Math 7A',
    'Math 8',
    'Algebra 8',
    // TECHNOLOGY
    'Computer Science', // Gunn
    'AP Comp Sci A',
    'AP Comp Sci P',
    'FOOP',
    'Industrial Tech 1A', // JLS
    'Industrial Tech 1B',
    'Keyboarding',
    'Computer Programming',
    'Web Design 1A',
    'Web Design 1B',
    'Design and Technology',
    'Yearbook',
    'Multimedia Art',
    'Video Production',
    // ART
    'Art Spectrum', // Gunn
    'AP Art History',
    'Photography 1',
    'Video 1',
    'Yearbook', // JLS
    'Video Production',
    'Art 1A',
    'Art 1B',
    'Ceramics and Sculpture',
    'Multimedia Art',
    'Drama 1A',
    'Drama 1B',
    // SCIENCE
    'Astrophysics', // Gunn
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
    'Science 6', // JLS
    'Science 7',
    'Science 8',
    // HISTORY
    'World History', // Gunn
    'Cont World History',
    'Government',
    'US History',
    'APUSH',
    'Economics',
    'AP Economics',
    'Psychology',
    'AP Psychology',
    'Social Studies 6', // JLS
    'Social Studies 7',
    'Social Studies 8',
    // LANGUAGE
    'French 1', // Gunn
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
    'French 1A', // JLS
    'French 1B',
    'Japanese 1A',
    'Japanese 1B',
    'Spanish 1A',
    'Spanish 1B',
    'Mandarin 1A',
    'German 1A',
    // ENGLISH
    'Western Lit', // Gunn
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
    'English 6', // JLS
    'English 7',
    'English 8',
    // LIFE SKILLS
    'Planning', // Gunn
    'Organization',
    'Study Skills',
    'Other',
    'Leadership', // JLS
    'Public Speaking',
];

Data.genders = [
    'Male',
    'Female',
    'Other'
];

Data.types = [
    'Tutor',
    'Pupil',
    'Parent',
    'Supervisor',
];

module.exports = Data;