// This is a script to migrate the data of the current user base into a data
// structure that will function with the new app developments.

const admin = require('firebase-admin');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});

const firestore = admin.firestore();

// Main helper function that takes in an old userProfile and parses it
// into the new data structure (see below map).
function parseUserProfile(profile) {
  const user = {
    authenticated: getAuth(profile),
    name: profile.displayName || profile.name || '',
    uid: profile.uid || '',
    photo: profile.photoURL || profile.photo || '',
    id: profile.email || '', // Right now, we just use email for id
    email: profile.email || '',
    phone: profile.phone || '',
    type: profile.type || '',
    gender: profile.gender || '',
    grade: profile.gradeString || getGradeString(profile.grade) || '',
    bio: profile.bio || '',
    avgRating: profile.avgRating || 0,
    numRatings: profile.numRatings || 0,
    subjects: getUserSubjects(profile) || [],
    cards: profile.cards || {
      setupNotifications: true,
    },
    availability: profile.availability || getAvailability(profile) || {},
    payments: profile.payments || {
      hourlyChargeString: '$25.00',
      hourlyCharge: 25,
      totalChargedString: '$0.00',
      totalCharged: 0,
      currentBalance: 0,
      currentBalanceString: '$0.00',
      type: 'Free',
    },
    secondsTutored: profile.secondsTutored || 0,
    secondsPupiled: profile.secondsPupiled || 0,
  };
  return user;
}

// Helper function that returns whether or not a profile is verified (i.e. all
// tutors and pupils are verified, all supervisors and admins are not)
function getAuth(profile) {
  switch (profile.type) {
    case 'Tutor':
      return true;
    case 'Pupil':
      return true;
    case '':
      profile.type = 'Pupil';
      return true;
    default:
      console.warn(
        '[WARNING] User ' +
          profile.email +
          ' with type ' +
          profile.type +
          ' is not authenticated.'
      );
      return false;
  }
}

// Helper function that returns a string an hour away from the original string
function getHourAwayFrom(time) {
  const periods = [
    'A Period',
    'B Period',
    'C Period',
    'D Period',
    'E Period',
    'F Period',
    'G Period',
    'Flex',
  ];
  if (periods.indexOf(time) >= 0) {
    console.log('[DEBUG] Time given was a period, returning time:', time);
    return time;
  }
  // First, iterate over 'AM' vs 'PM'
  var timeStrings = [];
  ['AM', 'PM'].forEach((suffix) => {
    // NOTE: 12:00 AM and 12:00 PM are wierd (as they occur after the
    // opposite suffix) so we have to append them differently
    for (var min = 0; min < 60; min++) {
      // Add an extra zero for values less then 10
      if (min < 10) {
        var minString = '0' + min.toString();
      } else {
        var minString = min.toString();
      }
      timeStrings.push('12:' + minString + ' ' + suffix);
    }

    // Next, iterate over every hour value in a 12 hour period
    for (var hour = 1; hour < 12; hour++) {
      // Finally, iterate over every minute value in an hour
      for (var min = 0; min < 60; min++) {
        // Add an extra zero for values less then 10
        if (min < 10) {
          var minString = '0' + min.toString();
        } else {
          var minString = min.toString();
        }
        timeStrings.push(hour + ':' + minString + ' ' + suffix);
      }
    }
  });

  try {
    return timeStrings[timeStrings.indexOf(time) + 60];
  } catch (e) {
    console.warn(
      '[WARNING] Error while returning timeString at index ' +
        (timeStrings.indexOf(time) + 60) +
        ':',
      e
    );
    return time;
  }
}

// Helper function that returns a user's availability based on their profile
function getAvailability(profile) {
  // NOTE: Availability is stored in the Firestore database as:
  // availability: {
  //   Gunn Library: {
  //     Friday: [
  //       { open: '10:00 AM', close: '3:00 PM' },
  //       { open: '10:00 AM', close: '3:00 PM' },
  //     ],
  //   }
  //   ...
  // };
  const availability = {};
  // NOTE: This logic assumes that for every one of the locations, the
  // user has the same availability.
  profile.availableLocations.forEach((location) => {
    availability[location] = {};
    profile.availableTimes.forEach((time) => {
      // NOTE: This logic assumes that each of those available
      // times was an hour long slot
      try {
        availability[location][time.day].push({
          open: time.time,
          close: getHourAwayFrom(time.time),
        });
      } catch (e) {
        availability[location][time.day] = [];
        availability[location][time.day].push({
          open: time.time,
          close: getHourAwayFrom(time.time),
        });
      }
    });
  });
  console.log(
    '[DEBUG] Parsed availability for ' + profile.email + ':',
    availability
  );
  console.log('[DEBUG] From ' + profile.name + "'s profile data:", profile);
  return availability;
}

// Helper function that returns a gradeString given a grade
function getGradeString(grade) {
  switch (grade) {
    case 9:
      return 'Freshman';
    case 10:
      return 'Sophomore';
    case 11:
      return 'Junior';
    case 12:
      return 'Senior';
    default:
      return '' + grade;
  }
}

// Helper function that filters out duplicates given an array
function filterSubjects(subjects) {
  var result = [];
  subjects.forEach((subject) => {
    if (result.indexOf(subject) < 0) {
      result.push(subject);
    }
  });
  return result;
}

// Helper function that returns the correct subjects given a profile
function getUserSubjects(profile) {
  var result;
  if (!!profile.subjects && profile.subjects !== []) {
    result = filterSubjects(profile.subjects);
    console.log(
      '[DEBUG] User ' + profile.email + ' already had subjects:',
      result
    );
    return result;
  }
  switch (profile.type) {
    case 'Tutor':
      result = filterSubjects(profile.proficientStudies);
      console.log(
        '[DEBUG] User ' +
          profile.email +
          ' was a tutor, returning proficientStudies:',
        result
      );
      return result || [];
    case 'Pupil':
      result = filterSubjects(profile.neededStudies);
      console.log(
        '[DEBUG] User ' +
          profile.email +
          ' was a pupil, returning neededStudies:',
        result
      );
      return result || [];
    default:
      console.warn(
        '[WARNING] User ' +
          profile.email +
          ' had an invalid type, returning empty:',
        profile.type
      );
      return [];
  }
}

// Main function that grabs all the user's profile documents and rewrites them
// with the correct data structures.
function updateUserProfiles() {
  return firestore
    .collection('users')
    .get()
    .then((snapshot) => {
      snapshot.forEach((doc) => {
        const id = doc.id;
        const profile = doc.data();
        console.log('[INFO] Updating ' + id + "'s user profile...");
        const user = parseUserProfile(profile);
        return firestore
          .collection('users')
          .doc(id)
          .set(user)
          .then(() => {
            console.log(
              '[INFO] Successfully updated ' + id + "'s user profile document."
            );
          });
      });
    });
}

// Run the migration
if (true) {
  console.log('[INFO] Starting user profile migration...');
  updateUserProfiles();
}
