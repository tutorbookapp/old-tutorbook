const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const to = require('await-to-js').default;
const stripe = require('stripe')(functions.config().stripe.key);
const cors = require('cors')({
    origin: true,
});

const Email = require('email');


// Create Stripe Connect Account Express URL
const accountURL = (req, res) => {
    return cors(req, res, async () => { // Cannot use async in CORS function
        console.log('Creating Stripe Express Account (' + req.query.id +
            ') login link...');
        const doc = await admin.firestore().collection('stripeAccounts')
            .doc(req.query.id).get(); // stripeAccounts are for paid tutors
        if (!doc.exists) {
            throw new Error('Account (' + req.query.id + ') did not exist.');
        }
        const link = await stripe.accounts.createLoginLink(doc.data().id);
        return res.send(link);
        // Link object: {
        //  "object": "login_link",
        //  "created": 1570475195,
        //  "url": "https://connect.stripe.com/express/q14GyGJnZyYp"
        // }
    });
};


// Complete the Express Account connection (client is redirected to Stripe's
// Express interface to securly add bank information --> once added, client is
// redirected back to the app and code is passed back here).
// See: https://stripe.com/docs/connect/express-accounts
const initAccount = (req, res) => {
    return cors(req, res, () => {
        console.log('Initializing Stripe account for ' + req.query.id + '...');
        const ref = admin.firestore().collection('stripeAccounts')
            .doc(req.query.id); // stripeAccounts are for paid tutors
        return axios({
            method: 'POST',
            url: 'https://connect.stripe.com/oauth/token',
            data: {
                client_secret: functions.config().stripe.key,
                code: req.query.code,
                grant_type: 'authorization_code',
            },
        }).then(async (response) => {
            console.log('Completed Stripe Express account (' +
                response.data.stripe_user_id + ') connection for ' +
                req.query.id + '.');
            const account = await stripe.accounts
                .retrieve(response.data.stripe_user_id);
            await ref.set(account);
            const accountURLData = await stripe.accounts
                .createLoginLink(account.id);
            res.send(accountURLData);
        }).catch((err) => {
            console.error('Error while completing Stripe Express ' +
                'account connection for ' + req.query.id + ':', err);
            res.send(err);
        });
    });
};


// Process sentPayment:
// 1) Update payment methods
// 2) Authorize charge on customer and store data securly in stripe collection
// 3) Create authPayment doc for tutor 
const processSentPayment = async (snap, context) => {
    const payment = snap.data();
    const id = context.params.payment;
    const db = admin.firestore();

    // Sends user error message and asks for different payment method
    async function error(err) {
        await db.collection('users').doc(payment.to.email)
            .collection('requestsIn').doc(id).delete();
        await db.collection('users').doc(payment.from.email)
            .collection('requestsOut').doc(id).delete();
        await db.collection('users').doc(payment.from.email)
            .collection('sentPayments').doc(id).delete();
        new Email('', payment.from, {
            subject: '[Invalid Payment] We couldn\'t process your payment method',
            message: 'We could not process payment for your request to ' +
                payment.for.toUser.name + ', so we\'ve canceled that request.' +
                ' To try again, send ' + payment.for.toUser.name.split(' ')[0] +
                ' the same request using a different payment method.',
        });
        throw err;
    };

    // 1) Update payment methods
    await addMethod(payment.transaction, payment.from.email);
    // 2) Authorize charge on customer 
    const customer = await db.collection('stripeCustomers')
        .doc(payment.from.email).get();
    const account = await db.collection('stripeAccounts')
        .doc(payment.to.email).get();
    if (!customer.exists || !account.exists) {
        throw new Error('Stripe customer (' + customer.id + ') or account (' +
            account.id + ') did not exist.');
    } // TODO: Don't trust client, recalculate amount
    const amount = new Number(payment.amount.toFixed(2)).valueOf();
    const fee = new Number((amount * 0.1).toFixed(2)).valueOf();
    var err; // We don't need these declarations (See: https://bit.ly/31ST3pk)
    var charge;
    [err, charge] = await to(stripe.charges.create({
        amount: amount * 100, // In cents (See: https://bit.ly/2Vj4Qut)
        currency: 'usd',
        customer: customer.data().id,
        application_fee_amount: fee * 100, // Also in cents
        capture: false,
        transfer_data: {
            destination: account.data().id,
        },
        description: 'Payment for tutoring lesson with ' + payment.to.name +
            ' for ' + payment.for.subject + ' on ' + payment.for.time.day +
            's at ' + payment.for.time.from + ' until ' + payment.for.time.to +
            '.',
    }));
    if (err) return error(err);
    await db.collection('stripeCustomers').doc(payment.from.email)
        .collection('authPayments').doc(id).set(charge);
    // 3) Create authPayment doc for tutor 
    const authPayments = [
        db.collection('users').doc(payment.to.email)
        .collection('authPayments').doc(id),
        db.collection('users').doc(payment.from.email)
        .collection('authPayments').doc(id),
    ];
    authPayments.forEach(async (doc) => {
        await doc.set({
            id: charge.id,
            from: payment.from,
            to: payment.to,
            amount: amount,
            for: payment.for,
            timestamp: new Date(),
        });
    });
    return db.collection('users').doc(payment.from.email)
        .collection('sentPayments').doc(id).delete();
};


