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
const firebasePort = require("../firebase.json").emulators.firestore.port;
const port = !!firebasePort ? firebasePort : 8080;
const coverageUrl = `http://localhost:${port}/emulator/v1/projects/${projectId}:ruleCoverage.html`;
const rules = fs.readFileSync("firestore.rules", "utf8");

function authedApp(auth) {
    return firebase.initializeTestApp({
        projectId,
        auth
    }).firestore();
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

async function resetDB() {
    // Clear the database simulator between tests
    await firebase.clearFirestoreData({
        projectId
    });
};

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

describe("Tutorbook", () => {
    // ========================================================================
    // PROFILE DATA FLOW
    // ========================================================================
    it("requires users to log in before creating a profile", async () => {
        const db = authedApp(null);
        const profile = db.collection("users").doc("pupil@tutorbook.me");
        await firebase.assertFails(profile.set({
            type: "Pupil"
        }));
    });

    it("does not let users change their balance or secondsTutored/Pupiled", async () => {
        const db = authedApp({
            uid: "pupil@tutorbook.me",
            email: "pupil@tutorbook.me"
        });
        const profile = db.collection("users").doc("pupil@tutorbook.me");
        await firebase.assertFails(profile.set({
            type: "Pupil"
        }));
        await firebase.assertSucceeds(
            profile.set({
                type: "Pupil",
                payments: {
                    currentBalance: 0,
                    currentBalanceString: '$0.00',
                },
                secondsPupiled: 0,
                secondsTutored: 0,
            })
        );
    });

    async function createProfiles() {
        var db = authedApp({
            uid: "pupil@tutorbook.me",
            email: "pupil@tutorbook.me"
        });
        await firebase.assertSucceeds(
            db
            .collection("users")
            .doc("pupil@tutorbook.me")
            .set({
                name: "Pupil Tutorbook",
                gender: "Male",
                type: "Pupil",
                payments: {
                    currentBalance: 0,
                    currentBalanceString: '$0.00',
                },
                secondsPupiled: 0,
                secondsTutored: 0,
            })
        );
        db = authedApp({
            uid: "tutor@tutorbook.me",
            email: "tutor@tutorbook.me"
        });
        await firebase.assertSucceeds(
            db
            .collection("users")
            .doc("tutor@tutorbook.me")
            .set({
                name: "Tutor Tutorbook",
                gender: "Male",
                type: "Tutor",
                payments: {
                    currentBalance: 0,
                    currentBalanceString: '$0.00',
                },
                secondsPupiled: 0,
                secondsTutored: 0,
            })
        );
    };

    async function createSupervisorProfile() {
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me"
        });
        await firebase.assertSucceeds(
            db
            .collection("users")
            .doc("supervisor@tutorbook.me")
            .set({
                name: "Supervisor Tutorbook",
                gender: "Male",
                type: "Supervisor",
                payments: {
                    currentBalance: 0,
                    currentBalanceString: '$0.00',
                },
                secondsPupiled: 0,
                secondsTutored: 0,
            })
        );
    };

    it("only lets users create their own profile", async () => {
        const db = authedApp({
            uid: "pupil@tutorbook.me",
            email: "pupil@tutorbook.me"
        });
        await firebase.assertSucceeds(
            db
            .collection("users")
            .doc("pupil@tutorbook.me")
            .set({
                type: "Pupil",
                payments: {
                    currentBalance: 0,
                    currentBalanceString: '$0.00',
                },
                secondsPupiled: 0,
                secondsTutored: 0,
            })
        );
        await firebase.assertFails(
            db
            .collection("users")
            .doc("tutor@tutorbook.me")
            .set({
                type: "Tutor",
                payments: {
                    currentBalance: 0,
                    currentBalanceString: '$0.00',
                },
                secondsPupiled: 0,
                secondsTutored: 0,
            })
        );
    });

    it("lets any logged in user read any profile", async () => {
        const db = authedApp({
            uid: 'pupil@tutorbook.me',
        });
        const profile = db.collection("users").doc("tutor@tutorbook.me");
        await firebase.assertSucceeds(profile.get());
    });
});

