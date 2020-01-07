const axios = require('axios');
const admin = require('firebase-admin');
const db = admin.firestore().collection('partitions').doc('default');

const updateHours = async (appt, context) => {
    const durationInSecs = (appt.data().clockOut.sentTimestamp.toDate() -
        appt.data().clockIn.sentTimestamp.toDate()) / 1000;
    const user = (await db.collection('users')
        .doc(context.params.user).get()).data();

    switch (user.type) {
        case 'Tutor':
            user.secondsTutored = user.secondsTutored || 0;
            user.secondsTutored += durationInSecs;
            break;
        case 'Pupil':
            user.secondsPupiled = user.secondsPupiled || 0;
            user.secondsPupiled += durationInSecs;
            break;
        default:
            return console.warn('Could not update hours for (' + user.type +
                ') invalid user type.');
    }

    console.log('Updating (' + user.type + ') seconds for ' + user.name + '...');
    await db.collection('users').doc(context.params.user)
        .update(user);
    console.log('Updating service hour sheet...');
    await axios({
        method: 'get',
        url: 'https://us-central1-tutorbook-779d8.cloudfunctions.net/updateSheet',
        params: {
            location: user.location || 'Any',
        },
    });
    console.log('Updated ' + user.name + '\'s service hours on db and sheet.');
};

module.exports = updateHours;