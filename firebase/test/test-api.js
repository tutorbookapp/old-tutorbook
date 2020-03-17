// =============================================================================
// DEPENDENCIES
// =============================================================================

const {
    PROJECT_ID,
    COVERAGE_URL,
    FIRESTORE_RULES,
    FUNCTIONS_URL,
} = require('./config.js');
const {
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
} = require('./data.js');

const {
    combineMaps,
    authedApp,
    data,
} = require('./utils.js');

debugger;

const fs = require('fs');
const axios = require('axios');
const firebaseApp = require('firebase').initializeApp({
    projectId: PROJECT_ID,
    databaseURL: 'https://' + PROJECT_ID + '.firebaseio.com',
    storageBucket: PROJECT_ID + '.appspot.com',
    locationId: 'us-central',
    apiKey: 'AIzaSyCNaEj1Mbi-79cGA0vW48iqZtrbtU-NTh4',
    authDomain: PROJECT_ID + '.firebaseapp.com',
    messagingSenderId: '488773238477',
});
const firebase = require('@firebase/testing');

// =============================================================================
// REST API TESTS
// =============================================================================

beforeEach(async () => { // Clear the database simulator between tests.
    await firebase.clearFirestoreData({
        projectId: PROJECT_ID,
    });
});

before(async () => { // Load the Firestore rules before testing.
    await firebase.loadFirestoreRules({
        projectId: PROJECT_ID,
        rules: FIRESTORE_RULES,
    });
});

after(async () => { // Delete test app instances and log coverage info URL.
    await Promise.all(firebase.apps().map(app => app.delete()));
    console.log('View rule coverage information at ' + COVERAGE_URL + ' \n');
});