describe("Tutorbook's REST API", () => {
    async function post(user, action, data) {
        const token = await axios({
            method: 'post',
            url: 'https://us-central1-tutorbook-779d8.cloudfunctions.net/auth',
            params: {
                user: user,
            },
        });
        if (typeof token.data === 'string' && token.data.indexOf('ERROR') > 0)
            throw new Error(token.data.replace('[ERROR] ', ''));
        await firebaseApp.auth().signInWithCustomToken(token.data);
        return axios({
            method: 'post',
            url: 'http://localhost:5001/tutorbook-779d8/us-central1/data',
            params: {
                user: user,
                action: action,
                token: (await firebaseApp.auth().currentUser.getIdToken(true)),
            },
            data: data,
        }).then((res) => {
            firebaseApp.auth().signOut();
            if (typeof res.data === 'string' && res.data.indexOf('ERROR') > 0)
                throw new Error(res.data.replace('[ERROR] ', ''));
            return res;
        }).catch((err) => {
            firebaseApp.auth().signOut();
            throw err;
        });
    };

    // ========================================================================
    // USERs
    // ========================================================================
    async function createUsers() {
        const users = [{
            name: 'Tutor Tutorbook',
            email: 'tutor@tutorbook.app',
            id: 'tutor@tutorbook.app',
            uid: 'l9oxeZesaQXsBh4guDGJzHdNJlw2',
            type: 'Tutor',
            config: {
                showProfile: true,
            },
            payments: {
                currentBalance: 0,
                currentBalanceString: '$0.00',
            },
            secondsPupiled: 0,
            secondsTutored: 0,
        }, {
            name: 'Pupil Tutorbook',
            email: 'pupil@tutorbook.app',
            id: 'pupil@tutorbook.app',
            uid: 'HBnt90xkbOW9GMZGJCacbqnK2hI3',
            type: 'Pupil',
            config: {
                showProfile: true,
            },
            payments: {
                currentBalance: 0,
                currentBalanceString: '$0.00',
            },
            secondsPupiled: 0,
            secondsTutored: 0,
        }, {
            name: 'Supervisor Tutorbook',
            email: 'supervisor@tutorbook.app',
            id: 'supervisor@tutorbook.app',
            uid: 'OAmavOtc6GcL2BuxFJu4sd5rwDu1',
            type: 'Supervisor',
            config: {
                showProfile: true,
            },
            payments: {
                currentBalance: 0,
                currentBalanceString: '$0.00',
            },
            secondsPupiled: 0,
            secondsTutored: 0,
        }];
        await users.forEach(async (user) => {
            const db = authedApp({
                uid: user.id,
                email: user.email,
            });
            const profile = db.collection('users').doc(user.id);
            await firebase.assertSucceeds(profile.set(user));
        });
    };

    // ========================================================================
    // REQUESTs
    // ========================================================================
    async function createRequest(user) {
        await createUsers();
        const request = {
            fromUser: {
                email: 'pupil@tutorbook.app',
                name: 'Pupil Tutorbook',
                type: 'Pupil',
                gender: 'Male',
            },
            toUser: {
                email: 'tutor@tutorbook.app',
                name: 'Tutor Tutorbook',
                type: 'Tutor',
                gender: 'Male',
            },
            subject: 'Computer Science',
            time: {
                day: 'Monday',
                from: '2:45 PM',
                to: '3:45 PM',
            },
            location: {
                name: 'Gunn Academic Center',
                id: 'NJp0Y6wyMh2fDdxSuRSx',
            },
            payment: {
                type: 'Free',
                amount: 25,
                method: 'Stripe',
            },
            timestamp: new Date(),
        };
        const res = await post(user || 'pupil@tutorbook.app', 'newRequest', {
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
        return post('pupil@tutorbook.app', 'modifyRequest', {
            request: request,
            id: id,
        });
    });

    it("lets the receiver modify a request", async () => {
        [request, id] = await createRequest();
        request.time.day = 'Wednesday';
        return post('tutor@tutorbook.app', 'modifyRequest', {
            request: request,
            id: id,
        });
    });

    it("lets the sender cancel a request", async () => {
        [request, id] = await createRequest();
        return post('pupil@tutorbook.app', 'cancelRequest', {
            request: request,
            id: id,
        });
    });

    it("lets the receiver reject a request", async () => {
        [request, id] = await createRequest();
        return post('tutor@tutorbook.app', 'rejectRequest', {
            request: request,
            id: id,
        });
    });

    async function approveRequest(user) {
        [request, id] = await createRequest(user);
        const res = await post(
            user || 'tutor@tutorbook.app',
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
        return createRequest('supervisor@tutorbook.app');
    });

    it("lets supervisors modify requests", async () => {
        [request, id] = await createRequest('supervisor@tutorbook.app');
        request.time.day = 'Wednesday';
        return post('supervisor@tutorbook.app', 'modifyRequest', {
            request: request,
            id: id,
        });
    });

    it("lets supervisors cancel requests", async () => {
        [request, id] = await createRequest('supervisor@tutorbook.app');
        return post('supervisor@tutorbook.app', 'cancelRequest', {
            request: request,
            id: id,
        });
    });

    it("lets supervisors reject requests", async () => {
        [request, id] = await createRequest('supervisor@tutorbook.app');
        return post('supervisor@tutorbook.app', 'rejectRequest', {
            request: request,
            id: id,
        });
    });

    it("lets supervisors approve requests", () => {
        return approveRequest('supervisor@tutorbook.app');
    });

    // ========================================================================
    // APPOINTMENTs
    // ========================================================================
    it("lets attendees modify appointments", async () => {
        [appt, id] = await approveRequest();
        appt.time.day = 'Wednesday';
        await post('tutor@tutorbook.app', 'modifyAppt', {
            appt: appt,
            id: id,
        });
        appt.time.day = 'Thursday';
        return post('pupil@tutorbook.app', 'modifyAppt', {
            appt: appt,
            id: id,
        });
    });

    it("lets attendees cancel appointments", async () => {
        [appt, id] = await approveRequest();
        await post('tutor@tutorbook.app', 'cancelAppt', {
            appt: appt,
            id: id,
        });
        [appt, id] = await approveRequest();
        return post('pupil@tutorbook.app', 'cancelAppt', {
            appt: appt,
            id: id,
        });
    });

    it("lets supervisors modify appointments", async () => {
        [appt, id] = await approveRequest();
        appt.time.day = 'Wednesday';
        return post('supervisor@tutorbook.app', 'modifyAppt', {
            appt: appt,
            id: id,
        });
    });

    it("lets supervisors cancel appointments", async () => {
        [appt, id] = await approveRequest();
        return post('supervisor@tutorbook.app', 'cancelAppt', {
            appt: appt,
            id: id,
        });
    });

    // ========================================================================
    // CLOCK-INs/OUTs
    // ========================================================================
    function createLocation() {
        const location = {
            supervisors: ['supervisor@tutorbook.app'],
            city: 'Palo Alto, CA',
            name: 'Gunn Academic Center',
            timestamp: new Date(),
        };
        return post('supervisor@tutorbook.app', 'createLocation', {
            location: location,
            id: 'NJp0Y6wyMh2fDdxSuRSx',
        });
    };

    async function clockIn(user) {
        [appt, id] = await approveRequest(user);
        await createLocation(); // Determines who to send clocking request(s)
        const res = await post(user || 'tutor@tutorbook.app', 'clockIn', {
            appt: appt,
            id: id,
        });
        return [res.data.clockIn, res.data.id];
    };

    it("lets tutors clock-in to appointments", () => {
        return clockIn();
    });

    it("lets supervisors clock tutors into appointments", () => {
        return clockIn('supervisor@tutorbook.app');
    });

    async function approveClockIn(user) {
        [clockInData, id] = await clockIn(user);
        const res = await post(user || 'supervisor@tutorbook.app',
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
        const res = await post(user || 'tutor@tutorbook.app', 'clockOut', {
            appt: appt,
            id: id,
        });
        return [res.data.clockOut, res.data.id];
    };

    it("lets tutors clock-out of active appointments", () => {
        return clockOut();
    });

    it("lets supervisors clock tutors out of active appointments", () => {
        return clockOut('supervisor@tutorbook.app');
    });

    it("lets supervisors approve clock-out requests", async () => {
        [clockOut, id] = await clockOut();
    });

    it("lets supervisors perform instant clock-ins", async () => {
        [appt, id] = await approveRequest();
        await createLocation();
        return post('supervisor@tutorbook.app', 'instantClockIn', {
            appt: appt,
            id: id,
        });
    });

    it("lets supervisors perform instant clock-outs", async () => {
        [appt, id] = await approveClockIn();
        return post('supervisor@tutorbook.app', 'instantClockOut', {
            appt: appt,
            id: id,
        });
    });

    // ========================================================================
    // TODO: PAYMENTs
    // ========================================================================

    // ========================================================================
    // TODO: SUPERVISORs
    // ========================================================================
});