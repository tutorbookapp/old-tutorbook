// =============================================================================
// DEPENDENCIES
// =============================================================================

const {
    PROJECT_ID,
} = require('./config.js');
const {
    FILTERS,
} = require('./data.js');

debugger;

const firebase = require('@firebase/testing');

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

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
        hourlyCharge: profile.payments ? profile.payments.hourlyCharge : 0,
        location: profile.location,
        payments: profile.payments,
        proxy: profile.proxy,
    };
};

/**
 * Returns if the array contains the same elements (regardless of order).
 * @memberof Array#
 * @param {Array} array - The array to compare.
 * @return {bool} Whether or not the array contains the same elements.
 */
Array.prototype.equals = function(array) {
    if (!array) return false;
    if (this.sort().length != array.sort().length) return false;
    for (var i = 0, l = this.length; i < l; i++) {
        if (this[i] instanceof Array && array[i] instanceof Array) {
            if (!this[i].equals(array[i])) return false;
        } else if (this[i] != array[i]) {
            return false;
        }
    }
    return true;
};

/**
 * Returns a Firestore database instance with the given authorization.
 * @param {Object} auth - The authorization token to initialize the Firestore
 * database with.
 * @param {string} [partition='default'] - The database partition to return.
 * @return {external:CollectionReference} The requested partition of the 
 * initialized Firestore database.
 */
const authedApp = (auth, partition = 'default') => {
    debugger;
    return firebase.initializeTestApp({
        projectId: PROJECT_ID,
        auth: auth,
    }).firestore().collection('partitions').doc(partition);
};

/**
 * Sets the Firestore database data to match the given data state.
 * @param {Map} data - The desired state of our Firestore database.
 * @param {string} [partition='default'] - The database partition to set the
 * state in.
 * @return {Promise<undefined>} Promise that resolves once the Firestore 
 * database's data matches what was defined in the given `data` map.
 */
const data = async (data, partition = 'default') => {
    debugger;
    const db = firebase.initializeAdminApp({
        projectId: PROJECT_ID,
    }).firestore().collection('partitions').doc(partition);
    for (const key in data) await db.doc(key).set(data[key]);
};

/**
 * Returns the combination of `mapA` and `mapB` while always giving priority to
 * `mapB` (i.e. if they both have the same key, the value at that key in the
 * combined map will be the value at that key in `mapB`).
 * @param {Map} mapA - The first map to combine.
 * @param {Map} mapB - The second map to combine (that will override any values
 * at shared keys in `mapA`).
 * @return {Map} The combination of `mapA` and `mapB` (giving precendence to
 * `mapB`).
 */
const combineMaps = (mapA, mapB) => {
    const result = {};
    for (var i in mapA) result[i] = mapA[i];
    for (var i in mapB) result[i] = mapB[i];
    return result;
};

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
 * Takes in an array of values and returns all possible combinations of the 
 * array items ignoring order (i.e. `['hello', 'hi']` and `['hi', 'hello']` are
 * not unique; they are considered duplicates and only one will be kept).
 * @example
 * const arr = ['hi', 'hello', 'bye'];
 * const res = combinations(arr);
 * assert(res = [
 *   ['hi'], 
 *   ['hi', 'hello'], 
 *   ['hi', 'bye'],
 *   ['hi', 'hello', 'bye'],
 *   ['hello'],
 *   ['hello', 'bye'],
 *   ['bye'],
 * ]);
 * @params {Array} arr - The array from which the elements come to combine in 
 * all possible ways.
 * @return {Array} A two dimensional array containing every possible combination
 * of the elements in the given array (`arr`).
 * @see {@link https://codereview.stackexchange.com/a/7042}
 */
const combinations = (arr) => {
    const fn = (active, rest, a) => {
        if (!active.length && !rest.length) return;
        if (!rest.length) {
            a.push(active);
        } else {
            fn(active.map(i => i), rest.slice(1), a);
            fn(active.concat(rest.slice(0, 1)), rest.slice(1), a);
        }
        return a;
    }
    const withDups = fn([], arr, []);
    const noDups = [];
    withDups.forEach(combination => {
        if (noDups.findIndex(combo => combo.equals(combination)) < 0)
            noDups.push(combination);
    });
    return noDups;
};

/**
 * Removes any filter combinations that contain more than one `array-contains`
 * filterable attribute.
 * @param {Array} filters - The filter combinations to remove filters that 
 * contain more than one `array-contains` filterable attribute from.
 * @return {Array} The `filters` array without filters that contain more than
 * one `array-contains` filterable attribute.
 */
const removeDoubleArrayContains = (filters) => {
    return filters.filter(filters => {
        var count = 0;
        filters.map(filter => {
            if (FILTERS[filter][0] === 'array-contains') count++;
        });
        if (count > 1) return false;
        return true;
    });
};

module.exports = {
    combineMaps,
    cloneMap,
    combinations,
    conciseUser,
    authedApp,
    data,
};