const nodemailer = require('nodemailer');
const fs = require('fs');


async function sendEmail(template) {
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
        to: 'nc26459@pausd.us, nicholas.h.chiang@gmail.com', // list of receivers
        subject: 'Welcome to Tutorbook  |  Mentoring Made Easy', // Subject line
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

    console.log('Message sent: %s', info.messageId);
    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
};


function getEmailTemplate(username) {
    fs.readFile('./emails/welcome.html', (err, html) => {
        if (err) {
            console.error('Error while reading email template:', err);
        }
        html = html.toString().replace("{ username }", username);
        console.log('Email template:', html);
        sendEmail(html);
    });
};


getEmailTemplate("Nicholas");