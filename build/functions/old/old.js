const XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const twilio = require('twilio');
const twilioClient = new twilio(
    functions.config().twilio.id,
    functions.config().twilio.key
);
const stripe = require('stripe')(functions.config().stripe.key);
const {
    google
} = require('googleapis');
const fs = require('fs');
const cors = require('cors')({
    origin: true,
});
// More on 'await-to-js' at: https://blog.grossman.io/how-to-write-async-await
// -without-try-catch-blocks-in-javascript/
const to = require('await-to-js').default;

const TOKEN_PATH = './sheetsToken.json';

// Class that proxies to the Google Sheets API (manages the reading and writing
// of our service hour tracking sheet).
class Sheet {

    constructor(auth) {
        const content = fs.readFileSync('./sheetsCredentials.json');
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
            auth: 'AIzaSyCPqUNTGlDG9CV5HVgF3wPQkTVBHyPMqCY',
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
            spreadsheetId: '1NRdoDa1VDcivCFUCZLLwBsOeSwlp89QessS4BzNLejs',
            range: 'Sheet1!A4:E',
            auth: this.auth,
        }).then((res) => {
            console.log('Read spreadsheet.');
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
            console.log('Wrote spreadsheet.');
        }).catch((err) => {
            console.error('Error while writing spreadsheet:', err);
        });
    }
};


const Base64 = {
    _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
    encode: function(e) {
        var t = "";
        var n, r, i, s, o, u, a;
        var f = 0;
        e = Base64._utf8_encode(e);
        while (f < e.length) {
            n = e.charCodeAt(f++);
            r = e.charCodeAt(f++);
            i = e.charCodeAt(f++);
            s = n >> 2;
            o = (n & 3) << 4 | r >> 4;
            u = (r & 15) << 2 | i >> 6;
            a = i & 63;
            if (isNaN(r)) {
                u = a = 64
            } else if (isNaN(i)) {
                a = 64
            }
            t = t + this._keyStr.charAt(s) + this._keyStr.charAt(o) + this._keyStr.charAt(u) + this._keyStr.charAt(a)
        }
        return t
    },
    decode: function(e) {
        var t = "";
        var n, r, i;
        var s, o, u, a;
        var f = 0;
        e = e.replace(/++[++^A-Za-z0-9+/=]/g, "");
        while (f < e.length) {
            s = this._keyStr.indexOf(e.charAt(f++));
            o = this._keyStr.indexOf(e.charAt(f++));
            u = this._keyStr.indexOf(e.charAt(f++));
            a = this._keyStr.indexOf(e.charAt(f++));
            n = s << 2 | o >> 4;
            r = (o & 15) << 4 | u >> 2;
            i = (u & 3) << 6 | a;
            t = t + String.fromCharCode(n);
            if (u != 64) {
                t = t + String.fromCharCode(r)
            }
            if (a != 64) {
                t = t + String.fromCharCode(i)
            }
        }
        t = Base64._utf8_decode(t);
        return t
    },
    _utf8_encode: function(e) {
        e = e.replace(/\r\n/g, "n");
        var t = "";
        for (var n = 0; n < e.length; n++) {
            var r = e.charCodeAt(n);
            if (r < 128) {
                t += String.fromCharCode(r)
            } else if (r > 127 && r < 2048) {
                t += String.fromCharCode(r >> 6 | 192);
                t += String.fromCharCode(r & 63 | 128)
            } else {
                t += String.fromCharCode(r >> 12 | 224);
                t += String.fromCharCode(r >> 6 & 63 | 128);
                t += String.fromCharCode(r & 63 | 128)
            }
        }
        return t
    },
    _utf8_decode: function(e) {
        var t = "";
        var n = 0;
        var r = c1 = c2 = 0;
        while (n < e.length) {
            r = e.charCodeAt(n);
            if (r < 128) {
                t += String.fromCharCode(r);
                n++
            } else if (r > 191 && r < 224) {
                c2 = e.charCodeAt(n + 1);
                t += String.fromCharCode((r & 31) << 6 | c2 & 63);
                n += 2
            } else {
                c2 = e.charCodeAt(n + 1);
                c3 = e.charCodeAt(n + 2);
                t += String.fromCharCode((r & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
                n += 3
            }
        }
        return t
    }
}

// NOTE: The FIREBASE_CONFIG environment variable is included automatically in 
// Cloud Functions for Firebase functions that were deployed via the Firebase 
// CLI.
admin.initializeApp();


function getUser(id) {
    var doc = admin.firestore().collection('users').doc(id);
    return doc.get().then((doc) => {
        console.log('Got user doc (' + doc.id + ').');
        return doc;
    }).catch((err) => {
        console.error('Error while getting user document:', err);
        console.warn('Could not get user:', id);
    });
};


function updateUser(user) {
    var doc = admin.firestore().collection('users').doc(user.id || user.email);
    return doc.update(user).catch((err) => {
        console.error('Error while updating user document:', err);
        console.warn('Could not update user:', user);
    });
};


function isValidToken(token) {
    if (token === undefined || token === null || token === '') {
        throw new Error("No notification token found, skipping.");
    }
};


function getGenderPronoun(gender) {
    switch (gender) {
        case 'Male':
            return 'his';
        case 'Female':
            return 'her';
        case 'Other':
            return 'their';
        default:
            return 'their';
    };
};


function sendText(phone, body) {
    twilioClient.messages
        .create({
            body: body,
            from: functions.config().twilio.phone,
            to: phone
        })
        .then((message) => console.log('Sent SMS message:', message.sid));
};


async function sendEmailTemplate(email, subject, template) {
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host: 'smtp-relay.gmail.com',
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: {
            user: functions.config().email.id, // generated ethereal user
            pass: functions.config().email.key // generated ethereal password
        }
    });

    transporter.verify((err, success) => {
        if (err) {
            console.error(err);
        } else {
            console.log("Server is ready to take our message.");
        }
    });

    // send mail with defined transport object
    let info = await transporter.sendMail({
        from: '"Tutorbook" <notifications@tutorbook.app>', // sender address
        to: email, // list of receivers
        subject: subject, // Subject line
        html: template, // html body
        attachments: [{
            filename: 'edge_banner.png',
            path: './emails/img/edge_banner.png',
            cid: 'edge_banner.png',
        }, {
            filename: 'tw.png',
            path: './emails/img/tw.png',
            cid: 'tw.png',
        }, {
            filename: 'yt.png',
            path: './emails/img/yt.png',
            cid: 'yt.png',
        }, {
            filename: 'ig.png',
            path: './emails/img/ig.png',
            cid: 'ig.png',
        }, {
            filename: 'text_logo.png',
            path: './emails/img/text_logo.png',
            cid: 'text_logo.png',
        }],
    });

    console.log('Email sent: %s', info.messageId);
    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
};


function sendWelcomeEmail(email, name, type) {
    const subject = 'Welcome to Tutorbook  |  Mentoring Made Easy';
    switch (type) {
        case 'Tutor':
            var template = './emails/tutors_start_now.html';
            break;
        case 'Pupil':
            var template = './emails/pupils_start_now.html';
            break;
        default:
            var template = './emails/welcome.html';
            break;
    }
    fs.readFile(template, (err, html) => {
        if (err) {
            console.error('Error while reading email template:', err);
        }
        html = html.toString().replace("{ username }", name);
        console.log('Sending welcome email template:', html);
        return sendEmailTemplate(email, subject, html);
    });
};


function sendEmail(email, subject, body) {
    fs.readFile('./emails/template.html', (err, html) => {
        if (err) {
            console.error('Error while reading email template:', err);
        }
        html = html.toString().replace("{ body }", body.summary);
        html = html.toString().replace("{ title }", body.title);
        console.log('Sending email template:', html);
        sendEmailTemplate(email, subject, html);
    });
};


function sendNotification(user, title, body) {
    console.log('Sending ' + user + ' notification:', {
        title: title,
        body: body
    });
    return getUser(user).then((doc) => {
        const token = doc.data().notificationToken;
        isValidToken(token);
        const message = {
            notification: {
                title: title,
                body: body,
            },
            webpush: {
                headers: {
                    'Urgency': 'high'
                },
                notification: {
                    title: title,
                    body: body,
                    requireInteraction: true,
                    icon: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                        'on/logo.svg',
                    image: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                        'on/logo.svg',
                    badge: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                        'on/notification-badge.svg',
                    actions: [{}],
                },
            },
            token: token,
        };
        return admin.messaging().send(notification).then((result) => {
            console.log('Sent ' + id + ' notification:', result);
        });
    }).catch((err) => {
        console.error('Error while sending ' + id + ' notification:', err);
    });
};


