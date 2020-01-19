const functions = require('firebase-functions');
const nodemailer = require('nodemailer');
const to = require('await-to-js').default;
const fs = require('fs');

// Welcome email templates
const tutorEmail = fs.readFileSync('./html/tutor.html').toString();
const paidTutorEmail = fs.readFileSync('./html/paidTutor.html').toString();
const pupilEmail = fs.readFileSync('./html/pupil.html').toString();
const supervisorEmail = fs.readFileSync('./html/supervisor.html').toString();
const genericEmail = fs.readFileSync('./html/generic.html').toString();

// Other email templates
const newRequestEmail =
    fs.readFileSync('./html/newRequest.html').toString();
const requestApprovedEmail =
    fs.readFileSync('./html/approvedRequest.html').toString();
const rulesEmail = fs.readFileSync('./html/rules.html').toString();
const defaultEmail = fs.readFileSync('./html/default.html').toString();

// Class that manages email templates
class Email {

    constructor(type, user, data, location) {
        this.user = user;
        if (this.valid(user, location)) {
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
                case 'rules':
                    this.renderRules(data);
                    break;
                default:
                    this.renderDefault(data);
                    break;
            };
            this.send();
        }
    }

    valid(user, location) {
        if ([
                'Gunn Academic Center',
                'JLS Library',
                'Any',
            ].indexOf(location || user.location) < 0) return console.error(
            '[ERROR] Cannot send SMS to ' + (location || user.location) +
            ' users.');
        if (!user || !user.email) return console.error('[ERROR] Cannot send ' +
            'to undefined email addresses.');
        return true;
    }

    renderDefault(data) {
        if (!data.message || !data.subject) return console.error('[ERROR] ' +
            'Email needs a subject and a message.');
        if (!this.user.name) return console.error('[ERROR] User must have a ' +
            'valid name.');
        this.subject = data.subject;
        this.html = defaultEmail
            .replace('{ username }', this.user.name)
            .replace('{ message }', data.message);
    }

    async send() {
        if (!this.user || !this.user.email) return console.error('[ERROR] ' +
            'Cannot send to undefined email addresses.');
        const transporter = nodemailer.createTransport({
            host: 'smtp-relay.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: functions.config().email.id,
                pass: functions.config().email.key,
            }
        });

        const [err, res] = await to(transporter.verify());
        if (err) return console.error('[ERROR] Could not verify email ' +
            'transporter b/c of ' + err.message);

        const [error, info] = await to(transporter.sendMail({
            from: '"Tutorbook" <notifications@tutorbook.app>',
            to: this.user.email,
            subject: this.subject,
            html: this.html,
        }));
        if (error) return console.error('[ERROR] Could not send email b/c of ' +
            error.message);
        console.log('[DEBUG] Email (' + info.messageId + ') sent.');
    }

    toString() {
        return 'Email to ' + this.user.name + ' <' + this.user.email + '>.';
    }

    renderNewRequest(request) { // Notifies tutor of a new request
        if (!this.user.name) return console.error('[ERROR] User needs a valid' +
            ' name.');
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
        if (!this.user.name) return console.error('[ERROR] User needs a valid' +
            ' name.');
        const request = approvedRequest.for;
        const approvedBy = approvedRequest.approvedBy;
        const summary = approvedBy.name + ' approved your lesson request. You' +
            ' now have tutoring appointments for ' + request.subject +
            ' with ' + request.toUser.name.split(' ')[0] + ' on ' +
            request.time.day + 's at the ' + request.location.name + ' from ' +
            request.time.from + ' until ' + request.time.to + '.';
        this.subject = '[Approved Request] ' + approvedBy.name.split(' ')[0] +
            ' approved your lesson request for ' + request.subject;
        this.html = requestApprovedEmail
            .replace('{ username }', this.user.name.split(' ')[0])
            .replace('{ summary }', summary);
    }

    renderRules(data) {
        const request = data.appt.for;
        const vars = {
            summary: 'You now have tutoring appointments for ' +
                request.subject + ' with ' + ((this.user.email !==
                        request.toUser.email) ?
                    request.toUser.name.split(' ')[0] :
                    request.fromUser.name.split(' ')[0]) +
                ' on ' + request.time.day + 's at the ' + request.location.name +
                ' from ' + request.time.from + ' until ' + request.time.to + '.',
            tutor: data.tutor.name.split(' ')[0],
            tutorPhone: data.tutor.phone || 'No Phone',
            tutorEmail: data.tutor.email || 'No Email',
            pupil: data.pupil.name.split(' ')[0],
            pupilPhone: data.pupil.phone || 'No Phone',
            pupilEmail: data.pupil.email || 'No Email',
            supervisor: data.supervisor.name.split(' ')[0],
            supervisorPhone: data.supervisor.phone || 'No Phone',
            supervisorEmail: data.supervisor.email || 'No Email',
            location: request.location.name,
        }
        this.subject = '[Important] ' + request.location.name + ' Policy';
        this.html = this.render(vars, rulesEmail);
    }

    render(vars, html) {
        String.prototype.replaceAll = function(search, replacement) {
            var target = this;
            return target.replace(new RegExp(search, 'g'), replacement);
        };
        Object.entries(vars).forEach((variable) => {
            html = html.replaceAll('{ ' + variable[0] + ' }', variable[1]);
        });
        return html;
    }

    renderWelcome() { // Renders welcome email (custom to user type)
        if (!this.user.name) return console.error('[ERROR] User needs a valid' +
            ' name.');
        this.subject = 'Welcome to Tutorbook';
        switch (this.user.type) {
            case 'Tutor':
                if (this.user.payments.type === 'Paid') {
                    this.subject += ' | Getting paid by your first student';
                    this.html = paidTutorEmail.replace('{ username }', this.user.name);
                } else {
                    this.subject += ' | Getting your first student';
                    this.html = tutorEmail.replace('{ username }', this.user.name);
                }
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