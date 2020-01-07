const db = require('firebase-admin').firestore().collection('partitions')
    .doc('default');

class Utils {

    constructor() {}

    static getPronoun(gender) {
        switch (gender) {
            case 'Male':
                return 'his';
            case 'Female':
                return 'her';
            default:
                return 'their';
        }
    }

    static async getSupervisorForLocation(locationName) {
        var supervisorId;
        (await db
            .collection('locations')
            .where('name', '==', locationName)
            .get()
        ).forEach((doc) => supervisorId = doc.data().supervisors[0]);
        if (!supervisorId) throw new Error('Could not get supervisor for the ' +
            locationName);
        return (await db
            .collection('users')
            .doc(supervisorId)
            .get()).data();
    }

    static async getUserFromPhone(phone) {
        var user;
        (await db
            .collection('users')
            .where('phone', '==', phone)
            .get()
        ).forEach((doc) => user = doc.data());
        return user;
    }
};


module.exports = Utils;