// ====================================================================
// HOURS TRACKING IMPLEMENTED W/ FIRESTORE TRIGGERS
// ====================================================================

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


exports.updateSheet = functions.https.onRequest(async (req, res) => {
    await cors(req, res, async () => {
        var err;
        var resp;
        [err, resp] = await to(updateSheet());
        res.json({
            err: err,
            res: resp,
        });
    });
});


// Update the user's total hours tutored/pupiled when we get a new pastAppt
exports.newPastApptUpdateHours = functions.firestore
    .document('users/{id}/pastAppointments/{appt}')
    .onCreate((snap, context) => {
        updateSheet();
        const appt = snap.data();
        const id = context.params.id;
        // See: https://stackoverflow.com/questions/13894632/get-time-
        // difference-between-two-dates-in-seconds#13894670
        const durationInSecs = (appt.clockOut.sentTimestamp.toDate() -
            appt.clockIn.sentTimestamp.toDate()) / 1000;

        return getUser(id).then((doc) => {
            const user = doc.data();
            switch (user.type) {
                case 'Tutor':
                    // Add to secondsTutored
                    user.secondsTutored = user.secondsTutored || 0;
                    user.secondsTutored += durationInSecs;
                    break;
                case 'Pupil':
                    // Add to secondsPupiled
                    user.secondsPupiled = user.secondsPupiled || 0;
                    user.secondsPupiled += durationInSecs;
                    break;
                default:
                    console.warn('Invalid user type:', user.type);
                    // TODO: Check the other user type and set this user's
                    // type to be whatever the opposite is
                    return;
            }
            console.log('Updating seconds on user:', user);
            return updateUser(user);
        });
    });




// ====================================================================
// PAYMENTS IMPLEMENTED W/ FIRESTORE TRIGGERS AND STRIPE REST API
// ====================================================================


// Complete the Express Account connection (client is redirected to Stripe's
// Express interface to securly add bank information --> once added, client is
// redirected back to the app and code is passed back here).
// See: https://stripe.com/docs/connect/express-accounts
exports.initStripeAccount = functions.https.onRequest((req, res) => {
    return cors(req, res, () => {
        console.log('Initializing Stripe account for ' + req.query.id + '...');
        const ref = admin.firestore().collection('stripeAccounts')
            .doc(req.query.id); // stripeAccounts are for paid tutors
        return axios({
            method: 'POST',
            url: 'https://connect.stripe.com/oauth/token',
            data: {
                client_secret: functions.config().stripe.key,
                code: req.query.code,
                grant_type: 'authorization_code',
            },
        }).then(async (response) => {
            console.log('Completed Stripe Express account (' +
                response.data.stripe_user_id + ') connection for ' +
                req.query.id + '.');
            await ref.set(response.data);
            const accountURLData = await stripe.accounts
                .createLoginLink(response.data.stripe_user_id);
            res.send(accountURLData);
        }).catch((err) => {
            console.error('Error while completing Stripe Express ' +
                'account connection for ' + req.query.id + ':', err);
            res.send(err);
        });
    });
});


// Specify to Stripe to automatically payout tutors every week on Fridays.
// TODO: Also check that this Stripe user is as expected (is enabled to do
// things that we need it to do, etc.)
exports.configureWeeklyPayouts = functions.firestore
    .document('/stripeAccounts/{user}')
    .onWrite(async (change, context) => {
        const data = change.after.data();
        const user = context.params.user;
        return axios({
            method: 'post',
            url: 'https://api.stripe.com/v1/accounts/' + data.stripe_user_id,
            data: {
                'settings[payouts][schedule][interval]': 'weekly',
                'settings[payouts][schedule][weekly_anchor]': 'friday',
            },
        }).then((res) => {
            console.log('Received response:', res.data);
            console.log('Configured weekly payouts to ' + user + '.');
        }).catch((err) => {
            console.error('Error while configuring weekly payouts to ' + user +
                ':', err);
        });
    });


// Add payment methods to Stripe Customer profile
exports.updatePaymentMethods = functions.firestore
    .document('/stripeCustomers/{user}/methods/{method}')
    .onCreate(async (snap, context) => { // stripeCustomers are paying pupils
        const db = admin.firestore().collection('stripeCustomers')
            .doc(context.params.user);
        const method = snap.data();
        const user = await db.get();
        console.log('Adding payment method (' + method.id + ') to user (' +
            user.id + ')...');
        if (user.exists) { // Update existing customer
            console.log('User (' + user.id +
                ') exists, adding source to customer...');
            const card = await stripe.customers.createSource(user.data().id, {
                source: method.id,
            });
            console.log('Adding card (' + card.id + ') doc...');
            await db.collection('cards').doc(card.id).set(card);
            const customer = await stripe.customers.retrieve(user.data().id);
            console.log('Updating customer (' + user.id + ') doc...');
            await db.update(customer);
        } else { // Create new customer
            console.log('User (' + user.id +
                ') does not exist, creating new customer and source...');
            const newCustomer = await stripe.customers.create({
                source: method.token.id,
                email: user.id,
            });
            console.log('Adding customer (' + user.id + ') doc...');
            await db.set(newCustomer); // Next, retrieve and add the new card
            const newCard = await stripe.customers.retrieveSource(
                newCustomer.id,
                newCustomer.default_source
            );
            console.log('Adding card (' + newCard.id + ') doc...');
            await db.collection('cards').doc(newCard.id).set(newCard);
        }
        return db.collection('methods').doc(context.params.method).delete();
    });


// Process payment with Stripe API
exports.processStripePayment = functions.firestore
    .document('stripeCustomers/{user}/payments/{payment}')
    .onCreate(async (snap, context) => {
        const db = admin.firestore();
        const payment = snap.data();
        const pastApptID = context.params.payment;
        const originalID = payment.for.appt.id;
        const user = context.params.id;

        function calculateAmt(clockIn, clockOut, rate) {

        };

        // 1) Capture the payment
        const pupil = await db.collection('stripeCustomers')
            .doc(payment.from.email).get();
        const tutor = await db.collection('stripeAccounts')
            .doc(payment.to.email).get();
        const appt = await db.collection('users').doc(user)
            .collection('pastAppointments').doc(pastApptID).get();
        const amount = calculateAmt(appt.data());
        const charge = await stripe.charges.create({
            amount: amount,
            currency: 'usd',
            customer: pupil.data().id,
            application_fee_amount: amount * 0.10,
            transfer_data: {
                destination: tutor.data().id,
            },
        });

        // 1b) Delete the approvedPayment docs
        const approvedPayments = [
            db.collection('users').doc(payment.to.email)
            .collection('approvedPayments')
            .doc(pastApptID),
            db.collection('users').doc(payment.from.email)
            .collection('approvedPayments')
            .doc(pastApptID),
        ];
        approvedPayments.forEach(async (approvedPayment) => {
            await approvedPayment.delete();
        });

        // 2) Delete the authPayment docs
        const authPayments = [
            db.collection('users').doc(authPayment.to.email)
            .collection('authPayments')
            .doc(originalID),
            db.collection('users').doc(authPayment.from.email)
            .collection('authPayments')
            .doc(originalID),
        ];
        authPayments.forEach(async (payment) => {
            await payment.delete();
        });

        // 3) Create pastPayment docs (which triggers another function to
        // update the tutor's balance).
        const pastPayments = [
            db.collection('users').doc(authPayment.to.email)
            .collection('pastPayments')
            .doc(pastApptID),
            db.collection('users').doc(authPayment.from.email)
            .collection('pastPayments')
            .doc(pastApptID),
        ];
        pastPayments.forEach(async (payment) => {
            await payment.set({
                for: appt,
                amount: amount,
                to: authPayment.to,
                from: authPayment.from,
                transaction: await getCapture(captureID),
                timestamp: new Date(),
            });
        });

        // 4) Create neededPayment doc for the pupil (asking to setup a
        // PayPal subscription for their tutoring lessons).
        const neededPayment = db.collection('users').doc(authPayment.from.email)
            .collection('neededPayments')
            .doc(originalID);
        await neededPayment.set({
            for: appt,
            amount: amount,
            to: authPayment.to,
            from: authPayment.from,
            timestamp: new Date(),
        });
        return console.log('Captured payment (' + authID + ') for past appointment (' +
            pastApptID + ') and sent needed payment for upcoming appointment (' +
            originalID + ').');
    });



