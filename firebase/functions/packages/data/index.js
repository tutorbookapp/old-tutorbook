const phone = require('phone');
const to = require('await-to-js').default;
const admin = require('firebase-admin');
const assert = require('assert');
const cors = require('cors')({
    origin: true,
});

const Stats = require('stats');

// Recieves a user, an action, and (optional) data. Performs requested action
// (using the below `Data` class) and sends snackbar message response.
class DataProxy {
    constructor(user, token, action, data) {
        assert(token.email === user.email);
        assert(token.uid === user.uid);
        ['name', 'email', 'id', 'type', 'uid'].forEach((attr) => {
            if (!user[attr] || user[attr] === '')
                throw new Error('User did not have a valid ' + attr + '.');
        });
        ['photo', 'grade', 'gender', 'payments', 'proxy'].forEach((attr) => {
            if (!user[attr] || user[attr] === '')
                console.warn('[WARNING] User did not have a valid ' + attr +
                    ', falling back to default...');
        });
        global.app = {
            user: user,
            conciseUser: {
                name: user.name,
                email: user.email,
                id: user.id,
                uid: user.uid,
                photo: user.photo || 'https://tutorbook.app/app/img/' +
                    ((user.gender === 'Female') ? 'female.png' : 'male.png'),
                type: user.type,
                grade: user.grade || 'Sophomore',
                gender: user.gender || 'Male',
                hourlyCharge: (user.payments && user.payments.hourlyCharge) ?
                    user.payments.hourlyCharge : 0,
                payments: user.payments || {
                    hourlyCharge: 0,
                    type: 'Free',
                },
                proxy: user.proxy || [],
            },
        };
        this.action = action;
        this.data = data;
        this.token = token;
        this.user = user;
    }

    async act() {
        const action = this.action;
        const data = this.data;
        const token = this.token;
        const user = this.user;
        const exists = async (collec, id, c = 'users', i = user.uid) => {
            const doc = await global.db.collection(c).doc(i).collection(collec)
                .doc(id).get();
            console.log('[DEBUG] Does ' + c + ' doc (' + i + ') have a(n) ' +
                collec + ' doc (' + id + ')?', (doc.exists) ? 'Yes.' : 'No, ' +
                'erroring.');
            assert(doc.exists);
        };
        switch (action) {
            case 'createLocation':
                assert(token.supervisor);
                return Data.createLocation(data.location, data.id);
            case 'updateLocation':
                assert(token.supervisor && token.locations.indexOf(data.id) >=
                    0);
                return Data.updateLocation(data.location, data.id);
            case 'deleteLocation':
                assert(token.supervisor && token.locations.indexOf(data.id) >=
                    0);
                return Data.deleteLocation(data.id);
            case 'createProxyUser':
                assert(token.supervisor);
                return Data.createProxyUser(data.user);
            case 'createUser':
                assert(token.uid === data.uid || token.supervisor);
                return Data.createUser(data);
            case 'newRequest':
                assert(token.uid === data.request.fromUser.uid ||
                    token.supervisor);
                return Data.newRequest(data.request, data.payment);
            case 'requestPayout':
                assert(user.type === 'Tutor' && user.payments.type === 'Paid');
                return Data.requestPayout();
            case 'requestPaymentFor':
                assert([
                        data.appt.attendees[0].uid,
                        data.appt.attendees[1].uid,
                    ].indexOf(token.uid) >= 0 &&
                    user.type === 'Tutor' &&
                    user.payments.type === 'Paid' &&
                    data.appt.for.payment.type === 'Paid'
                );
                await exists('appointments', data.id);
                return Data.requestPaymentFor(data.appt, data.id);
            case 'approvePayment':
                assert(user.type === 'Pupil');
                await exists('appointments', data.id);
                return Data.approvePayment(data.approvedPayment, data.id);
            case 'denyPayment':
                assert(user.type === 'Pupil');
                await exists('appointments', data.id);
                return Data.denyPayment(data.deniedPayment, data.id);
            case 'instantClockIn':
                assert(token.supervisor);
                return Data.instantClockIn(data.appt, data.id);
            case 'instantClockOut':
                assert(token.supervisor);
                return Data.instantClockOut(data.appt, data.id);
            case 'rejectClockIn':
                assert(token.supervisor);
                await exists('clockIns', data.id, 'locations', data.clockIn.for
                    .location.id);
                return Data.rejectClockIn(data.clockIn, data.id);
            case 'approveClockIn':
                assert(token.supervisor);
                await exists('clockIns', data.id, 'locations', data.clockIn.for
                    .location.id);
                return Data.approveClockIn(data.clockIn, data.id);
            case 'rejectClockOut':
                assert(token.supervisor);
                await exists('clockOuts', data.id, 'locations', data.clockOut
                    .for.location.id);
                return Data.rejectClockOut(data.clockOut, data.id);
            case 'approveClockOut':
                assert(token.supervisor);
                await exists('clockOuts', data.id, 'locations', data.clockOut
                    .for.location.id);
                return Data.approveClockOut(data.clockOut, data.id);
            case 'clockIn':
                assert(user.type === 'Tutor' || token.supervisor);
                if (!token.supervisor) await exists('appointments', data.id);
                return Data.clockIn(data.appt, data.id);
            case 'clockOut':
                assert(user.type === 'Tutor' || token.supervisor);
                if (!token.supervisor) await exists('activeAppointments', data.id);
                return Data.clockOut(data.appt, data.id);
            case 'approveRequest':
                assert(token.uid === data.request.toUser.uid ||
                    token.supervisor);
                if (!token.supervisor) await exists('requestsIn', data.id);
                return Data.approveRequest(data.request, data.id);
            case 'modifyAppt':
                assert([
                    data.appt.attendees[0].uid,
                    data.appt.attendees[1].uid
                ].indexOf(token.uid) >= 0 || token.supervisor);
                if (!token.supervisor) await exists('appointments', data.id);
                return Data.modifyAppt(data.appt, data.id);
            case 'newPastAppt':
                assert(token.supervisor);
                return Data.newPastAppt(data.appt);
            case 'modifyPastAppt':
                assert(token.supervisor);
                return Data.modifyPastAppt(data.appt, data.id);
            case 'deletePastAppt':
                assert([
                    data.appt.attendees[0].uid,
                    data.appt.attendees[1].uid
                ].indexOf(token.uid) >= 0 || token.supervisor);
                if (!token.supervisor) await exists('pastAppointments', data.id);
                return Data.deletePastAppt(data.appt, data.id);
            case 'cancelAppt':
                assert([
                    data.appt.attendees[0].uid,
                    data.appt.attendees[1].uid
                ].indexOf(token.uid) >= 0 || token.supervisor);
                if (!token.supervisor) await exists('appointments', data.id);
                return Data.cancelAppt(data.appt, data.id);
            case 'rejectRequest':
                assert(token.uid === data.request.toUser.uid ||
                    token.supervisor);
                if (!token.supervisor) await exists('requestsIn', data.id);
                return Data.rejectRequest(data.request, data.id);
            case 'cancelRequest':
                assert(token.uid === data.request.fromUser.uid ||
                    token.supervisor);
                if (!token.supervisor) await exists('requestsOut', data.id);
                return Data.cancelRequest(data.request, data.id);
            case 'modifyRequest':
                assert([
                    data.request.fromUser.uid,
                    data.request.toUser.uid,
                ].indexOf(token.uid) >= 0 || token.supervisor);
                if (token.uid === data.request.fromUser.uid)
                    await exists('requestsOut', data.id);
                if (token.uid === data.request.toUser.uid)
                    await exists('requestsIn', data.id);
                return Data.modifyRequest(data.request, data.id);
            default:
                throw new Error('Data action (' + action + ') does not exist.');
        };
    }
};


