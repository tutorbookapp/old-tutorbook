// =============================================================================
// EMAIL FUNCTION
// Usage:
//   send({
//     address: 'nicholas.h.chiang@gmail.com',
//     subject: '[Test] Another Test of the Nodemailer',
//     email: '<html><h1>Another Test of the Nodemailer</h1></html>',
//   });
// =============================================================================

const nodemailer = require('nodemailer');
const fs = require('fs');
const send = async (params) => {
    if (!(params.address && params.subject && params.email)) return;
    const transporter = nodemailer.createTransport({
        host: 'smtp-relay.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: 'TODO: Add-Your-Email-Address-Here',
            pass: 'TODO: Add-Your-SMTP-Relay-Password-Here',
        },
    });

    transporter.verify((err, res) => {
        if (err) return console.error('[ERROR] ' + err);
        console.log('[DEBUG] Server is ready to take our message.');
    });

    const info = await transporter.sendMail({
        from: '"Tutorbook" <notifications@tutorbook.app>',
        to: params.address,
        subject: params.subject,
        html: params.email,
    });

    console.log('[DEBUG] Message (' + info.messageId + ') sent.');
};

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

// =============================================================================
// RULES DEMO EMAIL
// =============================================================================
/*
 *const SUBJECT = '[Demo] Tutorbook Location Rules Email';
 *const ADDRESS = 'pamsrazz7@yahoo.com';
 *const FILENAME = './rules.html';
 *const VARS = {
 *    summary: 'You now have tutoring appointments for Planning and ' +
 *        'Organization every Monday at the Gunn Academic Center from 2:45 PM ' +
 *        'until 3:45 PM.',
 *    tutor: 'Elina',
 *    tutorPhone: '(650) 521-6671',
 *    tutorEmail: 'elina.saabsunden@gmail.com',
 *    pupil: 'Alison',
 *    pupilPhone: '(908) 873-9325',
 *    pupilEmail: 'erranli@gmail.com',
 *    supervisor: 'Pam Steward',
 *    supervisorPhone: '(650) 354-8271',
 *    supervisorEmail: 'psteward@pausd.org',
 *    location: 'Gunn Academic Center',
 *};
 *
 *send({
 *    address: ADDRESS,
 *    subject: SUBJECT,
 *    email: function() {
 *        var html = fs.readFileSync(FILENAME).toString();
 *        Object.entries(VARS).forEach((VAR) => {
 *            html = html.replaceAll('{ ' + VAR[0] + ' }', VAR[1]);
 *        });
 *        return html;
 *    }(),
 *});
 */

// =============================================================================
// MAINTENANCE NOTIFICATION EMAIL
// =============================================================================
/*
 *const SUBJECT = '[Important] Ignore notifications due to Tutorbook maintenance'
 *const ADDRESS = 'nicholas.h.chiang@gmail.com';
 *const FILENAME = './maintenance.html';
 *
 *const to = require('await-to-js').default;
 *const admin = require('firebase-admin');
 *const serviceAccount = require('../admin-cred.json');
 *
 *admin.initializeApp({
 *    credential: admin.credential.cert(serviceAccount),
 *    databaseURL: 'https://tutorbook-779d8.firebaseio.com',
 *});
 *
 *const db = admin
 *    .firestore()
 *    .collection('partitions')
 *    .doc('default');
 *const main = async () => {
 *    const html = fs.readFileSync(FILENAME).toString();
 *    return Promise.all((await db
 *        .collection('users')
 *        .get()
 *    ).docs.map(async (user) => {
 *        const profile = user.data();
 *        if (!profile.email && !profile.id) return console.warn('[WARNING] ' +
 *            'Could not find an email address for user (' + user.id + '), ' +
 *            'skipping...');
 *        if (!profile.name) return console.warn('[WARNING] Could not find a ' +
 *            'valid name for user (' + user.id + '), skipping...');
 *        const [err, res] = await to(send({
 *            address: profile.email || profile.id,
 *            subject: SUBJECT,
 *            email: function() {
 *                return html.replaceAll('{ username }', profile.name
 *                    .split(' ')[0]);
 *            }(),
 *        }));
 *        if (err) return console.error('[ERROR] Could not send email b/c of',
 *            err);
 *        console.log('[DEBUG] Sent email to ' + profile.name + ' (' + user.id +
 *            ').');
 *    }));
 *};
 *
 *main();
 */

// =============================================================================
// PITCH TO OTHER SCHOOLS EMAIL(S)
// =============================================================================
const EMAILS = {
    'Fremont High School\'s "Students for Success"': {
        subject: '[Tutorbook] A better way to manage peer tutoring.',
        address: 'miao_carroll@fuhsd.org',
        filename: 'pitches/fremont.html',
    },
    'Homestead High School\'s Academic Center': {
        subject: '[Tutorbook] A better way to manage peer tutoring.',
        filename: 'pitches/homestead.html',
    },
    'Los Altos High School\'s Tutorial Center': {
        subject: '[Tutorbook] A better way to manage peer tutoring.',
        address: 'quyen.nguyen@mvla.net',
        filename: 'pitches/los-altos.html',
    },
    'Mountain View High School\'s Tutorial Center': {
        subject: '[Tutorbook] A better way to manage peer tutoring.',
        address: 'nancy.rafati@mvla.net',
        filename: 'pitches/mtn-view.html',
    },
};

const main = () => {
    return Promise.all(Object.values(EMAILS).map(email => send({
        address: email.address,
        subject: email.subject,
        email: fs.readFileSync(email.filename).toString(),
    })));
};

main();