// ====================================================================
// PAYMENTS IMPLEMENTED W/ FIRESTORE TRIGGERS AND PAYPAL REST API
// ====================================================================


function getAccessToken() {
    const auth = functions.config().paypal.id + ':' +
        functions.config().paypal.key;
    return axios({
        method: 'post',
        url: 'https://api.paypal.com/v1/oauth2/token',
        headers: {
            'Accept': 'application/json',
            'Accept-Language': 'en_US',
            'Authorization': 'Basic ' + Base64.encode(auth),
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        params: {
            'grant_type': 'client_credentials',
        },
    }).then((response) => {
        return response.data.access_token;
    }).catch((err) => {
        console.error('Error while getting access token:', err);
    });
};


async function getAuthPayment(id) {
    return axios({
        method: 'get',
        url: 'https://api.paypal.com/v2/payments/authorizations/' + id,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + await getAccessToken(),
        },
    }).then((response) => {
        console.log('Got auth payment (' + id + ') data.');
        return response.data;
    }).catch((err) => {
        console.error('Error while getting authorized payment data:', err);
    });
};


async function getCapture(id) {
    return axios({
        method: 'get',
        url: 'https://api.paypal.com/v2/payments/captures/' + id,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + await getAccessToken(),
        },
    }).then((response) => {
        console.log('Got captured (' + id + ') payment data.');
        return response.data;
    }).catch((err) => {
        console.error('Error while getting captured (' + id + ') payment data:', err);
    });
};


async function capturePayment(id, amount, note) {
    return axios({
        method: 'post',
        url: 'https://api.paypal.com/v2/payments/authorizations/' + id + '/capture',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + await getAccessToken(),
        },
        data: {
            amount: {
                value: amount,
                currency_code: 'USD',
            },
            // NOTE: The note_to_payer max is 255 char and the soft_descriptor
            // max is 22 char.
            note_to_payer: note,
            soft_descriptor: 'Tutoring lesson via TB',
            // TODO: Allow users to pay for multiple lessons in one go and
            // save some money (thus, this would be false).
            final_capture: true,
        },
    }).then((response) => {
        console.log('Captured payment (' + id + ').');
        return response.data.id;
    }).catch((err) => {
        console.error('Error while capturing payment:', err);
    });
};


// #1 Pupil sends request and creates an authPayment document (after using the
// PayPal.Buttons() client side).


// #2 Verify that the authPayment is valid. If it isn't, remove it and add an
// invalidPayment doc.
exports.verifyAuthPayment = functions.firestore
    .document('users/{id}/authPayments/{payment}')
    .onCreate(async (snap, context) => {
        const payment = snap.data();
        const user = context.params.id;
        const id = context.params.payment;
        const db = admin.firestore();
        // Only do this once (and then if it isn't valid, get rid of both).
        if (payment.from.email === user) {
            // If the payment is invalid, delete the authPayment doc and create
            // invaidPayment docs
            async function invalidPayment(reason) {
                console.warn('Invalid payment b/c ', reason.toLowerCase());
                const payments = [
                    db.collection('users').doc(payment.from.email)
                    .collection('authPayments')
                    .doc(id),
                    db.collection('users').doc(payment.to.email)
                    .collection('authPayments')
                    .doc(id),
                ];
                payments.forEach(async (payment) => {
                    await payment.delete();
                });
                const invalids = [
                    db.collection('users').doc(payment.from.email)
                    .collection('invalidPayments')
                    .doc(id),
                    db.collection('users').doc(payment.to.email)
                    .collection('invalidPayments')
                    .doc(id),
                ];
                invalids.forEach(async (invalid) => {
                    await invalid.set({
                        for: payment,
                        invalidReason: reason,
                        invalidTimestamp: new Date(),
                    });
                });
            };
            const authPayment = await getAuthPayment(payment.authID);
            // 1) Check that the status is CREATED
            if (authPayment.status !== 'CREATED') {
                return invalidPayment('Auth payment status (' +
                    authPayment.status + ') wasn\'t created.');
            }
            // 2) Check that the amount was the same as the payment doc amount
            const paymentAmt = new Number(payment.amount).valueOf;
            const authAmt = new Number(authPayment.amount.value).valueOf;
            if (paymentAmt !== authAmt) {
                return invalidPayment('Auth payment amount (' + authAmt +
                    ') didn\'t match payment doc amount (' + paymentAmt + ').');
            }
            // 3) Check that the amount matches that on the request docs
            const requests = [
                db.collection('users').doc(payment.from.email)
                .collection('requestsOut')
                .doc(id),
                db.collection('users').doc(payment.to.email)
                .collection('requestsIn')
                .doc(id),
            ];
            requests.forEach(async (request) => {
                const doc = await request.get();
                const amt = new Number(doc.data().payment.amount).valueOf;
                if (amt !== authAmt) {
                    return invalidPayment('Auth payment amount (' + authAmt +
                        ') didn\'t match request amount (' + amt + ').');
                }
            });
            return console.log('Payment (' + authPayment.id + ') was valid.');
        }
        return console.log('Skipping toUser\'s (' + user + ') payment.');;
    });


// #2.5 After the past appointment is created, ask the pupil if they were 
// satisfied with their lesson (through a needApprovalPayments doc).
exports.askForApproval = functions.firestore
    .document('users/{id}/pastAppointments/{appt}')
    .onCreate((snap, context) => {
        const appt = snap.data();
        const user = context.params.id;
        const id = context.params.appt;
        const db = admin.firestore();
        // No need to do this twice (i.e. once for the toUser and then once
        // for the fromUser): we only do this for the fromUser.
        if (appt.for.payment.type === 'Paid' && user === appt.for.fromUser.email) {
            return db.collection('users').doc(appt.for.fromUser.email)
                .collection('needApprovalPayments')
                .doc(id).set({
                    to: appt.for.toUser,
                    from: appt.for.fromUser,
                    amount: appt.for.payment.amount,
                    method: appt.for.payment.method,
                    appt: appt,
                    timestamp: new Date(),
                });
        }
        return console.log('Skipping toUser (' + user + ') when asking for approval.');
    });


// #3 Pupil confirms that they were satisfied with the lesson (client side) and
// creates payment doc.


// #4 After the pupil is satisfied with the lesson (characterized by a dialog in
// the pupil's client), they add a payment doc with the ID of the appt (i.e. the
// ID of the authPayment). We then capture that payment to send to the tutor.
exports.processPayment = functions.firestore
    .document('users/{id}/approvedPayments/{payment}')
    .onCreate(async (snap, context) => {
        const db = admin.firestore();
        const payment = snap.data();
        const pastApptID = context.params.payment;
        const originalID = payment.for.appt.id;
        const user = context.params.id;

        if (user === payment.approvedBy.email) {
            if (payment.method === 'Stripe') {
                console.log('Passing paymentProcessing to Stripe function...');
                return db.collection('stripeCustomers').doc(user)
                    .collection('payments').set(payment);
            }
            const authPaymentRef = await db.collection('users').doc(user)
                .collection('authPayments').doc(originalID).get();
            const authPayment = authPaymentRef.data();

            const apptRef = await db.collection('users').doc(user)
                .collection('pastAppointments').doc(pastApptID).get();
            const appt = apptRef.data();

            // 1) Capture the payment
            const note = 'Tutoring lesson with booked via the Tutorbook app.';
            // TODO: Only capture the amount that is actually needed (based
            // on the actual duration of the lesson).
            const amount = authPayment.amount;
            const authID = authPayment.authID;
            const captureID = await capturePayment(authID, amount, note);

            // 1b) Delete the approvedPayment docs
            const approvedPayments = [
                db.collection('users').doc(authPayment.to.email)
                .collection('approvedPayments')
                .doc(pastApptID),
                db.collection('users').doc(authPayment.from.email)
                .collection('approvedPayments')
                .doc(pastApptID),
            ];
            approvedPayments.forEach(async (approvedPayment) => {
                await approvedPayment.delete();
            });

            // 2) Delete the authPayment docs
            const authPayments = [
                db.collection('users').doc(authPayment.to.email)
                .collection('authPayments')
                .doc(originalID),
                db.collection('users').doc(authPayment.from.email)
                .collection('authPayments')
                .doc(originalID),
            ];
            authPayments.forEach(async (payment) => {
                await payment.delete();
            });

            // 3) Create pastPayment docs (which triggers another function to
            // update the tutor's balance).
            const pastPayments = [
                db.collection('users').doc(authPayment.to.email)
                .collection('pastPayments')
                .doc(pastApptID),
                db.collection('users').doc(authPayment.from.email)
                .collection('pastPayments')
                .doc(pastApptID),
            ];
            pastPayments.forEach(async (payment) => {
                await payment.set({
                    for: appt,
                    amount: amount,
                    to: authPayment.to,
                    from: authPayment.from,
                    transaction: await getCapture(captureID),
                    timestamp: new Date(),
                });
            });

            // 4) Create neededPayment doc for the pupil (asking to setup a
            // PayPal subscription for their tutoring lessons).
            const neededPayment = db.collection('users').doc(authPayment.from.email)
                .collection('neededPayments')
                .doc(originalID);
            await neededPayment.set({
                for: appt,
                amount: amount,
                to: authPayment.to,
                from: authPayment.from,
                timestamp: new Date(),
            });
            return console.log('Captured payment (' + authID + ') for past appointment (' +
                pastApptID + ') and sent needed payment for upcoming appointment (' +
                originalID + ').');
        }
        return console.log('Skipping toUser\'s (' + user + ') payment.');
    });