class Data {
    constructor() {
        this.initTimes();
        this.initHourlyCharges();
        this.initLocations();
    }

    static requestPayout() {
        return global.db.collection('users')
            .doc(global.app.user.uid).collection('requestedPayouts').doc().set({
                timestamp: new Date(),
            });
    }

    static requestPaymentFor(appt, id) {
        const user = Data.getOther(appt.attendees);
        return global.db.collection('users').doc(user.uid)
            .collection('requestedPayments').doc(id).set({
                from: Data.getOther(appt.attendees),
                to: global.app.conciseUser,
                amount: appt.for.payment.amount,
                for: appt,
                timestamp: new Date(),
            });
    }

    static async approvePayment(approvedPayment, id) {
        const db = global.db;
        const payments = [
            db.collection('users').doc(approvedPayment.to.uid)
            .collection('approvedPayments').doc(id),
            db.collection('users').doc(approvedPayment.from.uid)
            .collection('approvedPayments').doc(id),
        ];
        const requestedPayment = db.collection('users')
            .doc(global.app.user.uid)
            .collection('requestedPayments').doc(id);
        await requestedPayment.delete();
        return payments.forEach(async (payment) => {
            await payment.set(approvedPayment);
        });
    }

    static async denyPayment(deniedPayment, id) {
        const db = global.db;
        const payments = [
            db.collection('users').doc(approvedPayment.appt.attendees[0].uid)
            .collection('deniedPayments').doc(id),
            db.collection('users').doc(approvedPayment.appt.attendees[1].uid)
            .collection('deniedPayments').doc(id),
        ];
        const approvedPaymentRef = db.collection('users')
            .doc(global.app.user.uid)
            .collection('requestedPayments').doc(id);
        await approvedPaymentRef.delete();
        payments.forEach(async (payment) => {
            await payment.set({
                for: deniedPayment,
                deniedBy: that.conciseUser,
                deniedTimestamp: new Date(),
            });
        });
    }

    static async getUser(id) {
        if (!id) {
            throw new Error('Could not get user data b/c id was undefined.');
        } else if (id.indexOf('@') >= 0) {
            console.warn('[WARNING] Using an email as a user ID is ' +
                'deprecated.');
            var ref = await global.db.collection('usersByEmail').doc(id).get();
        } else {
            var ref = await global.db.collection('users').doc(id).get();
        }
        if (ref.exists) return ref.data();
        throw new Error('User (' + id + ') did not exist.');
    }

    static updateUser(user) {
        if (!user) {
            throw new Error('Cannot update an undefined user.');
        } else if (!user.id && !user.email && !user.uid) {
            throw new Error('Could not update user b/c id was undefined.');
        } else if (user.uid) {
            return global.db.collection('users').doc(user.uid).update(user);
        } else {
            console.warn('[WARNING] Using an email as a user ID is ' +
                'deprecated.');
            return global.db.collection('usersByEmail').doc(user.id ||
                user.email).update(user);
        }
    }

    static deleteUser(id) {
        if (!id) {
            throw new Error('Could not delete user b/c id was undefined.');
        } else if (id.indexOf('@') >= 0) {
            console.warn('[WARNING] Using an email as a user ID is ' +
                'deprecated.');
            return global.db.collection('usersByEmail').doc(id).delete();
        } else {
            return global.db.collection('users').doc(id).delete();
        }
    }

    static async createLocation(location, id) {
        location = Data.trimObject(location);
        const ref = id ? global.db.collection('locations').doc(id) : global.db
            .collection('locations').doc();
        if ((await ref.get()).exists) console.warn('[WARNING] Location (' + id +
            ') already existed.');
        await ref.set(location);
        return {
            id: ref.id,
            location: location,
        };
    }

    static async updateLocation(location, id) {
        console.log('[DEBUG] Location before trimming:', location);
        location = Data.trimObject(location);
        console.log('[DEBUG] Location after trimming:', location);
        const ref = global.db.collection('locations').doc(id);
        await ref.update(location);
        return {
            id: id,
            location: (await ref.get()).data(),
        };
    }

    static async deleteLocation(id) {
        const ref = global.db.collection('locations').doc(id);
        const location = (await ref.get()).data();
        await ref.delete();
        return {
            id: id,
            location: location,
        };
    }

    static async createProxyUser(profile) {
        var [err, user] = await to(admin.auth().getUserByEmail(profile.email));
        if (err) var [err, user] = await to(admin.auth().createUser({
            email: profile.email,
            emailVerified: false,
            displayName: profile.name,
            photoURL: profile.photo ? profile.photo : 'https://tutorbook.app/' +
                'app/img/' + ((profile.gender === 'Female') ? 'female.png' :
                    'male.png'),
            disabled: false,
        }));
        if (err) throw new Error('Could not create user b/c of ' + err.message);
        return global.db.collection('users').doc(user.uid).set(
            Data.combineMaps(profile, {
                uid: user.uid,
                photo: user.photoURL,
                phone: phone(profile.phone)[0] || profile.phone,
            }));
    }

    static createUser(user) {
        if (!user) {
            throw new Error('Cannot create an undefined user.');
        } else if (!user.id && !user.uid && !user.email) {
            throw new Error('Could not create user b/c id was undefined.');
        } else if (user.uid) {
            return global.db.collection('users').doc(user.uid).set(user);
        } else {
            console.warn('[WARNING] Using an email as a user ID is ' +
                'deprecated.');
            return global.db.collection('usersByEmail').doc(user.id ||
                user.email).set(user);
        }
    }

    static async instantClockIn(appt, id) { // Creates and approves clock in
        const db = global.db;
        const clockIn = {
            sentTimestamp: new Date(),
            sentBy: global.app.conciseUser,
        };
        const activeAppts = [
            db.collection('users').doc(appt.attendees[0].uid)
            .collection('activeAppointments')
            .doc(id),
            db.collection('users').doc(appt.attendees[1].uid)
            .collection('activeAppointments')
            .doc(id),
            db.collection('locations').doc(appt.location.id)
            .collection('activeAppointments')
            .doc(id),
        ];

        // Tedious work arounds for infinite reference loops
        appt = (await db.collection('users').doc(appt.attendees[0].uid)
            .collection('appointments').doc(id).get()).data();
        clockIn.for = Data.cloneMap(appt);
        appt.clockIn = Data.combineMaps(clockIn, {
            approvedTimestamp: new Date(),
            approvedBy: global.app.conciseUser,
        });
        for (var i = 0; i < activeAppts.length; i++) {
            await activeAppts[i].set(appt);
        }
        return {
            clockIn: clockIn,
            appt: appt,
            id: id,
        };
    }

