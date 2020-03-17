// =============================================================================
// DEPENDENCIES
// =============================================================================

const {
    PROJECT_ID,
    FIRESTORE_RULES,
    FILTERS,
    SORTERS,
} = require('./config.js');
const {
    PUPIL,
} = require('./data.js');

const {
    combinations,
    authedApp,
} = require('./utils.js');

const firebase = require('@firebase/testing');
const fs = require('fs');

// =============================================================================
// FIRESTORE INDEXES TESTS
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
});

describe('Tutorbook\'s Database Indexing', async () => {
    const db = authedApp({
        uid: PUPIL.uid,
        email: PUPIL.email,
        access: PUPIL.access,
    });
    const filterCombos = combinations(Object.keys(FILTERS));
    filterCombos.forEach(filters => it('lets users filter profiles by ' +
        filters.join(', '), () => {
            var query = db.collection('users')
                .where('access', 'array-contains-any', PUPIL.access);
            filters.map(filter => query =
                query.where(filter, FILTERS[filter][0], FILTERS[filter][1]));
            return Promise.all(SORTERS.map(sorter =>
                firebase.assertSucceeds(query.orderBy(sorter).get())));
        }));
});