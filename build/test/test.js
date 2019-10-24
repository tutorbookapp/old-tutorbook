const axios = require('axios');
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

describe("Tutorbook's REST API", () => {
    function post(user, action, data) {
        return axios({
            method: 'post',
            url: 'https://us-central1-tutorbook-779d8.cloudfunctions.net/data'
            params: {
                user: user,
                action: action,
                sandbox: true,
            },
            data: data,
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
            type: 'Tutor',
        }, {
            name: 'Pupil Tutorbook',
            email: 'pupil@tutorbook.app',
            id: 'pupil@tutorbook.app',
            type: 'Pupil',
        }, {
            name: 'Supervisor Tutorbook',
            email: 'supervisor@tutorbook.app',
            id: 'supervisor@tutorbook.app',
            type: 'Supervisor',
        }];
        await users.forEach(async (user) => {
            await post(user.id, 'createUser', user);
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
    });

    it("lets the receiver modify a request", async () => {
        [request, id] = await createRequest();
    });

    it("lets the sender cancel a request", async () => {
        [request, id] = await createRequest();
    });

    it("lets the receiver reject a request", async () => {
        [request, id] = await createRequest();
    });

    async function approveRequest(user) {
        [request, id] = await createRequest(user);
        const res = await post(
            user || 'tutor@tutorbook.app',
            'approveRequest', {
                request: request,
                id: id,
            });
        return [res.appt, res.id];
    };

    it("lets the receiver approve a request", () => {
        return approveRequest();
    });

    it("lets supervisors create requests", async () => {
        [request, id] = await createRequest('supervisor@tutorbook.app');
    });

    it("lets supervisors modify requests", async () => {
        [request, id] = await createRequest('supervisor@tutorbook.app');
    });

    it("lets supervisors cancel requests", async () => {
        [request, id] = await createRequest('supervisor@tutorbook.app');
    });

    it("lets supervisors reject requests", async () => {
        [request, id] = await createRequest('supervisor@tutorbook.app');
    });

    it("lets supervisors approve requests", () => {
        return approveRequest('supervisor@tutorbook.app');
    });

    // ========================================================================
    // APPOINTMENTs
    // ========================================================================
    it("lets attendees modify appointments", async () => {
        [appt, id] = await approveRequest();
    });

    it("lets attendees cancel appointments", async () => {
        [appt, id] = await approveRequest();
    });

    it("lets supervisors modify appointments", async () => {
        [appt, id] = await approveRequest();
    });

    it("lets supervisors cancel appointments", async () => {
        [appt, id] = await approveRequest();
    });

    // ========================================================================
    // CLOCK-INs/OUTs
    // ========================================================================
    async function clockIn(user) {
        [appt, id] = await approveRequest(user);
        const res = await post(user || 'tutor@tutorbook.app', 'clockIn', {
            appt: appt,
            id: id,
        });
        return [res.clockIn, res.id];
    };

    it("lets tutors clock-in to appointments", () => {
        return clockIn();
    });

    it("lets supervisors clock tutors into appointments", () => {
        return clockIn('supervisor@tutorbook.app');
    });

    it("lets supervisors approve clock-in requests", async () => {
        [clockIn, id] = await clockIn();
    });

    async function clockOut(user) {
        [clockIn, id] = await clockIn(user);
        const res = await post(user || 'tutor@tutorbook.app', 'clockOut', {
            appt: clockIn.for,
            id: id,
        });
        return [res.clockOut, res.id];
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

    // ========================================================================
    // PAYMENTs
    // ========================================================================

    // ========================================================================
    // SUPERVISORs
    // ========================================================================
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