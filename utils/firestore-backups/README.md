# Tutorbook Firestore Backups

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
firestore-export -a ../admin-cred.json -b MM-DD-YYYY-HR:MIN-AM/PM.json -n
partitions/default -p
```

To upload a JSON snapshot and overwrite the data in the default database
partition:
```bash
firestore-import -a ../admin-cred.json -b MM-DD-YYYY-HR:MIN-AM/PM.json -n
partitions/default
```