    static async rejectClockIn(clockIn, id) {
        const db = global.db;
        const ref = db.collection('locations').doc(clockIn.for.location.id)
            .collection('clockIns').doc(id);
        clockIn = (await ref.get()).data(); // Don't trust the client (and this
        // will use the actual Timestamp() object for clockIn.sentTimestamp).
        const rejectedClockIn = db.collection('locations').doc(clockIn.for
            .location.id).collection('rejectedClockIns').doc();
        const rejectedClockInData = Data.combineMaps(clockIn, {
            rejectedTimestamp: new Date(),
            rejectedBy: global.app.conciseUser,
        });
        await ref.delete();
        await rejectedClockIn.set(rejectedClockInData);
        return {
            clockIn: rejectedClockInData,
            id: rejectedClockIn.id,
        };
    }

    static async approveClockIn(clockIn, id) {
        const db = global.db;
        const ref = db.collection('locations').doc(clockIn.for.location.id)
            .collection('clockIns').doc(id);
        clockIn = (await ref.get()).data(); // Don't trust the client (and this
        // will use the actual Timestamp() object for clockIn.sentTimestamp).
        const approvedClockIn = db.collection('locations').doc(clockIn.for
            .location.id).collection('approvedClockIns').doc();
        const activeAppts = [
            db.collection('users').doc(clockIn.for.attendees[0].uid)
            .collection('activeAppointments')
            .doc(id),
            db.collection('users').doc(clockIn.for.attendees[1].uid)
            .collection('activeAppointments')
            .doc(id),
            db.collection('locations').doc(clockIn.for.location.id)
            .collection('activeAppointments')
            .doc(id),
        ];
        await ref.delete();
        await approvedClockIn.set(Data.combineMaps(clockIn, {
            approvedTimestamp: new Date(),
            approvedBy: global.app.conciseUser,
        }));
        // Tedious work around of the infinite loop
        const activeApptData = Data.cloneMap(clockIn.for);
        activeApptData.clockIn = Data.combineMaps(clockIn, {
            approvedTimestamp: new Date(),
            approvedBy: global.app.conciseUser,
        });
        for (var i = 0; i < activeAppts.length; i++) {
            var activeAppt = activeAppts[i];
            await activeAppt.set(activeApptData);
        }
        return {
            appt: activeApptData,
            id: id,
        };
    }

    static getOther(notThisUser, attendees) { // Don't create dependency loops
        if (!notThisUser.uid && notThisUser.length) {
            if (notThisUser[0].uid === global.app.user.uid) {
                return notThisUser[1];
            }
            return notThisUser[0];
        }
        if (attendees[0].uid === notThisUser.uid) {
            return attendees[1];
        }
        return attendees[0];
    }

    static async instantClockOut(appt, id) {
        const db = global.db;
        const clockOut = {
            sentTimestamp: new Date(),
            sentBy: global.app.conciseUser,
        };
        const activeAppts = [
            db.collection('users').doc(appt.attendees[0].uid)
            .collection('activeAppointments')
            .doc(id),
            db.collection('users').doc(appt.attendees[1].uid)
            .collection('activeAppointments')
            .doc(id),
            db.collection('locations').doc(appt.location.id)
            .collection('activeAppointments')
            .doc(id),
        ];

        appt = (await activeAppts[0].get()).data();
        appt.clockOut = Data.cloneMap(clockOut); // Avoid infinite ref loop
        clockOut.for = Data.cloneMap(appt);

        const pastAppts = [
            db.collection('users').doc(appt.attendees[0].uid)
            .collection('pastAppointments')
            .doc(),
        ];
        const pastApptID = pastAppts[0].id;
        pastAppts.push(
            db.collection('users').doc(appt.attendees[1].uid)
            .collection('pastAppointments')
            .doc(pastApptID),
        );
        pastAppts.push(
            db.collection('locations').doc(appt.location.id)
            .collection('pastAppointments')
            .doc(pastApptID),
        );

        // Actually mess with docs
        for (var i = 0; i < activeAppts.length; i++) {
            await activeAppts[i].delete();
        }
        for (var i = 0; i < pastAppts.length; i++) {
            await pastAppts[i].set(appt);
        }
        return {
            clockOut: clockOut,
            appt: appt,
            id: pastApptID,
        };
    }

    static async rejectClockOut(clockOutData, id) {
        // Tedious work around of the infinite loop
        const db = global.db;
        const clockOut = db.collection('locations').doc(clockOutData.for
            .location.id).collection('clockOuts').doc(id);
        clockOutData = (await clockOut.get()).data(); // Don't trust client
        const rejectedClockOutData = Data.combineMaps(clockOutData, {
            rejectedTimestamp: new Date(),
            rejectedBy: global.app.conciseUser,
        });
        const appt = Data.cloneMap(rejectedClockOutData.for);
        const rejectedClockOut = db.collection('locations').doc(clockOutData.for
            .location.id).collection('rejectedClockOuts').doc();
        const activeAppts = [
            db.collection('users').doc(appt.attendees[0].uid)
            .collection('activeAppointments')
            .doc(id),
            db.collection('users').doc(appt.attendees[1].uid)
            .collection('activeAppointments')
            .doc(id),
            db.collection('locations').doc(appt.location.id)
            .collection('activeAppointments')
            .doc(id),
        ];
        // Actually mess with docs
        await clockOut.delete();
        await rejectedClockOut.set(rejectedClockOutData);
        for (var i = 0; i < activeAppts.length; i++) {
            await activeAppts[i].delete();
        }
        return {
            clockOut: rejectedClockOutData,
            id: rejectedClockOut.id,
        };
    }

    static async approveClockOut(clockOutData, id) {
        // Tedious work around of the infinite loop
        const db = global.db;
        const clockOut = db.collection('locations').doc(clockOutData.for
            .location.id).collection('clockOuts').doc(id);
        clockOutData = (await clockOut.get()).data(); // Don't trust client
        const approvedClockOutData = Data.combineMaps(clockOutData, {
            approvedTimestamp: new Date(),
            approvedBy: global.app.conciseUser,
        });
        const appt = Data.cloneMap(approvedClockOutData.for);
        appt.clockOut = Data.cloneMap(approvedClockOutData);

        const approvedClockOut = db.collection('locations').doc(appt.location
            .id).collection('approvedClockOuts').doc();
        const activeAppts = [
            db.collection('users').doc(appt.attendees[0].uid)
            .collection('activeAppointments')
            .doc(id),
            db.collection('users').doc(appt.attendees[1].uid)
            .collection('activeAppointments')
            .doc(id),
            db.collection('locations').doc(appt.location.id)
            .collection('activeAppointments')
            .doc(id),
        ];
        const pastAppts = [
            db.collection('users').doc(appt.attendees[0].uid)
            .collection('pastAppointments')
            .doc(),
        ];
        const pastApptID = pastAppts[0].id;
        pastAppts.push(
            db.collection('users').doc(appt.attendees[1].uid)
            .collection('pastAppointments')
            .doc(pastApptID),
        );
        pastAppts.push(
            db.collection('locations').doc(appt.location.id)
            .collection('pastAppointments')
            .doc(pastApptID),
        );

        // Actually mess with docs
        await clockOut.delete();
        await approvedClockOut.set(approvedClockOutData);
        for (var i = 0; i < activeAppts.length; i++) {
            await activeAppts[i].delete();
        }
        for (var i = 0; i < pastAppts.length; i++) {
            await pastAppts[i].set(appt);
        }
        return {
            appt: appt,
            id: pastApptID,
        };
    }

