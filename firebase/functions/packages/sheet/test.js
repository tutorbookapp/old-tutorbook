const admin = require('firebase-admin');
const serviceAccount = require('./admin-cred.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});

const Sheet = require('./sheet.js');
const to = require('await-to-js').default;

// Manages service hour tracking sheet for supervisors
function parseDate(timestamp) {
  const date = timestamp.toDate();
  return date.getMonth() + '/' + date.getDate() + '/' + date.getFullYear();
}

function getDurationStringFromSecs(secs) {
  // See: https://www.codespeedy.com/convert-seconds-to-hh-mm-ss-format-
  // in-javascript/
  const time = new Date(null);
  time.setSeconds(secs);
  return time.toISOString().substr(11, 8);
}

// Update spreadsheet when we get a new pastAppt
async function updateGoogleSheet() {
  const db = admin.firestore().collection('partitions').doc('default');
  const userSnap = await db
    .collection('users')
    .where('type', '==', 'Tutor')
    .orderBy('name')
    .get();
  const users = [];
  const sheetVals = [];
  userSnap.forEach((doc) => {
    users.push(doc);
  });
  for (var i = 0; i < users.length; i++) {
    var startDate = '1/1/2019';
    var endDate = '1/1/2019';
    var profile = users[i].data();
    var name = profile.name;
    var grade = profile.grade;
    var serviceHours = getDurationStringFromSecs(profile.secondsTutored);

    var firstAppt = await users[i].ref
      .collection('pastAppointments')
      .orderBy('clockOut.sentTimestamp', 'asc')
      .limit(1)
      .get();
    firstAppt.forEach((doc) => {
      startDate = parseDate(doc.data().clockOut.sentTimestamp);
    });

    var lastAppt = await users[i].ref
      .collection('pastAppointments')
      .orderBy('clockOut.sentTimestamp', 'desc')
      .limit(1)
      .get();
    lastAppt.forEach((doc) => {
      endDate = parseDate(doc.data().clockOut.sentTimestamp);
    });

    sheetVals.push([name, grade, serviceHours, startDate, endDate]);
  }
  return new Sheet().write(sheetVals);
}

updateGoogleSheet();
