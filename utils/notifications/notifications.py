import pdb
import os
import logging

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from firebase_admin import messaging


logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


def initFirestore(
    pathToCert=os.path.join(os.path.dirname(__name__), "admin-cred.json")
):
    cred = credentials.Certificate(pathToCert)
    firebase_admin.initialize_app(cred)
    return firestore.client()  # Return database reference


# def on_request_out_snapshot(snapshot):
    # for doc in snapshot:
        # if doc.change == 'added':
        # elif doc.change == 'removed':
            # return None # stub
            # # TODO: Show canceled request notification
        # else:
            # return None # stub
            # # TODO: Show notification that request has been changed


def on_request_in_snapshot(snapshot):
    for doc in snapshot:
        if doc.change == 'added':
            # Get user data to show relevant notification info
            title = "Request from " + doc.get('fromUser.name').split()[0]
            summary = "New request from " + doc.get('fromUser.name') + " for " + doc.get('subject') + " on " + doc.get('day') + "s at " + doc.get('time') + "."
            # Get the photo from the user document that holds this document's subcollection
            fromUserPhoto = doc.get('fromUser.photo')

            message = messaging.Message(
                    data={
                        'lastUpdate': doc.update_time,
                        'created': doc.create_time,
                        'data': doc.to_dict(),
                        },
                notification=messaging.Notification(
                    title=title,
                    body=summary,
                ),
                webpush=messaging.WebpushConfig(
                    headers={
                        'Urgency': 'high'
                    },
                    notification=messaging.WebpushNotification(
                        title=title,
                        body=summary,
                        require_interaction=True,
                        icon=fromUserPhoto,
                        actions=[messaging.WebpushNotificationAction('view_request', 'View Request')]
                    )
                ),
                token=registration_token,
            )
            response = messaging.send(message)
        # elif doc.change == 'removed':
            # # TODO: Show canceled request notification
        # else:
            # # TODO: Show notification that request has been changed


def on_collection_snapshot(collection_snapshot):
    for doc in collection_snapshot.documents:
        print(f"Recieved user document snapshot: {doc.id}")
        # Send notifications when a document is added or removed
        # (i.e. removed == request was canceled and added == you have a new
        # request from __!)
        doc.collection('requestsIn').on_snapshot(on_request_in_snapshot)
        doc.collection('requestsOut').on_snapshot(on_request_out_snapshot)


def test_notifications():
    # Send notifications to all active users
    db = initFirestore()
    for doc in db.collection('users').list_documents():
        # This registration token comes from the client FCM SDKs.
        try:
            registration_token = doc.get().get('notificationToken')
            if registration_token is None or registration_token == '':
                continue

            logger.info(f"Sending notification to {doc.id}...")
            logger.debug(f"With token: {registration_token}")

            # See documentation on defining a message payload.
            message = messaging.Message(
                data={
                    'score': '850',
                    'time': '2:45',
                },
                notification=messaging.Notification(
                    title='Test Notification',
                    body='This is a test notification.',
                ),
                webpush=messaging.WebpushConfig(
                    headers={
                        'Urgency': 'high'
                    },
                    notification=messaging.WebpushNotification(
                        title='A Web Test Notification',
                        body='This is a web test notification from a python script.',
                        require_interaction=True,
                        icon='https://lh6.googleusercontent.com/-2ZeeLPx2zIA/AAAAAAAAAAI/AAAAAAAADUM/1O3YQj5sA9Q/s96-c/photo.jpg',
                        badge='https://lh6.googleusercontent.com/-2ZeeLPx2zIA/AAAAAAAAAAI/AAAAAAAADUM/1O3YQj5sA9Q/s96-c/photo.jpg'
                    )
                ),
                token=registration_token,
            )

            # Send a message to the device corresponding to the provided
            # registration token.
            response = messaging.send(message)
            # Response is a message ID string.
            logger.debug(f"Successfully sent message: {response}")
        except KeyError as e:
            logger.warn(f"{e} while getting notification token from {doc.id}, skipping.")
            continue


if __name__ == "__main__":
    # db = initFirestore()
    # user_watch = db.collection('users').on_snapshot(on_col_snapshot)
    test_notifications()
