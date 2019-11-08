const to = require('await-to-js').default;
const admin = require('firebase-admin');
const assert = require('assert');
const cors = require('cors')({
    origin: true,
});


// Recieves a user, an action, and (optional) data. Performs requested action
// (using the below `Data` class) and sends snackbar message response.
class DataProxy {
    constructor(user, token, action, data) {
        assert(token.email === user.email);
        assert(token.uid === user.uid);
        ['name', 'email', 'id', 'type'].forEach((attr) => {
            if (!user[attr] || user[attr] === '')
                throw new Error('User did not have a valid ' + attr + '.');
        });
        ['photo', 'grade', 'gender', 'payments', 'proxy'].forEach((attr) => {
            if (!user[attr] || user[attr] === '')
                console.warn('User did not have a valid ' + attr +
                    ', falling back to default...');
        });
        global.app = {
            user: user,
            conciseUser: {
                name: user.name,
                email: user.email,
                id: user.id,
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
        const exists = async (collection, id) => {
            const doc = await global.db.collection('users').doc(user.id)
                .collection(collection).doc(id).get();
            console.log('Does ' + user.id + ' have a(n) ' + collection +
                ' doc (' + id + ')?', (doc.exists) ? 'Yes.' : 'No, erroring.');
            assert(doc.exists);
        };
        switch (action) {
            case 'createLocation':
                assert(token.supervisor);
                return Data.createLocation(data.location, data.id);
            case 'createUser':
                assert(token.email === data.email || token.supervisor);
                return Data.createUser(data);
            case 'newRequest':
                assert(token.email === data.request.fromUser.email || token.supervisor);
                return Data.newRequest(data.request, data.payment);
            case 'requestPayout':
                assert(user.type === 'Tutor' && user.payments.type === 'Paid');
                return Data.requestPayout();
            case 'requestPaymentFor':
                assert([
                        data.appt.attendees[0].email,
                        data.appt.attendees[1].email,
                    ].indexOf(token.email) >= 0 &&
                    user.type === 'Tutor' &&
                    user.payments.type === 'Paid' &&
                    data.appt.payment.type === 'Paid'
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
            case 'approveClockIn':
                assert(token.supervisor);
                await exists('clockIns', data.id);
                return Data.approveClockIn(data.clockIn, data.id);
            case 'approveClockOut':
                assert(token.supervisor);
                await exists('clockOuts', data.id);
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
                assert(token.email === data.request.toUser.email ||
                    token.supervisor);
                if (!token.supervisor) await exists('requestsIn', data.id);
                return Data.approveRequest(data.request, data.id);
            case 'modifyAppt':
                assert([
                    data.appt.attendees[0].email,
                    data.appt.attendees[1].email
                ].indexOf(token.email) >= 0 || token.supervisor);
                if (!token.supervisor) await exists('appointments', data.id);
                return Data.modifyAppt(data.appt, data.id);
            case 'deletePastAppt':
                assert([
                    data.appt.attendees[0].email,
                    data.appt.attendees[1].email
                ].indexOf(token.email) >= 0 || token.supervisor);
                if (!token.supervisor) await exists('pastAppointments', data.id);
                return Data.deletePastAppt(data.appt, data.id);
            case 'cancelAppt':
                assert([
                    data.appt.attendees[0].email,
                    data.appt.attendees[1].email
                ].indexOf(token.email) >= 0 || token.supervisor);
                if (!token.supervisor) await exists('appointments', data.id);
                return Data.cancelAppt(data.appt, data.id);
            case 'rejectRequest':
                assert(token.email === data.request.toUser.email ||
                    token.supervisor);
                if (!token.supervisor) await exists('requestsIn', data.id);
                return Data.rejectRequest(data.request, data.id);
            case 'cancelRequest':
                assert(token.email === data.request.fromUser.email ||
                    token.supervisor);
                if (!token.supervisor) await exists('requestsOut', data.id);
                return Data.cancelRequest(data.request, data.id);
            case 'modifyRequest':
                assert([
                    data.request.fromUser.email,
                    data.request.toUser.email,
                ].indexOf(token.email) >= 0 || token.supervisor);
                if (token.email === data.request.fromUser.email)
                    await exists('requestsOut', data.id);
                if (token.email === data.request.toUser.email)
                    await exists('requestsIn', data.id);
                return Data.modifyRequest(data.request, data.id);
            default:
                throw new Error('Data action (' + action + ') does not exist.');
        };
    }
};


// Straight from client-side implementation. TODO: Probably needs fine-tuning.
class Data {
    constructor() {
        this.initTimes();
        this.initHourlyCharges();
        this.initLocations();
    }

    static requestPayout() {
        return global.db.collection('users')
            .doc(global.app.user.id).collection('requestedPayouts').doc().set({
                timestamp: new Date(),
            });
    }

    static requestPaymentFor(appt, id) {
        const user = Data.getOther(appt.attendees);
        return global.db.collection('users').doc(user.email)
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
            db.collection('users').doc(approvedPayment.to.email)
            .collection('approvedPayments').doc(id),
            db.collection('users').doc(approvedPayment.from.email)
            .collection('approvedPayments').doc(id),
        ];
        const requestedPayment = db.collection('users')
            .doc(global.app.user.email)
            .collection('requestedPayments').doc(id);
        await requestedPayment.delete();
        return payments.forEach(async (payment) => {
            await payment.set(approvedPayment);
        });
    }

    static async denyPayment(deniedPayment, id) {
        const db = global.db;
        const payments = [
            db.collection('users').doc(approvedPayment.appt.attendees[0].email)
            .collection('deniedPayments').doc(id),
            db.collection('users').doc(approvedPayment.appt.attendees[1].email)
            .collection('deniedPayments').doc(id),
        ];
        const approvedPaymentRef = db.collection('users')
            .doc(global.app.user.email)
            .collection('needApprovalPayments').doc(id);
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
            //console.warn('Using an email as a user ID is deprecated.');
            var ref = await global.db.collection('users').doc(id)
                .get();
        } else {
            var ref = await global.db.collection('search').doc(id)
                .get();
        }
        if (ref.exists) {
            return ref.data();
        } else {
            console.error('User (' + id + ') did not exist.');
            throw new Error('User (' + id + ') did not exist.');
        }
    }

    static updateUser(user) {
        if (!user) {
            throw new Error('Could not update user b/c id was undefined.');
        }
        return global.db.collection('users').doc(user.id || user.email)
            .update(user);
    }

    static deleteUser(id) {
        if (!id) {
            throw new Error('Could not delete user b/c id was undefined.');
        }
        return global.db.collection('users').doc(id)
            .delete();
    }

    static async createLocation(location, id) {
        if (!location)
            throw new Error('Could not create location b/c it was undefined.');
        const doc = (id && id !== '') ? global.db.collection('locations')
            .doc(id) : global.db.collection('locations').doc();
        await doc.set(location);
        return {
            id: doc.id,
            location: location,
        };
    }

    static createUser(user) {
        if (!user || !user.id)
            throw new Error('Could not create user b/c id was undefined.');
        return global.db.collection('users').doc(user.id).set(user);
    }

    static async instantClockIn(appt, id) { // Creates and approves clock in
        const db = global.db;
        const clockIn = {
            sentTimestamp: new Date(),
            sentBy: global.app.conciseUser,
        };
        const supervisor = await Data.getLocationSupervisor(appt.location.id);
        const activeAppts = [
            db.collection('users').doc(appt.attendees[0].email)
            .collection('activeAppointments')
            .doc(id),
            db.collection('users').doc(appt.attendees[1].email)
            .collection('activeAppointments')
            .doc(id),
            db.collection('locations').doc(appt.location.id)
            .collection('activeAppointments')
            .doc(id),
        ];

        // Tedious work arounds for infinite reference loops
        appt = (await db.collection('users').doc(appt.attendees[0].email)
            .collection('appointments').doc(id).get()).data();
        appt.supervisor = supervisor;
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

    static async approveClockIn(clockIn, id) {
        const db = global.db;
        const ref = db.collection('users').doc(global.app.user.id)
            .collection('clockIns').doc(id);
        const approvedClockIn = db.collection('users').doc(global.app.user.id)
            .collection('approvedClockIns').doc();
        const activeAppts = [
            db.collection('users').doc(clockIn.for.attendees[0].email)
            .collection('activeAppointments')
            .doc(id),
            db.collection('users').doc(clockIn.for.attendees[1].email)
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
        if (!notThisUser.email && !!notThisUser.length) {
            if (notThisUser[0].email === global.app.user.email) {
                return notThisUser[1];
            }
            return notThisUser[0];
        }
        if (attendees[0].email === notThisUser.email) {
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
            db.collection('users').doc(appt.attendees[0].email)
            .collection('activeAppointments')
            .doc(id),
            db.collection('users').doc(appt.attendees[1].email)
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
            db.collection('users').doc(appt.attendees[0].email)
            .collection('pastAppointments')
            .doc(),
        ];
        const pastApptID = pastAppts[0].id;
        pastAppts.push(
            db.collection('users').doc(appt.attendees[1].email)
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

    static async approveClockOut(clockOutData, id) {
        // Tedious work around of the infinite loop
        const approvedClockOutData = Data.combineMaps(clockOutData, {
            approvedTimestamp: new Date(),
            approvedBy: global.app.conciseUser,
        });
        const appt = Data.cloneMap(approvedClockOutData.for);
        appt.clockOut = Data.cloneMap(approvedClockOutData);

        // Define Firestore doc locations
        const db = global.db;
        const clockOut = db.collection('users').doc(global.app.user.id)
            .collection('clockOuts').doc(id);
        const approvedClockOut = db.collection('users').doc(global.app.user.id)
            .collection('approvedClockOuts').doc();
        const activeAppts = [
            db.collection('users').doc(appt.attendees[0].email)
            .collection('activeAppointments')
            .doc(id),
            db.collection('users').doc(appt.attendees[1].email)
            .collection('activeAppointments')
            .doc(id),
            db.collection('locations').doc(appt.location.id)
            .collection('activeAppointments')
            .doc(id),
        ];
        const pastAppts = [
            db.collection('users').doc(appt.attendees[0].email)
            .collection('pastAppointments')
            .doc(),
        ];
        const pastApptID = pastAppts[0].id;
        pastAppts.push(
            db.collection('users').doc(appt.attendees[1].email)
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
        const supervisor = await Data.getLocationSupervisor(appt.location.id);
        const ref = db.collection('users').doc(supervisor)
            .collection('clockIns').doc(id);

        appt.supervisor = supervisor; // Avoid infinite reference loop
        appt.clockIn = Data.cloneMap(clockIn);
        clockIn.for = Data.cloneMap(appt);

        await ref.set(clockIn);
        await db.collection('users').doc(global.app.user.id).update({
            clockedIn: true
        });
        return {
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
        const ref = db.collection('users').doc(appt.supervisor)
            .collection('clockOuts').doc(id);

        appt.clockOut = Data.cloneMap(clockOut); // Avoid infinite ref loop
        clockOut.for = Data.cloneMap(appt);

        await ref.set(clockOut);
        await db.collection('users').doc(global.app.user.id).update({
            clockedOut: true
        });
        return {
            clockOut: clockOut,
            appt: appt,
            id: id,
        };
    }

    static async approveRequest(request, id) {
        const db = global.db;
        const requestIn = db.collection("users").doc(request.toUser.email)
            .collection('requestsIn')
            .doc(id);
        const requestOut = db.collection('users').doc(request.fromUser.email)
            .collection('requestsOut')
            .doc(id);
        // TODO: Right now we don't allow supervisors to approve requests.
        // Shoud we?
        const approvedRequestOut = db.collection('users').doc(request.fromUser.email)
            .collection('approvedRequestsOut')
            .doc(id);
        // NOTE: The appts must be processed in this order due to the way that
        // the Firestore rules are setup (i.e. first we check if there is an
        // approvedRequestOut doc, then we check if there is an appt doc
        // already created).
        const appts = [
            db.collection('users').doc(request.fromUser.email)
            .collection('appointments')
            .doc(id),
            db.collection('users').doc(request.toUser.email)
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

        var err;
        var res;
        [err, res] = await to(approvedRequestOut.set({
            for: request,
            approvedBy: app.conciseUser,
            approvedTimestamp: new Date(),
        }));
        if (err)
            throw new Error('Error while adding approvedRequestOut:', err);
        [err, res] = await to(requestOut.delete());
        if (err) throw new Error('Error while deleting requestOut:', err);
        [err, res] = await to(requestIn.delete());
        if (err) throw new Error('Error while deleting requestIn:', err);
        for (var i = 0; i < appts.length; i++) {
            var appt = appts[i];
            [err, res] = await to(appt.set(apptData));
            if (err) throw new Error('Error while creating appt doc:', err);
        }
        return {
            request: request,
            appt: apptData,
            id: id,
        };
    }

    static async modifyAppt(apptData, id) {
        const db = global.db;
        apptData = Data.trimObject(apptData);
        const appts = [
            db.collection('users').doc(apptData.attendees[0].email)
            .collection('appointments')
            .doc(id),
            db.collection('users').doc(apptData.attendees[1].email)
            .collection('appointments')
            .doc(id),
            db.collection('locations').doc(apptData.location.id)
            .collection('appointments')
            .doc(id),
        ];
        const modifiedAppts = [];
        if (apptData.attendees[0].email !== app.user.email) {
            modifiedAppts.push(db.collection('users').doc(apptData.attendees[0].email)
                .collection('modifiedAppointments').doc(id));
        }
        if (apptData.attendees[1].email !== app.user.email) {
            modifiedAppts.push(db.collection('users').doc(apptData.attendees[1].email)
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
            db.collection('users').doc(apptData.attendees[0].email)
            .collection('pastAppointments')
            .doc(id),
            db.collection('users').doc(apptData.attendees[1].email)
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
            db.collection('users').doc(apptData.attendees[0].email)
            .collection('appointments')
            .doc(id),
            db.collection('users').doc(apptData.attendees[1].email)
            .collection('appointments')
            .doc(id),
            db.collection('locations').doc(apptData.location.id)
            .collection('appointments')
            .doc(id),
        ];
        const canceledAppts = [];
        if (apptData.attendees[0].email !== app.user.email) {
            canceledAppts.push(db.collection('users').doc(apptData.attendees[0].email)
                .collection('canceledAppointments').doc(id));
        }
        if (apptData.attendees[1].email !== app.user.email) {
            canceledAppts.push(db.collection('users').doc(apptData.attendees[1].email)
                .collection('canceledAppointments').doc(id));
        }
        canceledAppts.push(db.collection('locations').doc(apptData.location.id)
            .collection('canceledAppointments').doc(id));

        if (apptData.for.payment.type === 'Paid') {
            // Delete the authPayment docs as well
            const authPayments = [
                db.collection('users').doc(apptData.attendees[0].email)
                .collection('authPayments')
                .doc(id),
                db.collection('users').doc(apptData.attendees[1].email)
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
        const requestIn = db.collection("users").doc(request.toUser.email)
            .collection('requestsIn')
            .doc(id);
        const requestOut = db.collection('users').doc(request.fromUser.email)
            .collection('requestsOut')
            .doc(id);
        const rejectedRequestOut = db.collection('users').doc(request.fromUser.email)
            .collection('rejectedRequestsOut')
            .doc(id);

        if (request.payment.type === 'Paid') {
            // Delete the authPayment docs as well
            const authPayments = [
                db.collection('users').doc(request.fromUser.email)
                .collection('authPayments')
                .doc(id),
                db.collection('users').doc(request.toUser.email)
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
        const requestIn = db.collection("users").doc(request.toUser.email)
            .collection('requestsIn')
            .doc(id);
        const requestOut = db.collection('users').doc(request.fromUser.email)
            .collection('requestsOut')
            .doc(id);

        if (request.payment.type === 'Paid') {
            // Delete the authPayment docs as well
            const authPayments = [
                db.collection('users').doc(request.fromUser.email)
                .collection('authPayments')
                .doc(id),
                db.collection('users').doc(request.toUser.email)
                .collection('authPayments')
                .doc(id),
            ];
            authPayments.forEach(async (authPayment) => {
                await authPayment.delete();
            });
        }

        const canceledRequests = [];
        if (request.toUser.email !== app.user.email) {
            canceledRequests.push(db.collection('users').doc(request.toUser.email)
                .collection('canceledRequestsIn').doc(id));
        }
        if (request.fromUser.email !== app.user.email) {
            canceledRequests.push(db.collection('users').doc(request.fromUser.email)
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
        const requestIn = db.collection("users").doc(request.toUser.email)
            .collection('requestsIn')
            .doc(id);
        const requestOut = db.collection('users').doc(request.fromUser.email)
            .collection('requestsOut')
            .doc(id);
        // We send modified requests to all users that aren't the currentUser
        const modifiedRequests = [];
        if (request.fromUser.email !== app.user.email) {
            modifiedRequests.push(db.collection('users')
                .doc(request.fromUser.email)
                .collection('modifiedRequestsOut')
                .doc(id));
        }
        if (request.toUser.email !== app.user.email) {
            modifiedRequests.push(db.collection('users')
                .doc(request.toUser.email)
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
        Object.entries(ob).forEach((entry) => {
            switch (typeof entry[1]) {
                case 'string':
                    result[entry[0]] = entry[1].trim();
                    break;
                case 'object': // Yay recursion!
                    if (!entry[1].getTime) {
                        result[entry[0]] = Data.trimObject(entry[1]);
                    } else { // It's a timestamp (don't try to trim it)
                        result[entry[0]] = entry[1];
                    }
                    break;
                default:
                    result[entry[0]] = entry[1];
            };
        });
        return result;
    }

    static async newRequest(request, payment) {
        const db = global.db;
        request = Data.trimObject(request);
        const requestIn = db.collection('users').doc(request.toUser.email)
            .collection('requestsIn')
            .doc();
        const requestOut = db.collection('users').doc(request.fromUser.email)
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
                        .doc(request.fromUser.email)
                        .collection('authPayments')
                        .doc(requestIn.id)
                        .set(payment);
                    await global.db.collection('users')
                        .doc(request.toUser.email)
                        .collection('authPayments')
                        .doc(requestIn.id)
                        .set(payment);
                    break;
                case 'Stripe':
                    // Authorize payment for capture (after the tutor clocks
                    // out and the pupil approves payment).
                    await global.db.collection('users')
                        .doc(request.fromUser.email)
                        .collection('sentPayments')
                        .doc(requestIn.id)
                        .set(payment);
                    break;
                default:
                    console.warn('Invalid payment method (' + payment.method +
                        '). Defaulting to PayPal...');
                    // Authorize payment for capture (after the tutor clocks
                    // out and the pupil approves payment).
                    await global.db.collection('users')
                        .doc(request.fromUser.email)
                        .collection('authPayments')
                        .doc(requestIn.id)
                        .set(payment);
                    await global.db.collection('users')
                        .doc(request.toUser.email)
                        .collection('authPayments')
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
    'Parent',
    'Supervisor',
];


module.exports = {
    onRequest: (req, res) => { // Firebase Functions HTTP Request trigger
        return cors(req, res, async () => {
            console.log('Responding to ' + req.query.action + ' action from ' +
                req.query.user + '...');
            global.db = (req.query.sandbox) ? admin.firestore()
                .collection('sandbox').doc('tutorbook') : admin.firestore();
            const data = new DataProxy(
                (await Data.getUser(req.query.user)),
                (await admin.auth().verifyIdToken(req.query.token)),
                req.query.action,
                req.body,
            );
            return data.act().then((result) => {
                res.json(result);
            }).catch((err) => {
                console.error('Error while processing ' + req.query.action +
                    ' action from ' + req.query.user + ':', err.message);
                res.send('[ERROR] ' + err.message);
                throw err;
            });
        });
    },
    onCall: async (data, context) => { // Firebase Function HTTPS Callable trigger
        console.log('Responding to ' + data.action + ' action from ' +
            context.auth.token.email + '...');
        global.db = (data.sandbox) ? admin.firestore()
            .collection('sandbox').doc('tutorbook') : admin.firestore();
        const dataProxy = new DataProxy(
            (await Data.getUser(context.auth.token.email)),
            context.auth.token,
            data.action,
            data.body,
        );
        return dataProxy.act().catch((err) => {
            throw new functions.https.HttpsError('internal', err.message);
        });
    },
};