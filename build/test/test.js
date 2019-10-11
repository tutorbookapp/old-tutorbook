const firebase = require("@firebase/testing");
const fs = require("fs");

/*
 * ============
 *    Setup
 * ============
 */
const projectId = "tutorbook-779d8";
const firebasePort = require("../firebase.json").emulators.firestore.port;
const port = !!firebasePort /** Exists? */ ? firebasePort : 8080;
const coverageUrl = `http://localhost:${port}/emulator/v1/projects/${projectId}:ruleCoverage.html`;

const rules = fs.readFileSync("firestore.rules", "utf8");

/**
 * Creates a new app with authentication data matching the input.
 *
 * @param {object} auth the object to use for authentication (typically {uid: some-uid})
 * @return {object} the app.
 */
function authedApp(auth) {
    return firebase.initializeTestApp({
        projectId,
        auth
    }).firestore();
}

// to.js
function to(promise) {
    return promise.then(data => {
            return [null, data];
        })
        .catch(err => [err]);
};

/*
 * ============
 *  Test Cases
 * ============
 */
beforeEach(async () => {
    // Clear the database between tests
    await firebase.clearFirestoreData({
        projectId
    });
});

async function resetDB() {
    // Clear the database between tests
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


    // ========================================================================
    // REQUESTS DATA FLOW
    // ========================================================================
    var id;
    it("lets logged in users with profiles to send requests", async () => {
        await createProfiles();
        const db = authedApp({
            uid: "pupil@tutorbook.me",
            email: "pupil@tutorbook.me"
        });
        const requestIn = db.collection("users").doc("tutor@tutorbook.me")
            .collection('requestsIn')
            .doc();
        id = requestIn.id;
        const requestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('requestsOut')
            .doc(id);
        await firebase.assertSucceeds(
            requestOut.set({
                fromUser: {
                    name: "Pupil Tutorbook",
                    email: 'pupil@tutorbook.me',
                    type: 'Pupil',
                    gender: 'Male',
                },
                toUser: {
                    name: 'Tutor Tutorbook',
                    email: 'tutor@tutorbook.me',
                    type: 'Tutor',
                    gender: 'Male',
                },
                subject: 'Computer Science',
                timestamp: new Date(),
            })
        );
        await firebase.assertSucceeds(
            requestIn.set({
                fromUser: {
                    name: "Pupil Tutorbook",
                    email: 'pupil@tutorbook.me',
                    type: 'Pupil',
                    gender: 'Male',
                },
                toUser: {
                    name: 'Tutor Tutorbook',
                    email: 'tutor@tutorbook.me',
                    type: 'Tutor',
                    gender: 'Male',
                },
                subject: 'Computer Science',
                timestamp: new Date(),
            })
        )
    });

    it("only lets the receiver of a request to modify it", async () => {
        await createRequest();
        const db = authedApp({
            uid: "random@tutorbook.me",
            email: "random@tutorbook.me"
        });
        const requestIn = db.collection("users").doc("tutor@tutorbook.me")
            .collection('requestsIn')
            .doc(id);
        const requestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('requestsOut')
            .doc(id);
        const modifiedRequestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('modifiedRequestsOut')
            .doc(requestIn.id);
        await firebase.assertFails(
            modifiedRequestOut.set({
                for: {
                    fromUser: {
                        name: "Pupil Tutorbook",
                        email: 'pupil@tutorbook.me',
                        type: 'Pupil',
                        gender: 'Male',
                    },
                    toUser: {
                        name: 'Tutor Tutorbook',
                        email: 'tutor@tutorbook.me',
                        type: 'Tutor',
                        gender: 'Male',
                    },
                    subject: 'Geometry Honors',
                    timestamp: new Date(),
                },
                modifiedBy: {
                    name: "Random Tutorbook",
                    email: 'random@tutorbook.me',
                    type: 'Pupil',
                    gender: 'Female',
                },
                modifiedTimestamp: new Date(),
            })
        );
        await firebase.assertFails(
            requestOut.update({
                fromUser: {
                    name: "Pupil Tutorbook",
                    email: 'pupil@tutorbook.me',
                    type: 'Pupil',
                    gender: 'Male',
                },
                toUser: {
                    name: 'Tutor Tutorbook',
                    email: 'tutor@tutorbook.me',
                    type: 'Tutor',
                    gender: 'Male',
                },
                subject: 'Geometry Honors',
                timestamp: new Date(),
            })
        );
        await firebase.assertFails(
            requestIn.update({
                fromUser: {
                    name: "Pupil Tutorbook",
                    email: 'pupil@tutorbook.me',
                    type: 'Pupil',
                    gender: 'Male',
                },
                toUser: {
                    name: 'Tutor Tutorbook',
                    email: 'tutor@tutorbook.me',
                    type: 'Tutor',
                    gender: 'Male',
                },
                subject: 'Geometry Honors',
                timestamp: new Date(),
            })
        );
    });

    async function createModifiedRequestIn() {
        await createRequest();
        const db = authedApp({
            uid: "pupil@tutorbook.me",
            email: "pupil@tutorbook.me",
        });
        const requestIn = db.collection("users").doc("tutor@tutorbook.me")
            .collection('requestsIn')
            .doc(id);
        const requestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('requestsOut')
            .doc(id);
        const modifiedRequestIn = db.collection('users').doc('tutor@tutorbook.me')
            .collection('modifiedRequestsIn')
            .doc(id);
        await firebase.assertSucceeds(
            modifiedRequestIn.set({
                for: {
                    fromUser: {
                        name: "Pupil Tutorbook",
                        email: 'pupil@tutorbook.me',
                        type: 'Pupil',
                        gender: 'Male',
                    },
                    toUser: {
                        name: 'Tutor Tutorbook',
                        email: 'tutor@tutorbook.me',
                        type: 'Tutor',
                        gender: 'Male',
                    },
                    location: {
                        id: 'locationID',
                        name: 'Gunn Academic Center',
                    },
                    subject: 'Geometry Honors',
                    timestamp: new Date(),
                },
                modifiedBy: {
                    name: "Pupil Tutorbook",
                    email: 'pupil@tutorbook.me',
                    type: 'Pupil',
                    gender: 'Male',
                },
                modifiedTimestamp: new Date(),
            })
        );
        await firebase.assertSucceeds(
            requestOut.update({
                fromUser: {
                    name: "Pupil Tutorbook",
                    email: 'pupil@tutorbook.me',
                    type: 'Pupil',
                    gender: 'Male',
                },
                toUser: {
                    name: 'Tutor Tutorbook',
                    email: 'tutor@tutorbook.me',
                    type: 'Tutor',
                    gender: 'Male',
                },
                subject: 'Geometry Honors',
                timestamp: new Date(),
            })
        );
        await firebase.assertSucceeds(
            requestIn.update({
                fromUser: {
                    name: "Pupil Tutorbook",
                    email: 'pupil@tutorbook.me',
                    type: 'Pupil',
                    gender: 'Male',
                },
                toUser: {
                    name: 'Tutor Tutorbook',
                    email: 'tutor@tutorbook.me',
                    type: 'Tutor',
                    gender: 'Male',
                },
                subject: 'Geometry Honors',
                timestamp: new Date(),
            })
        );
    };

    it("lets the sender of a request modify it", async () => {
        await createRequest();
        const db = authedApp({
            uid: "pupil@tutorbook.me",
            email: "pupil@tutorbook.me",
        });
        const requestIn = db.collection("users").doc("tutor@tutorbook.me")
            .collection('requestsIn')
            .doc(id);
        const requestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('requestsOut')
            .doc(id);
        const modifiedRequestIn = db.collection('users').doc('tutor@tutorbook.me')
            .collection('modifiedRequestsIn')
            .doc(id);
        await firebase.assertSucceeds(
            modifiedRequestIn.set({
                for: {
                    fromUser: {
                        name: "Pupil Tutorbook",
                        email: 'pupil@tutorbook.me',
                        type: 'Pupil',
                        gender: 'Male',
                    },
                    toUser: {
                        name: 'Tutor Tutorbook',
                        email: 'tutor@tutorbook.me',
                        type: 'Tutor',
                        gender: 'Male',
                    },
                    subject: 'Geometry Honors',
                    timestamp: new Date(),
                },
                modifiedBy: {
                    name: "Pupil Tutorbook",
                    email: 'pupil@tutorbook.me',
                    type: 'Pupil',
                    gender: 'Male',
                },
                modifiedTimestamp: new Date(),
            })
        );
        await firebase.assertSucceeds(
            requestOut.update({
                fromUser: {
                    name: "Pupil Tutorbook",
                    email: 'pupil@tutorbook.me',
                    type: 'Pupil',
                    gender: 'Male',
                },
                toUser: {
                    name: 'Tutor Tutorbook',
                    email: 'tutor@tutorbook.me',
                    type: 'Tutor',
                    gender: 'Male',
                },
                subject: 'Geometry Honors',
                timestamp: new Date(),
            })
        );
        await firebase.assertSucceeds(
            requestIn.update({
                fromUser: {
                    name: "Pupil Tutorbook",
                    email: 'pupil@tutorbook.me',
                    type: 'Pupil',
                    gender: 'Male',
                },
                toUser: {
                    name: 'Tutor Tutorbook',
                    email: 'tutor@tutorbook.me',
                    type: 'Tutor',
                    gender: 'Male',
                },
                subject: 'Geometry Honors',
                timestamp: new Date(),
            })
        );
    });

    it("lets the receiver of a request modify it", async () => {
        await createRequest();
        const db = authedApp({
            uid: "tutor@tutorbook.me",
            email: "tutor@tutorbook.me",
        });
        const requestIn = db.collection("users").doc("tutor@tutorbook.me")
            .collection('requestsIn')
            .doc(id);
        const requestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('requestsOut')
            .doc(id);
        const modifiedRequestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('modifiedRequestsOut')
            .doc(id);
        await firebase.assertSucceeds(
            modifiedRequestOut.set({
                for: {
                    fromUser: {
                        name: "Pupil Tutorbook",
                        email: 'pupil@tutorbook.me',
                        type: 'Pupil',
                        gender: 'Male',
                    },
                    toUser: {
                        name: 'Tutor Tutorbook',
                        email: 'tutor@tutorbook.me',
                        type: 'Tutor',
                        gender: 'Male',
                    },
                    subject: 'Geometry Honors',
                    timestamp: new Date(),
                },
                modifiedBy: {
                    name: "Tutor Tutorbook",
                    email: 'tutor@tutorbook.me',
                    type: 'Tutor',
                    gender: 'Male',
                },
                modifiedTimestamp: new Date(),
            })
        );
        await firebase.assertSucceeds(
            requestOut.update({
                fromUser: {
                    name: "Pupil Tutorbook",
                    email: 'pupil@tutorbook.me',
                    type: 'Pupil',
                    gender: 'Male',
                },
                toUser: {
                    name: 'Tutor Tutorbook',
                    email: 'tutor@tutorbook.me',
                    type: 'Tutor',
                    gender: 'Male',
                },
                subject: 'Geometry Honors',
                timestamp: new Date(),
            })
        );
        await firebase.assertSucceeds(
            requestIn.update({
                fromUser: {
                    name: "Pupil Tutorbook",
                    email: 'pupil@tutorbook.me',
                    type: 'Pupil',
                    gender: 'Male',
                },
                toUser: {
                    name: 'Tutor Tutorbook',
                    email: 'tutor@tutorbook.me',
                    type: 'Tutor',
                    gender: 'Male',
                },
                subject: 'Geometry Honors',
                timestamp: new Date(),
            })
        );
    });

    // Function that resets out database and creates a new request from
    // pupil@tutorbook.me to tutor@tutorbook.me
    async function createRequest() {
        await createProfiles();
        const db = authedApp({
            uid: "pupil@tutorbook.me",
            email: "pupil@tutorbook.me"
        });
        const requestIn = db.collection("users").doc("tutor@tutorbook.me")
            .collection('requestsIn')
            .doc();
        id = requestIn.id;
        const requestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('requestsOut')
            .doc(id);
        await firebase.assertSucceeds(
            requestOut.set({
                fromUser: {
                    name: "Pupil Tutorbook",
                    email: 'pupil@tutorbook.me',
                    proxy: [],
                    type: 'Pupil',
                    gender: 'Male',
                },
                toUser: {
                    name: 'Tutor Tutorbook',
                    email: 'tutor@tutorbook.me',
                    type: 'Tutor',
                    proxy: [],
                    gender: 'Male',
                },
                subject: 'Computer Science',
                location: {
                    id: 'locationID',
                    name: 'Gunn Academic Center',
                },
                timestamp: new Date(),
            })
        );
        await firebase.assertSucceeds(
            requestIn.set({
                fromUser: {
                    name: "Pupil Tutorbook",
                    email: 'pupil@tutorbook.me',
                    type: 'Pupil',
                    proxy: [],
                    gender: 'Male',
                },
                toUser: {
                    name: 'Tutor Tutorbook',
                    email: 'tutor@tutorbook.me',
                    type: 'Tutor',
                    proxy: [],
                    gender: 'Male',
                },
                subject: 'Computer Science',
                location: {
                    id: 'locationID',
                    name: 'Gunn Academic Center',
                },
                timestamp: new Date(),
            })
        );
    };

    async function createCanceledRequest() {
        await createRequest();
        const db = authedApp({
            uid: "pupil@tutorbook.me",
            email: "pupil@tutorbook.me",
        });
        const requestIn = db.collection("users").doc("tutor@tutorbook.me")
            .collection('requestsIn')
            .doc(id);
        const requestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('requestsOut')
            .doc(id);
        const requestOutData = await requestOut.get();
        const canceledRequestIn = db.collection('users').doc('tutor@tutorbook.me')
            .collection('canceledRequestsIn')
            .doc(id);

        await firebase.assertSucceeds(
            canceledRequestIn.set({
                for: requestOutData.data(),
                canceledBy: {
                    email: 'pupil@tutorbook.me'
                },
                canceledTimestamp: new Date(),
            })
        );
        await firebase.assertSucceeds(
            requestOut.delete()
        );
        await firebase.assertSucceeds(
            requestIn.delete()
        );
    };

    it("lets the sender of a request cancel it", async () => {
        await createRequest();
        const db = authedApp({
            uid: "pupil@tutorbook.me",
            email: "pupil@tutorbook.me",
        });
        const requestIn = db.collection("users").doc("tutor@tutorbook.me")
            .collection('requestsIn')
            .doc(id);
        const requestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('requestsOut')
            .doc(id);
        const canceledRequestIn = db.collection('users').doc('tutor@tutorbook.me')
            .collection('canceledRequestsIn')
            .doc(id);

        await firebase.assertSucceeds(
            canceledRequestIn.set({
                for: {},
                canceledBy: {
                    email: 'pupil@tutorbook.me'
                },
                canceledTimestamp: new Date(),
            })
        );
        await firebase.assertSucceeds(
            requestOut.delete()
        );
        await firebase.assertSucceeds(
            requestIn.delete()
        );
    });

    it("only lets recipients of a request to delete it", async () => {
        await createRequest();
        const db = authedApp({
            uid: "random@tutorbook.me",
            email: "random@tutorbook.me",
        });
        const requestIn = db.collection("users").doc("tutor@tutorbook.me")
            .collection('requestsIn')
            .doc(id);
        const requestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('requestsOut')
            .doc(id);
        await firebase.assertFails(
            requestOut.delete()
        );
        await firebase.assertFails(
            requestIn.delete()
        );
    });

    it("only lets the receiver of a request approve it", async () => {
        await createRequest();
        const db = authedApp({
            uid: "random@tutorbook.me",
            email: "random@tutorbook.me",
        });
        const requestIn = db.collection("users").doc("tutor@tutorbook.me")
            .collection('requestsIn')
            .doc(id);
        const requestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('requestsOut')
            .doc(id);
        const approvedRequestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('approvedRequestsOut')
            .doc(id);
        // NOTE: The appts must be processed in this order due to the way that
        // the Firestore rules are setup (i.e. first we check if there is an
        // approvedRequestOut doc, then we check if there is an appt doc
        // already created).
        const appts = [
            db.collection('users').doc('pupil@tutorbook.me')
            .collection('appointments')
            .doc(id),
            db.collection('users').doc('tutor@tutorbook.me')
            .collection('appointments')
            .doc(id),
            db.collection('locations').doc('locationID')
            .collection('appointments')
            .doc(id),
        ];

        await firebase.assertFails(
            approvedRequestOut.set({
                for: {
                    fromUser: {
                        name: "Pupil Tutorbook",
                        email: 'pupil@tutorbook.me',
                        type: 'Pupil',
                        gender: 'Male',
                    },
                    toUser: {
                        name: 'Tutor Tutorbook',
                        email: 'tutor@tutorbook.me',
                        type: 'Tutor',
                        gender: 'Male',
                    },
                    subject: 'Geometry Honors',
                    timestamp: new Date(),
                },
                approvedBy: {
                    name: "Tutor Tutorbook",
                    email: 'tutor@tutorbook.me',
                    type: 'Tutor',
                    gender: 'Male',
                },
                approvedTimestamp: new Date(),
            })
        );
        await firebase.assertFails(
            requestOut.delete()
        );
        await firebase.assertFails(
            requestIn.delete()
        );
        for (var i = 0; i < appts.length; i++) {
            var appt = appts[i];
            await firebase.assertFails(
                appt.set({
                    attendees: [{
                        name: 'Tutor Tutorbook',
                        email: 'tutor@tutorbook.me',
                        type: 'Tutor',
                        gender: 'Male',
                    }, {
                        name: "Pupil Tutorbook",
                        email: 'pupil@tutorbook.me',
                        type: 'Pupil',
                        gender: 'Male',
                    }],
                    location: {
                        name: 'Gunn Academic Center',
                        id: 'locationID',
                    },
                    time: {
                        day: 'Monday',
                        from: '11:00 AM',
                        to: '12:00 PM',
                    },
                })
            );
        }
    });

    async function createRejectedRequest() {
        await createRequest();
        const db = authedApp({
            uid: "tutor@tutorbook.me",
            email: "tutor@tutorbook.me",
        });
        const requestIn = db.collection("users").doc("tutor@tutorbook.me")
            .collection('requestsIn')
            .doc(id);
        const requestInData = await requestIn.get();
        const requestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('requestsOut')
            .doc(id);
        const rejectedRequestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('rejectedRequestsOut')
            .doc(id);
        await firebase.assertSucceeds(
            rejectedRequestOut.set({
                for: requestInData.data(),
                rejectedBy: {
                    name: "Tutor Tutorbook",
                    email: 'tutor@tutorbook.me',
                    type: 'Tutor',
                    gender: 'Male',
                },
                rejectedTimestamp: new Date(),
            })
        );
        await firebase.assertSucceeds(
            requestOut.delete()
        );
        await firebase.assertSucceeds(
            requestIn.delete()
        );
    };

    it("lets the receiver of a request reject it", async () => {
        await createRequest();
        const db = authedApp({
            uid: "tutor@tutorbook.me",
            email: "tutor@tutorbook.me",
        });
        const requestIn = db.collection("users").doc("tutor@tutorbook.me")
            .collection('requestsIn')
            .doc(id);
        const requestInData = await requestIn.get();
        const requestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('requestsOut')
            .doc(id);
        const rejectedRequestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('rejectedRequestsOut')
            .doc(id);
        await firebase.assertSucceeds(
            rejectedRequestOut.set({
                for: requestInData.data(),
                rejectedBy: {
                    name: "Tutor Tutorbook",
                    email: 'tutor@tutorbook.me',
                    type: 'Tutor',
                    gender: 'Male',
                },
                rejectedTimestamp: new Date(),
            })
        );
        await firebase.assertSucceeds(
            requestOut.delete()
        );
        await firebase.assertSucceeds(
            requestIn.delete()
        );
    });

    async function createApprovedRequest() {
        await createRequest();
        const db = authedApp({
            uid: "tutor@tutorbook.me",
            email: "tutor@tutorbook.me",
        });
        const requestIn = db.collection("users").doc("tutor@tutorbook.me")
            .collection('requestsIn')
            .doc(id);
        const requestInData = await requestIn.get();
        const requestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('requestsOut')
            .doc(id);
        const approvedRequestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('approvedRequestsOut')
            .doc(id);
        // NOTE: The appts must be processed in this order due to the way that
        // the Firestore rules are setup (i.e. first we check if there is an
        // approvedRequestOut doc, then we check if there is an appt doc
        // already created).
        const appts = [
            db.collection('users').doc('pupil@tutorbook.me')
            .collection('appointments')
            .doc(id),
            db.collection('users').doc('tutor@tutorbook.me')
            .collection('appointments')
            .doc(id),
            db.collection('locations').doc('locationID')
            .collection('appointments')
            .doc(id),
        ];

        await firebase.assertSucceeds(
            approvedRequestOut.set({
                for: requestInData.data(),
                approvedBy: {
                    name: "Tutor Tutorbook",
                    email: 'tutor@tutorbook.me',
                    type: 'Tutor',
                    gender: 'Male',
                },
                approvedTimestamp: new Date(),
            })
        );
        await firebase.assertSucceeds(
            requestOut.delete()
        );
        await firebase.assertSucceeds(
            requestIn.delete()
        );
        for (var i = 0; i < appts.length; i++) {
            var appt = appts[i];
            await firebase.assertSucceeds(
                appt.set({
                    attendees: [{
                        name: 'Tutor Tutorbook',
                        email: 'tutor@tutorbook.me',
                        type: 'Tutor',
                        gender: 'Male',
                    }, {
                        name: "Pupil Tutorbook",
                        email: 'pupil@tutorbook.me',
                        type: 'Pupil',
                        gender: 'Male',
                    }],
                    location: {
                        name: 'Gunn Academic Center',
                        id: 'locationID',
                    },
                    time: {
                        day: 'Monday',
                        from: '11:00 AM',
                        to: '12:00 PM',
                    },
                })
            );
        }
    };

    it("lets the receiver of a request approve it", async () => {
        await createRequest();
        const db = authedApp({
            uid: "tutor@tutorbook.me",
            email: "tutor@tutorbook.me",
        });
        const requestIn = db.collection("users").doc("tutor@tutorbook.me")
            .collection('requestsIn')
            .doc(id);
        const requestInData = await requestIn.get();
        const requestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('requestsOut')
            .doc(id);
        const approvedRequestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('approvedRequestsOut')
            .doc(id);
        // NOTE: The appts must be processed in this order due to the way that
        // the Firestore rules are setup (i.e. first we check if there is an
        // approvedRequestOut doc, then we check if there is an appt doc
        // already created).
        const appts = [
            db.collection('users').doc('pupil@tutorbook.me')
            .collection('appointments')
            .doc(id),
            db.collection('users').doc('tutor@tutorbook.me')
            .collection('appointments')
            .doc(id),
            db.collection('locations').doc('locationID')
            .collection('appointments')
            .doc(id),
        ];

        await firebase.assertSucceeds(
            approvedRequestOut.set({
                for: requestInData.data(),
                approvedBy: {
                    name: "Tutor Tutorbook",
                    email: 'tutor@tutorbook.me',
                    type: 'Tutor',
                    gender: 'Male',
                },
                approvedTimestamp: new Date(),
            })
        );
        await firebase.assertSucceeds(
            requestOut.delete()
        );
        await firebase.assertSucceeds(
            requestIn.delete()
        );
        for (var i = 0; i < appts.length; i++) {
            var appt = appts[i];
            await firebase.assertSucceeds(
                appt.set({
                    attendees: [{
                        name: 'Tutor Tutorbook',
                        email: 'tutor@tutorbook.me',
                        type: 'Tutor',
                        gender: 'Male',
                    }, {
                        name: "Pupil Tutorbook",
                        email: 'pupil@tutorbook.me',
                        type: 'Pupil',
                        gender: 'Male',
                    }],
                    location: {
                        name: 'Gunn Academic Center',
                        id: 'locationID',
                    },
                    time: {
                        day: 'Monday',
                        from: '11:00 AM',
                        to: '12:00 PM',
                    },
                })
            );
        }
    });

    it("only allows users to create appointments from requests", async () => {
        const db = authedApp({
            uid: "tutor@tutorbook.me",
            email: "tutor@tutorbook.me",
        });
        // NOTE: The appts must be processed in this order due to the way that
        // the Firestore rules are setup (i.e. first we check if there is an
        // approvedRequestOut doc, then we check if there is an appt doc
        // already created).
        const appts = [
            db.collection('users').doc('pupil@tutorbook.me')
            .collection('appointments')
            .doc()
        ];
        appts.push(
            db.collection('users').doc('tutor@tutorbook.me')
            .collection('appointments')
            .doc(appts[0].id)
        );
        appts.push(
            db.collection('locations').doc('locationID')
            .collection('appointments')
            .doc(appts[0].id),
        );
        for (var i = 0; i < appts.length; i++) {
            var appt = appts[i];
            await firebase.assertFails(
                appt.set({
                    attendees: [{
                        name: 'Tutor Tutorbook',
                        email: 'tutor@tutorbook.me',
                        type: 'Tutor',
                        gender: 'Male',
                    }, {
                        name: "Pupil Tutorbook",
                        email: 'pupil@tutorbook.me',
                        type: 'Pupil',
                        gender: 'Male',
                    }],
                    location: {
                        name: 'Gunn Academic Center',
                        id: 'locationID',
                    },
                    time: {
                        day: 'Monday',
                        from: '11:00 AM',
                        to: '12:00 PM',
                    },
                })
            );
        }
    });

    async function createAppt() {
        await createRequest();
        const db = authedApp({
            uid: "tutor@tutorbook.me",
            email: "tutor@tutorbook.me",
        });
        const requestIn = db.collection("users").doc("tutor@tutorbook.me")
            .collection('requestsIn')
            .doc(id);
        const requestInData = await requestIn.get();
        const requestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('requestsOut')
            .doc(id);
        const approvedRequestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('approvedRequestsOut')
            .doc(id);
        // NOTE: The appts must be processed in this order due to the way that
        // the Firestore rules are setup (i.e. first we check if there is an
        // approvedRequestOut doc, then we check if there is an appt doc
        // already created).
        const appts = [
            db.collection('users').doc('pupil@tutorbook.me')
            .collection('appointments')
            .doc(id),
            db.collection('users').doc('tutor@tutorbook.me')
            .collection('appointments')
            .doc(id),
            db.collection('locations').doc('locationID')
            .collection('appointments')
            .doc(id),
        ];

        await firebase.assertSucceeds(
            approvedRequestOut.set({
                for: requestInData.data(),
                approvedBy: {
                    name: "Tutor Tutorbook",
                    email: 'tutor@tutorbook.me',
                    type: 'Tutor',
                    gender: 'Male',
                },
                approvedTimestamp: new Date(),
            })
        );
        await firebase.assertSucceeds(
            requestOut.delete()
        );
        await firebase.assertSucceeds(
            requestIn.delete()
        );
        for (var i = 0; i < appts.length; i++) {
            var appt = appts[i];
            await firebase.assertSucceeds(
                appt.set({
                    attendees: [{
                        name: 'Tutor Tutorbook',
                        email: 'tutor@tutorbook.me',
                        type: 'Tutor',
                        gender: 'Male',
                    }, {
                        name: "Pupil Tutorbook",
                        email: 'pupil@tutorbook.me',
                        type: 'Pupil',
                        gender: 'Male',
                    }],
                    location: {
                        name: 'Gunn Academic Center',
                        id: 'locationID',
                    },
                    time: {
                        day: 'Monday',
                        from: '11:00 AM',
                        to: '12:00 PM',
                    },
                })
            );
        }
    };


    // ========================================================================
    // SUPERVISOR DATA FLOW
    // ========================================================================

    // TODO: Just get rid of proxy flow and allow supervisors to create requests
    // at their location.
    it("lets supervisors modify appointments at their locations", async () => {
        await createAppt();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const appts = [
            db.collection('users').doc('pupil@tutorbook.me')
            .collection('appointments')
            .doc(id),
            db.collection('users').doc('tutor@tutorbook.me')
            .collection('appointments')
            .doc(id),
            db.collection('locations').doc('locationID')
            .collection('appointments')
            .doc(id),
        ];
        const apptData = await appts[1].get();
        const modifiedAppts = [
            db.collection('users').doc('pupil@tutorbook.me')
            .collection('modifiedAppointments').doc(id),
            db.collection('users').doc('tutor@tutorbook.me')
            .collection('modifiedAppointments').doc(id),
        ];
        for (var i = 0; i < modifiedAppts.length; i++) {
            var modifiedAppt = modifiedAppts[i];
            await firebase.assertSucceeds(
                modifiedAppt.set({
                    modifiedBy: {
                        name: "Supervisor Tutorbook",
                        gender: "Male",
                        type: "Supervisor",
                        email: "supervisor@tutorbook.me",
                    },
                    modifiedTimestamp: new Date(),
                    for: apptData.data(),
                })
            );
        }
        for (var i = 0; i < appts.length; i++) {
            var appt = appts[i];
            await firebase.assertSucceeds(
                appt.update({
                    time: {
                        from: '11:00 AM',
                        to: '1:00 PM',
                    }
                })
            );
        }
    });

    it("lets supervisors cancel appointments at their locations", async () => {
        await createAppt();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const appts = [
            db.collection('users').doc('pupil@tutorbook.me')
            .collection('appointments')
            .doc(id),
            db.collection('users').doc('tutor@tutorbook.me')
            .collection('appointments')
            .doc(id),
            db.collection('locations').doc('locationID')
            .collection('appointments')
            .doc(id),
        ];
        const apptData = await appts[2].get();
        const canceledAppts = [
            db.collection('users').doc('pupil@tutorbook.me')
            .collection('canceledAppointments').doc(id),
            db.collection('users').doc('tutor@tutorbook.me')
            .collection('canceledAppointments').doc(id),
        ];
        for (var i = 0; i < canceledAppts.length; i++) {
            var canceledAppt = canceledAppts[i];
            await firebase.assertSucceeds(
                canceledAppt.set({
                    canceledBy: {
                        name: "Supervisor Tutorbook",
                        gender: "Male",
                        type: "Supervisor",
                        email: "supervisor@tutorbook.me",
                    },
                    canceledTimestamp: new Date(),
                    for: apptData.data(),
                })
            );
        }
        for (var i = 0; i < appts.length; i++) {
            var appt = appts[i];
            await firebase.assertSucceeds(
                appt.delete()
            );
        }
    });

    it("lets supervisors delete past appts at their location", async () => {
        await createPastAppt();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const appts = [
            db.collection('users').doc('tutor@tutorbook.me')
            .collection('pastAppointments').doc(pastApptID),
            db.collection('users').doc('pupil@tutorbook.me')
            .collection('pastAppointments').doc(pastApptID),
            db.collection('locations').doc('locationID')
            .collection('pastAppointments').doc(pastApptID),
        ];
        appts.forEach(async (appt) => {
            [err, res] = await to(firebase.assertSucceeds(
                appt.delete()
            ));
            if (err) throw new Error('Error while deleting past appt.');
        });
    });

    it("lets supervisors modify requests at their locations", async () => {
        await createRequest();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const requestIn = db.collection("users").doc("tutor@tutorbook.me")
            .collection('requestsIn')
            .doc(id);
        const requestInData = await requestIn.get();
        const requestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('requestsOut')
            .doc(id);
        const modifiedRequestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('modifiedRequestsOut')
            .doc(id);
        const modifiedRequestIn = db.collection('users').doc('tutor@tutorbook.me')
            .collection('modifiedRequestsIn')
            .doc(id);
        await firebase.assertSucceeds(
            modifiedRequestOut.set({
                for: requestInData.data(),
                modifiedBy: {
                    name: "Supervisor Tutorbook",
                    gender: "Male",
                    type: "Supervisor",
                    email: "supervisor@tutorbook.me",
                },
                modifiedTimestamp: new Date(),
            })
        );
        await firebase.assertSucceeds(
            modifiedRequestIn.set({
                for: requestInData.data(),
                modifiedBy: {
                    name: "Supervisor Tutorbook",
                    gender: "Male",
                    type: "Supervisor",
                    email: "supervisor@tutorbook.me",
                },
                modifiedTimestamp: new Date(),
            })
        );
        await firebase.assertSucceeds(
            requestOut.update({
                subject: 'Geometry Honors',
            })
        );
        await firebase.assertSucceeds(
            requestIn.update({
                subject: 'Geometry Honors',
            })
        );
    });

    it("lets supervisors cancel requests at their locations", async () => {
        await createRequest();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const requestIn = db.collection("users").doc("tutor@tutorbook.me")
            .collection('requestsIn')
            .doc(id);
        const requestInData = await requestIn.get();
        const requestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('requestsOut')
            .doc(id);
        const canceledRequestIn = db.collection('users').doc('tutor@tutorbook.me')
            .collection('canceledRequestsIn')
            .doc(id);
        const canceledRequestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('canceledRequestsOut')
            .doc(id);

        await firebase.assertSucceeds(
            canceledRequestOut.set({
                for: requestInData.data(),
                canceledBy: {
                    name: "Supervisor Tutorbook",
                    gender: "Male",
                    type: "Supervisor",
                    email: "supervisor@tutorbook.me",
                },
                canceledTimestamp: new Date(),
            })
        );
        await firebase.assertSucceeds(
            canceledRequestIn.set({
                for: requestInData.data(),
                canceledBy: {
                    name: "Supervisor Tutorbook",
                    gender: "Male",
                    type: "Supervisor",
                    email: "supervisor@tutorbook.me",
                },
                canceledTimestamp: new Date(),
            })
        );
        await firebase.assertSucceeds(
            requestOut.delete()
        );
        await firebase.assertSucceeds(
            requestIn.delete()
        );
    });

    it("lets supervisors read appointments at their locations", async () => {
        await createAppt();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const appts = db.collection('locations').doc('locationID')
            .collection('appointments');
        await firebase.assertSucceeds(
            appts.get()
        );
    });

    it("lets supervisors read activeAppointments at their locations", async () => {
        await createActiveAppt();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const appts = db.collection('locations').doc('locationID')
            .collection('activeAppointments');
        await firebase.assertSucceeds(
            appts.get()
        );
    });

    it("lets supervisors read modifiedAppointments at their locations", async () => {
        await createModifiedAppt();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const appts = db.collection('locations').doc('locationID')
            .collection('modifiedAppointments');
        await firebase.assertSucceeds(
            appts.get()
        );
    });

    it("lets supervisors read canceledAppointments at their locations", async () => {
        await createCanceledAppt();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const appts = db.collection('locations').doc('locationID')
            .collection('canceledAppointments');
        await firebase.assertSucceeds(
            appts.get()
        );
    });

    it("lets supervisors read pastAppointments at their locations", async () => {
        await createPastAppt();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const appts = db.collection('locations').doc('locationID')
            .collection('pastAppointments');
        await firebase.assertSucceeds(
            appts.get()
        );
    });

    it("lets supervisors read requestsOut at their locations", async () => {
        await createRequest();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const requestsOut = db.collectionGroup('requestsOut')
            .where('location.id', '==', 'locationID');
        await firebase.assertSucceeds(
            requestsOut.get()
        );
    });

    it("lets supervisors read canceledRequestsIn at their locations", async () => {
        await createCanceledRequest();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const canceledRequestsIn = db.collectionGroup('canceledRequestsIn')
            .where('for.location.id', '==', 'locationID');
        await firebase.assertSucceeds(
            canceledRequestsIn.get()
        );
    });

    it("lets supervisors read modifiedRequestsIn at their locations", async () => {
        await createModifiedRequestIn();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const modifiedRequestsIn = db.collectionGroup('modifiedRequestsIn')
            .where('for.location.id', '==', 'locationID');
        await firebase.assertSucceeds(
            modifiedRequestsIn.get()
        );
    });

    it("lets supervisors read rejectedRequestsOut at their locations", async () => {
        await createRejectedRequest();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const rejectedRequestsOut = db.collectionGroup('rejectedRequestsOut')
            .where('for.location.id', '==', 'locationID');
        await firebase.assertSucceeds(
            rejectedRequestsOut.get()
        );
    });

    it("lets supervisors read approvedRequestsOut at their locations", async () => {
        // NOTE: Creating an appt is the same thing as approving a request and
        // thus this function will also create an approvedRequestOut document.
        await createAppt();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const approvedRequestsOut = db.collectionGroup('approvedRequestsOut')
            .where('for.location.id', '==', 'locationID');
        await firebase.assertSucceeds(
            approvedRequestsOut.get()
        );
    });

    // ========================================================================
    // PROXY DATA FLOW
    // ========================================================================
    it("lets supervisors create proxy profiles", async () => {
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
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
                proxy: [
                    'supervisor@tutorbook.me'
                ],
            })
        );
        await firebase.assertSucceeds(
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
                proxy: [
                    'supervisor@tutorbook.me'
                ],
            })
        );
    });

    it("only lets supervisors create proxy profiles", async () => {
        const db = authedApp({
            uid: "random@tutorbook.me",
            email: "random@tutorbook.me",
            supervisor: false,
            locations: ['locationID'],
        });
        await firebase.assertFails(
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
                proxy: [
                    'supervisor@tutorbook.me'
                ],
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
                proxy: [
                    'supervisor@tutorbook.me'
                ],
            })
        );
    });

    async function createPupilProfile() {
        const db = authedApp({
            uid: "pupil@tutorbook.me",
            email: "pupil@tutorbook.me",
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
                proxy: [],
            })
        );
    };

    async function createProxyPupilProfile() {
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
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
                proxy: [
                    'supervisor@tutorbook.me'
                ],
            })
        );
    };

    async function createProxyTutorProfile() {
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        await firebase.assertSucceeds(
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
                proxy: [
                    'supervisor@tutorbook.me'
                ],
            })
        );
    };

    it("lets supervisors send proxy requests", async () => {
        await createSupervisorProfile();
        await createProxyPupilProfile();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const requestIn = db.collection("users").doc("tutor@tutorbook.me")
            .collection('requestsIn')
            .doc();
        id = requestIn.id;
        const requestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('requestsOut')
            .doc(id);
        await firebase.assertSucceeds(
            requestOut.set({
                fromUser: {
                    name: "Pupil Tutorbook",
                    email: 'pupil@tutorbook.me',
                    proxy: [
                        'supervisor@tutorbook.me'
                    ],
                    type: 'Pupil',
                    gender: 'Male',
                },
                toUser: {
                    name: 'Tutor Tutorbook',
                    email: 'tutor@tutorbook.me',
                    type: 'Tutor',
                    proxy: [],
                    gender: 'Male',
                },
                subject: 'Computer Science',
                timestamp: new Date(),
            })
        );
        await firebase.assertSucceeds(
            requestIn.set({
                fromUser: {
                    name: "Pupil Tutorbook",
                    email: 'pupil@tutorbook.me',
                    type: 'Pupil',
                    proxy: [
                        'supervisor@tutorbook.me'
                    ],
                    gender: 'Male',
                },
                toUser: {
                    name: 'Tutor Tutorbook',
                    email: 'tutor@tutorbook.me',
                    type: 'Tutor',
                    proxy: [],
                    gender: 'Male',
                },
                subject: 'Computer Science',
                timestamp: new Date(),
            })
        );
    });

    // Creates a request that was made by proxy from the pupil
    async function createProxyPupilRequest() {
        await createProxyPupilProfile();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const requestIn = db.collection("users").doc("tutor@tutorbook.me")
            .collection('requestsIn')
            .doc();
        id = requestIn.id;
        const requestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('requestsOut')
            .doc(id);
        await firebase.assertSucceeds(
            requestOut.set({
                fromUser: {
                    name: "Pupil Tutorbook",
                    email: 'pupil@tutorbook.me',
                    proxy: [
                        'supervisor@tutorbook.me'
                    ],
                    type: 'Pupil',
                    gender: 'Male',
                },
                toUser: {
                    name: 'Tutor Tutorbook',
                    email: 'tutor@tutorbook.me',
                    type: 'Tutor',
                    proxy: [],
                    gender: 'Male',
                },
                subject: 'Computer Science',
                timestamp: new Date(),
            })
        );
        await firebase.assertSucceeds(
            requestIn.set({
                fromUser: {
                    name: "Pupil Tutorbook",
                    email: 'pupil@tutorbook.me',
                    type: 'Pupil',
                    proxy: [
                        'supervisor@tutorbook.me'
                    ],
                    gender: 'Male',
                },
                toUser: {
                    name: 'Tutor Tutorbook',
                    email: 'tutor@tutorbook.me',
                    type: 'Tutor',
                    proxy: [],
                    gender: 'Male',
                },
                subject: 'Computer Science',
                timestamp: new Date(),
            })
        );
    };

    // Creates a request that was sent to a tutor with a proxy
    async function createProxyTutorRequest() {
        // NOTE: The pupil profile document must exist in order to create a
        // request for that user.
        await createPupilProfile();
        await createProxyTutorProfile();
        const db = authedApp({
            uid: "pupil@tutorbook.me",
            email: "pupil@tutorbook.me"
        });
        const requestIn = db.collection("users").doc("tutor@tutorbook.me")
            .collection('requestsIn')
            .doc();
        id = requestIn.id;
        const requestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('requestsOut')
            .doc(id);
        await firebase.assertSucceeds(
            requestOut.set({
                fromUser: {
                    name: "Pupil Tutorbook",
                    email: 'pupil@tutorbook.me',
                    proxy: [],
                    type: 'Pupil',
                    gender: 'Male',
                },
                toUser: {
                    name: 'Tutor Tutorbook',
                    email: 'tutor@tutorbook.me',
                    type: 'Tutor',
                    proxy: [
                        'supervisor@tutorbook.me'
                    ],
                    gender: 'Male',
                },
                subject: 'Computer Science',
                timestamp: new Date(),
            })
        );
        await firebase.assertSucceeds(
            requestIn.set({
                fromUser: {
                    name: "Pupil Tutorbook",
                    email: 'pupil@tutorbook.me',
                    type: 'Pupil',
                    proxy: [],
                    gender: 'Male',
                },
                toUser: {
                    name: 'Tutor Tutorbook',
                    email: 'tutor@tutorbook.me',
                    type: 'Tutor',
                    proxy: [
                        'supervisor@tutorbook.me'
                    ],
                    gender: 'Male',
                },
                subject: 'Computer Science',
                timestamp: new Date(),
            })
        );
    };

    it("only lets supervisors modify proxy requests", async () => {
        await createSupervisorProfile();
        await createProxyPupilRequest();
        const db = authedApp({
            uid: "random@tutorbook.me",
            email: "random@tutorbook.me",
            supervisor: false,
            locations: ['locationID'],
        });
        const requestIn = db.collection("users").doc("tutor@tutorbook.me")
            .collection('requestsIn')
            .doc(id);
        const requestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('requestsOut')
            .doc(id);
        const modifiedRequestIn = db.collection('users').doc('tutor@tutorbook.me')
            .collection('modifiedRequestsIn')
            .doc(id);
        await firebase.assertFails(
            modifiedRequestIn.set({
                for: {
                    fromUser: {
                        name: "Pupil Tutorbook",
                        email: 'pupil@tutorbook.me',
                        type: 'Pupil',
                        gender: 'Male',
                    },
                    toUser: {
                        name: 'Tutor Tutorbook',
                        email: 'tutor@tutorbook.me',
                        type: 'Tutor',
                        gender: 'Male',
                    },
                    subject: 'Geometry Honors',
                    timestamp: new Date(),
                },
                modifiedBy: {
                    name: "Supervisor Tutorbook",
                    email: 'supervisor@tutorbook.me',
                    type: 'Supervisor',
                    gender: 'Male',
                },
                modifiedTimestamp: new Date(),
            })
        );
        await firebase.assertFails(
            requestOut.update({
                fromUser: {
                    name: "Pupil Tutorbook",
                    email: 'pupil@tutorbook.me',
                    type: 'Pupil',
                    gender: 'Male',
                },
                toUser: {
                    name: 'Tutor Tutorbook',
                    email: 'tutor@tutorbook.me',
                    type: 'Tutor',
                    gender: 'Male',
                },
                subject: 'Geometry Honors',
                timestamp: new Date(),
            })
        );
        await firebase.assertFails(
            requestIn.update({
                fromUser: {
                    name: "Pupil Tutorbook",
                    email: 'pupil@tutorbook.me',
                    type: 'Pupil',
                    gender: 'Male',
                },
                toUser: {
                    name: 'Tutor Tutorbook',
                    email: 'tutor@tutorbook.me',
                    type: 'Tutor',
                    gender: 'Male',
                },
                subject: 'Geometry Honors',
                timestamp: new Date(),
            })
        );
    });

    it("lets supervisors modify requests as proxy for the sender", async () => {
        await createSupervisorProfile();
        await createProxyPupilRequest();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const requestIn = db.collection("users").doc("tutor@tutorbook.me")
            .collection('requestsIn')
            .doc(id);
        const requestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('requestsOut')
            .doc(id);
        const modifiedRequestIn = db.collection('users').doc('tutor@tutorbook.me')
            .collection('modifiedRequestsIn')
            .doc(id);
        await firebase.assertSucceeds(
            modifiedRequestIn.set({
                for: {
                    fromUser: {
                        name: "Pupil Tutorbook",
                        email: 'pupil@tutorbook.me',
                        type: 'Pupil',
                        gender: 'Male',
                    },
                    toUser: {
                        name: 'Tutor Tutorbook',
                        email: 'tutor@tutorbook.me',
                        type: 'Tutor',
                        gender: 'Male',
                    },
                    subject: 'Geometry Honors',
                    timestamp: new Date(),
                },
                modifiedBy: {
                    name: "Supervisor Tutorbook",
                    email: 'supervisor@tutorbook.me',
                    type: 'Supervisor',
                    gender: 'Male',
                },
                modifiedTimestamp: new Date(),
            })
        );
        await firebase.assertSucceeds(
            requestOut.update({
                fromUser: {
                    name: "Pupil Tutorbook",
                    email: 'pupil@tutorbook.me',
                    type: 'Pupil',
                    gender: 'Male',
                },
                toUser: {
                    name: 'Tutor Tutorbook',
                    email: 'tutor@tutorbook.me',
                    type: 'Tutor',
                    gender: 'Male',
                },
                subject: 'Geometry Honors',
                timestamp: new Date(),
            })
        );
        await firebase.assertSucceeds(
            requestIn.update({
                fromUser: {
                    name: "Pupil Tutorbook",
                    email: 'pupil@tutorbook.me',
                    type: 'Pupil',
                    gender: 'Male',
                },
                toUser: {
                    name: 'Tutor Tutorbook',
                    email: 'tutor@tutorbook.me',
                    type: 'Tutor',
                    gender: 'Male',
                },
                subject: 'Geometry Honors',
                timestamp: new Date(),
            })
        );
    });

    it("lets supervisors cancel requests as proxy for the sender", async () => {
        await createSupervisorProfile();
        await createProxyPupilRequest();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const requestIn = db.collection("users").doc("tutor@tutorbook.me")
            .collection('requestsIn')
            .doc(id);
        const requestInData = await requestIn.get();
        const requestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('requestsOut')
            .doc(id);
        const canceledRequestIn = db.collection('users').doc('tutor@tutorbook.me')
            .collection('canceledRequestsIn')
            .doc(id);

        await firebase.assertSucceeds(
            canceledRequestIn.set({
                for: requestInData.data(),
                canceledBy: {
                    email: 'supervisor@tutorbook.me'
                },
                canceledTimestamp: new Date(),
            })
        );
        await firebase.assertSucceeds(
            requestOut.delete()
        );
        await firebase.assertSucceeds(
            requestIn.delete()
        );
    });

    it("lets supervisors approve requests as proxy for the receiver", async () => {
        await createProxyTutorRequest();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const requestIn = db.collection("users").doc("tutor@tutorbook.me")
            .collection('requestsIn')
            .doc(id);
        const requestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('requestsOut')
            .doc(id);
        const approvedRequestOut = db.collection('users').doc('pupil@tutorbook.me')
            .collection('approvedRequestsOut')
            .doc(id);
        // NOTE: The appts must be processed in this order due to the way that
        // the Firestore rules are setup (i.e. first we check if there is an
        // approvedRequestOut doc, then we check if there is an appt doc
        // already created).
        const appts = [
            db.collection('users').doc('pupil@tutorbook.me')
            .collection('appointments')
            .doc(id),
            db.collection('users').doc('tutor@tutorbook.me')
            .collection('appointments')
            .doc(id),
            db.collection('locations').doc('locationID')
            .collection('appointments')
            .doc(id),
        ];

        await firebase.assertSucceeds(
            approvedRequestOut.set({
                for: {
                    fromUser: {
                        name: "Pupil Tutorbook",
                        email: 'pupil@tutorbook.me',
                        type: 'Pupil',
                        gender: 'Male',
                    },
                    toUser: {
                        name: 'Tutor Tutorbook',
                        email: 'tutor@tutorbook.me',
                        type: 'Tutor',
                        proxy: [
                            'supervisor@tutorbook.me',
                        ],
                        gender: 'Male',
                    },
                    subject: 'Geometry Honors',
                    timestamp: new Date(),
                },
                approvedBy: {
                    name: "Supervisor Tutorbook",
                    email: 'supervisor@tutorbook.me',
                    type: 'Supervisor',
                    gender: 'Male',
                },
                approvedTimestamp: new Date(),
            })
        );
        await firebase.assertSucceeds(
            requestOut.delete()
        );
        await firebase.assertSucceeds(
            requestIn.delete()
        );
        for (var i = 0; i < appts.length; i++) {
            var appt = appts[i];
            await firebase.assertSucceeds(
                appt.set({
                    attendees: [{
                        name: 'Tutor Tutorbook',
                        email: 'tutor@tutorbook.me',
                        type: 'Tutor',
                        proxy: [
                            'supervisor@tutorbook.me',
                        ],
                        gender: 'Male',
                    }, {
                        name: "Pupil Tutorbook",
                        email: 'pupil@tutorbook.me',
                        type: 'Pupil',
                        gender: 'Male',
                    }],
                    location: {
                        name: 'Gunn Academic Center',
                        id: 'locationID',
                    },
                    time: {
                        day: 'Monday',
                        from: '11:00 AM',
                        to: '12:00 PM',
                    },
                })
            );
        }
    });


    // ========================================================================
    // LOCATION DATA FLOW
    // ========================================================================
    it("lets supervisors create locations", async () => {
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const location = db.collection('locations').doc('newLocationID');
        await firebase.assertSucceeds(
            location.set({
                'name': '',
                'city': 'Palo Alto',
                'hours': {},
                // NOTE: Hours of locations are stored in the Firestore database as:
                // hours: {
                //   Friday: [
                //     { open: '10:00 AM', close: '12:00 PM' },
                //     { open: '2:00 PM', close: '5:00 PM' },
                //   ]
                // }
                'description': '',
                'supervisors': ['supervisor@tutorbook.me'], // We assume that the user creating
                // the new location will want to be a supervisor of it.
                'timestamp': new Date(),
            })
        );
    });

    async function createLocation() {
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const location = db.collection('locations').doc('newLocationID');
        await firebase.assertSucceeds(
            location.set({
                'name': '',
                'city': 'Palo Alto',
                'hours': {},
                // NOTE: Hours of locations are stored in the Firestore database as:
                // hours: {
                //   Friday: [
                //     { open: '10:00 AM', close: '12:00 PM' },
                //     { open: '2:00 PM', close: '5:00 PM' },
                //   ]
                // }
                'description': '',
                'supervisors': ['supervisor@tutorbook.me'], // We assume that the user creating
                // the new location will want to be a supervisor of it.
                'timestamp': new Date(),
            })
        );
    };

    it("lets supervisors modify their locations", async () => {
        await createLocation();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const location = db.collection('locations').doc('newLocationID');
        await firebase.assertSucceeds(
            location.update({
                'name': 'Gunn Academic Center',
                'supervisors': [
                    'supervisor@tutorbook.me',
                    'another.supervisor@tutorbook.me'
                ], // We assume that the user creating
                // the new location will want to be a supervisor of it.
                'timestamp': new Date(),
            })
        );
    });

    it("lets supervisors delete their locations", async () => {
        await createLocation();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const location = db.collection('locations').doc('newLocationID');
        await firebase.assertSucceeds(
            location.delete()
        );
    });

    it("only lets supervisors create locations", async () => {
        const db = authedApp({
            uid: "random@tutorbook.me",
            email: "random@tutorbook.me",
            supervisor: false,
            locations: ['locationID'],
        });
        const location = db.collection('locations').doc('newLocationID');
        await firebase.assertFails(
            location.set({
                'name': '',
                'city': 'Palo Alto',
                'hours': {},
                // NOTE: Hours of locations are stored in the Firestore database as:
                // hours: {
                //   Friday: [
                //     { open: '10:00 AM', close: '12:00 PM' },
                //     { open: '2:00 PM', close: '5:00 PM' },
                //   ]
                // }
                'description': '',
                'supervisors': ['random@tutorbook.me'], // We assume that the user creating
                // the new location will want to be a supervisor of it.
                'timestamp': new Date(),
            })
        );
    });

    it("only lets supervisors modify their locations", async () => {
        await createLocation();
        const db = authedApp({
            uid: "random@tutorbook.me",
            email: "random@tutorbook.me",
            supervisor: false,
            locations: ['locationID'],
        });
        const location = db.collection('locations').doc('newLocationID');
        await firebase.assertFails(
            location.update({
                'name': 'Gunn Academic Center',
                'supervisors': [
                    'random@tutorbook.me',
                    'another.random@tutorbook.me'
                ], // We assume that the user creating
                // the new location will want to be a supervisor of it.
                'timestamp': new Date(),
            })
        );
    });

    it("only lets supervisors delete their locations", async () => {
        await createLocation();
        const db = authedApp({
            uid: "random@tutorbook.me",
            email: "random@tutorbook.me",
            supervisor: false,
            locations: ['locationID'],
        });
        const location = db.collection('locations').doc('newLocationID');
        await firebase.assertFails(
            location.delete()
        );
    });


    // ========================================================================
    // CLOCKING SERVICE HOURS DATA FLOW
    // ========================================================================
    var pastApptID;

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

    it("enables tutors to clock into upcoming appointments", async () => {
        await createAppt();
        const db = authedApp({
            uid: "tutor@tutorbook.me",
            email: "tutor@tutorbook.me",
        });
        const appt = await db.collection('users').doc('tutor@tutorbook.me')
            .collection('appointments').doc(id).get();
        const clockIn = db.collection('users').doc('supervisor@tutorbook.me')
            .collection('clockIns').doc(id);
        await firebase.assertSucceeds(
            clockIn.set({
                sentBy: {
                    name: "Tutor Tutorbook",
                    uid: "tutor@tutorbook.me",
                    email: "tutor@tutorbook.me",
                    proxy: [],
                    gender: "Male",
                },
                for: combineMaps(appt.data(), {
                    clockIn: {
                        sentBy: {
                            name: "Tutor Tutorbook",
                            uid: "tutor@tutorbook.me",
                            email: "tutor@tutorbook.me",
                            proxy: [],
                            gender: "Male",
                        },
                        sentTimestamp: new Date(),
                    },
                }),
                sentTimestamp: new Date(),
            })
        );
    });

    async function createClockIn() {
        await createAppt();
        const db = authedApp({
            uid: "tutor@tutorbook.me",
            email: "tutor@tutorbook.me",
        });
        const appt = await db.collection('users').doc('tutor@tutorbook.me')
            .collection('appointments').doc(id).get();
        const clockIn = db.collection('users').doc('supervisor@tutorbook.me')
            .collection('clockIns').doc(id);
        await firebase.assertSucceeds(
            clockIn.set({
                sentBy: {
                    name: "Tutor Tutorbook",
                    uid: "tutor@tutorbook.me",
                    email: "tutor@tutorbook.me",
                    proxy: [],
                    gender: "Male",
                },
                for: combineMaps(appt.data(), {
                    clockIn: {
                        sentBy: {
                            name: "Tutor Tutorbook",
                            uid: "tutor@tutorbook.me",
                            email: "tutor@tutorbook.me",
                            proxy: [],
                            gender: "Male",
                        },
                        sentTimestamp: new Date(),
                    },
                }),
                sentTimestamp: new Date(),
            })
        );
    };

    async function createActiveAppt() {
        await createClockIn();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const clockIn = db.collection('users').doc('supervisor@tutorbook.me')
            .collection('clockIns').doc(id);
        const clockInData = await clockIn.get();
        const approvedClockIn = db.collection('users').doc('supervisor@tutorbook.me')
            .collection('approvedClockIns').doc();
        const appt = db.collection('users').doc('locationID')
            .collection('appointments').doc(id);
        const activeAppts = [
            db.collection('users').doc('pupil@tutorbook.me')
            .collection('activeAppointments')
            .doc(id),
            db.collection('users').doc('tutor@tutorbook.me')
            .collection('activeAppointments')
            .doc(id),
            db.collection('locations').doc('locationID')
            .collection('activeAppointments')
            .doc(id),
        ];
        await firebase.assertSucceeds(
            clockIn.delete()
        );
        await firebase.assertSucceeds(
            approvedClockIn.set(combineMaps(clockInData.data(), {
                approvedTimestamp: new Date(),
                approvedBy: {
                    uid: "supervisor@tutorbook.me",
                    email: "supervisor@tutorbook.me",
                    name: 'Supervisor Tutorbook',
                    gender: 'Male',
                },
            }))
        );
        for (var i = 0; i < activeAppts.length; i++) {
            var activeAppt = activeAppts[i];
            await firebase.assertSucceeds(
                activeAppt.set(clockInData.data().for)
            );
        }
    };

    it("enables supervisors to approve pending clock ins", async () => {
        await createClockIn();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const clockIn = db.collection('users').doc('supervisor@tutorbook.me')
            .collection('clockIns').doc(id);
        const clockInData = await clockIn.get();
        const approvedClockIn = db.collection('users').doc('supervisor@tutorbook.me')
            .collection('approvedClockIns').doc();
        const appt = db.collection('users').doc('locationID')
            .collection('appointments').doc(id);
        const activeAppts = [
            db.collection('users').doc('pupil@tutorbook.me')
            .collection('activeAppointments')
            .doc(id),
            db.collection('users').doc('tutor@tutorbook.me')
            .collection('activeAppointments')
            .doc(id),
            db.collection('locations').doc('locationID')
            .collection('activeAppointments')
            .doc(id),
        ];
        await firebase.assertSucceeds(
            clockIn.delete()
        );
        await firebase.assertSucceeds(
            approvedClockIn.set(combineMaps(clockInData.data(), {
                approvedTimestamp: new Date(),
                approvedBy: {
                    uid: "supervisor@tutorbook.me",
                    email: "supervisor@tutorbook.me",
                    name: 'Supervisor Tutorbook',
                    gender: 'Male',
                },
            }))
        );
        for (var i = 0; i < activeAppts.length; i++) {
            var activeAppt = activeAppts[i];
            await firebase.assertSucceeds(
                activeAppt.set(clockInData.data().for)
            );
        }
    });

    it("enables supervisors to reject pending clock ins", async () => {
        await createClockIn();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const clockIn = db.collection('users').doc('supervisor@tutorbook.me')
            .collection('clockIns').doc(id);
        const clockInData = await clockIn.get();
        const rejectedClockIn = db.collection('users').doc('supervisor@tutorbook.me')
            .collection('rejectedClockIns').doc();
        await firebase.assertSucceeds(
            clockIn.delete()
        );
        await firebase.assertSucceeds(
            rejectedClockIn.set(combineMaps(clockInData.data(), {
                rejectedTimestamp: new Date(),
                rejectedBy: {
                    uid: "supervisor@tutorbook.me",
                    email: "supervisor@tutorbook.me",
                    name: 'Supervisor Tutorbook',
                    gender: 'Male',
                },
            }))
        );
    });

    async function rejectClockIn() {
        await createClockIn();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const clockIn = db.collection('users').doc('supervisor@tutorbook.me')
            .collection('clockIns').doc(id);
        const clockInData = await clockIn.get();
        const rejectedClockIn = db.collection('users').doc('supervisor@tutorbook.me')
            .collection('rejectedClockIns').doc();
        await firebase.assertSucceeds(
            clockIn.delete()
        );
        await firebase.assertSucceeds(
            rejectedClockIn.set(combineMaps(clockInData.data(), {
                rejectedTimestamp: new Date(),
                rejectedBy: {
                    uid: "supervisor@tutorbook.me",
                    email: "supervisor@tutorbook.me",
                    name: 'Supervisor Tutorbook',
                    gender: 'Male',
                },
            }))
        );
    };

    async function rejectClockOut() {
        await createClockOut();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const clockOut = db.collection('users').doc('supervisor@tutorbook.me')
            .collection('clockOuts').doc(id);
        const clockOutData = await clockOut.get();
        const rejectedClockOut = db.collection('users').doc('supervisor@tutorbook.me')
            .collection('rejectedClockOuts').doc();
        await firebase.assertSucceeds(
            clockOut.delete()
        );
        await firebase.assertSucceeds(
            rejectedClockOut.set(combineMaps(clockOutData.data(), {
                rejectedTimestamp: new Date(),
                rejectedBy: {
                    uid: "supervisor@tutorbook.me",
                    email: "supervisor@tutorbook.me",
                    name: 'Supervisor Tutorbook',
                    gender: 'Male',
                },
            }))
        );
    };

    it("enables tutors to read rejected clock ins", async () => {
        await rejectClockIn();
        const db = authedApp({
            uid: "tutor@tutorbook.me",
            email: "tutor@tutorbook.me",
        });
        const clockIns = db.collection('users').doc('supervisor@tutorbook.me')
            .collection('rejectedClockIns')
            .where('sentBy.email', '==', 'tutor@tutorbook.me');
        await firebase.assertSucceeds(
            clockIns.get()
        );
    });

    it("enables tutors to read rejected clock outs", async () => {
        await rejectClockOut();
        const db = authedApp({
            uid: "tutor@tutorbook.me",
            email: "tutor@tutorbook.me",
        });
        const clockOuts = db.collection('users').doc('supervisor@tutorbook.me')
            .collection('rejectedClockOuts')
            .where('sentBy.email', '==', 'tutor@tutorbook.me');
        await firebase.assertSucceeds(
            clockOuts.get()
        );
    });

    it("enables tutors to clock out of active appointments", async () => {
        await createActiveAppt();
        const db = authedApp({
            uid: "tutor@tutorbook.me",
            email: "tutor@tutorbook.me",
        });
        const appt = await db.collection('users').doc('tutor@tutorbook.me')
            .collection('activeAppointments').doc(id).get();
        const clockOut = db.collection('users').doc('supervisor@tutorbook.me')
            .collection('clockOuts').doc(id);
        await firebase.assertSucceeds(
            clockOut.set({
                sentBy: {
                    name: "Tutor Tutorbook",
                    uid: "tutor@tutorbook.me",
                    email: "tutor@tutorbook.me",
                    proxy: [],
                    gender: "Male",
                },
                for: combineMaps(appt.data(), {
                    clockOut: {
                        sentBy: {
                            name: "Tutor Tutorbook",
                            uid: "tutor@tutorbook.me",
                            email: "tutor@tutorbook.me",
                            proxy: [],
                            gender: "Male",
                        },
                        sentTimestamp: new Date(),
                    },
                }),
                sentTimestamp: new Date(),
            })
        );
    });

    async function createClockOut() {
        await createActiveAppt();
        const db = authedApp({
            uid: "tutor@tutorbook.me",
            email: "tutor@tutorbook.me",
        });
        const appt = await db.collection('users').doc('tutor@tutorbook.me')
            .collection('activeAppointments').doc(id).get();
        const clockOut = db.collection('users').doc('supervisor@tutorbook.me')
            .collection('clockOuts').doc(id);
        await firebase.assertSucceeds(
            clockOut.set({
                sentBy: {
                    name: "Tutor Tutorbook",
                    uid: "tutor@tutorbook.me",
                    email: "tutor@tutorbook.me",
                    proxy: [],
                    gender: "Male",
                },
                for: combineMaps(appt.data(), {
                    clockOut: {
                        sentBy: {
                            name: "Tutor Tutorbook",
                            uid: "tutor@tutorbook.me",
                            email: "tutor@tutorbook.me",
                            proxy: [],
                            gender: "Male",
                        },
                        sentTimestamp: new Date(),
                    },
                }),
                sentTimestamp: new Date(),
            })
        );
    };

    it("enables supervisors to approve pending clock outs", async () => {
        await createClockOut();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const clockOut = db.collection('users').doc('supervisor@tutorbook.me')
            .collection('clockOuts').doc(id);
        const clockOutData = await clockOut.get();
        const approvedClockOut = db.collection('users').doc('supervisor@tutorbook.me')
            .collection('approvedClockOuts').doc();
        const activeAppts = [
            db.collection('users').doc('pupil@tutorbook.me')
            .collection('activeAppointments')
            .doc(id),
            db.collection('users').doc('tutor@tutorbook.me')
            .collection('activeAppointments')
            .doc(id),
            db.collection('locations').doc('locationID')
            .collection('activeAppointments')
            .doc(id),
        ];
        const pastAppts = [
            db.collection('users').doc('pupil@tutorbook.me')
            .collection('pastAppointments')
            .doc(),
        ];
        pastApptID = pastAppts[0].id;
        pastAppts.push(
            db.collection('users').doc('tutor@tutorbook.me')
            .collection('pastAppointments')
            .doc(pastApptID),
        );
        pastAppts.push(
            db.collection('locations').doc('locationID')
            .collection('pastAppointments')
            .doc(pastApptID),
        );
        await firebase.assertSucceeds(
            clockOut.delete()
        );
        await firebase.assertSucceeds(
            approvedClockOut.set(combineMaps(clockOutData.data(), {
                approvedTimestamp: new Date(),
                approvedBy: {
                    uid: "supervisor@tutorbook.me",
                    email: "supervisor@tutorbook.me",
                    name: 'Supervisor Tutorbook',
                    gender: 'Male',
                },
            }))
        );
        for (var i = 0; i < activeAppts.length; i++) {
            var activeAppt = activeAppts[i];
            await firebase.assertSucceeds(
                activeAppt.delete()
            );
        }
        for (var i = 0; i < pastAppts.length; i++) {
            var pastAppt = pastAppts[i];
            await firebase.assertSucceeds(
                pastAppt.set(clockOutData.data().for)
            );
        }
    });

    async function createPastAppt() {
        await createClockOut();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const clockOut = db.collection('users').doc('supervisor@tutorbook.me')
            .collection('clockOuts').doc(id);
        const clockOutData = await clockOut.get();
        const approvedClockOut = db.collection('users').doc('supervisor@tutorbook.me')
            .collection('approvedClockOuts').doc();
        const activeAppts = [
            db.collection('users').doc('pupil@tutorbook.me')
            .collection('activeAppointments')
            .doc(id),
            db.collection('users').doc('tutor@tutorbook.me')
            .collection('activeAppointments')
            .doc(id),
            db.collection('locations').doc('locationID')
            .collection('activeAppointments')
            .doc(id),
        ];
        const pastAppts = [
            db.collection('users').doc('pupil@tutorbook.me')
            .collection('pastAppointments')
            .doc(),
        ];
        pastApptID = pastAppts[0].id;
        pastAppts.push(
            db.collection('users').doc('tutor@tutorbook.me')
            .collection('pastAppointments')
            .doc(pastApptID),
        );
        pastAppts.push(
            db.collection('locations').doc('locationID')
            .collection('pastAppointments')
            .doc(pastApptID),
        );
        await firebase.assertSucceeds(
            clockOut.delete()
        );
        await firebase.assertSucceeds(
            approvedClockOut.set(combineMaps(clockOutData.data(), {
                approvedTimestamp: new Date(),
                approvedBy: {
                    uid: "supervisor@tutorbook.me",
                    email: "supervisor@tutorbook.me",
                    name: 'Supervisor Tutorbook',
                    gender: 'Male',
                },
            }))
        );
        for (var i = 0; i < activeAppts.length; i++) {
            var activeAppt = activeAppts[i];
            await firebase.assertSucceeds(
                activeAppt.delete()
            );
        }
        for (var i = 0; i < pastAppts.length; i++) {
            var pastAppt = pastAppts[i];
            await firebase.assertSucceeds(
                pastAppt.set(clockOutData.data().for)
            );
        }
    };

    it("enables supervisors to reject pending clock outs", async () => {
        await createClockOut();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const clockOut = db.collection('users').doc('supervisor@tutorbook.me')
            .collection('clockOuts').doc(id);
        const clockOutData = await clockOut.get();
        const rejectedClockOut = db.collection('users').doc('supervisor@tutorbook.me')
            .collection('rejectedClockOuts').doc();
        await firebase.assertSucceeds(
            clockOut.delete()
        );
        await firebase.assertSucceeds(
            rejectedClockOut.set(combineMaps(clockOutData.data(), {
                rejectedTimestamp: new Date(),
                rejectedBy: {
                    uid: "supervisor@tutorbook.me",
                    email: "supervisor@tutorbook.me",
                    name: 'Supervisor Tutorbook',
                    gender: 'Male',
                },
            }))
        );
    });


    // ========================================================================
    // SCHEDULE DATA FLOW
    // ========================================================================
    it("allows users to read their upcoming appointments", async () => {
        await createAppt();
        const db = authedApp({
            uid: "tutor@tutorbook.me",
            email: "tutor@tutorbook.me",
        });
        const appt = db.collection('users').doc('tutor@tutorbook.me')
            .collection('appointments').doc(id);
        await firebase.assertSucceeds(
            appt.get()
        );
    });

    async function createCanceledAppt() {
        await createAppt();
        const db = authedApp({
            uid: "tutor@tutorbook.me",
            email: "tutor@tutorbook.me",
        });
        const appts = [
            db.collection('users').doc('pupil@tutorbook.me')
            .collection('appointments')
            .doc(id),
            db.collection('users').doc('tutor@tutorbook.me')
            .collection('appointments')
            .doc(id),
            db.collection('locations').doc('locationID')
            .collection('appointments')
            .doc(id),
        ];
        const apptData = await appts[1].get();
        const canceledAppts = [
            db.collection('users').doc('pupil@tutorbook.me')
            .collection('canceledAppointments').doc(id),
            db.collection('locations').doc('locationID')
            .collection('canceledAppointments').doc(id),
        ];
        for (var i = 0; i < canceledAppts.length; i++) {
            var canceledAppt = canceledAppts[i];
            await firebase.assertSucceeds(
                canceledAppt.set({
                    canceledBy: {
                        name: "Tutor Tutorbook",
                        gender: "Male",
                        type: "Tutor",
                        email: "tutor@tutorbook.me",
                    },
                    canceledTimestamp: new Date(),
                    for: apptData.data(),
                })
            );
        }
        for (var i = 0; i < appts.length; i++) {
            var appt = appts[i];
            await firebase.assertSucceeds(
                appt.delete()
            );
        }
    };

    it("allows users to cancel their upcoming appointments", async () => {
        await createAppt();
        const db = authedApp({
            uid: "tutor@tutorbook.me",
            email: "tutor@tutorbook.me",
        });
        const appts = [
            db.collection('users').doc('pupil@tutorbook.me')
            .collection('appointments')
            .doc(id),
            db.collection('users').doc('tutor@tutorbook.me')
            .collection('appointments')
            .doc(id),
            db.collection('locations').doc('locationID')
            .collection('appointments')
            .doc(id),
        ];
        const apptData = await appts[1].get();
        const canceledAppts = [
            db.collection('users').doc('pupil@tutorbook.me')
            .collection('canceledAppointments').doc(id),
            db.collection('locations').doc('locationID')
            .collection('canceledAppointments').doc(id),
        ];
        for (var i = 0; i < canceledAppts.length; i++) {
            var canceledAppt = canceledAppts[i];
            await firebase.assertSucceeds(
                canceledAppt.set({
                    canceledBy: {
                        name: "Tutor Tutorbook",
                        gender: "Male",
                        type: "Tutor",
                        email: "tutor@tutorbook.me",
                    },
                    canceledTimestamp: new Date(),
                    for: apptData.data(),
                })
            );
        }
        for (var i = 0; i < appts.length; i++) {
            var appt = appts[i];
            await firebase.assertSucceeds(
                appt.delete()
            );
        }
    });

    it("allows supervisors to cancel upcoming appointments", async () => {
        await createAppt();
        const db = authedApp({
            uid: "supervisor@tutorbook.me",
            email: "supervisor@tutorbook.me",
            supervisor: true,
            locations: ['locationID'],
        });
        const appts = [
            db.collection('users').doc('pupil@tutorbook.me')
            .collection('appointments')
            .doc(id),
            db.collection('users').doc('tutor@tutorbook.me')
            .collection('appointments')
            .doc(id),
            db.collection('locations').doc('locationID')
            .collection('appointments')
            .doc(id),
        ];
        const apptData = await appts[2].get();
        const canceledAppts = [
            db.collection('users').doc('pupil@tutorbook.me')
            .collection('canceledAppointments').doc(id),
            db.collection('users').doc('tutor@tutorbook.me')
            .collection('canceledAppointments').doc(id),
        ];
        for (var i = 0; i < canceledAppts.length; i++) {
            var canceledAppt = canceledAppts[i];
            await firebase.assertSucceeds(
                canceledAppt.set({
                    canceledBy: {
                        name: "Supervisor Tutorbook",
                        gender: "Male",
                        type: "Supervisor",
                        email: "supervisor@tutorbook.me",
                    },
                    canceledTimestamp: new Date(),
                    for: apptData.data(),
                })
            );
        }
        for (var i = 0; i < appts.length; i++) {
            var appt = appts[i];
            await firebase.assertSucceeds(
                appt.delete()
            );
        }
    });

    async function createModifiedAppt() {
        await createAppt();
        const db = authedApp({
            uid: "tutor@tutorbook.me",
            email: "tutor@tutorbook.me",
        });
        const appts = [
            db.collection('users').doc('pupil@tutorbook.me')
            .collection('appointments')
            .doc(id),
            db.collection('users').doc('tutor@tutorbook.me')
            .collection('appointments')
            .doc(id),
            db.collection('locations').doc('locationID')
            .collection('appointments')
            .doc(id),
        ];
        const apptData = await appts[1].get();
        const modifiedAppts = [
            db.collection('users').doc('pupil@tutorbook.me')
            .collection('modifiedAppointments').doc(id),
            db.collection('locations').doc('locationID')
            .collection('modifiedAppointments').doc(id),
        ];
        for (var i = 0; i < modifiedAppts.length; i++) {
            var modifiedAppt = modifiedAppts[i];
            await firebase.assertSucceeds(
                modifiedAppt.set({
                    modifiedBy: {
                        name: "Tutor Tutorbook",
                        gender: "Male",
                        type: "Tutor",
                        email: "tutor@tutorbook.me",
                    },
                    modifiedTimestamp: new Date(),
                    for: apptData.data(),
                })
            );
        }
        for (var i = 0; i < appts.length; i++) {
            var appt = appts[i];
            await firebase.assertSucceeds(
                appt.update({
                    time: {
                        from: '11:00 AM',
                        to: '1:00 PM',
                    }
                })
            );
        }
    };

    it("allows users to modify their upcoming appointments", async () => {
        await createAppt();
        const db = authedApp({
            uid: "tutor@tutorbook.me",
            email: "tutor@tutorbook.me",
        });
        const appts = [
            db.collection('users').doc('pupil@tutorbook.me')
            .collection('appointments')
            .doc(id),
            db.collection('users').doc('tutor@tutorbook.me')
            .collection('appointments')
            .doc(id),
            db.collection('locations').doc('locationID')
            .collection('appointments')
            .doc(id),
        ];
        const apptData = await appts[1].get();
        const modifiedAppts = [
            db.collection('users').doc('pupil@tutorbook.me')
            .collection('modifiedAppointments').doc(id),
            db.collection('locations').doc('locationID')
            .collection('modifiedAppointments').doc(id),
        ];
        for (var i = 0; i < modifiedAppts.length; i++) {
            var modifiedAppt = modifiedAppts[i];
            await firebase.assertSucceeds(
                modifiedAppt.set({
                    modifiedBy: {
                        name: "Tutor Tutorbook",
                        gender: "Male",
                        type: "Tutor",
                        email: "tutor@tutorbook.me",
                    },
                    modifiedTimestamp: new Date(),
                    for: apptData.data(),
                })
            );
        }
        for (var i = 0; i < appts.length; i++) {
            var appt = appts[i];
            await firebase.assertSucceeds(
                appt.update({
                    time: {
                        from: '11:00 AM',
                        to: '1:00 PM',
                    }
                })
            );
        }
    });
    /*
     *
     *    it("allows supervisors to modify upcoming appointments as proxy for an attendee", async () => {
     *        // stub
     *    });
     *
     *    it("only allows attendees to modify upcoming appointments", async () => {
     *        // stub
     *    });
     */

    it("allows users to read their active appointments", async () => {
        await createActiveAppt();
        const db = authedApp({
            uid: "tutor@tutorbook.me",
            email: "tutor@tutorbook.me",
        });
        const appt = db.collection('users').doc('tutor@tutorbook.me')
            .collection('activeAppointments').doc(id);
        await firebase.assertSucceeds(
            appt.get()
        );
    });

    it("allows users to read their past appointments", async () => {
        await createPastAppt();
        const db = authedApp({
            uid: "tutor@tutorbook.me",
            email: "tutor@tutorbook.me",
        });
        const appt = db.collection('users').doc('tutor@tutorbook.me')
            .collection('pastAppointments').doc(pastApptID);
        await firebase.assertSucceeds(
            appt.get()
        );
    });


    // ========================================================================
    // PAYMENTS DATA FLOW
    // ========================================================================

    async function createAuthPayment() {
        const db = authedApp({
            uid: "pupil@tutorbook.me",
            email: "pupil@tutorbook.me",
        });
        const payments = [
            db.collection('users').doc('tutor@tutorbook.me')
            .collection('authPayments').doc()
        ];
        payments.push(
            db.collection('users').doc('pupil@tutorbook.me')
            .collection('authPayments').doc(payments[0].id)
        );
        payments.forEach(async (payment) => {
            await firebase.assertSucceeds(
                payment.set({
                    to: {
                        email: 'tutor@tutorbook.me',
                        name: 'Tutor Tutorbook',
                        type: 'Tutor',
                    },
                    from: {
                        email: 'pupil@tutorbook.me',
                        name: 'Pupil Tutorbook',
                        type: 'Pupil',
                    },
                    amount: 25,
                    for: {
                        // requestData
                    },
                    id: payments[0].id,
                })
            );
        });
    };

    it("allows pupils to create auth payments", async () => {
        const db = authedApp({
            uid: "pupil@tutorbook.me",
            email: "pupil@tutorbook.me",
        });
        const payments = [
            db.collection('users').doc('tutor@tutorbook.me')
            .collection('authPayments').doc()
        ];
        payments.push(
            db.collection('users').doc('pupil@tutorbook.me')
            .collection('authPayments').doc(payments[0].id)
        );
        payments.forEach(async (payment) => {
            await firebase.assertSucceeds(
                payment.set({
                    to: {
                        email: 'tutor@tutorbook.me',
                        name: 'Tutor Tutorbook',
                        type: 'Tutor',
                    },
                    from: {
                        email: 'pupil@tutorbook.me',
                        name: 'Pupil Tutorbook',
                        type: 'Pupil',
                    },
                    amount: 25,
                    for: {
                        // requestData
                    },
                    id: payments[0].id,
                })
            );
        });
    });

    it("allows pupils to create payments", async () => {
        // stub
    });

    it("allows tutors to request payouts", async () => {
        // stub
    });

    it("allows users to read their auth payments", async () => {
        await createAuthPayment();
        const db = authedApp({
            uid: "tutor@tutorbook.me",
            email: "tutor@tutorbook.me",
        });
        const payments = db.collection('users').doc('tutor@tutorbook.me')
            .collection('authPayments');
        await firebase.assertSucceeds(
            payments.get()
        );
    });

    it("allows users to read their past payments", async () => {
        const db = authedApp({
            uid: "tutor@tutorbook.me",
            email: "tutor@tutorbook.me",
        });
        const payments = db.collection('users').doc('tutor@tutorbook.me')
            .collection('pastPayments');
        await firebase.assertSucceeds(
            payments.get()
        );
    });

    it("allows users to read their paid payments", async () => {
        const db = authedApp({
            uid: "tutor@tutorbook.me",
            email: "tutor@tutorbook.me",
        });
        const payments = db.collection('users').doc('tutor@tutorbook.me')
            .collection('paidPayments');
        await firebase.assertSucceeds(
            payments.get()
        );
    });


    // ========================================================================
    // PARENT DATA FLOW
    // ========================================================================

    it("enables parents to create accounts for their children", async () => {
        const db = authedApp({
            uid: "parent@tutorbook.app",
            email: "parent@tutorbook.app",
            parent: true,
            supervisor: false,
            children: [],
            locations: [],
        });
        const child = db.collection('users').doc('pupil@tutorbook.app');
        await firebase.assertSucceeds(
            child.set({
                name: "Child Tutorbook",
                gender: "Male",
                email: "child@tutorbook.app",
                proxy: [
                    'parent@tutorbook.app',
                ],
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
});