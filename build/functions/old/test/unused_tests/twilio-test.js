const twilio = require('twilio');
const twilioClient = new twilio(
    sid,
    auth
);


function sendText(phone, body) {
    twilioClient.messages
        .create({
            body: body,
            from: '+18317048640',
            to: phone
        })
        .then((message) => console.log('Sent SMS message:', message.sid));
};


sendText('+16508612723', 'Welcome to Tutorbook. This is how we\'ll notify you' +
    ' about important app activity.');