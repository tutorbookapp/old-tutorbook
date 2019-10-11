const nodemailer = require('nodemailer');
const fs = require('fs');

const admin = require('firebase-admin');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://tutorbook-779d8.firebaseio.com"
});

const firestore = admin.firestore();
const messaging = admin.messaging();


async function sendEmail(template, email) {
    try {
        // create reusable transporter object using the default SMTP transport
        let transporter = nodemailer.createTransport({
            host: 'smtp-relay.gmail.com',
            port: 465,
            secure: true, // true for 465, false for other ports
            auth: {}
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
            subject: 'Welcome to Tutorbook  |  Mentoring Made Easy', // Subject line
            html: template, // html body
            attachments: [{
                filename: 'edge_banner.png',
                path: './email_templates/img/edge_banner.png',
                cid: 'edge_banner.png',
            }, {
                filename: 'tw.png',
                path: './email_templates/img/tw.png',
                cid: 'tw.png',
            }, {
                filename: 'yt.png',
                path: './email_templates/img/yt.png',
                cid: 'yt.png',
            }, {
                filename: 'ig.png',
                path: './email_templates/img/ig.png',
                cid: 'ig.png',
            }, {
                filename: 'text_logo.png',
                path: './email_templates/img/text_logo.png',
                cid: 'text_logo.png',
            }],
        });

        console.log('Message sent: %s', info.messageId);
        // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
    } catch (e) {
        console.error('Error while sending ' + email + ' welcome email:', e);
    }
};


function getEmailTemplate(username, email) {
    fs.readFile('./email_templates/welcome.html', (err, html) => {
        if (err) {
            console.error('Error while reading email template:', err);
        }
        html = html.toString().replace("{ username }", username);
        console.log('Email template:', html);
        sendEmail(html, email);
    });
};


function main() {
    // Send welcome email_templates to all user's
    firestore.collection('users').get().then((snapshot) => {
        snapshot.forEach((doc) => {
            var profile = doc.data();
            if (!!profile.name && profile.name !== '') {
                console.log('Sending welcome email to:', doc.id);
                getEmailTemplate(profile.name, doc.id);
            } else {
                console.warn('User profile did not have valid name:', doc.id);
            }
        });
    });
};


if (true) {
    main();
}