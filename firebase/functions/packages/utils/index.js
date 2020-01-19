const db = require('firebase-admin').firestore().collection('partitions')
    .doc('default');

class Utils {

    constructor() {}

    static addDurationStrings(current, duration) {
        // Formatted as: Hr:Min:Sec.Millisec
        var currentHours = new Number(current.split(':')[0]);
        var currentMinutes = new Number(current.split(':')[1]);
        var currentSeconds = new Number(current.split(':')[2].split('.')[0]);
        var durationHours = new Number(duration.split(':')[0]);
        var durationMinutes = new Number(duration.split(':')[1]);
        var durationSeconds = new Number(duration.split(':')[2].split('.')[0]);

        // Add the two durations
        currentHours += durationHours;
        currentMinutes += durationMinutes;
        currentSeconds += durationSeconds;

        // Parse the current values to ensure they are formatted correctly
        if (currentSeconds >= 60) {
            currentMinutes += parseInt(currentSeconds / 60);
            currentSeconds = currentSeconds % 60;
        }
        if (currentMinutes >= 60) {
            currentHours += parseInt(currentMinutes / 60);
            currentMinutes = currentMinutes % 60;
        }

        const f = (num) => ("0" + num).slice(-2);
        return f(currentHours) + ':' + f(currentMinutes) + ':' +
            f(currentSeconds);
    }

    static getDurationStringFromDates(start, end) {
        const secs = (end.getTime() - start.getTime()) / 1000;
        return Utils.getDurationStringFromSecs(secs);
    }

    static getDurationStringFromSecs(secs) {
        // See: https://www.codespeedy.com/convert-seconds-to-hh-mm-ss-format-
        // in-javascript/
        const time = new Date(null);
        time.setSeconds(secs);
        return time.toISOString().substr(11, 8);
    }

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