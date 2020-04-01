const nodemailer = require('nodemailer');
const fs = require('fs');

const admin = require('firebase-admin');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});

const firestore = admin.firestore();
const messaging = admin.messaging();

const twilio = require('twilio');
const twilioClient = new twilio(sid, auth);

function sendText(phone, body) {
  console.log('Sending text to ' + phone + ':', body);
  twilioClient.messages
    .create({
      body: body,
      from: '+18317048640',
      to: phone,
    })
    .then((message) => console.log('Sent SMS message:', message.sid));
}

async function sendEmail(template, email) {
  try {
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      host: 'smtp-relay.gmail.com',
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {},
    });

    transporter.verify((err, success) => {
      if (err) {
        console.error(err);
      } else {
        console.log('Server is ready to take our message.');
      }
    });

    // send mail with defined transport object
    let info = await transporter.sendMail({
      from: '"Tutorbook" <notifications@tutorbook.app>', // sender address
      to: email, // list of receivers
      subject: 'Start Using Tutorbook |  Setup Your Account', // Subject line
      html: template, // html body
    });

    console.log('Message sent: %s', info.messageId);
    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
  } catch (e) {
    console.error('Error while sending ' + email + ' welcome email:', e);
  }
}

function getEmailTemplate(template, username, email) {
  fs.readFile('./email_templates/' + template + '.html', async (err, html) => {
    if (err) {
      console.error('Error while reading email template:', err);
    }
    html = html.toString().replace('{ username }', username);
    sendEmail(html, email);
  });
}

var tutorEmailsToBeSent = [];
var pupilEmailsToBeSent = [];
var tutorEmailsSent = 0;
var pupilEmailsSent = 0;

function sendTutorEmails() {
  if (tutorEmailsSent < tutorEmailsToBeSent.length) {
    var profile = tutorEmailsToBeSent[tutorEmailsSent];
    console.log('Sending tutor welcome email to:', profile.email);
    getEmailTemplate('tutors_start_now', profile.name, profile.email);
    tutorEmailsSent++;
    setTimeout(sendTutorEmails, 1000);
  } else {
    console.log('Sent ' + tutorEmailsSent + ' tutor emails.');
  }
}

function sendPupilEmails() {
  if (pupilEmailsSent < pupilEmailsToBeSent.length) {
    var profile = pupilEmailsToBeSent[pupilEmailsSent];
    console.log('Sending pupil welcome email to:', profile.email);
    getEmailTemplate('pupils_start_now', profile.name, profile.email);
    pupilEmailsSent++;
    setTimeout(sendPupilEmails, 1000);
  } else {
    console.log('Sent ' + pupilEmailsSent + ' pupil emails.');
  }
}

function manualEmails() {
  tutorEmailsToBeSent = [
    {
      email: 'ad44168@pausd.us',
      name: 'Aditya Dhir',
    },
    {
      email: 'ma32027@pausd.us',
      name: 'Malavika',
    },
  ];
  pupilEmailsToBeSent = [
    {
      email: 'luckyducky7702@gmail.com',
      name: 'Annabel Lee',
    },
  ];

  sendTutorEmails();
  sendPupilEmails();
}

function manualTexts() {
  var message =
    'Hi Aditya, did you remember to clock into your tutoring' +
    ' appointment with Annabel today?' +
    ' Make sure to log unto Tutorbook (tutorbook.app) to track service hours.';
  sendText('6508622142', message);
  message =
    'Hi Malavika, did you remember to clock into your tutoring' +
    ' appointment with Esther today?' +
    ' Make sure to log unto Tutorbook (tutorbook.app) to track service hours.';
  sendText('650-665-3124', message);
  message =
    'Hi Annabel, did your tutor remember to clock into their tutoring' +
    ' appointment with you? Make sure to log unto Tutorbook (tutorbook.app)' +
    ' to check.';
  sendText('650-285-7801', message);
}

function manual() {
  manualEmails();
  manualTexts();
}

manual();
