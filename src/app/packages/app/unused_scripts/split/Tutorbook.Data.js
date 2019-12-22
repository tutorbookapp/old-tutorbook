'use strict';

Tutorbook.prototype.updateCurrentUser = function() {
    // Get user data from firestore database
    this.currentUser = {
        grade: '',
        gradeString: '',
        proficientStudies: [],
        neededStudies: [],
        profile: '',
        type: '',
        numRatings: 0,
        avgRating: 0,
        gender: '',
        name: firebase.auth().currentUser.displayName,
        email: firebase.auth().currentUser.email,
        phone: '',
        photo: firebase.auth().currentUser.photoURL
    };

    var that = this;
    return this.getUser(this.currentUser.email).then(function(doc) {
        var data = doc.data();
        /*
         *console.log(data);
         */
        Object.keys(that.currentUser).forEach(function(attr) {
            if (data[attr]) {
                /*
                 *console.log("Updating currentUser " + attr, +":", data[attr]);
                 */
                that.currentUser[attr] = data[attr];
            }
        });
        /*
         *console.log("Updated user:", that.currentUser);
         */
    }).catch(function(error) {
        // Set user data to database
        console.error(error);
        that.addUser(that.currentUser);
    });
};

Tutorbook.prototype.updateUser = function(data) {
    var doc = firebase.firestore().collection('usersByEmail').doc(data.email);
    return doc.update(data);
};

Tutorbook.prototype.addStudy = function(data, id) {
    var doc = firebase.firestore().collection('usersByEmail').doc(this.currentUser.email).collection(id).doc(data.name);
    return doc.set(data);
};

Tutorbook.prototype.addUser = function(data) {
    var doc = firebase.firestore().collection('usersByEmail').doc(data.email);
    return doc.set(data);
};

Tutorbook.prototype.getAllUsers = function(renderer) {
    var query = firebase.firestore()
        .collection('usersByEmail')
        .orderBy('avgRating', 'desc')
        .limit(50);

    this.getDocumentsInQuery(query, renderer);
};

Tutorbook.prototype.getDocumentsInQuery = function(query, renderer) {
    var that = this;
    query.onSnapshot(function(snapshot) {
        if (!snapshot.size) {
            console.log("Query " + that.filters + " is empty, showing no user screen.");
            return renderer.empty(); // Display "There are no users".
        }

        snapshot.docChanges().forEach(function(change) {
            if (change.type === 'removed') {
                renderer.remove(change.doc);
            } else {
                renderer.display(change.doc);
            }
        });
    });
};

Tutorbook.prototype.getUser = function(id) {
    return firebase.firestore().collection('usersByEmail').doc(id).get();
};

Tutorbook.prototype.getUserData = function(id) {
    firebase.firestore().collection('usersByEmail').doc(id).get().then(function(doc) {
        if (doc.exists) {
            return doc.data();
        } else {
            console.error("No user document with ID", id);
            return;
        }
    });
};

Tutorbook.prototype.getFilteredUsers = function(filters, renderer) {
    var query = firebase.firestore().collection('usersByEmail');

    if (filters.grade !== 'Any') {
        query = query.where('gradeString', '==', filters.grade);
    }

    if (filters.subject !== 'Any') {
        query = query.where('proficientSubject', '==', filters.subject);
    }

    if (filters.gender !== 'Any') {
        query = query.where('gender', '==', filters.gender);
    }

    if (filters.type !== 'Any') {
        query = query.where('type', '==', filters.type);
    }

    if (filters.sort === 'Rating') {
        query = query.orderBy('avgRating', 'desc');
    } else if (filters.sort === 'Reviews') {
        query = query.orderBy('numRatings', 'desc');
    }

    console.log("Getting documents for " + this.filters + "...");
    this.getDocumentsInQuery(query, renderer);
};

Tutorbook.prototype.addRating = function(userID, rating) {
    var collection = firebase.firestore().collection('usersByEmail');
    var document = collection.doc(userID);
    var newRatingDocument = document.collection('ratings').doc();

    return firebase.firestore().runTransaction(function(transaction) {
        return transaction.get(document).then(function(doc) {
            var data = doc.data();

            var newAverage =
                (data.numRatings * data.avgRating + rating.rating) /
                (data.numRatings + 1);

            transaction.update(document, {
                numRatings: data.numRatings + 1,
                avgRating: newAverage
            });
            return transaction.set(newRatingDocument, rating);
        });
    });
};

