// See: https://firebase.google.com/docs/functions/unit-testing#test_setup
const sinon = require('sinon');
const test = require('firebase-functions-test')();
test.mockConfig({
    stripe: {
        id: 'asdf',
        key: 'asdf',
    },
    twilio: {
        id: 'asdf',
        key: 'asdf',
    },
    paypal: {
        id: 'asdf',
        key: 'asdf',
    },
    email: {
        id: 'asdf@tutorbook.app',
        key: 'asdf',
    },
});
const adminInitStub = sinon.stub(admin, 'initializeApp');
const adminFirestoreStub = sinon.stub(admin, 'firestore');
const adminMessagingStub = sinon.stub(admin, 'messaging');
const functions = require('../index.js');


// PAYMENTS W/ STRIPE
const req = {
    query: {
        code: 'asdf',
        id: 'tutor@tutorbook.app',
    },
};
const res = {
    send: (data) => {
        assert.equal(data, 'Success.');
        done();
    },
};
functions.initStripeAccount(req, res);