    static combineMaps(mapA, mapB) { // Avoid dependency loops with Utils
        // NOTE: This function gives priority to mapB over mapA
        var result = {};
        for (var i in mapA) {
            result[i] = mapA[i];
        }
        for (var i in mapB) {
            result[i] = mapB[i];
        }
        return result;
    }

    static cloneMap(map) { // Don't create dependency loops by require('utils')
        var clone = {};
        for (var i in map) {
            clone[i] = map[i];
        }
        return clone;
    }

    static async getLocationIdFromName(name) {
        const doc = (await global.db.collection('locations')
            .where('name', '==', name).limit(1).get()).docs[0];
        if (!doc || !doc.exists) throw new Error('Location (' + name + ') did' +
            ' not exist.');
        return doc.id;
    }

    static async getLocationSupervisor(id) {
        const doc = await global.db.collection('locations')
            .doc(id).get();
        const supervisors = doc.data().supervisors;
        return supervisors[0]; // TODO: How do we check to see if a given
        // supervisor is actually active on the app right now?
    }

    static async clockIn(appt, id) {
        const clockIn = {
            sentTimestamp: new Date(),
            sentBy: global.app.conciseUser,
        };

        const db = global.db;
        const ref = db.collection('locations').doc(appt.location.id)
            .collection('clockIns').doc(id);
        const apptRef = db.collection('users').doc(appt.attendees[0].uid)
            .collection('appointments').doc(id);

        appt = (await apptRef.get()).data(); // Don't trust the client
        appt.clockIn = Data.cloneMap(clockIn);
        clockIn.for = Data.cloneMap(appt);

        await ref.set(clockIn);
        await db.collection('users').doc(global.app.user.uid).update({
            clockedIn: true
        });
        return {
            recipient: {
                name: 'the ' + appt.location.name + '\'s supervisors',
                path: ref.path,
            },
            clockIn: clockIn,
            appt: appt,
            id: id,
        };
    }

    static async clockOut(appt, id) {
        const clockOut = {
            sentTimestamp: new Date(),
            sentBy: global.app.conciseUser,
        };

        const db = global.db;
        const ref = db.collection('locations').doc(appt.location.id)
            .collection('clockOuts').doc(id);
        const apptRef = db.collection('users').doc(appt.attendees[0].uid)
            .collection('activeAppointments').doc(id);

        appt = (await apptRef.get()).data(); // Don't trust the client
        appt.clockOut = Data.cloneMap(clockOut);
        clockOut.for = Data.cloneMap(appt);

        await ref.set(clockOut);
        await db.collection('users').doc(global.app.user.uid).update({
            clockedOut: true
        });
        return {
            recipient: {
                name: 'the ' + appt.location.name + '\'s supervisors',
                path: ref.path,
            },
            clockOut: clockOut,
            appt: appt,
            id: id,
        };
    }

