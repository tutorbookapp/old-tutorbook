const cors = require('cors')({
    origin: true,
});
const getAvailabilityStrings = require('utils').getAvailabilityStrings;
const PDFDocument = require('pdfkit');
const admin = require('firebase-admin');
const firestore = admin.firestore();
const partitions = {
    test: firestore.collection('partitions').doc('test'),
    default: firestore.collection('partitions').doc('default'),
};

const styles = {
    h1: {
        font: 'Poppins-Bold',
        fontSize: 36,
        padding: 52,
        align: 'center',
    },
    h2: {
        font: 'Poppins-Bold',
        fontSize: 24,
        padding: 8,
        textTransform: 'capitalize',
    },
    para: {
        font: 'Roboto-Regular',
        fontSize: 12,
        padding: 4,
        textTransform: 'capitalize',
    },
    bold: {
        font: 'Roboto-Bold',
        fontSize: 12,
        continued: true,
        textTransform: 'uppercase',
    },
};

const caps = (str) => {
    if (!str || typeof str !== 'string') return 'Unknown';
    if (str.substr(0, 4) === 'http') return str;
    return str[0].toUpperCase() + str.substr(1);
};

const parse = (key, val) => {
    switch (key) {
        case 'subjects':
            return val.join(', ') + '.';
        case 'proxy':
            return val.join(', ') + '.';
        case 'locations':
            return val.join(', ') + '.';
        case 'availability':
            return getAvailabilityStrings(val).join(', ') + '.';
        default:
            return 'Adding complex object-to-string conversion soon.';
    }
};

const enumerate = (ob, add, doc) => {
    Object.entries(ob).forEach(([key, val]) => {
        switch (typeof val) {
            case 'string':
                add(key + ': ', styles.bold, doc);
                add(val, styles.para, doc);
                break;
            case 'number':
                return doc
                add(key + ': ', styles.bold, doc);
                add(new String(val), styles.para, doc);
                break;
            case 'boolean':
                add(key + ': ', styles.bold, doc);
                add(val ? 'Yes' : 'No', styles.para, doc);
                break;
            case 'object':
                add(key + ': ', styles.bold, doc);
                add(parse(key, val), styles.para, doc);
                break;
            default:
                throw new Error('Unsupported field type: ' + typeof val);
        }
    });
};

const add = (text, style, doc) => {
    if (style.font) doc.font(style.font);
    if (style.fontSize) doc.fontSize(style.fontSize);
    if (style.textTransform === 'capitalize') text = caps(text);
    if (style.textTransform === 'uppercase') text = text.toUpperCase();
    doc.text(text, style);
    if (style.padding && !style.continued) doc.y += style.padding;
};

const backupAsPDF = (req, res) => {
    return cors(req, res, async () => {
        const isTest = req.query.test === 'true';
        console.log('[DEBUG] Responding to ' + (isTest ? 'test' : 'live') +
            ' backup as PDF request for location (' + req.query.location +
            ')...');
        const token = await admin.auth().verifyIdToken(req.query.token);
        if (!token.supervisor) return res.status(400).send('[ERROR] Given ' +
            'authentication token lacks supervisor custom auth.');
        if (token.locations.indexOf(req.query.location) < 0) return res
            .status(400).send('[ERROR] Token\'s locations did not contain ' +
                'requested location.');
        const db = isTest ? partitions.test : partitions.default;
        const locations = (await db.collection('locations').get()).docs;
        if (locations.map(d => d.id).indexOf(req.query.location) < 0) return res
            .status(400).send('[ERROR] Requested location doesn\'t exist.');
        if (req.query.tutors !== 'true' && req.query.pupils !== 'true')
            return res.status(400).send('[ERROR] Skipping empty request.');
        const doc = new PDFDocument();
        const locationName = locations[locations
            .findIndex(d => d.id === req.query.location)].data().name;
        const types = req.query.tutors === 'true' &&
            req.query.pupils === 'true' ? ['Tutor', 'Pupil'] :
            req.query.tutors === 'true' ? ['Tutor'] : ['Pupil'];
        Object.values(styles).forEach((style) => {
            doc.registerFont(style.font, 'fonts/' + style.font + '.ttf');
        });
        doc.pipe(res);
        doc.image('img/text-logo-bg.png', 612 / 8, 792 / 3, {
            width: 612 * 3 / 4, // Center horz, 1/3 from top, and size 3/4 width
        });
        doc.y += (792 / 3) + styles.h1.padding;
        add(locationName.split(' ')[0] + ' Data Backup', styles.h1, doc);
        (await db
            .collection('users')
            .where('location', '==', locationName)
            .where('type', 'in', types)
            .orderBy('name')
            .get()
        ).forEach((d) => {
            const user = d.data();
            doc.addPage();
            add(user.name, styles.h2, doc);
            enumerate(user, add, doc);
        });
        doc.end();
    });
};

module.exports = backupAsPDF;