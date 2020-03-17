// =============================================================================
// DEPENDENCIES
// =============================================================================

const {
    PROJECT_ID,
    COVERAGE_URL,
    FIRESTORE_RULES_FILE,
    USER_SUBCOLLECTIONS,
} = require('./config.js');
const {
    PUPIL,
    TUTOR,
    SUPERVISOR,
    ACCESS,
    ACCESS_ID,
    LOCATION,
} = require('./data.js');

const {
    combineMaps,
    authedApp,
} = require('./utils.js');

const firebase = require('@firebase/testing');
const fs = require('fs');

// =============================================================================
// FIRESTORE RULES TESTS
// =============================================================================

beforeEach(async () => { // Clear the database simulator between tests.
    await firebase.clearFirestoreData({
        projectId: PROJECT_ID,
    });
});

before(async () => { // Load the Firestore rules before testing.
    await firebase.loadFirestoreRules({
        projectId: PROJECT_ID,
        rules: fs.readFileSync(FIRESTORE_RULES_FILE, 'utf8'),
    });
});

after(async () => { // Delete test app instances and log coverage info URL.
    await Promise.all(firebase.apps().map(app => app.delete()));
    console.log('View rule coverage information at ' + COVERAGE_URL + ' \n');
});

describe('Tutorbook\'s Database Security', async () => {

    // =========================================================================
    // USERs
    // =========================================================================

    it('requires users to log-in before creating a profile', async () => {
        const db = authedApp();
        const ref = db.collection('users').doc(PUPIL.uid);
        await firebase.assertFails(ref.set({
            type: PUPIL.type,
        }));
    });

    it('ensures users start w/out a balance and service hrs', async () => {
        const db = authedApp({
            uid: TUTOR.uid,
            email: TUTOR.email
        });
        const ref = db.collection('users').doc(TUTOR.uid);
        await firebase.assertFails(ref.set({
            type: TUTOR.type,
        }));
        await firebase.assertFails(ref.set({
            type: TUTOR.type,
            secondsPupiled: 0,
        }));
        await firebase.assertFails(ref.set({
            type: TUTOR.type,
            secondsTutored: 0,
        }));
        await firebase.assertFails(ref.set({
            type: TUTOR.type,
            secondsPupiled: 0,
            secondsTutored: 0,
        }));
        await firebase.assertFails(ref.set({
            type: TUTOR.type,
            payments: {
                currentBalance: 0,
            },
        }));
        await firebase.assertSucceeds(ref.set({
            type: TUTOR.type,
            payments: {
                currentBalance: 0,
            },
            secondsPupiled: 0,
            secondsTutored: 0,
        }));
    });

    function createProfile(profile) {
        const db = authedApp({
            uid: profile.uid,
            email: profile.email
        });
        const ref = db.collection('users').doc(profile.uid);
        return firebase.assertSucceeds(ref.set(profile));
    };

    it('prevents users from changing their access/district', async () => {
        await createProfile(TUTOR);
        const db = authedApp({
            uid: TUTOR.uid,
            email: TUTOR.email
        });
        const ref = db.collection('users').doc(TUTOR.uid);
        await firebase.assertFails(ref.update({
            access: [ACCESS_ID, ACCESS_ID, ACCESS_ID],
        }));
    });

    it('prevents users from changing their num of ratings', async () => {
        await createProfile(TUTOR);
        const db = authedApp({
            uid: TUTOR.uid,
            email: TUTOR.email
        });
        const ref = db.collection('users').doc(TUTOR.uid);
        await firebase.assertFails(ref.update({
            numRatings: 10,
        }));
    });

    it('prevents users from changing their avg rating', async () => {
        await createProfile(TUTOR);
        const db = authedApp({
            uid: TUTOR.uid,
            email: TUTOR.email
        });
        const ref = db.collection('users').doc(TUTOR.uid);
        await firebase.assertFails(ref.update({
            avgRating: 5,
        }));
    });

    it('prevents (free) tutors from changing their service hrs', async () => {
        await createProfile(TUTOR);
        const db = authedApp({
            uid: TUTOR.uid,
            email: TUTOR.email
        });
        const ref = db.collection('users').doc(TUTOR.uid);
        await firebase.assertFails(ref.update({
            secondsTutored: 2400,
        }));
    });

    it('prevents (paid) tutors from changing their balance', async () => {
        await createProfile(TUTOR);
        const db = authedApp({
            uid: TUTOR.uid,
            email: TUTOR.email
        });
        const ref = db.collection('users').doc(TUTOR.uid);
        await firebase.assertFails(ref.update({
            payments: {
                currentBalance: 200,
            },
        }));
    });

    async function createSupervisorProfile() {
        const db = authedApp({
            uid: SUPERVISOR.uid,
            email: SUPERVISOR.email
        });
        await Promise.all([
            db.collection('usersByEmail').doc(SUPERVISOR.email),
            db.collection('users').doc(SUPERVISOR.uid),
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

    it('only lets users create their own profiles', async () => {
        const db = authedApp({
            uid: PUPIL.uid,
            email: PUPIL.email
        });
        const pupil = db.collection('users').doc(PUPIL.uid);
        await firebase.assertSucceeds(pupil.set({
            type: PUPIL.type,
            payments: {
                currentBalance: 0,
                currentBalanceString: '$0.00',
            },
            secondsPupiled: 0,
            secondsTutored: 0,
        }));
        const tutor = db.collection('users').doc(TUTOR.uid);
        await firebase.assertFails(tutor.set({
            type: TUTOR.type,
            payments: {
                currentBalance: 0,
                currentBalanceString: '$0.00',
            },
            secondsPupiled: 0,
            secondsTutored: 0,
        }));
    });

    it('lets users read profiles in their access/district', async () => {
        const db = authedApp({
            uid: PUPIL.uid,
            email: PUPIL.email,
            access: PUPIL.access,
        });
        const ref = db.collection('users').doc(TUTOR.uid);
        await createProfile(TUTOR);
        await firebase.assertSucceeds(ref.get());
    });

    it('contains users within their access/district', async () => {
        const db = authedApp({
            uid: PUPIL.uid,
            email: PUPIL.email,
            access: PUPIL.access,
        });
        const ref = db.collection('users').doc(TUTOR.uid);
        await createProfile(combineMaps(TUTOR, {
            access: [],
        }));
        await firebase.assertFails(ref.get());
    });

    // =========================================================================
    // SUBCOLLECTIONs (requests, appointments, etc)
    // =========================================================================

    USER_SUBCOLLECTIONS.forEach(subcollection => {
        it('lets users read their ' + subcollection, () => {
            const db = authedApp({
                uid: TUTOR.uid,
                email: TUTOR.email,
            });
            const ref = db.collection('users').doc(TUTOR.uid);
            return firebase.assertSucceeds(ref.collection(subcollection).get());
        });
        it('only lets users read their own ' + subcollection, async () => {
            const db = authedApp({
                uid: TUTOR.uid,
                email: TUTOR.email,
            });
            await createProfile(PUPIL);
            const ref = db.collection('users').doc(PUPIL.uid);
            return firebase.assertFails(ref.collection(subcollection).get());
        });
        it('lets users read their proxy\'s ' + subcollection, async () => {
            const db = authedApp({
                uid: TUTOR.uid,
                email: TUTOR.email,
            });
            await createProfile(combineMaps(PUPIL, {
                proxy: [TUTOR.uid],
            }));
            const ref = db.collection('users').doc(PUPIL.uid);
            return firebase.assertSucceeds(ref.collection(subcollection).get());
        });
    });

    // =========================================================================
    // TODO: CHATs
    // =========================================================================

    it('lets users send messages', async () => {
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
});