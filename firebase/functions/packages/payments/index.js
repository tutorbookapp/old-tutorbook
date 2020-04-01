const functions = require('firebase-functions');
const admin = require('firebase-admin');
const partitions = {
  test: admin.firestore().collection('partitions').doc('test'),
  default: admin.firestore().collection('partitions').doc('default'),
};
const axios = require('axios');
const to = require('await-to-js').default;
const stripeNode = require('stripe');
const stripeLive = stripeNode(functions.config().stripe.key);
const stripeTest = stripeNode(functions.config().stripe.test.key);
const cors = require('cors')({
  origin: true,
});

const Email = require('email');

// Cancel and release auth payment funds when appt or request is canceled.
const cancelAuthPayment = async (snap, context) => {
  const payment = snap.data();
  if (context.params.user !== payment.from.uid)
    return console.log('Skipping toUser (' + context.params.user + ')...');
  const isTest = context.params.partition === 'test';
  const stripe = isTest ? stripeTest : stripeLive;
  const db = isTest ? partitions.test : partitions.live;
  const authPaymentRef = db
    .collection('stripeCustomers')
    .doc(context.params.user)
    .collection('authPayments')
    .doc(context.params.payment);
  const authPayment = await authPaymentRef.get();
  if (!authPayment.exists)
    return console.warn(
      'Auth payment (' + context.params.payment + ') did not exist.'
    );
  const [err, refund] = await to(
    stripe.refunds.create({
      charge: authPayment.data().id, // TODO: Deduct 10% service fee?
    })
  );
  if (err)
    return console.error(
      'Could not refund auth payment (' + context.params.payment + ') b/c of',
      err
    );
  await authPaymentRef.delete();
  return db
    .collection('stripeCustomers')
    .doc(context.params.user)
    .collection('refunds')
    .set(refund);
};

