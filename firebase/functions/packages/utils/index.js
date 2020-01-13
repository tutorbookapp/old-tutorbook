const db = require('firebase-admin').firestore().collection('partitions')
    .doc('default');

class Utils {

    constructor() {}

    static getAvailabilityString(data) {
        if ([
                'Gunn Academic Center',
                'Paly Peer Tutoring Center',
                'JLS Library',
            ].indexOf(data.location) >= 0) {
            return data.day + 's at the ' + data.location + ' from ' +
                data.fromTime + ' to ' + data.toTime;
        }
        return data.day + 's at ' + data.location + ' from ' + data.fromTime +
            ' to ' + data.toTime;
    }

    static getAvailabilityStrings(availability, addPeriod) {
        // NOTE: User availability is stored in the Firestore database as:
        // availability: {
        // 	Gunn Academic Center: {
        //     Friday: [
        //       { open: '10:00 AM', close: '3:00 PM' },
        //       { open: '10:00 AM', close: '3:00 PM' },
        //     ],
        //   },
        //   Paly Tutoring Center: {
        //   ...
        //   },
        // };
        const availableTimes = [];
        Object.entries(availability).forEach((entry) => {
            var location = entry[0];
            var times = entry[1];
            Object.entries(times).forEach((time) => {
                var day = time[0];
                var openAndCloseTimes = time[1];
                openAndCloseTimes.forEach((openAndCloseTime) => {
                    availableTimes.push(Utils.getAvailabilityString({
                        day: day,
                        location: location,
                        fromTime: openAndCloseTime.open,
                        toTime: openAndCloseTime.close,
                    }) + (addPeriod ? '.' : ''));
                });
            })
        });

        // Next, sort the strings by day
        const result = [];
        const temp = {};
        availableTimes.forEach((time) => {
            var day = time.split(' ')[0];
            try {
                temp[day].push(time);
            } catch (e) {
                temp[day] = [time];
            }
        });
        [
            'Mondays',
            'Tuesdays',
            'Wednesdays',
            'Thursdays',
            'Fridays',
            'Saturdays',
            'Sundays',
        ].forEach((day) => {
            Object.entries(temp).forEach((entry) => {
                if (entry[0] === day) {
                    entry[1].forEach((time) => {
                        result.push(time);
                    });
                }
            });
        });
        return result;
    }

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