// #4b Function updates tutor's balance to reflect new payment.
exports.addToBalance = functions.firestore
    .document('users/{id}/pastPayments/{payment}')
    .onCreate(async (snap, context) => {
        const payment = snap.data();
        const user = context.params.id;
        const db = admin.firestore();
        if (user === payment.to.email) {
            const dataRef = await db.collection('users').doc(user).get();
            const data = dataRef.data();

            // See: https://stackoverflow.com/questions/149055/how-can-i-
            // format-numbers-as-currency-string-in-javascript
            const balance = data.payments.currentBalance + payment.amount;
            const balanceString = '$' + balance.toFixed(2);
            const charged = data.payments.totalCharged + payment.amount;
            const chargedString = '$' + charged.toFixed(2);

            await db.collection('users').doc(user).update({
                payments: {
                    currentBalance: balance,
                    currentBalanceString: balanceString,
                    hourlyCharge: data.payments.hourlyCharge,
                    hourlyChargeString: data.payments.hourlyChargeString,
                    totalCharged: charged,
                    totalChargedString: chargedString,
                    type: 'Paid',
                },
            });
            return console.log('Updated toUser\'s (' + user +
                ') current balance (' + balanceString +
                ') and total charged (' + chargedString + ').');
        }
        return console.log('Skipping fromUser\'s (' + user + ') current balance update.');
    });


exports.substractFromBalance = functions.firestore
    .document('users/{id}/pastPayments/{payment}')
    .onDelete(async (snap, context) => {
        const payment = snap.data();
        const user = context.params.id;
        const db = admin.firestore();
        if (user === payment.to.email) {
            const dataRef = await db.collection('users').doc(user).get();
            const data = dataRef.data();

            // See: https://stackoverflow.com/questions/149055/how-can-i-
            // format-numbers-as-currency-string-in-javascript
            const balance = data.payments.currentBalance - payment.amount;
            const balanceString = '$' + balance.toFixed(2);

            await db.collection('users').doc(user).update({
                payments: {
                    currentBalance: balance,
                    currentBalanceString: balanceString,
                    hourlyCharge: data.payments.hourlyCharge,
                    hourlyChargeString: data.payments.hourlyChargeString,
                    totalCharged: data.payments.totalCharged,
                    totalChargedString: data.payments.totalChargedString,
                    type: 'Paid',
                },
            });
            return console.log('Updated toUser\'s (' + user +
                ') current balance (' + balanceString +
                ') and total charged (' + chargedString + ').');
        }
        return console.log('Skipping fromUser\'s (' + user + ') current balance update.');
    });


// #4 Pupil isn't satisified with the lesson, delete the authPayment docs.
exports.denyPayment = functions.firestore
    .document('users/{id}/deniedPayments/{payment}')
    .onCreate(async (snap, context) => {
        const payment = snap.data();
        const id = context.params.payment;
        const user = context.params.id;
        const db = admin.firestore();

        if (user === payment.deniedBy.email) {
            const authPaymentRef = await db.collection('users').doc(user)
                .collection('authPayments').doc(id).get();
            const authPayment = authPaymentRef.data();
            return console.log('TODO: Release this authPayment with PayPal REST API,' +
                ' delete the authPayment docs, and update the pupil\'s profile' +
                ' (noting that he/she denied payment).');
        }
        return console.log('Skipping toUser\'s (' + user + ') payment.');
    });


// #5 Tutor creates the payment document by clicking ('Get Paid') client side.


// #6 Tutor requests payment or automated function (every two weeks) requests
// payment. We then add the tutor's pastPayments, send the payout, reset his/her
// balance, and move all of those pastPayments to paidPayments.
exports.sendPayout = functions.firestore
    .document('payouts/{payout}')
    .onCreate(async (snap, context) => {
        const payout = snap.data();
        const db = admin.firestore();
        const user = context.params.payout;

        // 1) Grab pastPayments
        const pastPayments = await db.collection('users').doc(user)
            .collection('pastPayments').get();
        var amount = 0;
        pastPayments.forEach((payment) => {
            amount += payment.data().amount;
            fees += new Number(payment.data().transaction
                .seller_receivable_breakdown.paypal_fee.value);
        });
        const tutorPayment = amount * .9;
        var myPayment = amount * .1; // 10% Fee
        if (tutorPayment + myPayment !== amount) {
            throw new Error('Payment amounts ($' + tutorPayment.toFixed(2) +
                ' and $' + myPayment.toFixed(2) + ') did not match.');
        }
        myPayment -= fees;
        console.log('Sending tutor (' + user + ') $' + tutorPayment.toFixed(2) +
            ' and myself (nicholas.h.chiang@gmail.com) $' +
            myPayment.toFixed(2) + '.');


        // 2) Send payout
        const pastPayout = db.collection('pastPayouts').doc();
        [err, res] = await to(axios({
            method: 'post',
            url: 'https://api.paypal.com/v1/payments/payouts',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + await getAccessToken(),
            },
            data: {
                'sender_batch_header': {
                    'sender_batch_id': pastPayout.id,
                    'email_subject': 'Tutorbook Lessons Payment',
                    'email_message': 'You have been paid for your tutoring' +
                        ' services on Tutorbook. As always, thanks for using Tutorbook!',
                    recipient_type: 'EMAIL',
                },
                items: [{
                    amount: {
                        value: tutorPayment.toFixed(2),
                        currency: 'USD',
                    },
                    note: 'Thanks for using Tutorbook!',
                    sender_item_id: pastPayout.id.toString() + '001',
                    receiver: user,
                }, {
                    amount: {
                        value: myPayment.toFixed(2),
                        currency: 'USD',
                    },
                    note: 'Thanks for creating Tutorbook!',
                    sender_item_id: pastPayout.id.toString() + '002',
                    receiver: 'nicholas.h.chiang@gmail.com',
                }],
            },
        }));
        if (err) {
            return console.error('Error while sending payout (' + pastPayout.id +
                ') of $' + amount.toFixed(2) + ' to ' + user + '.');
        }

        // 3) Delete payout, pastPayments and create pastPayouts, paidPayments
        await db.collection('payouts').doc(user).delete();
        await db.collection('pastPayouts').doc().set({
            amount: amount,
            paidTimestamp: new Date(),
            paidID: pastPayout.id,
            payoutData: res.data,
            to: user,
        });
        pastPayments.forEach(async (payment) => {
            await db.collection('users').doc(user)
                .collection('pastPayments').doc(payment.id).delete();
            await db.collection('users').doc(user)
                .collection('paidPayments').doc(payment.id).set(combineMaps(payment.data(), {
                    paidTimestamp: new Date(),
                    paidID: pastPayout.id,
                }));
        });
        return console.log('Sent payout (' + pastPayout.id + ') of $' +
            amount.toFixed(2) + ' to ' + user + '.');
    });




