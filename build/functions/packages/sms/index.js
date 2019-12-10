const functions = require('firebase-functions');
const twilio = new require('twilio')(
    functions.config().twilio.id,
    functions.config().twilio.key,
);
const cors = require('cors')({
    origin: true,
});
const Message = require('message');
const getUser = require('utils').getUserFromPhone;

class SMS {

    constructor(recipient, message) {
        this.recipient = recipient;
        this.message = message; // TODO: Alert sender if message fails
        if (recipient.phone && recipient.phone !== '') this.send();
    }

    send() {
        return twilio.messages.create({
            body: this.message,
            from: functions.config().twilio.phone,
            to: this.recipient.phone,
        }).then(new Message({
            message: this.message,
            to: this.recipient,
        }));
    }

    static receive(req, res) {
        return cors(req, res, async () => {
            console.log('[DEBUG] Received request:', req);
            console.log('[DEBUG] Received request data:', req.data);
            new Message({
                message: req.params.message,
                from: (await getUser(req.params.phone)),
            });
            const twiml = new twilio.TwimlResponse();
            twiml.message('Your message has been forwarded to your Tutorbook ' +
                'supervisor. He or she will get back to you asap.');
            res.writeHead(200, {
                'Content-Type': 'text/xml'
            });
            return res.send(twiml.toString());
        });
    }

    static fallback(req, res) {
        return cors(req, res, async () => {
            console.log('[DEBUG] Received request:', req);
            console.log('[DEBUG] Received request data:', req.data);
            const twiml = new twilio.TwimlResponse();
            twiml.message('Sorry, it looks like we encountered an error and ' +
                'could not relay your message to your Tutorbook supervisor. ' +
                'Try messaging (650) 861-2723 to get this resolved.');
            res.writeHead(200, {
                'Content-Type': 'text/xml'
            });
            return res.send(twiml.toString());
        });
    }
}

module.exports = SMS;