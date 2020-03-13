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

## Indexes

Learn more about Firestore indexes at [their official
documentation](https://firebase.google.com/docs/firestore/query-data/index-overview)
before reading below (or, if you're already pretty familiar with the concept of
database indexing, feel free to forge ahead).

Our indexes are primarily [composite indexes](https://firebase.google.com/docs/firestore/query-data/index-overview#composite_indexes)
that power the filter options in our app's [primary search
view](https://tutorbook.app/app/search). Note that indexes do not (easily)
support text based searches (instead, we use [Algolia](https://algolia.com)
paired with Firebase Cloud Functions as described
[here](https://firebase.google.com/docs/firestore/solutions/search)). You can
view all of our indexes in `firebase/firestore.indexes.json` (and check out
those Firebase Cloud Functions in `firebase/functions/index.js` and
`firebase/functions/packages/algolia/index.js`).

We also provide some useful Firestore index management utilities (e.g. you can
batch delete indexes without having to manually click the 'Delete' option for
**each index** in the Firebase console) in `utils/firestore` which are explained
[here](https://tutorbook.app/docs/tutorial-Utilities.html).
