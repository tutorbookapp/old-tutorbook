const to = require('await-to-js').default;
const cliProgress = require('cli-progress');
const admin = require('firebase-admin');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});

const db = admin.firestore().collection('partitions').doc('default');
const auth = admin.auth();

const addUIDs = async () => {
  const locations = (await db.collection('locations').get()).docs;
  for (locationDoc of locations) {
    console.log('');
    console.log('========================================================');
    console.log(
      '[INFO] Processing appts from the ' + locationDoc.data().name + '...'
    );
    const locationRef = locationDoc.ref;
    const appts = (await locationRef.collection('appointments').get()).docs;
    const apptsBar = new cliProgress.SingleBar({}, cliProgress.Presets.legacy);
    const canceledAppts = (
      await locationRef.collection('canceledAppointments').get()
    ).docs;
    const canceledApptsBar = new cliProgress.SingleBar(
      {},
      cliProgress.Presets.legacy
    );
    const modifiedAppts = (
      await locationRef.collection('modifiedAppointments').get()
    ).docs;
    const modifiedApptsBar = new cliProgress.SingleBar(
      {},
      cliProgress.Presets.legacy
    );
    console.log(
      '[INFO] Adding uIDs to ' +
        appts.length +
        ' appts from ' +
        'the ' +
        locationDoc.data().name +
        '...'
    );
    var count = 0;
    apptsBar.start(appts.length, 0);
    await Promise.all(
      appts.map(async (apptDoc) => {
        // Ensure that every appt's attendees contain valid uIDs.
        const appt = apptDoc.data();
        await Promise.all(
          appt.attendees.map(async (attendee) => {
            if (!attendee.uid) {
              const [err, user] = await to(
                auth.getUserByEmail(attendee.email || attendee.id)
              );
              if (err)
                return console.warn(
                  '[WARNING] Could not get ' +
                    'user (' +
                    attendee.id +
                    ') uID, skipping...'
                );
              attendee.uid = user.uid;
              if (appt.for.toUser.id === attendee.id)
                appt.for.toUser.uid = user.uid;
              if (appt.for.fromUser.id === attendee.id)
                appt.for.fromUser.uid = user.uid;
            }
          })
        );
        await apptDoc.ref.update(appt);
        count++;
        apptsBar.update(count);
      })
    );
    apptsBar.stop();
    count = 0;
    console.log(
      '[INFO] Adding uIDs to ' +
        canceledAppts.length +
        ' canceledAppts from the ' +
        locationDoc.data().name +
        '...'
    );
    canceledApptsBar.start(canceledAppts.length, 0);
    await Promise.all(
      canceledAppts.map(async (apptDoc) => {
        // Ensure that every appt's attendees contain valid uIDs.
        const appt = apptDoc.data();
        if (!appt.canceledBy.uid) {
          const [err, user] = await to(
            auth.getUserByEmail(appt.canceledBy.email || appt.canceledBy.id)
          );
          if (err)
            return console.warn(
              '[WARNING] Could not get ' +
                'user (' +
                appt.canceledBy.id +
                ') uID, skipping...'
            );
          appt.canceledBy.uid = user.uid;
        }
        await Promise.all(
          appt.for.attendees.map(async (attendee) => {
            if (!attendee.uid) {
              const [err, user] = await to(
                auth.getUserByEmail(attendee.email || attendee.id)
              );
              if (err)
                return console.warn(
                  '[WARNING] Could not get ' +
                    'user (' +
                    attendee.id +
                    ') uID, skipping...'
                );
              attendee.uid = user.uid;
              if (appt.for.for.toUser.id === attendee.id)
                appt.for.for.toUser.uid = user.uid;
              if (appt.for.for.fromUser.id === attendee.id)
                appt.for.for.fromUser.uid = user.uid;
            }
          })
        );
        await apptDoc.ref.update(appt);
        count++;
        canceledApptsBar.update(count);
      })
    );
    canceledApptsBar.stop();
    count = 0;
    console.log(
      '[INFO] Adding uIDs to ' +
        modifiedAppts.length +
        ' modifiedAppts from the ' +
        locationDoc.data().name +
        '...'
    );
    modifiedApptsBar.start(modifiedAppts.length, 0);
    await Promise.all(
      modifiedAppts.map(async (apptDoc) => {
        // Ensure that every appt's attendees contain valid uIDs.
        const appt = apptDoc.data();
        if (!appt.modifiedBy.uid) {
          const [err, user] = await to(
            auth.getUserByEmail(appt.modifiedBy.email || appt.modifiedBy.id)
          );
          if (err)
            return console.warn(
              '[WARNING] Could not get ' +
                'user (' +
                appt.modifiedBy.id +
                ') uID, skipping...'
            );
          appt.modifiedBy.uid = user.uid;
        }
        await Promise.all(
          appt.for.attendees.map(async (attendee) => {
            if (!attendee.uid) {
              const [err, user] = await to(
                auth.getUserByEmail(attendee.email || attendee.id)
              );
              if (err)
                return console.warn(
                  '[WARNING] Could not get ' +
                    'user (' +
                    attendee.id +
                    ') uID, skipping...'
                );
              attendee.uid = user.uid;
              if (appt.for.for.toUser.id === attendee.id)
                appt.for.for.toUser.uid = user.uid;
              if (appt.for.for.fromUser.id === attendee.id)
                appt.for.for.fromUser.uid = user.uid;
            }
          })
        );
        await apptDoc.ref.update(appt);
        count++;
        modifiedApptsBar.update(count);
      })
    );
    modifiedApptsBar.stop();
  }
};