Tutorbook.prototype.addRequest = function(userID, request) {
    const EMTPY_USER_DATA = {
        name: '',
        email: '',
        avgRating: '',
        gender: '',
        gradeString: '',
        grade: '',
        neededStudy: '',
        proficientStudy: '',
        profile: '',
        type: '',
        photo: '',
        phone: '',
        numRatings: '',
    };

    // First, add it to the other users requestsIn inbox
    // to wait for approval.
    console.log("Adding request to target user's inbox...");
    var targetsInbox = firebase.firestore().collection('usersByEmail').doc(userID).collection('requestsIn');
    targetsInbox.add(request).catch(function(error) {
        console.error("Error writing new request to Firebase Database", error);
    });
    console.log("Done.");

    // Next, we add it to this user's requestsOut outbox
    // so as to reference it in the user's dashboard
    // (where he/she can cancel if desired)
    console.log("Adding request to your outbox...");
    var currentUserID = firebase.auth().currentUser.email;
    // TODO: Move from using email as unique ID to using 
    // Firebase.auth()'s built-in uid attribute
    var yourOutbox = firebase.firestore().collection('usersByEmail').doc(currentUserID).collection('requestsOut');

    this.getUser(userID).then(function(doc) {
        if (doc.exists) {
            console.log("Got data for user " + userID + ":", doc.data());
            return doc.data();
        } else {
            console.error("No user doc for ID ", userID);
            return EMPTY_USER_DATA;
        }
    }).then(function(targetUser) {
        request = {
            subject: request.subject,
            message: request.message,
            time: request.time,
            userName: targetUser.name,
            userID: userID,
            userPhoto: targetUser.photo,
            userEmail: targetUser.email,
            timestamp: request.timestamp,
        };

        yourOutbox.add(request);

    }).catch(function(error) {
        console.error("Error adding request to outbox:", error);
    });
    console.log("Done.");

};

Tutorbook.prototype.addMessage = function(messageText, userEmail) {
    return firebase.firestore().collection('messages').add({
        fromName: firebase.auth().currentUser.displayName,
        fromID: firebase.auth().currentUser.email,
        fromProfilePicUrl: firebase.auth().currentUser.photoURL,
        toName: this.getUser(userEmail).then(function(doc) {
            if (doc.exists) {
                return doc.data().name;
            } else {
                console.error("No user doc for ID", userEmail);
            }
        }),
        toID: userEmail,
        text: messageText,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function(error) {
        console.error('Error writing new messages to Firebase Database', error);
    });
};

Tutorbook.prototype.getMessageGroups = function(userID) {
    // TODO: Render messages that are to a certain userID
    // Renderer should account for multiple conversations
    // (i.e. this is just between two ppl vs. a group chat)
    var query = firebase.firestore()
        .collection('messages')
        .where("userIDs", "array-contains", userID);

    var that = this;
    query.onSnapshot(function(snapshot) {
        if (!snapshot.size) {
            console.log("Query for user groups with userID " + userID + " is empty, showing no user screen.");
            return that.messageGroupRenderer.empty(); // Display "There are no messages".
        }

        snapshot.docChanges().forEach(function(change) {
            if (change.type === 'removed') {
                that.messageGroupRenderer.remove(change.doc);
            } else {
                that.messageGroupRenderer.display(change.doc);
            }
        });
    });
};

Tutorbook.prototype.getMessages = function(groupID) {
    // TODO: This should actually render those messages
    // into a readable format using the renderer defined 
    // in Tutorbook.View.js
    var query = firebase.firestore()
        .collection('messages')
        .doc(groupID)
        .collection('messages')
        .orderBy('timestamp', 'desc')
        .limit(10);

    var that = this;
    query.onSnapshot(function(snapshot) {
        if (!snapshot.size) {
            console.log("Query for messages for groupID " + groupID + " is empty, showing no user screen.");
            return that.messagesRenderer.empty(); // Display "There are no messages".
        }

        snapshot.docChanges().forEach(function(change) {
            if (change.type === 'removed') {
                that.messagesRenderer.remove(change.doc);
            } else {
                that.messagesRenderer.display(change.doc);
            }
        });
    });
};


// Saves a new message on the Cloud Firestore.
Tutorbook.prototype.addMessage = function(messageText, groupID) {
    // Add a new message entry to the Firebase database.
    return firebase.firestore().collection('messages').doc(groupID).collection('messages').add({
        userName: firebase.auth().currentUser.displayName,
        messageText: messageText,
        userPhoto: firebase.auth().currentUser.photoURL,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function(error) {
        console.error('Error writing new message to Firebase Database', error);
    });
};


Tutorbook.prototype.getDashboardData = function(userID) {
    const types = ['requestsIn', 'requestsOut', 'upcoming'];

    var that = this;
    types.forEach(function(type) {
        var query = firebase.firestore()
            .collection('usersByEmail')
            .doc(userID)
            .collection(type)
            .orderBy('timestamp', 'desc')
            .limit(30) // TODO: Do we really want to limit requests by 30?

        query.onSnapshot(function(snapshot) {
            if (!snapshot.size) {
                return that.dashboardRenderer.empty(type);
            }

            snapshot.docChanges().forEach(function(change) {
                if (change.type === 'removed') {
                    that.dashboardRenderer.remove(change.doc, type);
                } else {
                    that.dashboardRenderer.display(change.doc, type);
                }
            });
        });
    });
};