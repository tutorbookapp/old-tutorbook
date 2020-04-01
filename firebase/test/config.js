// =============================================================================
// DEPENDENCIES
// =============================================================================

const fs = require('fs');
const path = require('path');
const firebasePort = require('../../firebase.json').emulators.firestore.port;

const { TUTOR } = require('./data.js');

// =============================================================================
// REFERENCE CONSTANTS
// =============================================================================

const PORT = firebasePort ? firebasePort : 8080;
const FIRESTORE_RULES_FILE = path.resolve(__dirname, '../firestore.rules');
const UNSUPPORTED_FILTERS = {
  // We use our one `array-contains` for `access`.
  subject: ['array-contains', TUTOR.subjects[0]],
  availability: ['array-contains', TUTOR.availability[0]],
};

// =============================================================================
// CONFIGURATION CONSTANTS
// =============================================================================

const FIRESTORE_RULES = fs.readFileSync(FIRESTORE_RULES_FILE, 'utf8');
const PROJECT_ID = 'tutorbook-779d8';
const COVERAGE_URL =
  'http://localhost:' +
  PORT +
  '/emulator/v1/projects/' +
  PROJECT_ID +
  ':ruleCoverage.html';
const FUNCTIONS_URL = 'http://localhost:5001/' + PROJECT_ID + '/us-central1/';
const FILTERS = {
  grade: ['==', TUTOR.grade],
  gender: ['==', TUTOR.gender],
  location: ['==', TUTOR.location],
  type: ['==', TUTOR.type],
  'payments.type': ['==', TUTOR.payments.type],
  'config.showProfile': ['==', true],
};
const SORTERS = ['avgRating', 'numRatings'];
const USER_SUBCOLLECTIONS = [
  'requestsIn',
  'canceledRequestsIn',
  'modifiedRequestsIn',
  'requestsOut',
  'rejectedRequestsOut',
  'approvedRequestsOut',
  'modifiedRequestsOut',
  'appointments',
  'canceledAppointments',
  'modifiedAppointments',
  'activeAppointments',
];

module.exports = {
  PROJECT_ID,
  COVERAGE_URL,
  FIRESTORE_RULES,
  FUNCTIONS_URL,
  FILTERS,
  SORTERS,
  USER_SUBCOLLECTIONS,
};