const copyAppts = async () => {
  const locations = (await db.collection('locations').get()).docs;
  for (locationDoc of locations) {
    console.log('');
    console.log('========================================================');
    console.log(
      '[INFO] Copying appts from the ' + locationDoc.data().name + '...'
    );
    const locationRef = locationDoc.ref;
    const appts = (await locationRef.collection('appointments').get()).docs;
    const canceledAppts = (
      await locationRef.collection('canceledAppointments').get()
    ).docs;
    const modifiedAppts = (
      await locationRef.collection('modifiedAppointments').get()
    ).docs;
    const bar = new cliProgress.SingleBar({}, cliProgress.Presets.legacy);
    bar.start(appts.length + canceledAppts.length + modifiedAppts.length, 0);
    var count = 0;
    for (appt of appts) {
      await Promise.all(
        appt.data().attendees.map(async (attendee) => {
          if (!attendee.uid)
            return console.warn(
              '[WARNING] No uID for ' +
                'attendee (' +
                attendee.id +
                '), skipping...'
            );
          const ref = db
            .collection('users')
            .doc(attendee.uid)
            .collection('appointments')
            .doc(appt.id);
          const doc = await ref.get();
          if (doc.exists)
            return console.log(
              '[DEBUG] Found appt (' + appt.id + ') doc, skipping recreation...'
            );
          await ref.set(appt.data());
        })
      );
      count++;
      bar.update(count);
    }
    for (appt of canceledAppts) {
      await Promise.all(
        appt.data().for.attendees.map(async (attendee) => {
          if (!attendee.uid)
            return console.warn(
              '[WARNING] No uID for ' +
                'attendee (' +
                attendee.id +
                '), skipping...'
            );
          const ref = db
            .collection('users')
            .doc(attendee.uid)
            .collection('canceledAppointments')
            .doc(appt.id);
          const doc = await ref.get();
          if (doc.exists)
            return console.log(
              '[DEBUG] Found appt (' + appt.id + ') doc, skipping recreation...'
            );
          await ref.set(appt.data());
        })
      );
      count++;
      bar.update(count);
    }
    for (appt of modifiedAppts) {
      await Promise.all(
        appt.data().for.attendees.map(async (attendee) => {
          if (!attendee.uid)
            return console.warn(
              '[WARNING] No uID for ' +
                'attendee (' +
                attendee.id +
                '), skipping...'
            );
          const ref = db
            .collection('users')
            .doc(attendee.uid)
            .collection('modifiedAppointments')
            .doc(appt.id);
          const doc = await ref.get();
          if (doc.exists)
            return console.log(
              '[DEBUG] Found appt (' + appt.id + ') doc, skipping recreation...'
            );
          await ref.set(appt.data());
        })
      );
      count++;
      bar.update(count);
    }
    bar.stop();
    console.log(
      '[INFO] Processed ' +
        count +
        ' appts from the ' +
        locationDoc.data().name +
        '.'
    );
  }
};

const main = async () => {
  await addUIDs();
  await copyAppts();
};

main();
