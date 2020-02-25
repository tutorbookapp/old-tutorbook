const readline = require('readline-sync');
const admin = require('firebase-admin');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});

const firestore = admin.firestore();
const partitions = {
    test: firestore.collection('partitions').doc('test'),
    default: firestore.collection('partitions').doc('default'),
};

const findLocations = async (isTest = false) => {
    var num = new Number(readline.question('How many locations to select?'));
    while (num.toString() === 'NaN')
        num = new Number(readline.question('How many locations to select?'));
    const locations = [];
    for (var i = 0; i < num.valueOf(); i++) {
        locations.push((await findLocation(isTest)));
    }
    return locations;
};

const findLocation = (isTest = false) => {
    const ans = readline.question('Select a location by name or say "new":');
    if (ans === 'new') return createLocation({
        isTest: isTest,
    });
    return findLocationByName(ans, isTest);
};

const findLocationByName = async (name, isTest = false) => {
    const matches = (await (isTest ? partitions.test : partitions.default)
        .collection('locations').where('name', '==', name).get()).docs;
    if (matches.length > 1) {
        const uids = matches.map(m => m.id)
        while (uids.indexOf(selected) < 0) {
            var selected = readline.question('Select a location (' +
                uids.combine(', ') + '):');
        }
        return matches.filter(m => selected === m.id)[0];
    }
    if (matches.length < 1) {
        console.log('[DEBUG] No locations had the name (' + name + ').');
        return findLocation();
    }
    return matches[0];
};

const findUsers = async (isTest = false) => {
    var num = new Number(readline.question('How many users to select?'));
    while (num.toString() === 'NaN')
        num = new Number(readline.question('How many users to select?'));
    const users = [];
    for (var i = 0; i < num.valueOf(); i++) {
        users.push((await findUser(isTest)));
    }
    return users;
};

const findUser = (isTest = false) => {
    const search = readline.question('Select a user by name or email:');
    if (search.indexOf('@') >= 0) return findUserByEmail(search, isTest);
    return findUserByName(search, isTest);
};

const findUserByName = async (name, isTest = false) => {
    const matches = (await (isTest ? partitions.test : partitions.default)
        .collection('users').where('name', '==', name).get()).docs;
    if (matches.length > 1) {
        const uids = matches.map(m => m.id)
        while (uids.indexOf(selected) < 0) {
            var selected = readline.question('Select a user (' +
                uids.combine(', ') + '):');
        }
        return matches.filter(m => selected === m.id)[0];
    }
    if (matches.length < 1) return findUser();
    return matches[0];
};

const findUserByEmail = async (email, isTest = false) => {
    const matches = (await (isTest ? partitions.test : partitions.default)
        .collection('users').where('email', '==', email).get()).docs;
    if (matches.length > 1) {
        const uids = matches.map(m => m.id)
        while (uids.indexOf(selected) < 0) {
            var selected = readline.question('Select a user (' +
                uids.combine(', ') + '):');
        }
        return matches.filter(m => selected === m.id)[0];
    }
    if (matches.length < 1) return findUser();
    return matches[0];
};

/**
 * Creates and returns an open hours map based on user input.
 */
const setHours = () => {

};

/**
 * Creates an object from a map of fields (with their datatypes) from values
 * provided by user input.
 * @return hours: {
 *   Friday: [
 *     { open: '10:00 AM', close: '3:00 PM' },
 *     { open: '10:00 AM', close: '3:00 PM' },
 *   ],
 *   Tuesday: [
 *     { open: '10:00 AM', close: '3:00 PM' },
 *   ],
 * }
 */
const createOb = async (obName, fields, options = {}) => {
    const ob = {};
    await Promise.all(Object.entries(fields).map(([datatype, keys]) =>
        Promise.all(keys.map(async key => {
            if (options[key]) return ob[key] = options[key];
            switch (datatype) {
                case 'strings':
                    return ob[key] = readline.question(obName + ' ' + key +
                        ' (string):');
                case 'arrays':
                    return ob[key] = readline.question(obName + ' ' + key +
                        ' (comma separated values):').split(',');
                case 'hours':
                    return ob[key] = setHours();
                case 'maps':
                    return console.warn('[WARNING] Maps are not currently ' +
                        'supported as a prompt.');
                case 'timestamps':
                    var val = readline.question(obName + ' ' +
                        key + ' (valid datestring):') || new Date().toString();
                    var date = new Date(val);
                    while (date.toString() === 'Invalid Date')
                        date = new Date(readline.question('Invalid date, try ' +
                            'again (valid datestring):'));
                    return ob[key] = date;
                case 'users':
                    return ob[key] = (await findUsers()).map(u => u.id);
                case 'locations':
                    return ob[key] = (await findLocations()).map(l => l.id);
                default:
                    return console.warn('[WARNING] Datatype (' + datatype +
                        ') isn\'t supported.');
            };
        }))));
    return ob;
};

/**
 * Creates a new location document with the specified configuration (or prompts
 * for missing data).
 */
const createLocation = async (options = {}) => {
    const fields = {
        strings: ['name', 'description', 'city'],
        arrays: ['photos'],
        hours: ['hours'],
        timestamps: ['created', 'updated'],
        users: ['supervisors'],
    };
    const location = await createOb('Location', fields, options);
    while (typeof options.isTest !== 'boolean') {
        var answer = readline.question('Create in test partition? (y/n)');
        options.isTest = answer === 'y' ? true : answer === 'n' ? false : null;
    }
    const db = options.isTest ? partitions.test : partitions.default;
    const ref = options.id ? db.collection('locations').doc(options.id) :
        db.collection('locations').doc();
    await ref.set(location);
    console.log('[INFO] Created location (' + ref.id + ') in ' + (options
        .isTest ? 'test' : 'default') + ' database partition.');
};

/**
 * Creates a new access or district document with the specified configuration
 * (or prompts for missing data).
 */
const createAccess = async (options = {}) => {
    const fields = {
        strings: ['name', 'symbol'],
        timestamps: ['created', 'updated'],
    };
    const access = await createOb('Access/District', fields, options);
    while (typeof options.isTest !== 'boolean') {
        var answer = readline.question('Create in test partition? (y/n)');
        options.isTest = answer === 'y' ? true : answer === 'n' ? false : null;
    }
    const db = options.isTest ? partitions.test : partitions.default;
    const ref = options.id ? db.collection('access').doc(options.id) :
        db.collection('access').doc();
    await ref.set(access);
    console.log('[INFO] Created access (' + ref.id + ') in ' + (options
        .isTest ? 'test' : 'default') + ' database partition.');
};

/** 
 * Creates a new website document with the specified configuration (or prompts
 * for missing data).
 */
const createWebsite = async (options = {}) => {
    const fields = {
        strings: ['url'],
        arrays: ['grades'],
        timestamps: ['created', 'updated'],
        access: ['access'],
        locations: ['locations'],
    };
    const website = await createOb('Website', fields, options);
    while (typeof options.isTest !== 'boolean') {
        var answer = readline.question('Create in test partition? (y/n)');
        options.isTest = answer === 'y' ? true : answer === 'n' ? false : null;
    }
    const db = options.isTest ? partitions.test : partitions.default;
    const ref = options.id ? db.collection('websites').doc(options.id) :
        db.collection('websites').doc();
    await ref.set(website);
    console.log('[INFO] Created website (' + ref.id + ') in ' + (options
        .isTest ? 'test' : 'default') + ' database partition.');
};

/**
 * Prompts for new locations, access, and website documents.
 */
const create = () => {

};

createWebsite();