// Create Stripe Connect Account Express URL
const accountURL = (req, res) => {
  return cors(req, res, async () => {
    // Cannot use async in CORS function
    console.log(
      'Creating Stripe Express Account (' + req.query.id + ') login link...'
    );
    if (req.query.test === 'true') {
      var stripe = stripeTest;
      var db = partitions.test;
    } else {
      var stripe = stripeLive;
      var db = partitions.default;
    }
    const doc = await db.collection('stripeAccounts').doc(req.query.id).get(); // stripeAccounts are for paid tutors
    if (!doc.exists) {
      res
        .status(500)
        .send('[ERROR] Account (' + req.query.id + ') did ' + 'not exist.');
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
    if (req.query.test === 'true') {
      var stripe = stripeTest;
      var db = partitions.test;
    } else {
      var stripe = stripeLive;
      var db = partitions.default;
    }
    const ref = db.collection('stripeAccounts').doc(req.query.id); // stripeAccounts are for paid tutors
    return axios({
      method: 'POST',
      url: 'https://connect.stripe.com/oauth/token',
      data: {
        client_secret:
          req.query.test === 'true'
            ? functions.config().stripe.test.key
            : functions.config().stripe.key,
        code: req.query.code,
        grant_type: 'authorization_code',
      },
    })
      .then(async (response) => {
        console.log(
          'Completed Stripe Express account (' +
            response.data.stripe_user_id +
            ') connection for ' +
            req.query.id +
            '.'
        );
        const account = await stripe.accounts.retrieve(
          response.data.stripe_user_id
        );
        await ref.set(account);
        const accountURLData = await stripe.accounts.createLoginLink(
          account.id
        );
        res.send(accountURLData);
      })
      .catch((err) => {
        console.error(
          'Error while completing Stripe Express ' +
            'account connection for ' +
            req.query.id +
            ':',
          err
        );
        res.status(500).send(err);
      });
  });
};

// Helper function that creates a charge from customer to connect account
// charging a 10% service fee
const createCharge = async (options) => {
  const stripe = options.isTest ? stripeTest : stripeLive;
  const db = options.isTest ? partitions.test : partitions.default;
  const payment = options.payment;
  const customer = await db
    .collection('stripeCustomers')
    .doc(payment.from.uid)
    .get();
  const account = await db
    .collection('stripeAccounts')
    .doc(payment.to.uid)
    .get();
  if (!customer.exists || !account.exists) {
    throw new Error(
      'Stripe customer (' +
        customer.id +
        ') or account (' +
        account.id +
        ') did not exist.'
    );
  } // TODO: Don't trust client, recalculate amount
  const amount = new Number(payment.amount.toFixed(2)).valueOf();
  const fee = new Number((amount * 0.1).toFixed(2)).valueOf();
  return stripe.charges.create({
    amount: amount * 100, // In cents (See: https://bit.ly/2Vj4Qut)
    currency: 'usd',
    customer: customer.data().id,
    application_fee_amount: fee * 100, // Also in cents
    capture: options.capture,
    transfer_data: {
      destination: account.data().id,
    },
    description:
      'Payment for tutoring lesson with ' +
      payment.to.name +
      ' for ' +
      payment.for.subject +
      ' on ' +
      payment.for.time.day +
      's at ' +
      payment.for.time.from +
      ' until ' +
      payment.for.time.to +
      '.',
  });
};

// Process sentPayment:
// 1) Update payment methods
// 2) Authorize charge on customer and store data securly in stripe collection
// 3) Create authPayment doc for tutor
const processSentPayment = async (snap, context) => {
  const isTest = context.params.partition === 'test';
  const payment = snap.data();
  const id = context.params.payment;
  const stripe = isTest ? stripeTest : stripeLive;
  const db = isTest ? partitions.test : partitions.default;

  // Sends user error message and asks for different payment method
  async function error(err) {
    await db
      .collection('users')
      .doc(payment.to.uid)
      .collection('requestsIn')
      .doc(id)
      .delete();
    await db
      .collection('users')
      .doc(payment.from.uid)
      .collection('requestsOut')
      .doc(id)
      .delete();
    await db
      .collection('users')
      .doc(payment.from.uid)
      .collection('sentPayments')
      .doc(id)
      .delete();
    new Email('', payment.from, {
      subject: "[Invalid Payment] We couldn't process your payment " + 'method',
      message:
        'We could not process payment for your request to ' +
        payment.for.toUser.name +
        ", so we've canceled that request." +
        ' To try again, send ' +
        payment.for.toUser.name.split(' ')[0] +
        ' the same request using a different payment method.',
    });
    throw err;
  }

  // 1) Update payment methods
  await addMethod(
    payment.transaction,
    payment.from.uid,
    payment.from.email,
    isTest
  );
  // 2) Authorize charge on customer
  const [err, charge] = await to(
    createCharge({
      payment: payment,
      capture: false,
      isTest: isTest,
    })
  );
  if (err) return error(err);
  await db
    .collection('stripeCustomers')
    .doc(payment.from.uid)
    .collection('authPayments')
    .doc(id)
    .set(charge);
  // 3) Create authPayment doc for tutor
  const authPayments = [
    db
      .collection('users')
      .doc(payment.to.uid)
      .collection('authPayments')
      .doc(id),
    db
      .collection('users')
      .doc(payment.from.uid)
      .collection('authPayments')
      .doc(id),
  ];
  authPayments.forEach(async (doc) => {
    await doc.set({
      id: charge.id,
      from: payment.from,
      to: payment.to,
      amount: payment.amount,
      for: payment.for,
      timestamp: new Date(),
    });
  });
  return db
    .collection('users')
    .doc(payment.from.uid)
    .collection('sentPayments')
    .doc(id)
    .delete();
};

// Process pastAppointment:
// 1) Create pendingPayment docs with the amount calculated from the actual
// clock-in and clock-out times (shows tutor that the payment is pending
// approval from the pupil and asks the pupil to approve payment)
const processPastAppt = (snap, context) => {
  const isTest = context.params.partition === 'test';
  const appt = snap.data();
  const request = appt.for;
  const id = context.params.appt;
  const db = isTest ? partitions.test : partitions.default;
  const pendingPayments = [
    db
      .collection('users')
      .doc(request.fromUser.uid)
      .collection('pendingPayments')
      .doc(id),
    db
      .collection('users')
      .doc(request.toUser.uid)
      .collection('pendingPayments')
      .doc(id),
  ];
  return pendingPayments.forEach(async (doc) => {
    await doc.set({
      from: request.fromUser,
      to: request.toUser,
      amount: amount, // TODO: amount is undefined
      for: appt,
      timestamp: new Date(),
    });
  });
};

// Processes approvedPayment after initial authorization:
// 1) Charges amount on approvedPayment
// 2) Deletes approvedPayment docs and creates pastPayment docs

// Process approvedPayment:
// 1) Capture amount on approvedPayment
// 2) Delete approvedPayment docs and create pastPayment docs
const processApprovedPayment = async (snap, context) => {
  const payment = snap.data();
  const id = context.params.payment;
  const user = context.params.user;
  const isTest = context.params.partition === 'test';
  const stripe = isTest ? stripeTest : stripeLive;
  const db = isTest ? partitions.test : partitions.default;

  if (user !== payment.from.uid)
    return console.log('Skipping toUser (' + user + ')...');

  // Sends user error message and asks for different payment method
  async function error(err) {
    await db
      .collection('users')
      .doc(payment.from.uid)
      .collection('appointments')
      .doc(id)
      .delete();
    await db
      .collection('users')
      .doc(payment.to.uid)
      .collection('appointments')
      .doc(id)
      .delete();
    new Email('', payment.from, {
      subject: "[Invalid Payment] We couldn't process your payment " + 'method',
      message:
        'We could not process payment for your lesson with ' +
        payment.for.toUser.name +
        ", so we've canceled that " +
        'appointment. To try again, send ' +
        payment.for.toUser.name.split(' ')[0] +
        ' the same request using a different payment' +
        ' method.',
    });
    throw err;
  }

  // 1) Capture amount on approvedPayment
  const authCharge = await db
    .collection('stripeCustomers')
    .doc(user)
    .collection('authPayments')
    .doc(id)
    .get();
  if (authCharge.exists) {
    console.log(
      'Capturing $' +
        payment.amount.toFixed(2) +
        ' (' +
        authCharge.data().id +
        ') for appointment (' +
        id +
        ')...'
    );
    // TODO: Calculate amount from actual timestamps
    const amt = new Number(payment.amount.toFixed(2)).valueOf();
    var [err, charge] = await to(
      stripe.charges.capture(authCharge.data().id, {
        amount: amt * 100, // In cents
      })
    );
  } else {
    console.log(
      'Charging $' +
        payment.amount.toFixed(2) +
        ' for ' +
        'appointment (' +
        id +
        ')...'
    );
    var [err, charge] = await to(
      createCharge({
        payment: payment,
        isTest: isTest,
        capture: true,
      })
    );
  }
  if (err) error(err);

  // 2) Delete approved/authPayment docs and create pastPayment docs
  const approvedPayments = [
    db
      .collection('users')
      .doc(payment.from.uid)
      .collection('approvedPayments')
      .doc(id),
    db
      .collection('users')
      .doc(payment.to.uid)
      .collection('approvedPayments')
      .doc(id),
  ];
  const authPayments = authCharge.exists
    ? [
        db
          .collection('stripeCustomers')
          .doc(user)
          .collection('authPayments')
          .doc(id),
        db
          .collection('users')
          .doc(payment.from.uid)
          .collection('authPayments')
          .doc(id),
        db
          .collection('users')
          .doc(payment.to.uid)
          .collection('authPayments')
          .doc(id),
      ]
    : [];
  const pastPayments = [
    db
      .collection('users')
      .doc(payment.from.uid)
      .collection('pastPayments')
      .doc(),
  ];
  pastPayments.push(
    db
      .collection('users')
      .doc(payment.to.uid)
      .collection('pastPayments')
      .doc(pastPayments[0].id)
  );
  console.log(
    'Deleting approvedPayment (' +
      id +
      ') docs and adding ' +
      'pastPayment (' +
      pastPayments[0].id +
      ') docs...'
  );
  await pastPayments.forEach(async (doc) => {
    await doc.set({
      id: charge.id,
      from: payment.from,
      to: payment.to,
      amount: payment.amount,
      for: payment.for,
      timestamp: new Date(),
    });
  });
  return Promise.all(
    authPayments.concat(approvedPayments).map((doc) => doc.delete())
  );
};

// Process requestedPayout:
// 1) Delete requestedPayout doc and create pendingPayout doc
// 2) Send tutor payout
// 3) Delete pendingPayout doc and create pastPayout doc
const processRequestedPayout = async (snap, context) => {
  const user = context.params.tutor;
  const payout = snap.data();
  const isTest = context.params.partition === 'test';
  const stripe = isTest ? stripeTest : stripeLive;
  const db = isTest ? partitions.test : partitions.default;

  const account = await db.collection('stripeAccounts').doc(user).get();
  console.log(
    'Creating payout for user (' +
      user +
      ') with account (' +
      account.data().id +
      ')...'
  );
  // Grab all pastPayments that occurred after the payout request timestamp
  const pastPayments = await db
    .collection('users')
    .doc(user)
    .collection('pastPayments')
    .orderBy('timestamp', 'desc')
    .get();
  var amount = 0; // In cents
  pastPayments.forEach(async (payment) => {
    const charge = await stripe.charges.retrieve(payment.data().id);
    if (charge.amount / 100 !== payment.data().amount) {
      // In cents
      console.warn(
        'Payment amounts (charge: $' +
          (charge.amount / 100).toFixed(2) +
          ' and payment: $' +
          payment.data().amount.toFixed(2) +
          ') did not match.'
      );
    }
    amount += charge.amount; // Amount is in cents
  });
  console.log('Sending ' + user + ' $' + (amount / 100).toFixed(2) + '...');
  const pastPayout = await stripe.payouts.create(
    {
      amount: amount,
      currency: 'usd',
    },
    {
      stripe_account: account.data().id,
    }
  );
  const requestedPayoutDoc = db
    .collection('users')
    .doc(user)
    .collection('requestedPayouts')
    .doc(context.params.payout);
  const pastPayoutDoc = db
    .collection('users')
    .doc(user)
    .collection('pastPayouts')
    .doc();
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
    throw new Error(
      'Payout trigger to decrease balance has not been ' + 'implemented yet.'
    );
  } else if (!!context.params.payment) {
    const payment = snap.data();
    const id = context.params.payment;
    throw new Error(
      'Payment trigger to increase balance has not been ' + 'implemented yet.'
    );
  } else {
    throw new Error('Invalid call to updateBalance:', context);
  }
};