    // Adds a 'booked' field to every availability window on the given user by:
    // 1) Getting the user's appointments
    // 2) Changing 'booked' to false for every appointment's time field
    static async updateUserAvailability(uid) {
        const doc = await global.db.collection('users').doc(uid).get();
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
            if (bookedAvailability[appt.location.name][appt.time.day]
                .findIndex(t =>
                    t.open === appt.time.from &&
                    t.close === appt.time.to
                ) >= 0) return;
            bookedAvailability[appt.location.name][appt.time.day].push({
                open: appt.time.from,
                close: appt.time.to,
                booked: true,
            });
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
                    }
                });
            });
        });
        return doc.ref.update({
            availability: bookedAvailability,
        });
    }

    static async approveRequest(request, id) {
        const db = global.db;
        const requestIn = db.collection("users").doc(request.toUser.uid)
            .collection('requestsIn')
            .doc(id);
        const requestOut = db.collection('users').doc(request.fromUser.uid)
            .collection('requestsOut')
            .doc(id);
        const approvedRequestOut = db.collection('users')
            .doc(request.fromUser.uid)
            .collection('approvedRequestsOut')
            .doc(id);
        // NOTE: The appts must be processed in this order due to the way that
        // the Firestore rules are setup (i.e. first we check if there is an
        // approvedRequestOut doc, then we check if there is an appt doc
        // already created).
        if (!request.location.id) request.location.id =
            await Data.getLocationIdFromName(request.location.name);
        const appts = [
            db.collection('users').doc(request.fromUser.uid)
            .collection('appointments')
            .doc(id),
            db.collection('users').doc(request.toUser.uid)
            .collection('appointments')
            .doc(id),
            db.collection('locations').doc(request.location.id)
            .collection('appointments')
            .doc(id),
        ];
        const apptData = {
            attendees: [request.fromUser, request.toUser],
            location: request.location,
            for: request,
            time: request.time,
            timestamp: new Date(),
        };

        var [err, res] = await to(approvedRequestOut.set({
            for: request,
            approvedBy: app.conciseUser,
            approvedTimestamp: new Date(),
        }));
        if (err) throw new Error('Error while adding approvedRequestOut:', err);
        [err, res] = await to(requestOut.delete());
        if (err) throw new Error('Error while deleting requestOut:', err);
        [err, res] = await to(requestIn.delete());
        if (err) throw new Error('Error while deleting requestIn:', err);
        for (var i = 0; i < appts.length; i++) {
            var appt = appts[i];
            [err, res] = await to(appt.set(apptData));
            if (err) throw new Error('Error while creating appt doc:', err);
        }
        Data.updateUserAvailability(request.fromUser.uid);
        Data.updateUserAvailability(request.toUser.uid);
        return {
            request: request,
            appt: apptData,
            id: id,
        };
    }

    static async newPastAppt(appt) {
        ['clockIn', 'clockOut'].forEach(key => {
            ['sentTimestamp', 'approvedTimestamp'].forEach(time => {
                if (typeof appt[key][time] === 'object') {
                    appt[key][time] = new admin.firestore.Timestamp(
                        appt[key][time]._seconds,
                        appt[key][time]._nanoseconds,
                    ).toDate();
                } else {
                    appt[key][time] = new Date(appt[key][time]);
                }
            });
        });
        appt = Data.trimObject(appt);
        const db = global.db;
        const appts = [
            db.collection('users').doc(appt.attendees[0].uid)
            .collection('pastAppointments').doc(),
        ];
        const id = appts[0].id;
        appts.push(db.collection('users').doc(appt.attendees[1].uid)
            .collection('pastAppointments').doc(id));
        appts.push(db.collection('locations').doc(appt.location.id)
            .collection('pastAppointments').doc(id));
        await Promise.all(appts.map(doc => doc.set(appt)));
        return {
            appt: appt,
            id: id,
        };
    }

    static async modifyPastAppt(apptData, id) {
        const db = global.db;
        ['clockIn', 'clockOut'].forEach(key => {
            if (typeof apptData[key].sentTimestamp === 'object') {
                apptData[key].sentTimestamp = new admin.firestore.Timestamp(
                    apptData[key].sentTimestamp._seconds,
                    apptData[key].sentTimestamp._nanoseconds,
                ).toDate();
            } else {
                apptData[key].sentTimestamp = new Date(apptData[key]
                    .sentTimestamp);
            }
        });
        apptData = Data.trimObject(apptData);
        const appts = [
            db.collection('users').doc(apptData.attendees[0].uid)
            .collection('pastAppointments')
            .doc(id),
            db.collection('users').doc(apptData.attendees[1].uid)
            .collection('pastAppointments')
            .doc(id),
            db.collection('locations').doc(apptData.location.id)
            .collection('pastAppointments')
            .doc(id),
        ];
        await Promise.all(appts.map((appt) => {
            return appt.update(apptData);
        }));
        return {
            appt: apptData,
            id: id,
        };
    }

    static async modifyAppt(apptData, id) {
        const db = global.db;
        apptData = Data.trimObject(apptData);
        const appts = [
            db.collection('users').doc(apptData.attendees[0].uid)
            .collection('appointments')
            .doc(id),
            db.collection('users').doc(apptData.attendees[1].uid)
            .collection('appointments')
            .doc(id),
            db.collection('locations').doc(apptData.location.id)
            .collection('appointments')
            .doc(id),
        ];
        const modifiedAppts = [];
        if (apptData.attendees[0].uid !== app.user.uid) {
            modifiedAppts.push(db.collection('users')
                .doc(apptData.attendees[0].uid)
                .collection('modifiedAppointments').doc(id));
        }
        if (apptData.attendees[1].uid !== app.user.uid) {
            modifiedAppts.push(db.collection('users')
                .doc(apptData.attendees[1].uid)
                .collection('modifiedAppointments').doc(id));
        }
        if (app.user.locations &&
            app.user.locations.indexOf(apptData.location.id) < 0) {
            modifiedAppts.push(db.collection('locations').doc(apptData.location.id)
                .collection('modifiedAppointments').doc(id));
        }

        for (var i = 0; i < modifiedAppts.length; i++) {
            var modifiedAppt = modifiedAppts[i];
            await modifiedAppt.set({
                modifiedBy: app.conciseUser,
                modifiedTimestamp: new Date(),
                for: apptData,
            });
        }
        for (var i = 0; i < appts.length; i++) {
            var appt = appts[i];
            await appt.update(apptData);
        }
    }

    static deletePastAppt(apptData, id) {
        const db = global.db;
        const appts = [
            db.collection('users').doc(apptData.attendees[0].uid)
            .collection('pastAppointments')
            .doc(id),
            db.collection('users').doc(apptData.attendees[1].uid)
            .collection('pastAppointments')
            .doc(id),
            db.collection('locations').doc(apptData.location.id)
            .collection('pastAppointments')
            .doc(id),
        ];
        return appts.forEach(async (appt) => {
            await appt.delete();
        });
    }

    static async cancelAppt(apptData, id) {
        const db = global.db;
        const appts = [
            db.collection('users').doc(apptData.attendees[0].uid)
            .collection('appointments')
            .doc(id),
            db.collection('users').doc(apptData.attendees[1].uid)
            .collection('appointments')
            .doc(id),
            db.collection('locations').doc(apptData.location.id)
            .collection('appointments')
            .doc(id),
        ];
        const canceledAppts = [];
        if (apptData.attendees[0].uid !== app.user.uid) {
            canceledAppts.push(db.collection('users')
                .doc(apptData.attendees[0].uid)
                .collection('canceledAppointments').doc(id));
        }
        if (apptData.attendees[1].uid !== app.user.uid) {
            canceledAppts.push(db.collection('users')
                .doc(apptData.attendees[1].uid)
                .collection('canceledAppointments').doc(id));
        }
        canceledAppts.push(db.collection('locations').doc(apptData.location.id)
            .collection('canceledAppointments').doc(id));

        if (apptData.for.payment.type === 'Paid') {
            // Delete the authPayment docs as well
            const authPayments = [
                db.collection('users').doc(apptData.attendees[0].uid)
                .collection('authPayments')
                .doc(id),
                db.collection('users').doc(apptData.attendees[1].uid)
                .collection('authPayments')
                .doc(id),
            ];
            authPayments.forEach(async (authPayment) => {
                await authPayment.delete();
            });
        }

        canceledAppts.forEach(async (appt) => {
            await appt.set({
                canceledBy: app.conciseUser,
                canceledTimestamp: new Date(),
                for: apptData,
            });
        });

        appts.forEach(async (appt) => {
            await appt.delete();
        });
    }

    static async rejectRequest(request, id) {
        const db = global.db;
        const requestIn = db.collection("users").doc(request.toUser.uid)
            .collection('requestsIn')
            .doc(id);
        const requestOut = db.collection('users').doc(request.fromUser.uid)
            .collection('requestsOut')
            .doc(id);
        const rejectedRequestOut = db.collection('users')
            .doc(request.fromUser.uid)
            .collection('rejectedRequestsOut')
            .doc(id);

        if (request.payment.type === 'Paid') {
            // Delete the authPayment docs as well
            const authPayments = [
                db.collection('users').doc(request.fromUser.uid)
                .collection('authPayments')
                .doc(id),
                db.collection('users').doc(request.toUser.uid)
                .collection('authPayments')
                .doc(id),
            ];
            authPayments.forEach(async (authPayment) => {
                await authPayment.delete();
            });
        }

        await rejectedRequestOut.set({
            for: request,
            rejectedBy: app.conciseUser,
            rejectedTimestamp: new Date(),
        });
        await requestOut.delete();
        await requestIn.delete();
    }

    static async cancelRequest(request, id) {
        const db = global.db;
        const requestIn = db.collection("users").doc(request.toUser.uid)
            .collection('requestsIn')
            .doc(id);
        const requestOut = db.collection('users').doc(request.fromUser.uid)
            .collection('requestsOut')
            .doc(id);

        if (request.payment.type === 'Paid') {
            // Delete the authPayment docs as well
            const authPayments = [
                db.collection('users').doc(request.fromUser.uid)
                .collection('authPayments')
                .doc(id),
                db.collection('users').doc(request.toUser.uid)
                .collection('authPayments')
                .doc(id),
            ];
            authPayments.forEach(async (authPayment) => {
                await authPayment.delete();
            });
        }

        const canceledRequests = [];
        if (request.toUser.uid !== app.user.uid) {
            canceledRequests.push(db.collection('users').doc(request.toUser.uid)
                .collection('canceledRequestsIn').doc(id));
        }
        if (request.fromUser.uid !== app.user.uid) {
            canceledRequests.push(db.collection('users')
                .doc(request.fromUser.uid)
                .collection('canceledRequestsOut').doc(id));
        }

        canceledRequests.forEach(async (canceledRequest) => {
            await canceledRequest.set({
                canceledBy: app.conciseUser,
                canceledTimestamp: new Date(),
                for: request,
            });
        });
        await requestOut.delete();
        await requestIn.delete();
    }

    static async modifyRequest(request, id) {
        const db = global.db;
        request = Data.trimObject(request);
        const requestIn = db.collection("users").doc(request.toUser.uid)
            .collection('requestsIn')
            .doc(id);
        const requestOut = db.collection('users').doc(request.fromUser.uid)
            .collection('requestsOut')
            .doc(id);
        // We send modified requests to all users that aren't the currentUser
        const modifiedRequests = [];
        if (request.fromUser.uid !== app.user.uid) {
            modifiedRequests.push(db.collection('users')
                .doc(request.fromUser.uid)
                .collection('modifiedRequestsOut')
                .doc(id));
        }
        if (request.toUser.uid !== app.user.uid) {
            modifiedRequests.push(db.collection('users')
                .doc(request.toUser.uid)
                .collection('modifiedRequestsIn')
                .doc(id));
        }
        modifiedRequests.forEach(async (modifiedRequest) => {
            await modifiedRequest.set({
                for: request,
                modifiedBy: app.conciseUser,
                modifiedTimestamp: new Date(),
            });
        });
        await requestOut.update(request);
        await requestIn.update(request);
    }

    static trimObject(ob) {
        const result = {};
        const ISODate = new RegExp('^([\\+-]?\\d{4}(?!\\d{2}\\b))((-?)((0[1-9' +
            ']|1[0-2])(\\3([12]\\d|0[1-9]|3[01]))?|W([0-4]\\d|5[0-2])(-?[1-7]' +
            ')?|(00[1-9]|0[1-9]\\d|[12]\\d{2}|3([0-5]\\d|6[1-6])))([T\\s]((([' +
            '01]\\d|2[0-3])((:?)[0-5]\\d)?|24\\:?00)([\\.,]\\d+(?!:))?)?(\\17' +
            '[0-5]\\d([\\.,]\\d+)?)?([zZ]|([\\+-])([01]\\d|2[0-3]):?([0-5]\\d' +
            ')?)?)?)?$/'); // See https://bit.ly/2Tb4ghY
        const UTCDate = new RegExp('^(\\w{3}), (\\d{2}) (\\w{3}) (\\d{4}) ((' +
            '\\d{2}):(\\d{2}):(\\d{2})) GMT$'); // See https://bit.ly/39VjTAO
        Object.entries(ob).forEach(([key, val]) => {
            switch (typeof val) {
                case 'string':
                    result[key] = val.trim();
                    if (ISODate.test(val.trim()) || UTCDate.test(val.trim())) {
                        console.log('[DEBUG] Value (' + val + ') for ' + key +
                            ' was a valid UTC or ISO date string.');
                        result[key] = new Date(val.trim());
                    }
                    break;
                case 'object':
                    if (val instanceof Array) { // Array
                        result[key] = val;
                    } else if (val._seconds && val._nanoseconds) { // Timestamp
                        console.log('[DEBUG] Value (' + val + ') for ' + key +
                            ' was a valid Timestamp object map.');
                        result[key] = new admin.firestore.Timestamp(
                            val._seconds,
                            val._nanoseconds,
                        );
                    } else if (!val.getTime && !val.toDate) { // Map
                        result[key] = Data.trimObject(val);
                    } else { // Timestamp or Date 
                        result[key] = val;
                    }
                    break;
                default:
                    result[key] = val;
            };
        });
        return result;
    }

    static async newRequest(request, payment) {
        const db = global.db;
        console.log('[DEBUG] Subject before trimming:', request.subject);
        request = Data.trimObject(request);
        console.log('[DEBUG] Subject after trimming:', request.subject);
        const requestIn = db.collection('users').doc(request.toUser.uid)
            .collection('requestsIn')
            .doc();
        const requestOut = db.collection('users').doc(request.fromUser.uid)
            .collection('requestsOut')
            .doc(requestIn.id);

        // Add request documents for both users
        await requestOut.set(request);
        await requestIn.set(request);
        // Add payment document for server to process
        if (payment && request.payment && request.payment.type === 'Paid') {
            switch (payment.method) {
                case 'PayPal':
                    // Authorize payment for capture (after the tutor clocks
                    // out and the pupil approves payment).
                    await global.db.collection('users')
                        .doc(request.fromUser.uid)
                        .collection('authPayments')
                        .doc(requestIn.id)
                        .set(payment);
                    await global.db.collection('users')
                        .doc(request.toUser.uid)
                        .collection('authPayments')
                        .doc(requestIn.id)
                        .set(payment);
                    break;
                case 'Stripe':
                    // Authorize payment for capture (after the tutor clocks
                    // out and the pupil approves payment).
                    await global.db.collection('users')
                        .doc(request.fromUser.uid)
                        .collection('sentPayments')
                        .doc(requestIn.id)
                        .set(payment);
                    break;
                default:
                    console.warn('[WARNING] Invalid payment method (' + payment
                        .method + '). Defaulting to Stripe...');
                    // Authorize payment for capture (after the tutor clocks
                    // out and the pupil approves payment).
                    await global.db.collection('users')
                        .doc(request.fromUser.uid)
                        .collection('sentPayments')
                        .doc(requestIn.id)
                        .set(payment);
                    break; // Not necessary (see: https://bit.ly/2AILLZj)
            };
        }
        return {
            request: request,
            payment: payment,
            id: requestIn.id,
        };
    }

    async initLocations() { // Different formats of the same location data
        this.locationsByName = {};
        this.locationsByID = {};
        this.locationDataByName = {};
        this.locationDataByID = {};
        this.locationNames = [];
        this.locationIDs = [];
        const snap = await global.db.collection('locations').get();
        snap.docs.forEach((doc) => {
            if (global.app.location.name === 'Any' ||
                global.app.location.id === doc.id) {
                this.locationsByName[doc.data().name] = doc.id;
                this.locationDataByName[doc.data().name] = doc.data();
                this.locationsByID[doc.id] = doc.data().name;
                this.locationDataByID[doc.id] = doc.data();
                this.locationNames.push(doc.data().name);
                this.locationIDs.push(doc.id);
            }
        });
    }

    initTimes() {
        // First, iterate over 'AM' vs 'PM'
        this.timeStrings = [];
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
                this.timeStrings.push('12:' + minString + ' ' + suffix);
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
                    this.timeStrings.push(hour + ':' + minString + ' ' + suffix);
                }
            }
        });
    }

    initHourlyCharges() {
        for (var i = 5; i <= 200; i += 5) {
            var chargeString = '$' + i + '.00';
            this.payments.hourlyChargeStrings.push(chargeString);
            this.payments.hourlyChargesMap[chargeString] = i;
        }
    }

};

