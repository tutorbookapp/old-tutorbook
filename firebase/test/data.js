// =============================================================================
// DEPENDENCIES
// =============================================================================

const {
    cloneMap,
    conciseUser,
} = require('./utils.js');

// =============================================================================
// PLACEHOLDER DATA
// =============================================================================

const ACCESS = {
    name: 'Palo Alto Unified School District',
    symbol: 'PAUSD',
};
const ACCESS_ID = 'H542qmTScoXfCDLtpM62';

const LOCATION = {
    name: 'Gunn Academic Center',
    url: 'https://gunn.tutorbook.app',
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
    type: 'Tutor',
    gender: 'Male',
    grade: 'Sophomore',
    config: {
        showProfile: true,
    },
    payments: {
        currentBalance: 0,
        type: 'Free',
    },
    subjects: ['Marine Biology'],
    secondsPupiled: 0,
    secondsTutored: 0,
    location: LOCATION.name,
    access: [ACCESS.id],
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
    type: 'Pupil',
    gender: 'Male',
    grade: 'Sophomore',
    config: {
        showProfile: true,
    },
    payments: {
        currentBalance: 0,
        type: 'Free',
    },
    subjects: ['Marine Biology'],
    secondsPupiled: 0,
    secondsTutored: 0,
    location: LOCATION.name,
    access: [ACCESS.id],
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
    uid: 'OAmavOtc6GcL2BuxFJu4sd5rwDu1',
    type: 'Supervisor',
    gender: 'Female',
    grade: 'Adult',
    config: {
        showProfile: true,
    },
    payments: {
        currentBalance: 0,
        type: 'Free',
    },
    secondsPupiled: 0,
    secondsTutored: 0,
    location: LOCATION.name,
    access: [ACCESS.id],
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

const APPT = {
    for: cloneMap(REQUEST),
    subject: REQUEST.subject,
    time: cloneMap(REQUEST.time),
    timestamp: new Date(),
};
const APPT_ID = REQUEST_ID;

const APPROVED_CLOCK_IN_ID = '9OY6F7CZYifaA6Vio6Zj';
const APPROVED_CLOCK_IN = {
    for: cloneMap(APPT),
    sentBy: conciseUser(TUTOR),
    sentTimestamp: new Date(),
    approvedBy: conciseUser(SUPERVISOR),
    approvedTimestamp: new Date(),
    approvedRef: 'partitions/default/locations/' + LOCATION_ID +
        '/approvedClockIns/' + APPROVED_CLOCK_IN_ID,
};

const CLOCK_IN = {
    for: cloneMap(APPT),
    sentBy: conciseUser(TUTOR),
    sentTimestamp: new Date(),
    approvedRef: 'partitions/default/locations/' + LOCATION_ID +
        '/approvedClockIns/' + APPROVED_CLOCK_IN_ID,
};
const CLOCK_IN_ID = APPT_ID;

const ACTIVE_APPT = {
    for: cloneMap(REQUEST),
    subject: REQUEST.subject,
    time: cloneMap(REQUEST.time),
    timestamp: new Date(),
    clockIn: cloneMap(CLOCK_IN),
};
const ACTIVE_APPT_ID = CLOCK_IN_ID;

const APPROVED_CLOCK_OUT_ID = 'fCiLTf2AY01W8G6n0SME';
const APPROVED_CLOCK_OUT = {
    for: cloneMap(ACTIVE_APPT),
    sentBy: conciseUser(TUTOR),
    sentTimestamp: new Date(),
    approvedBy: conciseUser(SUPERVISOR),
    approvedTimestamp: new Date(),
    approvedRef: 'partitions/default/locations/' + LOCATION_ID +
        '/approvedClockOuts/' + APPROVED_CLOCK_OUT_ID,
};

const CLOCK_OUT = {
    for: cloneMap(ACTIVE_APPT),
    sentBy: conciseUser(TUTOR),
    sentTimestamp: new Date(),
    approvedRef: 'partitions/default/locations/' + LOCATION_ID +
        '/approvedClockOuts/' + APPROVED_CLOCK_OUT_ID,
};
const CLOCK_OUT_ID = ACTIVE_APPT_ID;

const PAST_APPT = {
    for: cloneMap(REQUEST),
    subject: REQUEST.subject,
    time: cloneMap(REQUEST.time),
    timestamp: new Date(),
    clockIn: cloneMap(CLOCK_IN),
    clockOut: cloneMap(CLOCK_OUT),
};
const PAST_APPT_ID = '31i0rJPYKH2Dm1V5laOS';

module.exports = {
    PUPIL,
    TUTOR,
    SUPERVISOR,
    LOCATION,
    LOCATION_ID,
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
    CLOCK_OUT,
    CLOCK_OUT_ID,
    APPROVED_CLOCK_OUT,
    APPROVED_CLOCK_OUT_ID,
};