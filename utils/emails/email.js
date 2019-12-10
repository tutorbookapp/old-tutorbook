const SUBJECT = '[Demo] Tutorbook Location Rules Email';
const ADDRESS = 'pamsrazz7@yahoo.com';
const FILENAME = './rules.html';
const VARS = {
    summary: 'You now have tutoring appointments for Planning and ' +
        'Organization every Monday at the Gunn Academic Center from 2:45 PM ' +
        'until 3:45 PM.',
    tutor: 'Elina',
    tutorPhone: '(650) 521-6671',
    tutorEmail: 'elina.saabsunden@gmail.com',
    pupil: 'Alison',
    pupilPhone: '(908) 873-9325',
    pupilEmail: 'erranli@gmail.com',
    supervisor: 'Pam Steward',
    supervisorPhone: '(650) 354-8271',
    supervisorEmail: 'psteward@pausd.org',
    location: 'Gunn Academic Center',
};

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
        console.log('Server is ready to take our message.');
    });

    const info = await transporter.sendMail({
        from: '"Tutorbook" <notifications@tutorbook.app>',
        to: params.address,
        subject: params.subject,
        html: params.email,
    });

    console.log('Message (' + info.messageId + ') sent.');
};

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

send({
    address: ADDRESS,
    subject: SUBJECT,
    email: function() {
        var html = fs.readFileSync(FILENAME).toString();
        Object.entries(VARS).forEach((VAR) => {
            html = html.replaceAll('{ ' + VAR[0] + ' }', VAR[1]);
        });
        return html;
    }(),
});