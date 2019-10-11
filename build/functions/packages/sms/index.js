const functions = require('firebase-functions');
const twilio = new require('twilio')(
    functions.config().twilio.id,
    functions.config().twilio.key,
);


class SMS {

    constructor(phone, message) {
        this.phone = phone;
        this.message = message;
        this.send();
    }

    send() {
        return twilio.messages.create({
            body: this.message,
            from: functions.config().twilio.phone,
            to: this.phone,
        }).then((message) => console.log('Sent (' + this.phone +
            ') SMS message:', message.sid));
    }
};


module.exports = SMS;