// Process pastAppointment:
// 1) Create pendingPayment docs with the amount calculated from the actual
// clock-in and clock-out times (shows tutor that the payment is pending
// approval from the pupil and asks the pupil to approve payment)
const processPastAppt = (snap, context) => {
    const appt = snap.data();
    const request = appt.for;
    const id = context.params.appt;
    const pendingPayments = [
        admin.firestore().collection('users').doc(request.fromUser.email)
        .collection('pendingPayments').doc(id),
        admin.firestore().collection('users').doc(request.toUser.email)
        .collection('pendingPayments').doc(id),
    ];
    return pendingPayments.forEach(async (doc) => {
        await doc.set({
            from: request.fromUser,
            to: request.toUser,
            amount: amount,
            for: appt,
            timestamp: new Date(),
        });
    });
};


// Process approvedPayment:
// 1) Capture amount on approvedPayment
// 2) Delete approvedPayment docs and create pastPayment docs
const processApprovedPayment = async (snap, context) => {
    const payment = snap.data();
    const db = admin.firestore();
    const id = context.params.payment;
    const user = context.params.user;
    if (user !== payment.from.email) {
        return console.log('Skipping toUser (' + user + ')...');
    }
    // 1) Capture amount on approvedPayment
    const authCharge = await db.collection('stripeCustomers').doc(user)
        .collection('authPayments').doc(id).get();
    // TODO: Calculate amount from actual timestamps 
    const amt = new Number(payment.amount.toFixed(2)).valueOf();
    console.log('Capturing $' + amt.toFixed(2) + ' (' + authCharge.data().id +
        ') for appointment (' + id + ')...');
    const charge = await stripe.charges.capture(authCharge.data().id, {
        amount: amt * 100, // In cents
    });
    // 2) Delete approvedPayment docs and create pastPayment docs
    const approvedPayments = [
        db.collection('users').doc(payment.from.email)
        .collection('approvedPayments').doc(id),
        db.collection('users').doc(payment.to.email)
        .collection('approvedPayments').doc(id),
    ];
    const pastPayments = [
        db.collection('users').doc(payment.from.email)
        .collection('pastPayments').doc(),
    ];
    pastPayments.push(db.collection('users').doc(payment.to.email)
        .collection('pastPayments').doc(pastPayments[0].id));
    console.log('Deleting approvedPayment (' + id + ') docs and adding ' +
        'pastPayment (' + pastPayments[0].id + ') docs...');
    await pastPayments.forEach(async (doc) => {
        await doc.set({
            id: charge.id,
            from: payment.from,
            to: payment.to,
            amount: amt,
            for: payment.for,
            timestamp: new Date(),
        });
    });
    return approvedPayments.forEach(async (doc) => {
        await doc.delete();
    });
};


