// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Clones a variety of different objects (`Array`, `Date`, `Object`) and 
 * variable types.
 * @param val - The value to clone.
 * @return The cloned value (same type as the given `val`).
 */
const clone = (val) => {
    return val instanceof Array ? cloneArr(val) :
        val instanceof Date ? new Date(val) :
        val instanceof Object ? cloneMap(val) : val;
};

/**
 * Takes in a map (`map`) and returns a copy of it.
 * @param {Map} map - The map to clone.
 * @return {Map} The cloned map (exactly the same; but it doesn't (and none of
 * it's constituents) point towards the same object).
 */
const cloneMap = (map) => {
    const res = {};
    for (var i in map) res[i] = clone(map[i]);
    return res;
};

/**
 * Takes in an array (`arr`) and returns a copy of it.
 * @param {Array} arr - The array to clone.
 * @return {Array} The cloned array (exactly the same; but it doesn't (and none 
 * of it's constituents) point towards the same object).
 */
const cloneArr = (arr) => {
    return arr.map(i => clone(i));
};

/**
 * Takes in a profile/user object and returns the concise (filtered) version of
 * it (that is stored in requests, appointments, clocking requests, etc).
 */
const conciseUser = (profile) => {
    return {
        name: profile.name,
        email: profile.email,
        uid: profile.uid,
        id: profile.id,
        photo: profile.photo,
        type: profile.type,
        grade: profile.grade,
        gender: profile.gender,
        hourlyCharge: profile.payments.hourlyCharge,
        location: profile.location,
        payments: profile.payments,
        proxy: profile.proxy,
    };
};

// =============================================================================
// PLACEHOLDER DATA
// =============================================================================

const ACCESS = {
    name: 'Palo Alto Unified School District',
    symbol: 'PAUSD',
};
const ACCESS_ID = 'H542qmTScoXfCDLtpM62';

const SUPERVISOR_UID = 'OAmavOtc6GcL2BuxFJu4sd5rwDu1';
const LOCATION = {
    name: 'Gunn Academic Center',
    description: 'The Academic Center is a clean, well-lighted place for ' +
        'students to study, do homework, print, tutor or be tutored.',
    url: 'https://gunn.tutorbook.app',
    supervisors: [SUPERVISOR_UID],
    hours: {
        'Monday': [{
            open: '2:45 PM',
            close: '3:45 PM',
        }, {
            open: 'A Period',
            close: 'A Period',
        }],
    },
    config: {
        hrs: {
            rounding: 'Up',
            threshold: '30 Minutes',
            timeThreshold: '5 Minutes',
        },
    },
};
const LOCATION_ID = 'NJp0Y6wyMh2fDdxSuRSx';

const WEBSITE = {
    grades: ['Freshman', 'Sophomore', 'Junior', 'Senior'],
    locations: [LOCATION_ID],
    url: 'https://gunn.tutorbook.app/',
};
const WEBSITE_ID = 'JJ5BuGZ1za0eON81vdOh';

const TUTOR = {
    name: 'Tutor Tutorbook',
    email: 'tutor@tutorbook.app',
    id: 'tutor@tutorbook.app',
    uid: 'nuCqWin1KAcnAvOhlWYq5qWOj123',
    photo: 'https://tutorbook.app/app/img/male.png',
    type: 'Tutor',
    gender: 'Male',
    grade: 'Sophomore',
    config: {
        showProfile: true,
    },
    payments: {
        currentBalance: 0,
        hourlyCharge: 0,
        type: 'Free',
    },
    proxy: [],
    subjects: ['Marine Biology'],
    secondsPupiled: 0,
    secondsTutored: 0,
    location: LOCATION.name,
    access: [ACCESS_ID],
    avgRating: 0,
    numRatings: 0,
    availability: [{
        location: {
            id: LOCATION_ID,
            name: LOCATION.name,
        },
        day: 'Monday',
        from: '2:45 PM',
        to: '3:45 PM',
    }],
};

const PUPIL = {
    name: 'Pupil Tutorbook',
    email: 'pupil@tutorbook.app',
    id: 'pupil@tutorbook.app',
    uid: 'HBnt90xkbOW9GMZGJCacbqnK2hI3',
    photo: 'https://tutorbook.app/app/img/male.png',
    type: 'Pupil',
    gender: 'Male',
    grade: 'Sophomore',
    config: {
        showProfile: true,
    },
    payments: {
        currentBalance: 0,
        hourlyCharge: 0,
        type: 'Free',
    },
    proxy: [],
    subjects: ['Marine Biology'],
    secondsPupiled: 0,
    secondsTutored: 0,
    location: LOCATION.name,
    access: [ACCESS_ID],
    avgRating: 0,
    numRatings: 0,
    availability: [{
        location: {
            id: LOCATION_ID,
            name: LOCATION.name,
        },
        day: 'Monday',
        from: '2:45 PM',
        to: '3:45 PM',
    }],
};