Data.setupCards = [
    'searchTutors',
    'setupNotifications',
    'setupProfile',
    'setupAvailability',
    'addChildren'
];

// This is not static and thus has to include `prototype` in it's definition
Data.prototype.payments = {
    types: ['Free', 'Paid'],
    hourlyChargeStrings: [],
    hourlyChargesMap: {},
};

Data.prices = [
    'Free',
    'Paid',
];

Data.emptyProfile = {
    name: '',
    uid: '',
    photo: '',
    id: '', // Right now, we just use email for id
    email: '',
    phone: '',
    type: '',
    gender: '',
    grade: '',
    bio: '',
    avgRating: 0,
    numRatings: 0,
    subjects: [],
    cards: {},
    config: {
        showPayments: false,
        showProfile: true,
    },
    settings: {},
    availability: {},
    payments: {
        hourlyChargeString: '$25.00',
        hourlyCharge: 25,
        totalChargedString: '$0.00',
        totalCharged: 0,
        currentBalance: 0,
        currentBalanceString: '$0.00',
        type: 'Free',
        policy: 'Hourly rate is $25.00 per hour. Will accept ' +
            'lesson cancellations if given notice within 24 hours.' +
            ' No refunds will be issued unless covered by a Tutorbook ' +
            'guarantee.',
    },
    authenticated: false,
    secondsTutored: 0,
    secondsPupiled: 0,
    location: (global.app) ? global.app.location.name : 'Gunn Academic Center',
};