// ====================================================================
// CUSTOM AUTH IMPLEMENTED W/ FIRESTORE TRIGGERS
// ====================================================================


// user - when a newUser document is created, check if they have a valid uid
// (i.e. the user signed in by themselves). If they do not, create a new account
// for them with Firebase auth and update the uid.
exports.createAccounts = functions.firestore
    .document('users/{id}')
    .onCreate(async (snap, context) => {
        var err;
        var res;
        const profile = snap.data();
        const db = admin.firestore();
        const auth = admin.auth();
        [err, res] = await to(auth.getUser(profile.uid));
        if (err) {
            console.warn('Error while getting user (' + profile.email +
                '), creating new account:', err);
            [err, res] = await to(auth.createUser({
                email: profile.email,
                emailVerified: false,
                phoneNumber: profile.phone,
                displayName: profile.name,
                photoURL: profile.photo,
                disabled: false,
            }));
            if (err) {
                console.error('Error while creating new account:', err);
                throw new Error(err);
            }
            console.log('Created new account (' + res.uid + ') for user (' +
                profile.email + ').');
            return db.collection('users').doc(profile.email).update({
                uid: res.uid,
            });
        }
        return console.log('Profile (' + profile.email + ') had a valid uid (' +
            res.uid + ').');
    });


// user - When a newUser document is modified, check if they're a verified
// supervisor and if so, ensure that they have customAuth setup
exports.updateCustomAuth = functions.firestore
    .document('users/{id}')
    .onWrite(async (change, context) => {
        const profile = change.after.data();
        const db = admin.firestore();

        // Check to see if the supervisor's id is in the codes collection
        const supervisorCodes = await admin.firestore().collection('auth')
            .doc('supervisors')
            .get();
        var validIDs = [];
        Object.entries(supervisorCodes.data()).forEach((entry) => {
            validIDs.push(entry[1]);
        });
        if (profile.type === 'Supervisor' && profile.authenticated && validIDs.indexOf(id) >= 0) {
            // SUPERVISOR
            console.log(profile.name + ' was a verified supervisor. ' +
                'Adding customAuth claims...');
            const locations = await db.collection('locations')
                .where('supervisors', 'array-contains', profile.email)
                .get();
            var locationIDs = [];
            locations.forEach((doc) => {
                locationIDs.push(doc.id);
            });
            return admin.auth()
                .setCustomUserClaims(profile.uid, {
                    supervisor: true,
                    parent: false,
                    locations: locationIDs,
                    children: [],
                }).then(() => {
                    console.log('Added supervisor customAuth to ' +
                        profile.email + '\'s account.');
                    sendNotification(profile.email, 'Profile Updated',
                        'Authenticated account.');
                }).catch((err) => {
                    console.error('Error while adding ' +
                        'supervisor customAuth to ' + profile.email +
                        '\'s account:', err);
                });
        } else if (profile.type === 'Parent' && profile.authenticated === true) {
            // PARENT
            console.log(profile.name + ' was a verified parent. ' +
                'Adding customAuth claims...');
            const children = await db.collection('users')
                .where('proxy', 'array-contains', profile.email)
                .get();
            var childrenIDs = [];
            children.forEach((doc) => {
                childrenIDs.push(doc.id);
            });
            return admin.auth()
                .setCustomUserClaims(profile.uid, {
                    supervisor: false,
                    parent: true,
                    locations: [],
                    children: childrenIDs,
                }).then(() => {
                    console.log('Added parent customAuth to ' + profile.email +
                        '\'s account.');
                    sendNotification(profile.email, 'Profile Updated',
                        'Authenticated account.');
                }).catch((err) => {
                    console.error('Error while adding parent customAuth to ' +
                        profile.email + '\'s account:', err);
                });
        } else {
            // NOTHING
            console.log(profile.name + ' was not a verified supervisor. ' +
                'Ensuring that they don\'t have customAuth claims...');
            return admin.auth()
                .setCustomUserClaims(profile.uid, {
                    supervisor: false,
                    parent: false,
                    locations: [],
                    children: [],
                })
                .then(() => {
                    console.log('Removed any customAuth claims from ' +
                        profile.email + '\'s account.');
                    sendNotification(profile.email, 'Profile Updated',
                        'Authenticated account.');
                }).catch((err) => {
                    console.error('Error while removing customAuth claims' +
                        ' from ' + profile.email + '\'s account:', err);
                });
        }
    });


// ====================================================================
// WEBPUSH NOTIFICATIONS IMPLEMENTED W/ FIRESTORE TRIGGERS
// ====================================================================


// messages - send an webpush notification for all new messages
exports.messageNotification = functions.firestore
    .document('chats/{chat}/messages/{message}')
    .onCreate(async (snap, context) => {
        const message = snap.data();
        const body = message.message;
        const title = 'Message from ' + message.sentBy.name;
        // Send notification to all the other people on the chat.
        const db = admin.firestore();
        const chat = await db.collection('chats').doc(context.params.chat).get();
        return chat.data().chatterEmails.forEach((email) => {
            if (email !== message.sentBy.email) {
                return sendNotification(email, title, body);
            }
        });
    });


// chats - send an sms and webpush notification for new chats
exports.newChatNotification = functions.firestore
    .document('chats/{chat}')
    .onCreate((snap, context) => {
        const chat = snap.data();
        const body = chat.createdBy.name + ' wants to chat with you. Log ' +
            'into Tutorbook (https://tutorbook.app/app/messages) to respond to ' +
            getGenderPronoun(chat.createdBy.gender) + ' messages.';
        const title = 'Chat with ' + chat.createdBy.name;
        // Send notification to all the other people on the chat
        return chat.chatters.forEach((chatter) => {
            if (chatter.email !== chat.createdBy.email) {
                sendNotification(chatter.email, title, body);
                sendText(chatter.phone, body);
            }
        });
    });


// feedback - Send me an email and sms notification whenever anybody creates a
// new feedback document
exports.feedbackNotification = functions.firestore
    .document('feedback/{id}')
    .onCreate((snap, context) => {
        const feedback = snap.data();
        const id = context.params.id;
        const me = {
            email: 'nicholas.h.chiang@gmail.com',
            phone: '6508612723'
        };

        // TODO: Add a customized greeting message here in this HTML email
        // template.
        console.log('Sending feedback notification to:', me);
        sendText(me.phone, 'Feedback from ' + feedback.from.name + ': ' +
            feedback.subject + '. ' + feedback.message);
        return sendEmail(me.email,
            'Feedback from ' + feedback.from.name, {
                title: feedback.subject,
                summary: feedback.message
            });
    });


// user - Send the user a welcome email notification when they first create an
// account
exports.newUserNotification = functions.firestore
    .document('users/{id}')
    .onCreate((snap, context) => {
        const profile = snap.data();
        const id = context.params.id;

        // TODO: Add a customized greeting message here in this HTML email
        // template.
        console.log('New user:', profile);
        console.log('Sending ' + profile.name + ' a welcome email to:', id);
        if (!!profile.phone && profile.phone !== '') {
            sendText(profile.phone, "Welcome to Tutorbook, " + profile.name +
                ". This is how we'll notify you of important app activity on " +
                "your Tutorbook dashboard (tutorbook.app/app/dashboard).");
        }
        return sendWelcomeEmail(id, profile.name);
    });