// Process requestedPayout:
// 1) Delete requestedPayout doc and create pendingPayout doc
// 2) Send tutor payout
// 3) Delete pendingPayout doc and create pastPayout doc
const processRequestedPayout = async (snap, context) => {
    const user = context.params.tutor;
    const payout = snap.data();
    const account = await admin.firestore().collection('stripeAccounts')
        .doc(user).get();
    console.log('Creating payout for user (' + user + ') with account (' +
        account.data().id + ')...');
    // Grab all pastPayments that occurred after the payout request timestamp
    const pastPayments = await admin.firestore().collection('users').doc(user)
        .collection('pastPayments').orderBy('timestamp', 'desc').get();
    var amount = 0; // In cents
    pastPayments.forEach(async (payment) => {
        const charge = await stripe.charges.retrieve(payment.data().id);
        if (charge.amount / 100 !== payment.data().amount) { // In cents
            console.warn('Payment amounts (charge: $' +
                (charge.amount / 100).toFixed(2) + ' and payment: $' +
                payment.data().amount.toFixed(2) + ') did not match.');
        }
        amount += charge.amount; // Amount is in cents
    });
    console.log('Sending ' + user + ' $' + (amount / 100).toFixed(2) + '...');
    const pastPayout = await stripe.payouts.create({
        amount: amount,
        currency: 'usd',
    }, {
        stripe_account: account.data().id,
    });
    const requestedPayoutDoc = admin.firestore().collection('users').doc(user)
        .collection('requestedPayouts').doc(context.params.payout);
    const pastPayoutDoc = admin.firestore().collection('users').doc(user)
        .collection('pastPayouts').doc();
    await requestedPayoutDoc.delete();
    await payoutDoc.set({
        id: pastPayout.id,
        amount: amount / 100,
        timestamp: new Date(),
    });
};


// Stripe webhook trigger:
// 1) Create pastPayout doc
const payoutWebhook = async (req, res) => {
    throw new Error('Weekly payouts webhook has not been implemented yet.');
};


// Process pastPayout & pastPayments:
// 1) Call Stripe API to get user's balance
// 2) Calculate balance based on Firestore
// 3) Check if they match (but ALWAYS use the Stripe balance)
// 4) Update the user's balance doc
const updateBalance = async (snap, context) => {
    if (!!context.params.payout) {
        const payout = snap.data();
        const id = context.params.payout;
        throw new Error('Payout trigger to decrease balance has not been ' +
            'implemented yet.');
    } else if (!!context.params.payment) {
        const payment = snap.data();
        const id = context.params.payment;
        throw new Error('Payment trigger to increase balance has not been ' +
            'implemented yet.');
    } else {
        throw new Error('Invalid call to updateBalance:', context);
    }
};


// Add payment methods to Stripe Customer profile
const addMethod = async (method, userID) => {
    const db = admin.firestore().collection('stripeCustomers')
        .doc(userID);
    const user = await db.get();
    console.log('Adding payment method (' + method.id + ') to user (' +
        user.id + ')...');
    if (user.exists) { // Update existing customer
        console.log('User (' + user.id +
            ') exists, adding source to customer...');
        const card = await stripe.customers.createSource(user.data().id, {
            source: method.id,
        });
        console.log('Adding card (' + card.id + ') doc...');
        await db.collection('cards').doc(card.id).set(card);
        const customer = await stripe.customers.retrieve(user.data().id);
        console.log('Updating customer (' + user.id + ') doc...');
        await db.update(customer);
    } else { // Create new customer
        console.log('User (' + user.id +
            ') does not exist, creating new customer and source...');
        const newCustomer = await stripe.customers.create({
            source: method.id,
            email: user.id,
        });
        console.log('Adding customer (' + user.id + ') doc...');
        await db.set(newCustomer); // Next, retrieve and add the new card
        const newCard = await stripe.customers.retrieveSource(
            newCustomer.id,
            newCustomer.default_source
        );
        console.log('Adding card (' + newCard.id + ') doc...');
        await db.collection('cards').doc(newCard.id).set(newCard);
    }
};

const updateMethods = async (snap, context) => {
    await addMethod(snap.data(), context.params.user);
    return db.collection('methods').doc(context.params.method).delete();
};


// Functions are called in index.js
module.exports = {
    initAccount: initAccount,
    accountURL: accountURL,
    addMethod: updateMethods,
    processSentPayment: processSentPayment,
    askForPayment: processPastAppt,
    processPayment: processApprovedPayment,
    processPayout: processRequestedPayout,
    processWeeklyPayouts: payoutWebhook,
};