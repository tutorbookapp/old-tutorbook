const admin = require('firebase-admin');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});

const db = admin.firestore().collection('partitions').doc('default');

const doToAllUsers = async (func) => {
    return Promise.all((await db
        .collection('users')
        .get()
    ).docs.map((doc) => func(doc)));
};

// Adds a 'booked' field to every availability window on the given user by:
// 1) Getting the user's appointments
// 2) Changing 'booked' to false for every appointment's time field
const updateAvailability = async (doc, debug) => {
    // Availability is stored in Firestore as:
    // 'Gunn Academic Center': {
    //   'Monday': [
    //     {
    //       open: '2:45 PM',
    //       close: '3:45 PM', 
    //       booked: false,
    //     },
    //     {
    //       open: 'A Period',
    //       close: 'A Period',
    //       booked: true,
    //     },
    //   ],
    // },
    const appts = (await doc.ref.collection('appointments').get()).docs;
    const bookedAvailability = {};
    appts.forEach((apptDoc) => {
        const appt = apptDoc.data();
        if (!bookedAvailability[appt.location.name])
            bookedAvailability[appt.location.name] = {};
        if (!bookedAvailability[appt.location.name][appt.time.day])
            bookedAvailability[appt.location.name][appt.time.day] = [];
        if (bookedAvailability[appt.location.name][appt.time.day].findIndex(t =>
                t.open === appt.time.from &&
                t.close === appt.time.to
            ) >= 0) return;
        bookedAvailability[appt.location.name][appt.time.day].push({
            open: appt.time.from,
            close: appt.time.to,
            booked: true,
        });
        if (debug) console.log('[DEBUG] Added ' + appt.location.name +
            ' timeslot (' + appt.time.day + 's at ' + appt.time.from + ' to ' +
            appt.time.to + ') to booked availability.');
    });
    Object.entries(doc.data().availability || {}).forEach((loc) => {
        // Iterate over locations in user's existing availability
        if (!bookedAvailability[loc[0]]) bookedAvailability[loc[0]] = {};
        // Iterate over days in each location
        Object.entries(loc[1]).forEach((day) => {
            if (!bookedAvailability[loc[0]][day[0]])
                bookedAvailability[loc[0]][day[0]] = [];
            // Iterate over timeslots in each day in each location
            day[1].forEach((timeslot) => {
                if (bookedAvailability[loc[0]][day[0]].findIndex(t =>
                        t.open === timeslot.open &&
                        t.close === timeslot.close
                    ) < 0) {
                    // User does not have an appt at this timeslot, add it to 
                    // bookedAvailability as an unbooked timeslot.
                    bookedAvailability[loc[0]][day[0]].push({
                        open: timeslot.open,
                        close: timeslot.close,
                        booked: false,
                    });
                    if (debug) console.log('[DEBUG] Added ' + loc[0] + ' ' +
                        'timeslot (' + day[0] + 's at ' + timeslot.open + ' ' +
                        'to ' + timeslot.close + ') to unbooked availability.');
                }
            });
        });
    });
    console.log('[INFO] Updated ' + doc.data().name + ' (' + doc.id + ')\'s ' +
        'availability.');
    return doc.ref.update({
        availability: bookedAvailability,
    });
};

const main = () => {
    return doToAllUsers(updateAvailability);
};

const test = async () => {
    return updateAvailability((await db
        .collection('users')
        .doc('HBnt90xkbOW9GMZGJCacbqnK2hI3')
        .get()
    ));
};

main();