// pendingPayment - Send the user a notification whenever a pendingPayment
// is created
/*
 *exports.newPendingPaymentNotification = functions.firestore
 *    .document('users/{id}/pendingPayments/{payment}')
 *    .onCreate((snap, context) => {
 *        const payment = snap.data();
 *        const id = context.params.id;
 *
 *        // Helper function that returns a duration string (hrs:min:sec) given two Date
 *        // objects.
 *        function getDurationStringFromDates(start, end) {
 *            const secs = (end.getTime() - start.getTime()) / 1000;
 *            // See: https://www.codespeedy.com/convert-seconds-to-hh-mm-ss-format-
 *            // in-javascript/
 *            const time = new Date(null);
 *            time.setSeconds(secs);
 *            return time.toISOString().substr(11, 8);
 *        };
 *
 *        return getUser(id).then((doc) => {
 *            const token = doc.data().notificationToken;
 *            isValidToken(token);
 *            const message = {
 *                notification: {
 *                    title: 'Payment from ' + payment.from.name,
 *                    body: payment.from.name + ' paid you $' + payment.amount +
 *                        ' for a ' + getDurationStringFromDates(
 *                            payment.for.clockIn.sentTimestamp.toDate(),
 *                            payment.for.clockOut.sentTimestamp.toDate()
 *                        ) + ' long lesson on ' + payment.for.for.subject + '.',
 *                },
 *                webpush: {
 *                    headers: {
 *                        'Urgency': 'high'
 *                    },
 *                    notification: {
 *                        title: 'Payment from ' + payment.from.name,
 *                        body: payment.from.name + ' paid you $' + payment.amount +
 *                            ' for a ' + getDurationStringFromDates(
 *                                payment.for.clockIn.sentTimestamp.toDate(),
 *                                payment.for.clockOut.sentTimestamp.toDate()
 *                            ) + ' long lesson on ' + payment.for.for.subject + '.',
 *                        requireInteraction: true,
 *                        icon: 'https://tutorbook-779d8.firebaseapp.com/favic' +
 *                            'on/logo.svg',
 *                        image: 'https://tutorbook-779d8.firebaseapp.com/favic' +
 *                            'on/logo.svg',
 *                        badge: 'https://tutorbook-779d8.firebaseapp.com/favic' +
 *                            'on/notification-badge.svg',
 *                        actions: [{
 *                            action: 'view_payment',
 *                            title: 'View'
 *                        }],
 *
 *                    },
 *                },
 *                token: token,
 *            };
 *            console.log("Sending " + id + " newPendingPayment notification:", message);
 *            return admin.messaging().send(message);
 *        }).then((result) => {
 *            console.log("Sent notification to " + id + ":", result);
 *        }).catch((err) => {
 *            console.error("Error while sending " + id + " a newPendingPayment " +
 *                "notification:", err);
 *        });
 *    });
 */


// notifications - Custom notifications whenever a notification doc is created
// (we only use this to send a welcome notification when the user first grants
// notification access)
exports.newNotification = functions.firestore
    .document('users/{id}/notifications/{notification}')
    .onCreate((snap, context) => {
        const notification = snap.data();
        const id = context.params.id;

        console.log('Sending ' + id + ' notification:', notification);
        return admin.messaging().send(notification).then((result) => {
            console.log('Sent ' + id + ' notification:', result);
        }).catch((err) => {
            console.error('Error while sending ' + id + ' notification:', err);
        });
    });


// Helper functions for newPendingClockIn notification message
function getTimeString(timestamp) {
    // NOTE: Although we create timestamp objects here as new Date() objects,
    // Firestore converts them to Google's native Timestamp() objects and thus
    // we must call toDate() to access any Date() methods.
    var timeString = timestamp.toDate().toLocaleTimeString();
    var timeStringSplit = timeString.split(':');
    var hour = timeStringSplit[0];
    var min = timeStringSplit[1];
    var ampm = timeStringSplit[2].split(' ')[1] || 'AM';
    return hour + ':' + min + ' ' + ampm;
};

function getOtherAttendee(user, users) {
    if (user.email !== users[0].email) {
        return users[0];
    }
    return users[1];
};


// pendingClockIns - Notification for the supervisor (toUser) when a tutor is 
// trying to clockIn.
exports.newPendingClockIn = functions.firestore
    .document('users/{id}/pendingClockIns/{clockIn}')
    .onCreate((snap, context) => {
        const clockIn = snap.data();
        const id = context.params.id;

        return getUser(id).then((doc) => {
            const token = doc.data().notificationToken;
            const phone = doc.data().phone;
            if (!!phone && phone !== '') {
                sendText(phone, 'Clock-In from ' + clockIn.sentBy.name + ': ' +
                    clockIn.sentBy.name.split(' ')[0] + ' clocked in on Tutorbook at ' +
                    getTimeString(clockIn.sentTimestamp) + ' for ' +
                    getGenderPronoun(clockIn.sentBy.gender) + ' appointment with ' +
                    getOtherAttendee(clockIn.sentBy, clockIn.for.attendees).name + ' at ' +
                    clockIn.for.time.from + '. Log into your Tutorbook ' +
                    'dashboard (tutorbook.app/app/dashboard) to approve or reject this clock in.');
            }
            isValidToken(token);
            const message = {
                notification: {
                    title: 'Clock-In from ' + clockIn.sentBy.name,
                    body: clockIn.sentBy.name.split(' ')[0] + ' clocked in at ' +
                        getTimeString(clockIn.sentTimestamp) + ' for ' +
                        getGenderPronoun(clockIn.sentBy.gender) + ' appointment with ' +
                        getOtherAttendee(clockIn.sentBy, clockIn.for.attendees).name + ' at ' +
                        clockIn.for.time.from + '.',
                },
                webpush: {
                    headers: {
                        'Urgency': 'high'
                    },
                    notification: {
                        title: 'Clock-In from ' + clockIn.sentBy.name,
                        body: clockIn.sentBy.name.split(' ')[0] + ' clocked in at ' +
                            getTimeString(clockIn.sentTimestamp) + ' for ' +
                            getGenderPronoun(clockIn.sentBy.gender) + ' appointment with ' +
                            getOtherAttendee(clockIn.sentBy, clockIn.for.attendees).name + ' at ' +
                            clockIn.for.time.from + '.',
                        requireInteraction: true,
                        icon: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                            'on/logo.svg',
                        image: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                            'on/logo.svg',
                        badge: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                            'on/notification-badge.svg',
                        actions: [{
                                action: 'view_clockIn',
                                title: 'View'
                            },
                            {
                                action: 'reject_clockIn',
                                title: 'Reject'
                            },
                            {
                                action: 'approve_clockIn',
                                title: 'Approve'
                            }
                        ],

                    },
                },
                token: token,
            };
            console.log("Sending " + id + " newPendingClockIn notification:", message);
            return admin.messaging().send(message);
        }).then((result) => {
            console.log("Sent notification to " + id + ":", result);
        }).catch((err) => {
            console.error("Error while sending " + id + " a newPendingClockIn " +
                "notification:", err);
        });
    });


// requestsIn - Notification for the tutor (toUser) when a tutor recieves a new 
// request
exports.newRequestIn = functions.firestore
    .document('users/{id}/requestsIn/{newRequest}')
    .onCreate((snap, context) => {
        const request = snap.data();
        const id = context.params.id;

        return getUser(id).then((doc) => {
            const token = doc.data().notificationToken;
            const phone = doc.data().phone;
            if (!!phone && phone !== '') {
                sendText(phone, 'New lesson request from ' + request.fromUser.name +
                    ': ' + request.fromUser.name.split(' ')[0] +
                    ' wants you as a ' + request.toUser.type.toLowerCase() + ' for ' +
                    request.subject + '. Log into your Tutorbook dashboard ' +
                    '(tutorbook.app/app/dashboard) to approve or modify this request.');
                if (request.message !== '') {
                    sendText(phone, 'With message: ' + request.message);
                }
            }
            sendEmail(id, 'Request from ' + request.fromUser.name, {
                title: 'New lesson request from <b class="color">' + request.fromUser.name +
                    '</b>:',
                summary: request.fromUser.name.split(' ')[0] +
                    ' wants you as a ' + request.toUser.type.toLowerCase() + ' for ' +
                    request.subject + '. Log into your Tutorbook dashboard ' +
                    '(tutorbook.app/app/dashboard) to approve or modify this request.'
            });
            isValidToken(token);
            const message = {
                notification: {
                    title: 'Request from ' + request.fromUser.name,
                    body: request.fromUser.name.split(' ')[0] + ' wants you' +
                        ' as a ' + request.toUser.type.toLowerCase() + ' for ' +
                        request.subject + '.',
                },
                webpush: {
                    headers: {
                        'Urgency': 'high'
                    },
                    notification: {
                        title: 'Request from ' + request.fromUser.name,
                        body: request.fromUser.name.split(' ')[0] + ' wants you' +
                            ' as a ' + request.toUser.type.toLowerCase() + ' for ' +
                            request.subject + '.',
                        requireInteraction: true,
                        icon: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                            'on/logo.svg',
                        image: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                            'on/logo.svg',
                        badge: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                            'on/notification-badge.svg',
                        actions: [{
                            action: 'view_request',
                            title: 'View'
                        }],

                    },
                },
                token: token,
            };
            console.log("Sending " + id + " newRequest notification:", message);
            return admin.messaging().send(message);
        }).then((result) => {
            console.log("Sent notification to " + id + ":", result);
        }).catch((err) => {
            console.error("Error while sending " + id + " a newRequest " +
                "notification:", err);
        });
    });


