const axios = require('axios');
const admin = require('firebase-admin');
const firestore = admin.firestore();
const partitions = {
  test: firestore.collection('partitions').doc('test'),
  default: firestore.collection('partitions').doc('default'),
};

const roundDate = (date, thresholdMins, rounding = 'Normally') => {
  const coeff = 1000 * 60 * thresholdMins;
  switch (rounding) {
    case 'Up':
      return new Date(Math.ceil(date.getTime() / coeff) * coeff);
    case 'Down':
      return new Date(Math.floor(date.getTime() / coeff) * coeff);
    default:
      return new Date(Math.round(date.getTime() / coeff) * coeff);
  }
};

const roundDuration = (secs, thresholdSecs, rounding = 'Normally') => {
  switch (rounding) {
    case 'Up':
      return Math.ceil(secs / thresholdSecs) * thresholdSecs;
    case 'Down':
      return Math.floor(secs / thresholdSecs) * thresholdSecs;
    default:
      return Math.round(secs / thresholdSecs) * thresholdSecs;
  }
};

const getRules = async (locationId, isTest) => {
  const db = isTest ? partitions.test : partitions.default;
  const doc = await db.collection('locations').doc(locationId).get();
  if (!doc.exists)
    return console.error(
      '[ERROR] Could not get rounding ' +
        'rules b/c location (' +
        locationId +
        ') did not exist.'
    );
  return doc.data().config.hrs;
};

const secsDuration = (cIn, cOut) => (cOut - cIn) / 1000;

const roundHours = async (appt, context) => {
  // Rounds appt clockIn/Out times
  // 0) Validate the location's rounding rules and set defaults
  const isTest = context.params.partition === 'test';
  const db = isTest ? partitions.test : partitions.default;
  const a = appt.data();
  if (!a.clockOut)
    return console.error(
      '[ERROR] Cannot round hours for ' + 'appt w/out clockOut data.'
    );
  if (!a.clockIn)
    return console.error(
      '[ERROR] Cannot round hours for appt' + 'w/out clockIn data.'
    );
  const rules = await getRules(a.location.id, isTest);
  const thresholdSecs = {
    Minute: 60,
    '5 Minutes': 5 * 60,
    '15 Minutes': 15 * 60,
    '30 Minutes': 30 * 60,
    Hour: 60 * 60,
  };
  const threshs = ['Minute', '5 Minutes', '15 Minutes', '30 Minutes', 'Hour'];
  const roundings = ['Up', 'Down', 'Normally'];
  if (threshs.indexOf(rules.threshold) < 0) rules.threshold = threshs[0];
  if (roundings.indexOf(rules.rounding) < 0) rules.rounding = roundings[0];
  // 1) Round duration up/down/normally to threshold
  const roundedDurationSecs = roundDuration(
    secsDuration(
      a.clockIn.sentTimestamp.toDate(),
      a.clockOut.sentTimestamp.toDate()
    ),
    thresholdSecs[rules.threshold],
    rules.rounding
  );
  console.log('[DEBUG] Rounded duration in minutes:', roundedDurationSecs / 60);
  // 2) Round clockIn time to timeThreshold
  const roundedClockInDate = roundDate(
    a.clockIn.sentTimestamp.toDate(),
    thresholdSecs[rules.timeThreshold] / 60
  );
  console.log(
    '[DEBUG] Unrounded clock-in date:',
    a.clockIn.sentTimestamp.toDate().toLocaleTimeString('en-US', {
      timeZone: 'America/Los_Angeles',
    })
  );
  console.log(
    '[DEBUG] Rounded clock-in date:',
    roundedClockInDate.toLocaleTimeString('en-US', {
      timeZone: 'America/Los_Angeles',
    })
  );
  // 3) Add rounded duration to rounded clockIn time to get clockOut time
  const roundedClockOutDate = new Date(
    roundedClockInDate.getTime() + roundedDurationSecs * 1000
  );
  console.log(
    '[DEBUG] Unrounded clock-out date:',
    a.clockOut.sentTimestamp.toDate().toLocaleTimeString('en-US', {
      timeZone: 'America/Los_Angeles',
    })
  );
  console.log(
    '[DEBUG] Rounded clock-out date:',
    roundedClockOutDate.toLocaleTimeString('en-US', {
      timeZone: 'America/Los_Angeles',
    })
  );
  // 4) Update appt clockIn and clockOut dates
  a.clockIn.roundedTimestamp = roundedClockInDate;
  a.clockOut.roundedTimestamp = roundedClockOutDate;
  await appt.ref.update(a);
  console.log('[DEBUG] Updated past appt (' + appt.ref.path + ').');
  return a;
};

const updateHours = async (appt, context) => {
  const isTest = context.params.partition === 'test';
  const db = isTest ? partitions.test : partitions.default;
  if (!appt.data().clockOut)
    return console.error(
      '[ERROR] Cannot update ' + 'hours for appt w/out clockOut data.'
    );
  if (!appt.data().clockIn)
    return console.error(
      '[ERROR] Cannot update ' + 'hours for appt w/out clockIn data.'
    );
  const a = await roundHours(appt, context);
  const durationInSecs = secsDuration(
    a.clockIn.roundedTimestamp,
    a.clockOut.roundedTimestamp
  );
  const user = (
    await db.collection('users').doc(context.params.user).get()
  ).data();

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
      return console.warn(
        '[WARNING] Could not update hours for (' +
          user.type +
          ') invalid user type.'
      );
  }

  console.log(
    '[DEBUG] Updating (' + user.type + ') seconds for ' + user.name + '...'
  );
  await db.collection('users').doc(context.params.user).update(user);
  console.log('[DEBUG] Updating service hour sheet...');
  await axios({
    method: 'get',
    url: 'https://us-central1-tutorbook-779d8.cloudfunctions.net/updateSheet',
    params: {
      location: user.location || 'Any',
    },
  });
  console.log(
    '[INFO] Updated ' +
      user.name +
      "'s service hours on db and " +
      'service hours sheet.'
  );
};

module.exports = {
  update: updateHours,
  round: roundHours,
};