// Add payment methods to Stripe Customer profile
const addMethod = async (method, userID, userEmail, isTest) => {
  const stripe = isTest ? stripeTest : stripeLive;
  const db = isTest ? partitions.test : partitions.default;
  const custDoc = db.collection('stripeCustomers').doc(userID);
  const user = await custDoc.get();
  console.log(
    'Adding payment method (' + method.id + ') to user (' + user.id + ')...'
  );
  if (user.exists) {
    // Update existing customer
    console.log('User (' + user.id + ') exists, adding source to customer...');
    const card = await stripe.customers.createSource(user.data().id, {
      source: method.id,
    });
    console.log('Adding card (' + card.id + ') doc...');
    await custDoc.collection('cards').doc(card.id).set(card);
    const customer = await stripe.customers.retrieve(user.data().id);
    console.log('Updating customer (' + user.id + ') doc...');
    await custDoc.update(customer);
  } else {
    // Create new customer
    console.log(
      'User (' +
        user.id +
        ') does not exist, creating new customer and source...'
    );
    const newCustomer = await stripe.customers.create({
      source: method.id,
      email: userEmail,
    });
    console.log('Adding customer (' + user.id + ') doc...');
    await custDoc.set(newCustomer); // Next, retrieve and add the new card
    const newCard = await stripe.customers.retrieveSource(
      newCustomer.id,
      newCustomer.default_source
    );
    console.log('Adding card (' + newCard.id + ') doc...');
    await custDoc.collection('cards').doc(newCard.id).set(newCard);
  }
};

const updateMethods = async (snap, context) => {
  const isTest = context.params.partition === 'test';
  const db = isTest ? partitions.test : partitions.default;
  const user = (
    await db.collection('users').doc(context.params.user).get()
  ).data();
  await addMethod(snap.data(), context.params.user, user.email, isTest);
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