// modifiedRequestsIn - Notification for the tutor (toUser) when the pupil edits 
// their request
exports.modifiedRequestIn = functions.firestore
    .document('users/{id}/modifiedRequestsIn/{modifiedRequest}')
    .onCreate((snap, context) => {
        const modifiedRequest = snap.data();
        const id = context.params.id;

        return getUser(id).then((doc) => {
            const token = doc.data().notificationToken;
            const phone = doc.data().phone;
            if (!!phone && phone !== '') {
                sendText(phone, 'A request to you was modified: ' +
                    modifiedRequest.modifiedBy.name + ' modified ' +
                    getGenderPronoun(modifiedRequest.modifiedBy.gender) +
                    ' lesson request to you. Log into your Tutorbook dashboard ' +
                    '(tutorbook.app/app/dashboard) to learn more.');
                if (modifiedRequest.for.message !== '') {
                    sendText(phone, 'With message: ' + modifiedRequest.for.message);
                }
            }
            isValidToken(token);
            const message = {
                notification: {
                    title: 'Modified Request',
                    body: modifiedRequest.modifiedBy.name + ' modified ' +
                        getGenderPronoun(modifiedRequest.modifiedBy.gender) +
                        ' request to you.',
                },
                webpush: {
                    headers: {
                        'Urgency': 'high'
                    },
                    notification: {
                        title: 'Modified Request',
                        body: modifiedRequest.modifiedBy.name + ' modified ' +
                            getGenderPronoun(modifiedRequest.modifiedBy.gender) +
                            ' request to you.',
                        requireInteraction: true,
                        icon: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                            'on/logo.svg',
                        image: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                            'on/logo.svg',
                        badge: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                            'on/notification-badge.svg',
                        actions: [{
                            action: 'view_request',
                            title: 'View'
                        }],

                    },
                },
                token: token,
            };
            console.log("Sending " + id + " modifiedRequest notification:", message);
            return admin.messaging().send(message);
        }).then((result) => {
            console.log("Sent notification to " + id + ":", result);
        }).catch((err) => {
            console.error("Error while sending " + id + " a modifiedRequest " +
                "notification:", err);
        });
    });


// canceledRequestsIn - Notification for the tutor (toUser) when the pupil 
// cancels their request
exports.canceledRequestIn = functions.firestore
    .document('users/{id}/canceledRequestsIn/{canceledRequest}')
    .onCreate((snap, context) => {
        const canceledRequest = snap.data();
        const id = context.params.id;

        return getUser(id).then((doc) => {
            const token = doc.data().notificationToken;
            const phone = doc.data().phone;
            if (!!phone && phone !== '') {
                sendText('A request to you was canceled: ' +
                    canceledRequest.canceledBy.name + ' canceled ' +
                    getGenderPronoun(canceledRequest.canceledBy.gender) +
                    ' lesson request to you. Log into your Tutorbook dashboard ' +
                    '(tutorbook.app/app/dashboard) to learn more.');
                if (canceledRequest.for.message !== '') {
                    sendText(phone, 'With message: ' + canceledRequest.for.message);
                }
            }
            isValidToken(token);
            const message = {
                notification: {
                    title: 'Canceled Request',
                    body: canceledRequest.canceledBy.name + ' canceled ' +
                        getGenderPronoun(canceledRequest.canceledBy.gender) +
                        ' request to you.',
                },
                webpush: {
                    headers: {
                        'Urgency': 'high'
                    },
                    notification: {
                        title: 'Canceled Request',
                        body: canceledRequest.canceledBy.name + ' canceled ' +
                            getGenderPronoun(canceledRequest.canceledBy.gender) +
                            ' request to you.',
                        requireInteraction: true,
                        icon: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                            'on/logo.svg',
                        image: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                            'on/logo.svg',
                        badge: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                            'on/notification-badge.svg',
                        actions: [{
                            action: 'view_request',
                            title: 'View'
                        }],

                    },
                },
                token: token,
            };
            console.log("Sending " + id + " canceledRequest notification:", message);
            return admin.messaging().send(message);
        }).then((result) => {
            console.log("Sent notification to " + id + ":", result);
        }).catch((err) => {
            console.error("Error while sending " + id + " a canceledRequest " +
                "notification:", err);
        });
    });


// approvedRequestsOut - Notification for the pupil (fromUser) when a pupil's 
// request is approved by the tutor
exports.approvedRequestOut = functions.firestore
    .document('users/{id}/approvedRequestsOut/{approvedRequest}')
    .onCreate((snap, context) => {
        const approvedRequest = snap.data();
        const id = context.params.id;

        return getUser(id).then((doc) => {
            const token = doc.data().notificationToken;
            const phone = doc.data().phone;
            if (!!phone && phone !== '') {
                if (approvedRequest.approvedBy.email === approvedRequest.for.toUser.email) {
                    sendText(phone, 'Your request was approved: ' +
                        approvedRequest.approvedBy.name + ' approved your lesson ' +
                        'request. Log into your Tutorbook dashboard (tutorbook.app/app/dashboard) ' +
                        'to view your new appointment.');
                    if (approvedRequest.for.message !== '') {
                        sendText(phone, 'With message: ' + approvedRequest.for.message);
                    }
                } else {
                    sendText(phone, 'Your request was approved: ' +
                        approvedRequest.approvedBy.name + ' approved your lesson ' +
                        'request to ' + approvedRequest.for.toUser.name + '. Log ' +
                        'into your Tutorbook dashboard (tutorbook.app/app/dashboard) ' +
                        'to view your new appointment.');
                }
            }
            isValidToken(token);
            const message = {
                notification: {
                    title: 'Approved Request',
                    body: approvedRequest.approvedBy.name + ' approved your ' +
                        'request.'
                },
                webpush: {
                    headers: {
                        'Urgency': 'high'
                    },
                    notification: {
                        title: 'Approved Request',
                        body: approvedRequest.approvedBy.name + ' approved your ' +
                            'request.',
                        requireInteraction: true,
                        icon: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                            'on/logo.svg',
                        image: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                            'on/logo.svg',
                        badge: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                            'on/notification-badge.svg',
                        actions: [{
                            action: 'view_appt',
                            title: 'View'
                        }],

                    },
                },
                token: token,
            };
            console.log("Sending " + id + " approvedRequest notification:", message);
            return admin.messaging().send(message);
        }).then((result) => {
            console.log("Sent notification to " + id + ":", result);
        }).catch((err) => {
            console.error("Error while sending " + id + " a approvedRequest " +
                "notification:", err);
        });
    });


// modifiedRequestsOut - Notification for the pupil (fromUser) when the tutor 
// edits their request
exports.modifiedRequestOut = functions.firestore
    .document('users/{id}/modifiedRequestsOut/{modifiedRequest}')
    .onCreate((snap, context) => {
        const modifiedRequest = snap.data();
        const id = context.params.id;

        return getUser(id).then((doc) => {
            const token = doc.data().notificationToken;
            const phone = doc.data().phone;
            if (!!phone && phone !== '') {
                if (modifiedRequest.modifiedBy.email === modifiedRequest.for.toUser.email) {
                    sendText(phone, 'Your request was modified: ' +
                        modifiedRequest.modifiedBy.name + ' modified your lesson ' +
                        'request. Log into your Tutorbook dashboard (tutorbook.app/app/dashboard) ' +
                        'to learn more.');
                    if (modifiedRequest.for.message !== '') {
                        sendText(phone, 'With message: ' + modifiedRequest.for.message);
                    }
                } else {
                    sendText(phone, 'Your request was modified: ' +
                        modifiedRequest.modifiedBy.name + ' modified your lesson ' +
                        'request to ' + modifiedRequest.for.toUser.name + '. Log ' +
                        'into your Tutorbook dashboard (tutorbook.app/app/dashboard) ' +
                        'to learn more.');
                }
            }
            isValidToken(token);
            const message = {
                notification: {
                    title: 'Modified Request',
                    body: modifiedRequest.modifiedBy.name + ' modified your ' +
                        'request.'
                },
                webpush: {
                    headers: {
                        'Urgency': 'high'
                    },
                    notification: {
                        title: 'Modified Request',
                        body: modifiedRequest.modifiedBy.name + ' modified your ' +
                            'request.',
                        requireInteraction: true,
                        icon: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                            'on/logo.svg',
                        image: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                            'on/logo.svg',
                        badge: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                            'on/notification-badge.svg',
                        actions: [{
                            action: 'view_request',
                            title: 'View'
                        }],

                    },
                },
                token: token,
            };
            console.log("Sending " + id + " modifiedRequest notification:", message);
            return admin.messaging().send(message);
        }).then((result) => {
            console.log("Sent notification to " + id + ":", result);
        }).catch((err) => {
            console.error("Error while sending " + id + " a modifiedRequest " +
                "notification:", err);
        });
    });


