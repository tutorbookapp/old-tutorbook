# Data Storage

We use [Firestore](https://firebase.google.com/docs/firestore/) to store and
distribute customer and user data. We suggest reading the Firestore
documentation and getting an idea of Firestore's [data
model](https://firebase.google.com/docs/firestore/data-model) and
[security](https://firebase.google.com/docs/firestore/rtdb-vs-firestore#security)
before continuing.

If you're only interested in learning about how we secure our customer data,
read this [security tutorial](https://tutorbook.app/docs/tutorial-Security.html)
. If you're interested in what our data structure looks like, then continue!

## Data Structure

Firestore is organized almost like your traditional filesystem.
[Documents](https://firebase.google.com/docs/firestore/data-model#documents)
(that contain `key`, `value` pairs) are contained in
[collections](https://firebase.google.com/docs/firestore/data-model#collections)
(much like PDFs organized in the folders on your computer).

<img src="https://firebase.google.com/docs/firestore/images/structure-data.png"
     alt="Collections, Documents, and Data Image"
     style="width: 250px;"/>

Below is how we organize our Firestore collections:

```
.
└── partitions
    ├── default
    │   ├── access
    │   ├── auth
    │   ├── chats
    │   │   └── messages
    │   ├── locations
    │   │   ├── announcements
    │   │   │   └── messages
    │   │   ├── appointments
    │   │   ├── canceledAppointments
    │   │   ├── modifiedAppointments
    │   │   └── pastAppointments
    │   ├── stripeAccounts
    │   ├── stripeCustomers
    │   ├── users
    │   │   ├── appointments
    │   │   ├── approvedRequestsOut
    │   │   ├── canceledAppointments
    │   │   ├── canceledRequestsIn
    │   │   ├── modifiedAppointments
    │   │   ├── modifiedRequestsIn
    │   │   ├── modifiedRequestsOut
    │   │   ├── pastAppointments
    │   │   ├── rejectedRequestsOut
    │   │   ├── requestsIn
    │   │   └── requestsOut
    │   └── websites
    └── test
```
