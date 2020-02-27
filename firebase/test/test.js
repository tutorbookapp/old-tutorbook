// =============================================================================
// CONFIG VARIABLES
// =============================================================================

const FUNCTIONS_URL = 'http://localhost:5001/tutorbook-779d8/us-central1/';
//const FUNCTIONS_URL = 'https://us-central1-tutorbook-779d8.cloudfunctions.net/';
const LOCATION = {
    name: 'Gunn Academic Center',
    id: 'NJp0Y6wyMh2fDdxSuRSx',
    url: 'https://gunn.tutorbook.app',
};
const TUTOR = {
    name: 'Tutor Tutorbook',
    email: 'tutor@tutorbook.app',
    id: 'tutor@tutorbook.app',
    uid: 'nuCqWin1KAcnAvOhlWYq5qWOj123',
    type: 'Tutor',
    gender: 'Male',
    config: {
        showProfile: true,
    },
    payments: {
        currentBalance: 0,
        currentBalanceString: '$0.00',
    },
    subjects: ['Marine Biology'],
    secondsPupiled: 0,
    secondsTutored: 0,
    location: LOCATION.name,
};
const PUPIL = {
    name: 'Pupil Tutorbook',
    email: 'pupil@tutorbook.app',
    id: 'pupil@tutorbook.app',
    uid: 'HBnt90xkbOW9GMZGJCacbqnK2hI3',
    type: 'Pupil',
    gender: 'Male',
    config: {
        showProfile: true,
    },
    payments: {
        currentBalance: 0,
        currentBalanceString: '$0.00',
    },
    subjects: ['Marine Biology'],
    secondsPupiled: 0,
    secondsTutored: 0,
    location: LOCATION.name,
};
const SUPERVISOR = {
    name: 'Supervisor Tutorbook',
    email: 'supervisor@tutorbook.app',
    id: 'supervisor@tutorbook.app',
    uid: 'OAmavOtc6GcL2BuxFJu4sd5rwDu1',
    type: 'Supervisor',
    gender: 'Female',
    config: {
        showProfile: true,
    },
    payments: {
        currentBalance: 0,
        currentBalanceString: '$0.00',
    },
    secondsPupiled: 0,
    secondsTutored: 0,
    location: LOCATION.name,
};

// =============================================================================
// DEPENDENCIES
// =============================================================================

const assert = require('assert');
const axios = require('axios');
const firebaseApp = require('firebase').initializeApp({
    "projectId": "tutorbook-779d8",
    "databaseURL": "https://tutorbook-779d8.firebaseio.com",
    "storageBucket": "tutorbook-779d8.appspot.com",
    "locationId": "us-central",
    "apiKey": "AIzaSyCNaEj1Mbi-79cGA0vW48iqZtrbtU-NTh4",
    "authDomain": "tutorbook-779d8.firebaseapp.com",
    "messagingSenderId": "488773238477"
});
const firebase = require("@firebase/testing");
const fs = require("fs");
const projectId = "tutorbook-779d8";
const firebasePort = require("../../firebase.json").emulators.firestore.port;
const port = !!firebasePort ? firebasePort : 8080;
const coverageUrl = `http://localhost:${port}/emulator/v1/projects/${projectId}:ruleCoverage.html`;
const rules = fs.readFileSync("firestore.rules", "utf8");

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function authedApp(auth) {
    return firebase.initializeTestApp({
        projectId,
        auth
    }).firestore().collection("partitions").doc("default");
}

function to(promise) {
    return promise.then(data => {
            return [null, data];
        })
        .catch(err => [err]);
};

beforeEach(async () => {
    // Clear the database simulator between tests
    await firebase.clearFirestoreData({
        projectId
    });
});

before(async () => {
    await firebase.loadFirestoreRules({
        projectId,
        rules
    });
});

after(async () => {
    await Promise.all(firebase.apps().map(app => app.delete()));
    console.log(`View rule coverage information at ${coverageUrl}\n`);
});

// =============================================================================
// FIRESTORE RULES TESTS
// =============================================================================