Data.gunnSchedule = {
    // TODO: Actually populate this with the right daily schedule
    Monday: [
        'A Period',
        'B Period',
        'C Period',
        'F Period',
    ],
    Tuesday: [
        'D Period',
        'Flex',
        'E Period',
        'A Period',
        'G Period',
    ],
    Wednesday: [
        'B Period',
        'C Period',
        'D Period',
        'F Period',
    ],
    Thursday: [
        'E Period',
        'Flex',
        'B Period',
        'A Period',
        'G Period',
    ],
    Friday: [
        'C Period',
        'D Period',
        'E Period',
        'F Period',
        'G Period',
    ],
    Saturday: ['No school'],
    Sunday: ['No school'],
};

Data.periods = [
    'A Period',
    'B Period',
    'C Period',
    'D Period',
    'E Period',
    'F Period',
    'G Period',
    'Flex',
];

Data.locations = ['Gunn Academic Center', 'Paly Peer Tutoring Center'];

Data.addresses = {
    'Gunn Academic Center': '780 Arastradero Rd, Palo Alto, CA 94306',
    'Paly Peer Tutoring Center': '50 Embarcadero Rd, Palo Alto, CA 94301',
};

Data.cities = ['Palo Alto, CA', 'Mountain View, CA', 'East Palo Alto, CA'];

Data.days = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
];

// List of subjects taken directly from AC Application form
Data.mathSubjects = [
    'Algebra 1', // Gunn
    'Algebra 1A',
    'Algebra 2',
    'Algebra 2/Trig A',
    'Algebra 2/Trig H',
    'Analysis H',
    'AP Calculus AB',
    'AP Calculus BC',
    'Geometry A',
    'Geometry A/Alg 1A',
    'Geometry H',
    'Geometry/ Alg 2A',
    'IAC',
    'Pre-Calculus',
    'Pre-Calculus A',
    'AP Statistics',
    'Applied Math',
    'Pre-Algebra', // JLS
    'Math 6',
    'Math 7',
    'Math 7A',
    'Math 8',
    'Algebra 8',
];

Data.techSubjects = [
    'Computer Science', // Gunn
    'AP Comp Sci A',
    'AP Comp Sci P',
    'FOOP',
    'Industrial Tech 1A', // JLS
    'Industrial Tech 1B',
    'Keyboarding',
    'Computer Programming',
    'Web Design 1A',
    'Web Design 1B',
    'Design and Technology',
    'Yearbook',
    'Multimedia Art',
    'Video Production',
];

Data.artSubjects = [
    'Art Spectrum', // Gunn
    'AP Art History',
    'Photography 1',
    'Video 1',
    'Yearbook', // JLS
    'Video Production',
    'Art 1A',
    'Art 1B',
    'Ceramics and Sculpture',
    'Multimedia Art',
    'Drama 1A',
    'Drama 1B',
];

Data.scienceSubjects = [
    'Astrophysics', // Gunn
    'Biology 1',
    'Biology 1A',
    'Biology H',
    'AP Biology',
    'Biotechnology',
    'Marine Biology',
    'Chemistry',
    'Chemistry H',
    'AP Chemistry',
    'Conceptual Physics',
    'Physics',
    'AP Physics 1',
    'AP Physics C',
    'APES Env Sci',
    'Science 6', // JLS
    'Science 7',
    'Science 8',
];

Data.historySubjects = [
    'World History', // Gunn
    'Cont World History',
    'Government',
    'US History',
    'APUSH',
    'Economics',
    'AP Economics',
    'Psychology',
    'AP Psychology',
    'Social Studies 6', // JLS
    'Social Studies 7',
    'Social Studies 8',
];

Data.languageSubjects = [
    'French 1', // Gunn
    'French 2',
    'French 3',
    'AP French',
    'German 1',
    'German 2',
    'German 3',
    'AP German',
    'Japanese 1',
    'Japanese 2',
    'Japanese 3',
    'AP Japanese',
    'Mandarin 1',
    'Mandarin 2',
    'Mandarin 3',
    'AP Mandarin',
    'Spanish 1',
    'Spanish 2',
    'Spanish 3',
    'AP Spanish',
    'French 1A', // JLS
    'French 1B',
    'Japanese 1A',
    'Japanese 1B',
    'Spanish 1A',
    'Spanish 1B',
    'Mandarin 1A',
    'German 1A',
];

Data.englishSubjects = [
    'Western Lit', // Gunn
    'Western Culture',
    'Communication',
    'World Lit',
    'World Classics H',
    'AP English Lit and Composition',
    'Fundamentals of Communication',
    'Advanced Communication',
    'American Lit',
    'Basic College Skills',
    'The Works of Shakespeare',
    'Escape Lit',
    'Classic Mythology',
    'Shakespeare in Performance',
    'Film as Composition in Lit',
    'Analysis of the Writers Craft',
    'Philosophy through Lit',
    'Reading Between the Lines',
    'The Art of Visual Storytelling',
    'Modern California Lit',
    'Women Writers',
    'English 6', // JLS
    'English 7',
    'English 8',
];