describe('Tutorbook\'s REST API', () => {

    async function getToken(user) {
        const res = await axios({
            method: 'post',
            url: 'https://us-central1-' + PROJECT_ID + '.cloudfunctions.net/auth',
            params: {
                user: user,
                token: process.env.TUTORBOOK_TEST_GET_AUTH_TOKEN,
            },
        });
        if (typeof res.data === 'string' && res.data.indexOf('ERROR') > 0)
            throw new Error(res.data.replace('[ERROR] ', ''));
        await firebaseApp.auth().signInWithCustomToken(res.data);
        const token = await firebaseApp.auth().currentUser.getIdToken(true);
        await firebaseApp.auth().signOut();
        return token;
    };

    async function post(user, action, data) {
        const uid = (user === PUPIL.email) ? PUPIL.uid :
            (user === TUTOR.email) ? TUTOR.uid :
            (user === SUPERVISOR.email) ? SUPERVISOR.uid : null;
        if (!uid) throw new Error('Unknown email (' + user + ').');
        return axios({
            method: 'post',
            url: FUNCTIONS_URL + 'data',
            params: {
                user: uid,
                action: action,
                token: (await getToken(user)),
            },
            data: data,
        }).then((res) => {
            if (typeof res.data === 'string' && res.data.indexOf('ERROR') > 0)
                throw new Error(res.data.replace('[ERROR] ', ''));
            return res;
        });
    };

    // =========================================================================
    // USERs
    // =========================================================================

    function createUsers() {
        const state = {};
        [TUTOR, PUPIL, SUPERVISOR].map(u => state['users/' + u.uid] = u);
        return data(state);
    };

    it('lets users send messages', async () => {
        await createUsers();
        const db = authedApp({
            uid: PUPIL.uid,
            email: PUPIL.email,
        });
        const chat = db.collection('chats').doc();
        await firebase.assertSucceeds(chat.set({
            lastMessage: {
                sentBy: PUPIL,
                message: 'This is a test.',
                timestamp: new Date(),
            },
            chatters: [
                PUPIL,
                SUPERVISOR,
            ],
            chatterUIDs: [
                PUPIL.uid,
                SUPERVISOR.uid,
            ],
            chatterEmails: [
                PUPIL.email,
                SUPERVISOR.email,
            ],
            location: LOCATION,
            createdBy: PUPIL,
            name: '', // We just use the chatter name as the chat name
            photo: '', // We just use the chatter photo as the chat photo
        }));
        await firebase.assertSucceeds(chat.collection('messages').doc().set({
            sentBy: PUPIL,
            message: 'This is a test.',
            timestamp: new Date(),
        }));
    });

    // =========================================================================
    // REQUESTs
    // =========================================================================

    async function createRequest() {
        await createUsers();
        const state = {};
        state['users/' + TUTOR.uid + '/requestsIn/' + REQUEST_ID] = REQUEST;
        state['users/' + PUPIL.uid + '/requestsOut/' + REQUEST_ID] = REQUEST;
        await data(state);
        return [REQUEST, REQUEST_ID];
    };

    it('lets authenticated users send requests', () => {
        return post(PUPIL.email, 'newRequest', {
            request: REQUEST,
            payment: {}
        });
    });

    it('lets the sender modify a request', async () => {
        [request, id] = await createRequest();
        request.time.day = 'Wednesday';
        return post(PUPIL.email, 'modifyRequest', {
            request: request,
            id: id,
        });
    });

    it('lets the receiver modify a request', async () => {
        [request, id] = await createRequest();
        request.time.day = 'Wednesday';
        return post(TUTOR.email, 'modifyRequest', {
            request: request,
            id: id,
        });
    });

    it('lets the sender cancel a request', async () => {
        [request, id] = await createRequest();
        return post(PUPIL.email, 'cancelRequest', {
            request: request,
            id: id,
        });
    });

    it('lets the receiver reject a request', async () => {
        [request, id] = await createRequest();
        return post(TUTOR.email, 'rejectRequest', {
            request: request,
            id: id,
        });
    });

    async function approveRequest() {
        await createUsers();
        const state = {};
        state['users/' + PUPIL.uid + '/approvedRequestsOut/' + APPROVED_REQUEST_ID] = APPROVED_REQUEST;
        state['users/' + PUPIL.uid + '/appointments/' + APPT_ID] = APPT;
        state['users/' + TUTOR.uid + '/appointments/' + APPT_ID] = APPT;
        state['locations/' + LOCATION_ID + '/appointments/' + APPT_ID] = APPT;
        await data(state);
        return [APPT, APPT_ID];
    };

    it('lets the receiver approve a request', async () => {
        [request, id] = await createRequest();
        return post(TUTOR.email, 'approveRequest', {
            request: request,
            id: id,
        });
    });

    it('lets supervisors create requests', () => {
        return post(SUPERVISOR.email, 'newRequest', {
            request: REQUEST,
            payment: {}
        });
    });

    it('lets supervisors modify requests', async () => {
        [request, id] = await createRequest();
        request.time.day = 'Wednesday';
        return post(SUPERVISOR.email, 'modifyRequest', {
            request: request,
            id: id,
        });
    });

    it('lets supervisors cancel requests', async () => {
        [request, id] = await createRequest();
        return post(SUPERVISOR.email, 'cancelRequest', {
            request: request,
            id: id,
        });
    });

    it('lets supervisors reject requests', async () => {
        [request, id] = await createRequest();
        return post(SUPERVISOR.email, 'rejectRequest', {
            request: request,
            id: id,
        });
    });

    it('lets supervisors approve requests', async () => {
        [request, id] = await createRequest();
        return post(SUPERVISOR.email, 'approveRequest', {
            request: request,
            id: id,
        });
    });

    // =========================================================================
    // APPOINTMENTs
    // =========================================================================

    it('lets attendees modify appointments', async () => {
        [appt, id] = await approveRequest();
        appt.time.day = 'Wednesday';
        await post(TUTOR.email, 'modifyAppt', {
            appt: appt,
            id: id,
        });
        appt.time.day = 'Thursday';
        return post(PUPIL.email, 'modifyAppt', {
            appt: appt,
            id: id,
        });
    });

    it('lets attendees cancel appointments', async () => {
        [appt, id] = await approveRequest();
        await post(TUTOR.email, 'cancelAppt', {
            appt: appt,
            id: id,
        });
        [appt, id] = await approveRequest();
        return post(PUPIL.email, 'cancelAppt', {
            appt: appt,
            id: id,
        });
    });

    it('lets supervisors modify appointments', async () => {
        [appt, id] = await approveRequest();
        appt.time.day = 'Wednesday';
        return post(SUPERVISOR.email, 'modifyAppt', {
            appt: appt,
            id: id,
        });
    });

    it('lets supervisors cancel appointments', async () => {
        [appt, id] = await approveRequest();
        return post(SUPERVISOR.email, 'cancelAppt', {
            appt: appt,
            id: id,
        });
    });

    // =========================================================================
    // CLOCK-INs/OUTs
    // =========================================================================

    async function createLocation() {
        const state = {};
        state['locations/' + LOCATION_ID] = LOCATION;
        await data(state);
        return [LOCATION, LOCATION_ID];
    };

    async function clockIn() {
        await approveRequest();
        const state = {};
        state['locations/' + LOCATION_ID + '/clockIns/' + CLOCK_IN_ID] = CLOCK_IN;
        await data(state);
        return [CLOCK_IN, CLOCK_IN_ID];
    };

    it('lets tutors clock-in to appointments', async () => {
        const [appt, id] = await approveRequest();
        await createLocation();
        return post(TUTOR.email, 'clockIn', {
            appt: appt,
            id: id,
        });
    });

    it('lets supervisors clock tutors into appointments', async () => {
        const [appt, id] = await approveRequest();
        return post(SUPERVISOR.email, 'clockIn', {
            appt: appt,
            id: id,
        });
    });

    async function approveClockIn() {
        await approveRequest();
        const state = {};
        state['locations/' + LOCATION_ID + '/approvedClockIns/' + APPROVED_CLOCK_IN_ID] = APPROVED_CLOCK_IN;
        state['locations/' + LOCATION_ID + '/activeAppointments/' + ACTIVE_APPT_ID] = ACTIVE_APPT;
        state['users/' + TUTOR.uid + '/activeAppointments/' + ACTIVE_APPT_ID] = ACTIVE_APPT;
        state['users/' + PUPIL.uid + '/activeAppointments/' + ACTIVE_APPT_ID] = ACTIVE_APPT;
        await data(state);
        return [ACTIVE_APPT, ACTIVE_APPT_ID];
    };

    it('lets supervisors approve clock-in requests', async () => {
        const [clockInData, id] = await clockIn();
        return post(SUPERVISOR.email, 'approveClockIn', {
            clockIn: clockInData,
            id: id,
        });
    });

    async function clockOut() {
        await approveClockIn();
        const state = {};
        state['locations/' + LOCATION_ID + '/clockOuts/' + CLOCK_OUT_ID] = CLOCK_OUT;
        await data(state);
        return [CLOCK_OUT, CLOCK_OUT_ID];
    };

    it('lets tutors clock-out of active appointments', async () => {
        const [appt, id] = await approveClockIn();
        return post(TUTOR.email, 'clockOut', {
            appt: appt,
            id: id,
        });
    });

    it('lets supervisors clock tutors out of active appointments', async () => {
        const [appt, id] = await approveClockIn();
        return post(SUPERVISOR.email, 'clockOut', {
            appt: appt,
            id: id,
        });
    });

    async function approveClockOut() {
        await approveRequest();
        const state = {};
        state['locations/' + LOCATION_ID + '/approvedClockOuts/' + APPROVED_CLOCK_OUT_ID] = APPROVED_CLOCK_OUT;
        state['locations/' + LOCATION_ID + '/pastAppointments/' + PAST_APPT_ID] = PAST_APPT;
        state['users/' + TUTOR.uid + '/pastAppointments/' + PAST_APPT_ID] = PAST_APPT;
        state['users/' + PUPIL.uid + '/pastAppointments/' + PAST_APPT_ID] = PAST_APPT;
        await data(state);
        return [PAST_APPT, PAST_APPT_ID];
    };

    it('lets supervisors approve clock-out requests', async () => {
        const [clockOutData, id] = await clockOut();
        return post(SUPERVISOR.email, 'approveClockOut', {
            clockOut: clockOutData,
            id: id,
        });
    });

    it('lets supervisors modify past appointments', async () => {
        const [appt, id] = await approveClockOut();
        return post(SUPERVISOR.email, 'modifyPastAppt', {
            appt: combineMaps(appt, {
                clockIn: combineMaps(appt.clockIn, {
                    sentTimestamp: new Date(),
                }),
            }),
            id: id,
        });
    });

    it('lets supervisors perform instant clock-ins', async () => {
        const [appt, id] = await approveRequest();
        await createLocation();
        return post(SUPERVISOR.email, 'instantClockIn', {
            appt: appt,
            id: id,
        });
    });

    it('lets supervisors perform instant clock-outs', async () => {
        const [appt, id] = await approveClockIn();
        return post(SUPERVISOR.email, 'instantClockOut', {
            appt: appt,
            id: id,
        });
    });

    // =========================================================================
    // TODO: PAYMENTs
    // =========================================================================

    // =========================================================================
    // SUPERVISORs
    // =========================================================================

    it('lets supervisors create locations', async () => {
        await createUsers();
        return post(SUPERVISOR.email, 'createLocation', {
            location: LOCATION,
            id: LOCATION_ID,
        });
    });

    it('lets supervisors update locations', async () => {
        await createUsers();
        const [location, id] = await createLocation();
        return post(SUPERVISOR.email, 'updateLocation', {
            location: combineMaps(location, {
                description: 'This is a modified description.',
            }),
            id: id,
        });
    });

    it('lets supervisors delete locations', async () => {
        await createUsers();
        const [location, id] = await createLocation();
        return post(SUPERVISOR.email, 'deleteLocation', {
            id: id,
        });
    });

    it('lets supervisors send announcements', async () => {
        await createUsers();
        const [locationData, locationId] = await createLocation();
        const db = authedApp({
            uid: SUPERVISOR.uid,
            email: SUPERVISOR.email,
            locations: [LOCATION_ID],
        });
        const chat = db.collection('locations').doc(locationId)
            .collection('announcements').doc();
        await firebase.assertSucceeds(chat.set({
            lastMessage: {
                sentBy: SUPERVISOR,
                message: 'This is a test.',
                timestamp: new Date(),
            },
            chatters: [
                PUPIL,
                SUPERVISOR,
            ],
            chatterUIDs: [
                PUPIL.uid,
                SUPERVISOR.uid,
            ],
            chatterEmails: [
                PUPIL.email,
                SUPERVISOR.email,
            ],
            location: LOCATION,
            createdBy: SUPERVISOR,
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
        }));
        await firebase.assertSucceeds(chat.collection('messages').doc().set({
            sentBy: SUPERVISOR,
            message: 'This is a test.',
            timestamp: new Date(),
        }));
    });

    it('lets supervisors download PDF backups of database', async () => {
        await approveRequest();
        await createLocation();
        return axios({
            method: 'get',
            url: FUNCTIONS_URL + 'backupAsPDF',
            responseType: 'stream',
            params: {
                token: (await getToken(SUPERVISOR.email)),
                location: LOCATION_ID,
                test: false,
                tutors: true,
                pupils: true,
            },
        }).then((res) => {
            res.data.pipe(fs.createWriteStream('exports/backup.pdf'));
        });
    });

    it('lets supervisors download individual service hour logs', async () => {
        await approveClockOut();
        return axios({
            method: 'get',
            url: FUNCTIONS_URL + 'serviceHoursAsPDF',
            responseType: 'stream',
            params: {
                token: (await getToken(SUPERVISOR.email)),
                location: LOCATION_ID,
                test: false,
                uid: TUTOR.uid,
            },
        }).then((res) => {
            res.data.pipe(fs.createWriteStream('exports/ind-service-hrs.pdf'));
        });
    });

    it('lets supervisors download everyone\'s service hour logs', async () => {
        await approveClockOut();
        return axios({
            method: 'get',
            url: FUNCTIONS_URL + 'serviceHoursAsPDF',
            responseType: 'stream',
            params: {
                token: (await getToken(SUPERVISOR.email)),
                location: LOCATION_ID,
                test: false,
            },
        }).then((res) => {
            res.data.pipe(fs.createWriteStream('exports/all-service-hrs.pdf'));
        });
    });
});