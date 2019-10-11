// TODO: Use randomuser.me to generate randomUsers (see Python utility)
'use strict';

/**
 * Adds a set of mock Users to the Cloud Firestore.
 */
Tutorbook.prototype.addMockUsers = function() {
    var promises = [];

    for (var i = 0; i < 20; i++) {
        var firstName = this.getRandomItem(this.data.firstNames);
        var lastName = this.getRandomItem(this.data.lastNames);
        var name = firstName + ' ' + lastName;
        var email = firstName + '.' + lastName + '@gmail.com';
        var grade = this.getRandomGrade();
        var phone = this.getRandomPhone();
        var gradeString = this.getGradeString(grade);
        var gender = this.getRandomItem(this.data.genders);
        var neededStudies = this.getRandomItem(this.data.subjects);
        var proficientStudies = this.getRandomItem(this.data.subjects);
        var photoID = Math.floor(Math.random() * 22) + 1;
        var photo = 'https://storage.googleapis.com/firestorequickstarts.appspot.com/food_' + photoID + '.png';
        var numRatings = 0;
        var avgRating = 0;

        var promise = this.addUser({
            email: email,
            phone: phone,
            gender: gender,
            grade: grade,
            gradeString: gradeString,
            name: name,
            neededStudies: neededStudies,
            proficientStudies: proficientStudies,
            numRatings: numRatings,
            avgRating: avgRating,
            photo: photo
        });

        if (!promise) {
            alert('addUser() is not implemented yet!');
            return Promise.reject();
        } else {
            promises.push(promise);
        }
    }

    return Promise.all(promises);
};

/**
 * Adds a set of mock Ratings to the given Restaurant.
 */
Tutorbook.prototype.addMockRatings = function(userID) {
    var ratingPromises = [];
    for (var r = 0; r < 5 * Math.random(); r++) {
        var rating = this.data.ratings[
            parseInt(this.data.ratings.length * Math.random())
        ];
        rating.userName = 'Bot';
        rating.userPhoto = 'https://cdn.mee6.xyz/assets/logo.png';
        rating.userEmail = 'web.bot@example.com';
        rating.timestamp = new Date();
        rating.userId = firebase.auth().currentUser.uid;
        ratingPromises.push(this.addRating(userID, rating));
    }
    return Promise.all(ratingPromises);
};