const SUPERVISOR = {
    name: 'Supervisor Tutorbook',
    email: 'supervisor@tutorbook.app',
    id: 'supervisor@tutorbook.app',
    uid: SUPERVISOR_UID,
    photo: 'https://tutorbook.app/app/img/female.png',
    type: 'Supervisor',
    gender: 'Female',
    grade: 'Adult',
    config: {
        showProfile: true,
    },
    payments: {
        currentBalance: 0,
        hourlyCharge: 0,
        type: 'Free',
    },
    proxy: [],
    secondsPupiled: 0,
    secondsTutored: 0,
    location: LOCATION.name,
    access: [ACCESS_ID],
    avgRating: 0,
    numRatings: 0,
    availability: [{
        location: {
            id: LOCATION_ID,
            name: LOCATION.name,
        },
        day: 'Monday',
        from: '2:45 PM',
        to: '3:45 PM',
    }],
};

const REQUEST = {
    fromUser: conciseUser(PUPIL),
    toUser: conciseUser(TUTOR),
    subject: PUPIL.subjects[0],
    time: {
        day: 'Monday',
        from: '2:45 PM',
        to: '3:45 PM',
    },
    location: {
        name: LOCATION.name,
        id: LOCATION_ID,
    },
    payment: {
        type: 'Free',
        amount: 25,
        method: 'Stripe',
    },
    timestamp: new Date(),
};
const REQUEST_ID = 'j0FfEHU2IvwVvNdl6rEx';

const APPROVED_REQUEST = {
    for: cloneMap(REQUEST),
    approvedBy: conciseUser(TUTOR),
    approvedTimestamp: new Date(),
};
const APPROVED_REQUEST_ID = REQUEST_ID;

const APPT = { // TODO: Why do we have `access` fields on these documents?
    attendees: [conciseUser(PUPIL), conciseUser(TUTOR)],
    for: cloneMap(REQUEST),
    location: cloneMap(REQUEST.location),
    time: cloneMap(REQUEST.time),
    timestamp: new Date(),
};
const APPT_ID = REQUEST_ID;

const APPROVED_CLOCK_IN_ID = '9OY6F7CZYifaA6Vio6Zj';
const REJECTED_CLOCK_IN_ID = 'in6H94C8EJWJuRrdLlJc';

const APPROVED_CLOCK_IN = {
    for: cloneMap(APPT),
    sentBy: conciseUser(TUTOR),
    sentTimestamp: new Date(),
    approvedBy: conciseUser(SUPERVISOR),
    approvedTimestamp: new Date(),
    approvedRef: 'partitions/default/locations/' + LOCATION_ID +
        '/approvedClockIns/' + APPROVED_CLOCK_IN_ID,
    rejectedRef: 'partitions/default/locations/' + LOCATION_ID +
        '/rejectedClockIns/' + REJECTED_CLOCK_IN_ID,
};

const REJECTED_CLOCK_IN = {
    for: cloneMap(APPT),
    sentBy: conciseUser(TUTOR),
    sentTimestamp: new Date(),
    rejectedBy: conciseUser(SUPERVISOR),
    rejectedTimestamp: new Date(),
    rejectedRef: 'partitions/default/locations/' + LOCATION_ID +
        '/rejectedClockIns/' + REJECTED_CLOCK_IN_ID,
    approvedRef: 'partitions/default/locations/' + LOCATION_ID +
        '/approvedClockIns/' + APPROVED_CLOCK_IN_ID,
};

const CLOCK_IN = {
    for: cloneMap(APPT),
    sentBy: conciseUser(TUTOR),
    sentTimestamp: new Date(),
    approvedRef: 'partitions/default/locations/' + LOCATION_ID +
        '/approvedClockIns/' + APPROVED_CLOCK_IN_ID,
    rejectedRef: 'partitions/default/locations/' + LOCATION_ID +
        '/rejectedClockIns/' + REJECTED_CLOCK_IN_ID,
};
const CLOCK_IN_ID = APPT_ID;

const ACTIVE_APPT = {
    attendees: [conciseUser(PUPIL), conciseUser(TUTOR)],
    for: cloneMap(REQUEST),
    location: cloneMap(REQUEST.location),
    time: cloneMap(REQUEST.time),
    timestamp: new Date(APPT.timestamp),
    clockIn: cloneMap(APPROVED_CLOCK_IN),
};
const ACTIVE_APPT_ID = CLOCK_IN_ID;

const APPROVED_CLOCK_OUT_ID = 'fCiLTf2AY01W8G6n0SME';
const REJECTED_CLOCK_OUT_ID = 'lWSPi8J5ayWSO2vRhgp1';

const APPROVED_CLOCK_OUT = {
    for: cloneMap(ACTIVE_APPT),
    sentBy: conciseUser(TUTOR),
    sentTimestamp: new Date(),
    approvedBy: conciseUser(SUPERVISOR),
    approvedTimestamp: new Date(),
    approvedRef: 'partitions/default/locations/' + LOCATION_ID +
        '/approvedClockOuts/' + APPROVED_CLOCK_OUT_ID,
    rejectedRef: 'partitions/default/locations/' + LOCATION_ID +
        '/rejectedClockOuts/' + REJECTED_CLOCK_OUT_ID,
};