Data.lifeSkills = [
    'Planning', // Gunn
    'Organization',
    'Study Skills',
    'Other',
    'Leadership', // JLS
    'Public Speaking',
];

Data.subjects = [
    // MATH
    'Algebra 1', // Gunn
    'Algebra 1A',
    'Algebra 2',
    'Algebra 2/Trig A',
    'Algebra 2/Trig H',
    'Analysis H',
    'AP Calculus AB',
    'AP Calculus BC',
    'Geometry A',
    'Geometry A/Alg 1A',
    'Geometry H',
    'Geometry/ Alg 2A',
    'IAC',
    'Pre-Calculus',
    'Pre-Calculus A',
    'AP Statistics',
    'Applied Math',
    'Pre-Algebra', // JLS
    'Math 6',
    'Math 7',
    'Math 7A',
    'Math 8',
    'Algebra 8',
    // TECHNOLOGY
    'Computer Science', // Gunn
    'AP Comp Sci A',
    'AP Comp Sci P',
    'FOOP',
    'Industrial Tech 1A', // JLS
    'Industrial Tech 1B',
    'Keyboarding',
    'Computer Programming',
    'Web Design 1A',
    'Web Design 1B',
    'Design and Technology',
    'Yearbook',
    'Multimedia Art',
    'Video Production',
    // ART
    'Art Spectrum', // Gunn
    'AP Art History',
    'Photography 1',
    'Video 1',
    'Yearbook', // JLS
    'Video Production',
    'Art 1A',
    'Art 1B',
    'Ceramics and Sculpture',
    'Multimedia Art',
    'Drama 1A',
    'Drama 1B',
    // SCIENCE
    'Astrophysics', // Gunn
    'Biology 1',
    'Biology 1A',
    'Biology H',
    'AP Biology',
    'Biotechnology',
    'Marine Biology',
    'Chemistry',
    'Chemistry H',
    'AP Chemistry',
    'Conceptual Physics',
    'Physics',
    'AP Physics 1',
    'AP Physics C',
    'APES Env Sci',
    'Science 6', // JLS
    'Science 7',
    'Science 8',
    // HISTORY
    'World History', // Gunn
    'Cont World History',
    'Government',
    'US History',
    'APUSH',
    'Economics',
    'AP Economics',
    'Psychology',
    'AP Psychology',
    'Social Studies 6', // JLS
    'Social Studies 7',
    'Social Studies 8',
    // LANGUAGE
    'French 1', // Gunn
    'French 2',
    'French 3',
    'AP French',
    'German 1',
    'German 2',
    'German 3',
    'AP German',
    'Japanese 1',
    'Japanese 2',
    'Japanese 3',
    'AP Japanese',
    'Mandarin 1',
    'Mandarin 2',
    'Mandarin 3',
    'AP Mandarin',
    'Spanish 1',
    'Spanish 2',
    'Spanish 3',
    'AP Spanish',
    'French 1A', // JLS
    'French 1B',
    'Japanese 1A',
    'Japanese 1B',
    'Spanish 1A',
    'Spanish 1B',
    'Mandarin 1A',
    'German 1A',
    // ENGLISH
    'Western Lit', // Gunn
    'Western Culture',
    'Communication',
    'World Lit',
    'World Classics H',
    'AP English Lit and Composition',
    'Fundamentals of Communication',
    'Advanced Communication',
    'American Lit',
    'Basic College Skills',
    'The Works of Shakespeare',
    'Escape Lit',
    'Classic Mythology',
    'Shakespeare in Performance',
    'Film as Composition in Lit',
    'Analysis of the Writers Craft',
    'Philosophy through Lit',
    'Reading Between the Lines',
    'The Art of Visual Storytelling',
    'Modern California Lit',
    'Women Writers',
    'English 6', // JLS
    'English 7',
    'English 8',
    // LIFE SKILLS
    'Planning', // Gunn
    'Organization',
    'Study Skills',
    'Other',
    'Leadership', // JLS
    'Public Speaking',
];

Data.genders = [
    'Male',
    'Female',
    'Other'
];

Data.grades = [
    'Adult',
    'Senior',
    'Junior',
    'Sophomore',
    'Freshman',
    '8th Grade',
    '7th Grade',
    '6th Grade',
    '5th Grade',
    '4th Grade',
    '3rd Grade',
    '2nd Grade',
    '1st Grade',
    'Kindergarten',
];

Data.types = [
    'Tutor',
    'Pupil',
    'Teacher',
    'Parent',
    'Supervisor',
];


module.exports = {
    onRequest: (req, res) => { // Firebase Functions HTTP Request trigger
        return cors(req, res, async () => {
            console.log('[INFO] Responding to ' +
                (req.query.test === 'true' ? 'test ' : 'live ') +
                req.query.action + ' action from ' + req.query.user + '...');
            global.db = (req.query.test === 'true') ? admin.firestore()
                .collection('partitions').doc('test') : admin.firestore()
                .collection('partitions').doc('default');
            const user = await Data.getUser(req.query.user);
            const data = new DataProxy(
                user,
                (await admin.auth().verifyIdToken(req.query.token)),
                req.query.action,
                req.body,
            );
            return data.act().then((result) => {
                res.json(result);
                console.log('[INFO] Resolved ' +
                    (req.query.test === 'true' ? 'test ' : 'live ') +
                    req.query.action + ' action from ' + user.name + ' (' +
                    req.query.user + ')...');
                if (!Stats.dataAction[req.query.action]) return console.warn(
                    '[WARNING] Data action (' + req.query.action + ') not yet' +
                    ' tracked.');
                return Stats.dataAction[req.query.action](
                    user,
                    req.body,
                    result,
                    (req.query.test === 'true'),
                );
            }).catch(async (err) => {
                console.error('Error while processing ' + req.query.action +
                    ' action from ' + req.query.user + ':', err);
                res.send('[ERROR] ' + err.message);
                if (!Stats.failedDataAction[req.query.action]) return console
                    .warn('[WARNING] Failed data action (' + req.query.action +
                        ') not yet tracked.');
                await Stats.failedDataAction[req.query.action](
                    user,
                    req.body,
                    err,
                    (req.query.test === 'true'),
                );
                throw err;
            });
        });
    },
    onCall: async (data, context) => { // Firebase Function HTTPS Callable trigger
        throw new Error('Tutorbook\'s onCall API is deprecated. Please use ' +
            'the HTTPS REST API (hosted at https://tutorbook-779d8-us-central' +
            '1.cloudfunctions.net/data) instead.');
        console.log('[INFO] Responding to ' + data.action + ' action from ' +
            context.auth.token.email + '...');
        global.db = (data.test) ? admin.firestore()
            .collection('partitions').doc('test') : admin.firestore()
            .collection('partitions').doc('default');
        const dataProxy = new DataProxy(
            (await Data.getUser(context.auth.uid)),
            context.auth.token,
            data.action,
            data.body,
        );
        return dataProxy.act().catch((err) => {
            throw new functions.https.HttpsError('internal', err.message);
        });
    },
};