describe("Tutorbook", () => {

    it("requires users to log in before creating a profile", async () => {
        const db = authedApp(null);
        await Promise.all([
            db.collection("usersByEmail").doc(PUPIL.email),
            db.collection("users").doc(PUPIL.uid),
        ].map(async (profile) => {
            await firebase.assertFails(profile.set({
                type: PUPIL.type
            }));
        }));
    });

    it("does not let users change their balance or secondsTutored/Pupiled", async () => {
        const db = authedApp({
            uid: PUPIL.uid,
            email: PUPIL.email
        });
        await Promise.all([
            db.collection("usersByEmail").doc(PUPIL.email),
            db.collection("users").doc(PUPIL.uid),
        ].map(async (profile) => {
            await firebase.assertFails(profile.set({
                type: PUPIL.type
            }));
            await firebase.assertSucceeds(
                profile.set({
                    type: PUPIL.type,
                    payments: {
                        currentBalance: 0,
                        currentBalanceString: '$0.00',
                    },
                    secondsPupiled: 0,
                    secondsTutored: 0,
                })
            );
        }));
    });

    async function createProfiles() {
        var db = authedApp({
            uid: PUPIL.uid,
            email: PUPIL.email
        });
        await Promise.all([
            db.collection("usersByEmail").doc(PUPIL.email),
            db.collection("users").doc(PUPIL.uid),
        ].map(async (profile) => {
            await firebase.assertSucceeds(profile.set({
                name: PUPIL.name,
                gender: PUPIL.gender,
                type: PUPIL.type,
                payments: {
                    currentBalance: 0,
                    currentBalanceString: '$0.00',
                },
                secondsPupiled: 0,
                secondsTutored: 0,
            }));
        }));
        db = authedApp({
            uid: PUPIL.uid,
            email: TUTOR.email
        });
        await Promise.all([
            db.collection("usersByEmail").doc(TUTOR.email),
            db.collection("users").doc(TUTOR.uid),
        ].map(async (profile) => {
            await firebase.assertSucceeds(profile.set({
                name: TUTOR.name,
                gender: TUTOR.gender,
                type: TUTOR.type,
                payments: {
                    currentBalance: 0,
                    currentBalanceString: '$0.00',
                },
                secondsPupiled: 0,
                secondsTutored: 0,
            }));
        }));
    };

    async function createSupervisorProfile() {
        const db = authedApp({
            uid: SUPERVISOR.uid,
            email: SUPERVISOR.email
        });
        await Promise.all([
            db.collection("usersByEmail").doc(SUPERVISOR.email),
            db.collection("users").doc(SUPERVISOR.uid),
        ].map(async (profile) => {
            await firebase.assertSucceeds(profile.set({
                name: SUPERVISOR.name,
                gender: SUPERVISOR.gender,
                type: SUPERVISOR.type,
                payments: {
                    currentBalance: 0,
                    currentBalanceString: '$0.00',
                },
                secondsPupiled: 0,
                secondsTutored: 0,
            }));
        }));
    };

    it("only lets users create their own profile", async () => {
        const db = authedApp({
            uid: PUPIL.uid,
            email: PUPIL.email
        });
        await Promise.all([
            db.collection("usersByEmail").doc(PUPIL.email),
            db.collection("users").doc(PUPIL.uid),
        ].map(async (profile) => {
            await firebase.assertSucceeds(profile.set({
                type: PUPIL.type,
                payments: {
                    currentBalance: 0,
                    currentBalanceString: '$0.00',
                },
                secondsPupiled: 0,
                secondsTutored: 0,
            }));
        }));
        await Promise.all([
            db.collection("usersByEmail").doc(TUTOR.email),
            db.collection("users").doc(TUTOR.uid),
        ].map(async (profile) => {
            await firebase.assertFails(profile.set({
                type: TUTOR.type,
                payments: {
                    currentBalance: 0,
                    currentBalanceString: '$0.00',
                },
                secondsPupiled: 0,
                secondsTutored: 0,
            }));
        }));
    });

    it("lets any logged in user read any profile", async () => {
        const db = authedApp({
            uid: PUPIL.uid,
            email: PUPIL.email
        });
        await Promise.all([
            db.collection("usersByEmail").doc(TUTOR.email),
            db.collection("users").doc(TUTOR.uid),
        ].map(async (profile) => await firebase.assertSucceeds(profile.get())));
    });
});

// =============================================================================
// REST API TESTS
// =============================================================================