const REJECTED_CLOCK_OUT = {
    for: cloneMap(ACTIVE_APPT),
    sentBy: conciseUser(TUTOR),
    sentTimestamp: new Date(),
    rejectedBy: conciseUser(SUPERVISOR),
    rejectedTimestamp: new Date(),
    rejectedRef: 'partitions/default/locations/' + LOCATION_ID +
        '/rejectedClockOuts/' + REJECTED_CLOCK_OUT_ID,
    approvedRef: 'partitions/default/locations/' + LOCATION_ID +
        '/approvedClockOuts/' + APPROVED_CLOCK_OUT_ID,
};

const CLOCK_OUT = {
    for: cloneMap(ACTIVE_APPT),
    sentBy: conciseUser(TUTOR),
    sentTimestamp: new Date(),
    approvedRef: 'partitions/default/locations/' + LOCATION_ID +
        '/approvedClockOuts/' + APPROVED_CLOCK_OUT_ID,
    rejectedRef: 'partitions/default/locations/' + LOCATION_ID +
        '/rejectedClockOuts/' + REJECTED_CLOCK_OUT_ID,
};
const CLOCK_OUT_ID = ACTIVE_APPT_ID;

const PAST_APPT = {
    attendees: [conciseUser(PUPIL), conciseUser(TUTOR)],
    for: cloneMap(REQUEST),
    location: cloneMap(REQUEST.location),
    time: cloneMap(REQUEST.time),
    timestamp: new Date(ACTIVE_APPT.timestamp),
    clockIn: cloneMap(APPROVED_CLOCK_IN),
    clockOut: cloneMap(APPROVED_CLOCK_OUT),
};
const PAST_APPT_ID = '31i0rJPYKH2Dm1V5laOS';

const MESSAGE = {
    sentBy: conciseUser(PUPIL),
    message: 'This is a test.',
    timestamp: new Date(),
};

const CHAT = {
    lastMessage: cloneMap(MESSAGE),
    chatters: [conciseUser(PUPIL), conciseUser(TUTOR)],
    chatterUIDs: [PUPIL.uid, TUTOR.uid],
    chatterEmails: [PUPIL.email, TUTOR.email],
    location: {
        id: LOCATION_ID,
        name: LOCATION.name,
    },
    createdBy: conciseUser(PUPIL),
    name: '', // We just use the chatter name as the chat name
    photo: '', // We just use the chatter photo as the chat photo
};

const ANNOUNCEMENT_MSG = {
    sentBy: conciseUser(SUPERVISOR),
    message: 'This is a test.',
    timestamp: new Date(),
};

const ANNOUNCEMENT_GROUP = {
    lastMessage: cloneMap(ANNOUNCEMENT_MSG),
    chatters: [conciseUser(PUPIL), conciseUser(SUPERVISOR)],
    chatterUIDs: [PUPIL.uid, SUPERVISOR.uid],
    chatterEmails: [PUPIL.email, SUPERVISOR.email],
    location: {
        id: LOCATION_ID,
        name: LOCATION.name,
    },
    createdBy: conciseUser(SUPERVISOR),
    name: '', // We just use the chatter name as the chat name
    photo: '', // We just use the chatter photo as the chat photo
    filters: {
        availability: {},
        gender: 'Any',
        grade: 'Any',
        location: LOCATION.name,
        price: 'Free',
        showBooked: true,
        sort: 'Rating',
        subject: TUTOR.subjects[0],
        type: 'Any',
    },
};

module.exports = {
    LOCATION,
    LOCATION_ID,
    ACCESS,
    ACCESS_ID,
    WEBSITE,
    WEBSITE_ID,
    PUPIL,
    TUTOR,
    SUPERVISOR,
    REQUEST,
    REQUEST_ID,
    APPROVED_REQUEST,
    APPROVED_REQUEST_ID,
    APPT,
    APPT_ID,
    ACTIVE_APPT,
    ACTIVE_APPT_ID,
    PAST_APPT,
    PAST_APPT_ID,
    CLOCK_IN,
    CLOCK_IN_ID,
    APPROVED_CLOCK_IN,
    APPROVED_CLOCK_IN_ID,
    REJECTED_CLOCK_IN,
    REJECTED_CLOCK_IN_ID,
    CLOCK_OUT,
    CLOCK_OUT_ID,
    APPROVED_CLOCK_OUT,
    APPROVED_CLOCK_OUT_ID,
    REJECTED_CLOCK_OUT,
    REJECTED_CLOCK_OUT_ID,
    ANNOUNCEMENT_GROUP,
    ANNOUNCEMENT_MSG,
    CHAT,
    MESSAGE,
};