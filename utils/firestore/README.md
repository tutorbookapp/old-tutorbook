# Firestore Utilities

A set of utilities for managing and backing up our Firestore database (e.g.
deleting indexes, saving data as locally stored JSON).

## Index Management

To delete all of our indexes via Firestore's [Google Cloud REST
API](https://cloud.google.com/firestore/docs/reference/rest/v1beta1/projects.databases.indexes/list)
first make sure to replace the `TODO` string constants (e.g. add the Google
Cloud Platform OAuth 2.0 client information) in `delete-indexes.js`. Then, run:

```
$ node delete-indexes.js
```

## Data Backups

Included in this directory are locally stored (not backed up to GitHub for
obvious privacy reasons) Firestore backup JSON files created with [this command
line tool](https://www.npmjs.com/package/node-firestore-import-export).

Filenames indicate the start time of the backup and are as follows:

```
MM-DD-YYYY-HR:MIN-AM/PM.json
```

To take a snapshot of the data in the default database partition and save it in
JSON format:

```bash
$ firestore-export -a ../admin-cred.json -b MM-DD-YYYY-HR:MIN-AM/PM.json -n
partitions/default -p
```

To upload a JSON snapshot and overwrite the data in the default database
partition:

```bash
$ firestore-import -a ../admin-cred.json -b MM-DD-YYYY-HR:MIN-AM/PM.json -n
partitions/default
```
