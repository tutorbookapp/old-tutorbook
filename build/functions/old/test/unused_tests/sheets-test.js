const {
    google
} = require('googleapis');
const fs = require('fs');
const admin = require('firebase-admin');
const serviceAccount = require('./../../../utils/admin-cred.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = './token.json';

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {}

// Class that proxies to the Google Sheets API (manages the reading and writing
// of our service hour tracking sheet).
class Sheet {

    constructor(auth) {
        const content = fs.readFileSync('credentials.json');
        const {
            client_secret,
            client_id,
            redirect_uris
        } = JSON.parse(content).web;
        this.auth = new google.auth.OAuth2(
            client_id, client_secret, redirect_uris[0]
        );
        const token = fs.readFileSync(TOKEN_PATH);
        this.auth.setCredentials(JSON.parse(token));
        this.sheets = google.sheets({
            version: 'v4',
            auth: '',
        }).spreadsheets;
    }

    create() {
        return this.sheets.create({
            properties: {
                title: 'Tutorbook - Service Hour Tracking',
            },
            auth: this.auth,
        }).then((response) => {
            console.log('Created spreadsheet:', response);
        }).catch((err) => {
            console.error('Error while creating spreadsheet:', err);
        });
    }

    read() {
        return this.sheets.values.get({
            spreadsheetId: '1NRdoDa1VDcivCFUCZLLwBsOeSwlp89QessS4BzNLejs',
            range: 'Sheet1!A4:E',
            auth: this.auth,
        }).then((res) => {
            console.log('Read spreadsheet:', res);
        }).catch((err) => {
            console.error('Error while reading spreadsheet:', err);
        });
    }

    clear() {
        return this.sheets.values.clear({
            spreadsheetId: '1NRdoDa1VDcivCFUCZLLwBsOeSwlp89QessS4BzNLejs',
            range: 'Sheet1!A4:E',
            auth: this.auth,
        });
    }

    async write(vals) {
        await this.clear();
        const body = {
            values: vals,
        };
        return this.sheets.values.update({
            spreadsheetId: '1NRdoDa1VDcivCFUCZLLwBsOeSwlp89QessS4BzNLejs',
            range: 'Sheet1!A4:E',
            valueInputOption: 'USER_ENTERED',
            resource: body,
            auth: this.auth,
        }).then((res) => {
            console.log('Wrote spreadsheet:', res);
        }).catch((err) => {
            console.error('Error while writing spreadsheet:', err);
        });
    }
};


const vals = [
    [ // Cell values
        'Nicholas Chiang',
        'Sophomore',
        '10:05:43.00',
        '09/27/2019',
        '10/1/2019',
    ],
    [ // Cell values
        'Nicholas Chiang',
        'Sophomore',
        '10:05:43.00',
        '09/27/2019',
        '10/1/2019',
    ],
    [ // Cell values
        'Column A',
        'Column B',
        'Column C',
        'Column D',
        'Column E',
    ],
    // Additional rows
];


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
async function updateSheet() {
    const db = admin.firestore();
    const userSnap = await db.collection('users')
        .where('type', '==', 'Tutor').get();
    const users = [];
    const sheetVals = [];
    userSnap.forEach((doc) => {
        users.push(doc);
    });
    users.forEach(async (user) => {
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
            console.warn(name + ' has not used Tutorbook to clock hours.');
            startDate = '1/1/2019';
            endDate = '1/1/2019';
        }

        sheetVals.push([name, grade, serviceHours, startDate, endDate]);
        if (sheetVals.length === users.length) {
            new Sheet().write(sheetVals);
        }
    });
};


updateSheet();