// rejectedRequestsOut - Notification for the pupil (fromUser) when the tutor
// rejects their request
exports.rejectedRequestOut = functions.firestore
    .document('users/{id}/rejectedRequestsOut/{rejectedRequest}')
    .onCreate((snap, context) => {
        const rejectedRequest = snap.data();
        const id = context.params.id;

        return getUser(id).then((doc) => {
            const token = doc.data().notificationToken;
            const phone = doc.data().phone;
            if (!!phone && phone !== '') {
                sendText(phone, 'Your request was rejected: ' +
                    rejectedRequest.rejectedBy.name + ' rejected your ' +
                    'lesson request. Log into your Tutorbook dashboard ' +
                    '(tutorbook.app/app/dashboard) to learn more.');
                if (rejectedRequest.for.message !== '') {
                    sendText(phone, 'With message: ' + rejectedRequest.for.message);
                }
            }
            isValidToken(token);
            const message = {
                notification: {
                    title: 'Rejected Request',
                    body: rejectedRequest.rejectedBy.name + ' rejected your ' +
                        'request.'
                },
                webpush: {
                    headers: {
                        'Urgency': 'high'
                    },
                    notification: {
                        title: 'Rejected Request',
                        body: rejectedRequest.rejectedBy.name + ' rejected your ' +
                            'request.',
                        requireInteraction: true,
                        icon: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                            'on/logo.svg',
                        image: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                            'on/logo.svg',
                        badge: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                            'on/notification-badge.svg',
                        actions: [{
                            action: 'view_request',
                            title: 'View'
                        }],

                    },
                },
                token: token,
            };
            console.log("Sending " + id + " rejectedRequest notification:", message);
            return admin.messaging().send(message);
        }).then((result) => {
            console.log("Sent notification to " + id + ":", result);
        }).catch((err) => {
            console.error("Error while sending " + id + " a rejectedRequest " +
                "notification:", err);
        });
    });


// modifiedAppointments - Notification for the otherUser (the one who didn't 
// edit the appointment) when their appointment is modified
exports.modifiedAppointment = functions.firestore
    .document('users/{id}/modifiedAppointments/{modifiedAppointment}')
    .onCreate((snap, context) => {
        const modifiedAppointment = snap.data();
        const id = context.params.id;

        return getUser(id).then((doc) => {
            const token = doc.data().notificationToken;
            const phone = doc.data().phone;
            if (!!phone && phone !== '') {
                if ([modifiedAppointment.for.attendees[0].email, modifiedAppointment.for.attendees[1].email].indexOf(modifiedAppointment.modifiedBy.email) >= 0) {
                    sendText(phone, 'Your appointment was modified: ' +
                        modifiedAppointment.modifiedBy.name +
                        ' modified your tutoring appointment together. Log into ' +
                        'your Tutorbook dashboard (tutorbook.app/app/dashboard) to learn more.');
                    if (modifiedAppointment.for.for.message !== '') {
                        sendText(phone, 'With message: ' + modifiedAppointment.for.for.message);
                    }
                } else {
                    if (modifiedAppointment.for.attendees[0].email !== id) {
                        var otherUser = modifiedAppointment.for.attendees[0];
                    } else {
                        var otherUser = modifiedAppointment.for.attendees[1];
                    }
                    sendText(phone, 'Your appointment was modified: ' +
                        modifiedAppointment.modifiedBy.name +
                        ' modified your tutoring appointment with ' + otherUser.name + '. Log into ' +
                        'your Tutorbook dashboard (tutorbook.app/app/dashboard) to learn more.');
                }
            }
            isValidToken(token);
            const message = {
                notification: {
                    title: 'Modified Appointment',
                    body: modifiedAppointment.modifiedBy.name +
                        ' modified your appointment together.'
                },
                webpush: {
                    headers: {
                        'Urgency': 'high'
                    },
                    notification: {
                        title: 'Modified Appointment',
                        body: modifiedAppointment.modifiedBy.name +
                            ' modified your appointment together.',
                        requireInteraction: true,
                        icon: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                            'on/logo.svg',
                        image: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                            'on/logo.svg',
                        badge: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                            'on/notification-badge.svg',
                        actions: [{
                            action: 'view_appt',
                            title: 'View'
                        }],

                    },
                },
                token: token,
            };
            console.log("Sending " + id + " modifiedAppointment notification:",
                message);
            return admin.messaging().send(message);
        }).then((result) => {
            console.log("Sent notification to " + id + ":", result);
        }).catch((err) => {
            console.error("Error while sending " + id + " a modifiedAppointment " +
                "notification:", err);
        });
    });


// canceledAppointments - Notification for the otherUser (the one who didn't 
// edit the appointment) when their appointment is canceled 
exports.canceledAppointment = functions.firestore
    .document('users/{id}/canceledAppointments/{canceledAppointment}')
    .onCreate((snap, context) => {
        const canceledAppointment = snap.data();
        const id = context.params.id;

        return getUser(id).then((doc) => {
            const token = doc.data().notificationToken;
            const phone = doc.data().phone;
            if (!!phone && phone !== '') {
                if ([canceledAppointment.for.attendees[0].email, canceledAppointment.for.attendees[1].email].indexOf(canceledAppointment.canceledBy.email) >= 0) {
                    sendText(phone, 'Your appointment was canceled: ' +
                        canceledAppointment.canceledBy.name +
                        ' canceled your tutoring appointment together. Log into ' +
                        'your Tutorbook dashboard (tutorbook.app/app/dashboard) to learn more.');
                    if (canceledAppointment.for.for.message !== '') {
                        sendText(phone, 'With message: ' + canceledAppointment.for.for.message);
                    }
                } else {
                    if (canceledAppointment.for.attendees[0].email !== id) {
                        var otherUser = canceledAppointment.for.attendees[0];
                    } else {
                        var otherUser = canceledAppointment.for.attendees[1];
                    }
                    sendText(phone, 'Your appointment was canceled: ' +
                        canceledAppointment.canceledBy.name +
                        ' canceled your tutoring appointment with ' + otherUser.name + '. Log into ' +
                        'your Tutorbook dashboard (tutorbook.app/app/dashboard) to learn more.');
                }
            }
            isValidToken(token);
            const message = {
                notification: {
                    title: 'Canceled Appointment',
                    body: canceledAppointment.canceledBy.name +
                        ' canceled your appointment together.'
                },
                webpush: {
                    headers: {
                        'Urgency': 'high'
                    },
                    notification: {
                        title: 'Canceled Appointment',
                        body: canceledAppointment.canceledBy.name +
                            ' canceled your appointment together.',
                        requireInteraction: true,
                        icon: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                            'on/logo.svg',
                        image: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                            'on/logo.svg',
                        badge: 'https://tutorbook-779d8.firebaseapp.com/favic' +
                            'on/notification-badge.svg',
                        actions: [{
                            action: 'view_appt',
                            title: 'View'
                        }],

                    },
                },
                token: token,
            };
            console.log("Sending " + id + " canceledAppointment notification:",
                message);
            return admin.messaging().send(message);
        }).then((result) => {
            console.log("Sent notification to " + id + ":", result);
        }).catch((err) => {
            console.error("Error while sending " + id + " a canceledAppointment " +
                "notification:", err);
        });
    });