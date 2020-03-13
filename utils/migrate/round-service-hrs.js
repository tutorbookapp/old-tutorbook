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

const roundDate = (date, thresholdMins, rounding = 'Normally') => {
    const coeff = 1000 * 60 * thresholdMins;
    switch (rounding) {
        case 'Up':
            return new Date(Math.ceil(date.getTime() / coeff) * coeff);
        case 'Down':
            return new Date(Math.floor(date.getTime() / coeff) * coeff);
        default:
            return new Date(Math.round(date.getTime() / coeff) * coeff);
    };
};

const roundDuration = (secs, thresholdSecs, rounding = 'Normally') => {
    switch (rounding) {
        case 'Up':
            return Math.ceil(secs / thresholdSecs) * thresholdSecs;
        case 'Down':
            return Math.floor(secs / thresholdSecs) * thresholdSecs;
        default:
            return Math.round(secs / thresholdSecs) * thresholdSecs;
    };
};

const getRules = async (locationId, isTest) => {
    const db = isTest ? partitions.test : partitions.default;
    const doc = await db.collection('locations').doc(locationId).get();
    if (!doc.exists) return console.error('[ERROR] Could not get rounding ' +
        'rules b/c location (' + locationId + ') did not exist.');
    return doc.data().config.hrs;
};

const secsDuration = (cIn, cOut) => (cOut - cIn) / 1000;

const roundHours = async (appt, isTest, givenRules) => {
    // 0) Validate the location's rounding rules and set defaults
    console.log('[DEBUG] Updating past appt (' + appt.ref.path + ')...');
    const db = isTest ? partitions.test : partitions.default;
    const a = appt.data();
    if (!a.clockOut) return console.error('[ERROR] Cannot round hours for ' +
        'appt w/out clockOut data.');
    if (!a.clockIn) return console.error('[ERROR] Cannot round hours for appt' +
        'w/out clockIn data.');
    const rules = givenRules || await getRules(a.location.id, isTest);
    const thresholdSecs = {
        'Minute': 60,
        '5 Minutes': 5 * 60,
        '15 Minutes': 15 * 60,
        '30 Minutes': 30 * 60,
        'Hour': 60 * 60,
    };
    const threshs = ['Minute', '5 Minutes', '15 Minutes', '30 Minutes', 'Hour'];
    const roundings = ['Up', 'Down', 'Normally'];
    if (threshs.indexOf(rules.threshold) < 0) rules.threshold = threshs[0];
    if (roundings.indexOf(rules.rounding) < 0) rules.rounding = roundings[0];
    // 1) Round duration up/down/normally to threshold
    const roundedDurationSecs = roundDuration(secsDuration(
        a.clockIn.sentTimestamp.toDate(),
        a.clockOut.sentTimestamp.toDate(),
    ), thresholdSecs[rules.threshold], rules.rounding);
    console.log('[DEBUG] Rounded duration in minutes:', roundedDurationSecs / 60);
    // 2) Round clockIn time to timeThreshold
    const roundedClockInDate = roundDate(
        a.clockIn.sentTimestamp.toDate(),
        thresholdSecs[rules.timeThreshold] / 60,
    );
    debugger;
    console.log('[DEBUG] Unrounded clock-in date:', a.clockIn.sentTimestamp
        .toDate().toLocaleTimeString('en-US', {
            timeZone: 'America/Los_Angeles',
        }));
    console.log('[DEBUG] Rounded clock-in date:', roundedClockInDate
        .toLocaleTimeString('en-US', {
            timeZone: 'America/Los_Angeles',
        }));
    // 3) Add rounded duration to rounded clockIn time to get clockOut time
    const roundedClockOutDate = new Date(roundedClockInDate.getTime() +
        roundedDurationSecs * 1000);
    console.log('[DEBUG] Unrounded clock-out date:', a.clockOut.sentTimestamp
        .toDate().toLocaleTimeString('en-US', {
            timeZone: 'America/Los_Angeles',
        }));
    console.log('[DEBUG] Rounded clock-out date:', roundedClockOutDate
        .toLocaleTimeString('en-US', {
            timeZone: 'America/Los_Angeles',
        }));
    // 4) Update appt clockIn and clockOut dates
    a.clockIn.sentTimestamp = roundedClockInDate;
    a.clockOut.sentTimestamp = roundedClockOutDate;
    await appt.ref.update(a);
    console.log('[DEBUG] Updated past appt (' + appt.ref.path + ').');
    return a;
};

const isTest = false;

const main = async (rules) => {
    const db = isTest ? partitions.test : partitions.default;
    const appts = [];
    await Promise.all(['locations', 'users'].map(async collection => {
        const docs = (await db.collection(collection).get()).docs;
        console.log('[DEBUG] Adding pastAppts from ' + docs.length + ' ' +
            collection + ' docs...');
        return Promise.all(docs.map(async doc => {
            const pastAppts = (await doc.ref.collection('pastAppointments')
                .get()).docs;
            console.log('[DEBUG] Adding ' + pastAppts.length + ' pastAppts ' +
                'from ' + collection + ' doc (' + doc.id + ')...');
            pastAppts.forEach(a => appts.push(a));
        }));
    }));
    console.log('[INFO] Rounding hours of ' + appts.length + ' pastAppts...');
    await Promise.all(appts.map(doc => roundHours(doc, isTest, rules)));
    console.log('[INFO] Rounded hours of ' + appts.length + ' pastAppts.');
};

main({
    rounding: 'Up',
    threshold: '30 Minutes',
    timeThreshold: '5 Minutes',
});