describe("Tutorbook's REST API", () => {
    async function getToken(user) {
        const res = await axios({
            method: 'post',
            url: 'https://us-central1-tutorbook-779d8.cloudfunctions.net/auth',
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
    async function createUsers() {
        const users = [TUTOR, PUPIL, SUPERVISOR];
        await Promise.all(users.map(async (user) => {
            const db = authedApp({
                uid: user.uid,
                email: user.email,
            });
            await Promise.all([
                db.collection('users').doc(user.uid),
                db.collection('usersByEmail').doc(user.id),
            ].map(async (doc) => {
                await firebase.assertSucceeds(doc.set(user))
            }));
        }));
    };

    it("lets users send messages", async () => {
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
    async function createRequest(user) {
        await createUsers();
        const request = {
            fromUser: {
                email: PUPIL.email,
                uid: PUPIL.uid,
                name: PUPIL.name,
                type: PUPIL.type,
                gender: PUPIL.gender,
            },
            toUser: {
                email: TUTOR.email,
                uid: TUTOR.uid,
                name: TUTOR.name,
                type: TUTOR.type,
                gender: TUTOR.gender,
            },
            subject: 'Computer Science',
            time: {
                day: 'Monday',
                from: '2:45 PM',
                to: '3:45 PM',
            },
            location: {
                name: LOCATION.name,
                id: LOCATION.id,
            },
            payment: {
                type: 'Free',
                amount: 25,
                method: 'Stripe',
            },
            timestamp: new Date(),
        };
        const res = await post(user || PUPIL.email, 'newRequest', {
            request: request,
            payment: {}
        });
        return [res.data.request, res.data.id];
    };

    it("lets authenticated users send requests", () => {
        return createRequest();
    });

    it("lets the sender modify a request", async () => {
        [request, id] = await createRequest();
        request.time.day = 'Wednesday';
        return post(PUPIL.email, 'modifyRequest', {
            request: request,
            id: id,
        });
    });

    it("lets the receiver modify a request", async () => {
        [request, id] = await createRequest();
        request.time.day = 'Wednesday';
        return post(TUTOR.email, 'modifyRequest', {
            request: request,
            id: id,
        });
    });

    it("lets the sender cancel a request", async () => {
        [request, id] = await createRequest();
        return post(PUPIL.email, 'cancelRequest', {
            request: request,
            id: id,
        });
    });

    it("lets the receiver reject a request", async () => {
        [request, id] = await createRequest();
        return post(TUTOR.email, 'rejectRequest', {
            request: request,
            id: id,
        });
    });

    async function approveRequest(user) {
        [request, id] = await createRequest(user);
        const res = await post(
            user || TUTOR.email,
            'approveRequest', {
                request: request,
                id: id,
            });
        return [res.data.appt, res.data.id];
    };

    it("lets the receiver approve a request", () => {
        return approveRequest();
    });

    it("lets supervisors create requests", () => {
        return createRequest(SUPERVISOR.email);
    });

    it("lets supervisors modify requests", async () => {
        [request, id] = await createRequest(SUPERVISOR.email);
        request.time.day = 'Wednesday';
        return post(SUPERVISOR.email, 'modifyRequest', {
            request: request,
            id: id,
        });
    });

    it("lets supervisors cancel requests", async () => {
        [request, id] = await createRequest(SUPERVISOR.email);
        return post(SUPERVISOR.email, 'cancelRequest', {
            request: request,
            id: id,
        });
    });

    it("lets supervisors reject requests", async () => {
        [request, id] = await createRequest(SUPERVISOR.email);
        return post(SUPERVISOR.email, 'rejectRequest', {
            request: request,
            id: id,
        });
    });

    it("lets supervisors approve requests", () => {
        return approveRequest(SUPERVISOR.email);
    });

    // =========================================================================
    // APPOINTMENTs
    // =========================================================================
    it("lets attendees modify appointments", async () => {
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

    it("lets attendees cancel appointments", async () => {
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

    it("lets supervisors modify appointments", async () => {
        [appt, id] = await approveRequest();
        appt.time.day = 'Wednesday';
        return post(SUPERVISOR.email, 'modifyAppt', {
            appt: appt,
            id: id,
        });
    });

    it("lets supervisors cancel appointments", async () => {
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
        const location = {
            supervisors: [SUPERVISOR.uid],
            name: LOCATION.name,
            url: LOCATION.url,
            timestamp: new Date(),
        };
        const res = await post(SUPERVISOR.email, 'createLocation', {
            location: location,
            id: LOCATION.id,
        });
        return [res.data.location, res.data.id];
    };

    async function clockIn(user) {
        [appt, id] = await approveRequest(user);
        await createLocation(); // Determines who to send clocking request(s)
        const res = await post(user || TUTOR.email, 'clockIn', {
            appt: appt,
            id: id,
        });
        return [res.data.clockIn, res.data.id];
    };

    it("lets tutors clock-in to appointments", () => {
        return clockIn();
    });

    it("lets supervisors clock tutors into appointments", () => {
        return clockIn(SUPERVISOR.email);
    });

    async function approveClockIn(user) {
        [clockInData, id] = await clockIn(user);
        const res = await post(user || SUPERVISOR.email,
            'approveClockIn', {
                clockIn: clockInData,
                id: id,
            });
        return [res.data.appt, res.data.id];
    };

    it("lets supervisors approve clock-in requests", async () => {
        return approveClockIn();
    });

    async function clockOut(user) {
        [appt, id] = await approveClockIn(user);
        const res = await post(user || TUTOR.email, 'clockOut', {
            appt: appt,
            id: id,
        });
        return [res.data.clockOut, res.data.id];
    };

    it("lets tutors clock-out of active appointments", () => {
        return clockOut();
    });

    it("lets supervisors clock tutors out of active appointments", () => {
        return clockOut(SUPERVISOR.email);
    });

    async function approveClockOut(user) {
        [clockOutData, id] = await clockOut();
        const res = await post(user || SUPERVISOR.email, 'approveClockOut', {
            clockOut: clockOutData,
            id: id,
        });
        return [res.data.appt, res.data.id];
    };

    it("lets supervisors approve clock-out requests", () => {
        return approveClockOut();
    });

    function combineMaps(mapA, mapB) {
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

    it("lets supervisors modify past appointments", async () => {
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

    it("lets supervisors perform instant clock-ins", async () => {
        [appt, id] = await approveRequest();
        await createLocation();
        return post(SUPERVISOR.email, 'instantClockIn', {
            appt: appt,
            id: id,
        });
    });

    it("lets supervisors perform instant clock-outs", async () => {
        [appt, id] = await approveClockIn();
        return post(SUPERVISOR.email, 'instantClockOut', {
            appt: appt,
            id: id,
        });
    });

    // =========================================================================
    // TODO: PAYMENTs
    // =========================================================================

    // =========================================================================
    // TODO: SUPERVISORs
    // =========================================================================
    it("lets supervisors create locations", async () => {
        await createUsers();
        return createLocation();
    });

    it("lets supervisors update locations", async () => {
        await createUsers();
        [location, id] = await createLocation();
        return post(SUPERVISOR.email, 'updateLocation', {
            location: combineMaps(location, {
                description: 'This is a modified description.',
            }),
            id: id,
        });
    });

    it("lets supervisors delete locations", async () => {
        await createUsers();
        [location, id] = await createLocation();
        return post(SUPERVISOR.email, 'deleteLocation', {
            id: id,
        });
    });

    it("lets supervisors send announcements", async () => {
        await createUsers();
        [locationData, locationId] = await createLocation();
        const db = authedApp({
            uid: SUPERVISOR.uid,
            email: SUPERVISOR.email,
            locations: [LOCATION.id],
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
                location: 'Gunn Academic Center',
                price: 'Free',
                showBooked: true,
                sort: 'Rating',
                subject: 'Marine Biology',
                type: 'Any'
            },
        }));
        await firebase.assertSucceeds(chat.collection('messages').doc().set({
            sentBy: SUPERVISOR,
            message: 'This is a test.',
            timestamp: new Date(),
        }));
    });

    it("lets supervisors download PDF backups of database", async () => {
        await approveRequest();
        await createLocation();
        return axios({
            method: 'get',
            url: FUNCTIONS_URL + 'backupAsPDF',
            responseType: 'stream',
            params: {
                token: (await getToken(SUPERVISOR.email)),
                location: LOCATION.id,
                test: false,
                tutors: true,
                pupils: true,
            },
        }).then((res) => {
            res.data.pipe(fs.createWriteStream('test/backup-test.pdf'));
        });
    });

    it("lets supervisors download individual's service hour logs", async () => {
        await approveClockOut();
        return axios({
            method: 'get',
            url: FUNCTIONS_URL + 'serviceHoursAsPDF',
            responseType: 'stream',
            params: {
                token: (await getToken(SUPERVISOR.email)),
                location: LOCATION.id,
                test: false,
                uid: TUTOR.uid,
            },
        }).then((res) => {
            res.data.pipe(fs.createWriteStream('test/service-hrs-test.pdf'));
        });
    });

    it("lets supervisors download everyone's service hour logs", async () => {
        await approveClockOut();
        return axios({
            method: 'get',
            url: FUNCTIONS_URL + 'serviceHoursAsPDF',
            responseType: 'stream',
            params: {
                token: (await getToken(SUPERVISOR.email)),
                location: LOCATION.id,
                test: false,
            },
        }).then((res) => {
            res.data.pipe(fs.createWriteStream('test/all-service-hrs-test.pdf'));
        });
    });
});