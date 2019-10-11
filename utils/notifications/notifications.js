var admin = require('firebase-admin');
var serviceAccount = require('./admin-cred.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://tutorbook-779d8.firebaseio.com"
});

var firestore = admin.firestore();
var messaging = admin.messaging();

function makeNotification(userToken, title, summary, actions, data) {
    try {
        var icon = data.fromUser.photo;
    } catch (e) {
        console.log("Could not find photo in data, skipping.", e);
        var icon = undefined;
    }

    // Send appropriate message
    var message = {
        'data': data,
        'webpush': {
            'data': data,
            'headers': {
                'Urgency': 'high'
            },
            'notification': {
                'body': summary,
                'icon': icon,
                'title': title,
                'requireInteraction': true,
                'actions': actions,
            },
        },
        'token': userToken,
    };
    return message;
};

function watchRequestsInbox(query, userToken) {
    query.onSnapshot((snapshot) => {
        if (!snapshot.size) {
            console.log("Query is empty, skipping.")
            return;
        }

        snapshot.docChanges().forEach((change) => {
            const data = change.doc;
            if (change.type === 'added') {
                // Get user data to show relevant notification messages
                var title = "Request from " + data.fromUser.name;
                var summary = "New request from " + data.fromUser.name + " for " + data.subject + " on " + data.time.day + "s at " + data.time.time + ".";
                var actions = [{
                    'action': 'view_request',
                    'title': 'View Request',
                }];

                var message = makeNotification(userToken, title, summary, actions, data);

                messaging.send(message).then((response) => {
                    console.log("Successfully sent new request message:", response);
                }).catch((err) => {
                    console.error("Error sending new request message:", err);
                });

            } else if (change.type === 'modified') {
                var title = "Request modified by " + data.fromUser.name;
                var summary = "Request from " + data.fromUser.name + " was modified.";
                var actions = [{
                    'action': 'view_request',
                    'title': 'View Changes',
                }];

                var message = makeNotification(userToken, title, summary, actions, data);

                messaging.send(message).then((response) => {
                    console.log("Successfully sent new request message:", response);
                }).catch((err) => {
                    console.error("Error sending new request message:", err);
                });

            } else if (change.type === 'removed') {
                var title = "Request from " + data.fromUser.name + " Canceled";
                var summary = "Request from " + data.fromUser.name + " for " + data.subject + " on " + data.time.day + "s at " + data.time.time + " was canceled.";
                var actions = [{}];

                var message = makeNotification(userToken, title, summary, actions, data);

                messaging.send(message).then((response) => {
                    console.log("Successfully sent new request message:", response);
                }).catch((err) => {
                    console.error("Error sending new request message:", err);
                });

            } else {
                console.warn("Invalid change type:", change.type);
                return;
            }
        });
    });
};

function testNotifications(userToken) {
    // Function to send user random test notification
    var title = "Test Notification";
    var summary = "This is a test notification to assure that my Node.js scripts are working properly.";
    var actions = [{
        'action': 'yes',
        'title': 'Yes, they\'re working',
    }];
    var data = {};

    var message = makeNotification(userToken, title, summary, actions, data);

    messaging.send(message).then((response) => {
        console.log("Successfully sent test message:", response);
    }).catch((err) => {
        console.error("Error sending test message:", err);
    });
};

function getUsersWithTokens() {
    console.log("Query for users with notificationTokens...");
    firestore.collection('users').where('notificationToken', '>', '').onSnapshot((snapshot) => {
        if (!snapshot.size) {
            console.log("Query for users with notificationTokens turned up empty.");
            return;
        }

        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
                console.log("Testing notifications for:", change.doc.id);
                testNotifications(change.doc.get('notificationToken'));
            }
        });
    });
};

getUsersWithTokens();