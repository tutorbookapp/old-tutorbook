# Data Security

This document is not Tutorbook's official legal policy (check out our [Security
Policy](https://tutorbook.app/legal#security) for that) but is rather meant to
give developers and other engineers more detailed technical insights as to how
we ensure our customer's data is secure.

## Data Storage

We use [Firestore](https://firebase.google.com/docs/firestore/) to store and
distribute customer and user data. We suggest reading the Firestore
documentation and getting an idea of Firestore's [data
model](https://firebase.google.com/docs/firestore/data-model) and
[security](https://firebase.google.com/docs/firestore/rtdb-vs-firestore#security)
before continuing.

The key to a secure Firestore database is to write good [Firestore
rules](https://firebase.google.com/docs/firestore/security/get-started) that use
[Firebase Authentication
tokens](https://firebase.google.com/docs/auth/users#auth_tokens) (which are sent
along with each database request) to restrict who can access what.

We implemented our Firestore rules by adding [custom auth
claims](https://firebase.google.com/docs/auth/admin/custom-claims) designating:
- Who is a supervisor (controlled by a `supervisor` boolean property) and which
  locations they supervise/manage (controlled by a `locations` array property).
  Supervisors can:
  - Edit their location(s) configuration data (e.g. service hour rounding rules,
    when the location is open for tutoring).
  - View, edit, and create profiles for users at their location(s).
  - View, edit, and create appointments, lesson requests, etc. for users at
    their location(s).
- Who goes to which school district (controlled by an `access` property). Users
  can only view data within their school district's `access`. Each Firestore
  document has an `access` property containing an array of `accessIds` (IDs of
  school district Firestore documents) that denote who can view it.

Check them (our `firestore.rules`) out for yourself [on our open source GitHub
repository](https://github.com/tutorbookapp/tutorbook/blob/develop/firebase/firestore.rules).

### Access Restrictions

To ensure that each school district's student data is kept secure and can only
be accessed by members of the school district, we add an `access` custom auth
claim to each user's Firebase Authentication token. Note that restrictions are
by district instead of by school to facilitate intradistrict tutoring
coordination (e.g. high school students tutoring middle schoolers).

Each school district has a Firestore document containing configuration data that
includes:

| Field     | Type     | Description                                                                                          | Example                               |
|:---------:|:--------:|:-----------------------------------------------------------------------------------------------------|:--------------------------------------|
| `name`    | `string` | The name of the school district.                                                                     | `'Palo Alto Unified School District'` |
| `symbol`  | `string` | The abbreviated name (or symbol) of the school district.                                             | `'PAUSD'`                             |
| `domains` |`string[]`| An array of valid email domains that can sign into the district's partitions of Tutorbook's web app. | `['pausd.org', 'pausd.us']`           |
