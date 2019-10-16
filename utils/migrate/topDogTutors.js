const parse = require('csv-parse/lib/sync');
const fs = require('fs');
const ProgressBar = require('progress');
const admin = require('firebase-admin');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});


function deleteTutors(tutors) {
    const bar = new ProgressBar(':bar', {
        total: tutors.length
    });
    tutors.forEach((tutor) => {
        admin.firestore().collection('users').doc(tutor.email).delete()
            .then(() => {
                bar.tick();
            }).catch((err) => {
                console.error('[ERROR] ' + err.message);
            });
    });
};


function addToDB(tutors) {
    const bar = new ProgressBar(':bar', {
        total: tutors.length
    });
    tutors.forEach((tutor) => {
        admin.firestore().collection('users').doc(tutor.email).set(tutor)
            .then(() => {
                bar.tick();
            }).catch((err) => {
                console.error('[ERROR] ' + err.message);
            });
    });
};


function parseTutor(t) {
    return {
        name: t.first_name + ' ' + t.last_name,
        photo: (t.profile_img && t.profile_img !== '') ? 'https://topdogtutor' +
            's.com/sitecontent/profile_pics/' + t.profile_img : (t.gender === 'female') ? 'https://tutorbook.app/app/img/female.' +
            'png' : 'https://tutorbook.app/app/img/male.png',
        bio: t.education + ' ' + t.experience_qualifications + ' ' +
            t.hobbies_interests + ' I\'m available ' +
            t.available_at + '. And I can meet ' +
            t.meet_at + '.',
        subjects: t.subjects.split(', '),
        email: t.email,
        id: t.email,
        type: 'Tutor',
        grade: 'Adult',
        avgRating: 0,
        numRatings: 0,
        gender: t.gender.charAt(0).toUpperCase() +
            t.gender.substring(1, t.gender.length),
        located: {
            city: t.city,
            state: t.state_region,
            code: t.postcode_zipcode,
        },
        cards: {
            setupProfile: true,
            setupNotifications: true
        },
        config: {
            showPayments: true,
            showProfile: true,
        },
        proxy: [],
        availability: {
            'Gunn Academic Center': {
                Monday: [{
                    open: '2:45 PM',
                    close: '4:45 PM'
                }],
                Tuesday: [{
                    open: '3:45 PM',
                    close: '4:45 PM'
                }],
                Wednesday: [{
                    open: '3:05 PM',
                    close: '4:45 PM'
                }],
                Thursday: [{
                    open: '3:45 PM',
                    close: '4:45 PM'
                }],
                Friday: [{
                    open: '3:45 PM',
                    close: '4:45 PM'
                }],
            },
        },
        payments: {
            hourlyCharge: new Number(t.hourly_rate).valueOf(),
            hourlyChargeString: '$' + new Number(t.hourly_rate).toFixed(2),
            totalChargedString: '$0.00',
            totalCharged: 0,
            currentBalance: 0,
            currentBalanceString: '$0.00',
            type: 'Paid',
            policy: 'Hourly rate is $' + new Number(t.hourly_rate).toFixed(2) +
                ' per hour. Will accept ' +
                'lesson cancellations if given notice within 24 hours.' +
                ' No refunds will be issued unless covered by a Tutorbook ' +
                'guarantee.',
        },
        authenticated: true,
        secondsTutored: 0,
        secondsPupiled: 0,
    };
};


function getTutors(filename) {
    const file = fs.readFileSync(filename).toString();
    const tutors = parse(file, {
        columns: true,
    });
    console.log('[DEBUG] We have data for ' + tutors.length + ' tutors.');
    const result = [];
    tutors.forEach((tutor) => {
        result.push(parseTutor(tutor));
    });
    return result;
};


//deleteTutors(getTutors('./topdogtutors.csv'));
addToDB(getTutors('./topdogtutors.csv'));