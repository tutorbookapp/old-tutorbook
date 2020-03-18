# Data Utilities

A set of utilities for creating new locations, website configurations (for web
app subdomains/partitions), users, and access configurations (i.e. districts).

**Note:** Each of these scripts accept array input as comma separated values
(e.g. to populate a user's `subjects`, respond with `Chemistry H, Chemistry`).

## Districts

To create a new school district (or `access` partition), run:

```
$ node district.js
```

This will ask you a couple of questions to populate the district's Firestore
document:

- What is the school district's name?
- What is it's symbol (typically an abbreviation of the name)?
- What email domains are allowed at this school district?

## Websites

To create a new website configuration, run:

```
$ node website.js
```

This will ask you a couple of questions to populate the location's Firestore
document:

- What is the website's URL?
- What grades can be selected at this website?
- What locations are shown on this website?
- What district (or `access`) is this website a part of?
- What email domains are allowed to access this website?

## Locations

To create a new location, run:

```
$ node location.js
```

This will ask you a couple of questions to populate the location's Firestore
document:

- What is the location's name?
- What is it's description?
- When is it open?
- Who can supervise it (find users by name or email)?
- What is it's service hour rounding rules?
- What district (or `access`) is this location a part of?

## Users

To create a new user (both their Firestore document and Firebase Authentication
account), run:

```
$ node user.js
```

This will ask you a couple of questions to populate the user's Firestore
document (and Firebase Authentication account):

- What is this user's name?
- Is this user a supervisor, tutor, or pupil?
- What is their email? Phone? Gender? Grade?
- What subjects does this user have?
- When is this user available?
- Is this a paid user? If so, what is their hourly rate?
- What district (or `access`) is this user a part of?
