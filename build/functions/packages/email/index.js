const functions = require('firebase-functions');
const nodemailer = require('nodemailer');
const fs = require('fs');

// Welcome email templates
const tutorEmail = fs.readFileSync('./html/tutor.html').toString();
const pupilEmail = fs.readFileSync('./html/pupil.html').toString();
const supervisorEmail = fs.readFileSync('./html/supervisor.html').toString();
const genericEmail = fs.readFileSync('./html/generic.html').toString();

// Other email templates
const newRequestEmail =
    fs.readFileSync('./html/newRequest.html').toString();
const requestApprovedEmail =
    fs.readFileSync('./html/approvedRequest.html').toString();
const defaultEmail = fs.readFileSync('./html/default.html').toString();

// Class that manages email templates
class Email {

    constructor(type, user, data) {
        this.user = user;
        switch (type) {
            case 'welcome':
                this.renderWelcome();
                break;
            case 'request':
                this.renderNewRequest(data);
                break;
            case 'appt':
                this.renderApprovedRequest(data);
                break;
            default:
                this.renderDefault(data);
                break;
        };
        this.send();
    }

    renderDefault(data) {
        this.subject = data.subject;
        this.html = defaultEmail
            .replace('{ username }', this.user.name)
            .replace('{ message }', data.message);
    }

    async send() {
        const transporter = nodemailer.createTransport({
            host: 'smtp-relay.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: functions.config().email.id,
                pass: functions.config().email.key,
            }
        });

        transporter.verify((err, success) => {
            if (err) {
                console.error('Error while verifying email transporter:', err);
            } else {
                console.log('Server is ready to take our message.');
            }
        });

        const info = await transporter.sendMail({
            from: '"Tutorbook" <notifications@tutorbook.app>',
            to: this.user.email,
            subject: this.subject,
            html: this.html,
        });
        console.log('Email sent:', info.messageId);
    }

    toString() {
        return 'Email to ' + this.user.name + ' <' + this.user.email + '>.';
    }

    renderNewRequest(request) { // Notifies tutor of a new request
        const summary = request.fromUser.name + ' wants you as a ' +
            request.toUser.type.toLowerCase() + ' for ' + request.subject +
            ' on ' + request.time.day + 's at ' + request.time.from +
            ' until ' + request.time.to + '.';
        this.subject = '[New Request] ' + request.fromUser.name.split(' ')[0] +
            ' wants you as a ' + request.toUser.type.toLowerCase() + ' for ' +
            request.subject;
        this.html = newRequestEmail
            .replace('{ username }', this.user.name.split(' ')[0])
            .replace('{ summary }', summary);
    }

    renderApprovedRequest(approvedRequest) { // Notifies pupil about new appts
        const request = approvedRequest.for;
        const approvedBy = approvedRequest.approvedBy;
        const summary = approvedBy.name + ' approved your lesson request. You' +
            ' now have tutoring appointments for ' + request.subject +
            ' with ' + request.toUser.name.split(' ')[0] + ' on ' +
            request.time.day + 's at the ' + request.location.name + ' from ' +
            request.time.from + ' until ' + request.time.to + '.';
        this.subject = '[Approved Request] ' + approvedBy.name.split(' ')[0] +
            ' approved your lesson request for ' + request.for.subject;
        this.html = requestApprovedEmail
            .replace('{ username }', this.user.name.split(' ')[0])
            .replace('{ summary }', summary);
    }

    renderWelcome() { // Renders welcome email (custom to user type)
        this.subject = 'Welcome to Tutorbook';
        switch (this.user.type) {
            case 'Tutor':
                this.subject += ' | Getting your first student';
                this.html = tutorEmail.replace('{ username }', this.user.name);
                break;
            case 'Pupil':
                this.subject += ' | Finding your perfect tutor';
                this.html = pupilEmail.replace('{ username }', this.user.name);
                break;
            case 'Supervisor':
                this.subject += ' | Managing your new location(s)';
                this.html = supervisorEmail
                    .replace('{ username }', this.user.name);
                break;
            default:
                this.subject += ' | Getting started';
                this.html = genericEmail
                    .replace('{ username }', this.user.name);
                break;
        };
    }
};


module.exports = Email;