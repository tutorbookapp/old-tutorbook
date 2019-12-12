const functions = require('firebase-functions');
const fs = require('fs');
const {
    google
} = require('googleapis');


// Class that proxies to the Google Sheets API (manages the reading and writing
// of our service hour tracking sheet).
class Sheet {

    constructor(auth) {
        const content = fs.readFileSync('./cred/sheets/cred.json');
        const {
            client_secret,
            client_id,
            redirect_uris
        } = functions.config().sheets.cred;
        this.auth = new google.auth.OAuth2(
            client_id, client_secret, redirect_uris[0]
        );
        const token = fs.readFileSync('./cred/sheets/token.json');
        this.auth.setCredentials(functions.config().sheets.token);
        this.sheets = google.sheets({
            version: 'v4',
            auth: functions.config().sheets.key,
        }).spreadsheets;
    }

    create() {
        return this.sheets.create({
            properties: {
                title: 'Tutorbook - Service Hour Tracking',
            },
            auth: this.auth,
        }).then((response) => {
            console.log('Created spreadsheet.');
        }).catch((err) => {
            console.error('Error while creating spreadsheet:', err);
        });
    }

    read() {
        return this.sheets.values.get({
            spreadsheetId: functions.config().sheets.id,
            range: 'Sheet1!A4:F',
            auth: this.auth,
        }).then((res) => {
            console.log('Read spreadsheet.');
        }).catch((err) => {
            console.error('Error while reading spreadsheet:', err);
        });
    }

    clear() {
        return this.sheets.values.clear({
            spreadsheetId: functions.config().sheets.id,
            range: 'Sheet1!A4:F',
            auth: this.auth,
        });
    }

    async write(vals) {
        await this.clear();
        const body = {
            values: vals,
        };
        return this.sheets.values.update({
            spreadsheetId: functions.config().sheets.id,
            range: 'Sheet1!A4:F',
            valueInputOption: 'USER_ENTERED',
            resource: body,
            auth: this.auth,
        }).then((res) => {
            console.log('Wrote spreadsheet.');
        }).catch((err) => {
            console.error('Error while writing spreadsheet:', err);
        });
    }
};


module.exports = Sheet;