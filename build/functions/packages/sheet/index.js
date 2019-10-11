const admin = require('firebase-admin');
const {
    google
} = require('googleapis');
const cors = require('cors')({
    origin: true,
});
const Sheet = require('./sheet.js');


// Manages service hour tracking sheet for supervisors
function parseDate(timestamp) {
    const date = timestamp.toDate();
    return date.getMonth() + '/' + date.getDate() + '/' + date.getFullYear();
};

function getDurationStringFromSecs(secs) {
    // See: https://www.codespeedy.com/convert-seconds-to-hh-mm-ss-format-
    // in-javascript/
    const time = new Date(null);
    time.setSeconds(secs);
    return time.toISOString().substr(11, 8);
};

// Update spreadsheet when we get a new pastAppt
async function updateGoogleSheet() {
    const db = admin.firestore();
    const userSnap = await db.collection('users')
        .where('type', '==', 'Tutor').get();
    const users = [];
    const sheetVals = [];
    userSnap.forEach((doc) => {
        users.push(doc);
    });
    return users.forEach(async (user) => {
        const profile = user.data();
        const name = profile.name;
        const grade = profile.grade;
        const serviceHours = getDurationStringFromSecs(profile.secondsTutored);

        const firstAppt = await user.ref.collection('pastAppointments')
            .orderBy('clockOut.sentTimestamp', 'asc').limit(1).get();
        var startDate;
        firstAppt.forEach((doc) => {
            startDate = parseDate(doc.data().clockOut.sentTimestamp);
        });

        const lastAppt = await user.ref.collection('pastAppointments')
            .orderBy('clockOut.sentTimestamp', 'desc').limit(1).get();
        var endDate;
        lastAppt.forEach((doc) => {
            endDate = parseDate(doc.data().clockOut.sentTimestamp);
        });

        if (!startDate || !endDate) {
            startDate = '1/1/2019';
            endDate = '1/1/2019';
        }

        sheetVals.push([name, grade, serviceHours, startDate, endDate]);
        if (sheetVals.length === users.length) {
            return new Sheet().write(sheetVals);
        }
    });
};


const updateSheet = (req, res) => {
    return cors(req, res, async () => {
        var err;
        var resp;
        [err, resp] = await to(updateGoogleSheet());
        res.json({
            err: err,
            res: resp,
        });
    });
};


module.exports = updateSheet;