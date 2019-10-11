const stripe = require('stripe')('');
const to = require('await-to-js').default;

async function updatePaymentMethods(user, token) {
    const card = await stripe.customers.createSource(user, {
        source: token,
    });
    console.log("Created card:", card);
};

async function createPaymentMethods(user, token) {
    const customer = await stripe.customers.create({
        source: token,
        email: user,
    });
    console.log("Created customer:", customer);
    const card = await stripe.customers.retrieveSource(
        customer.id,
        customer.default_source,
    );
    console.log("Retrieved source:", card);
};


async function authPayment(amount, customer, account) {
    [err, charge] = await to(stripe.charges.create({
        amount: amount * 100,
        currency: 'usd',
        customer: customer,
        application_fee_amount: amount * 10,
        capture: false,
        transfer_data: {
            destination: account,
        },
    }));
    if (err) return console.error('Error:', err);
    return console.log('Charge:', charge);
};


async function sendPayout(amount, account) {
    [err, payout] = await to(stripe.payouts.create({
        amount: amount,
        currency: 'usd',
    }, {
        stripe_account: account,
    }));
    if (err) return console.error('Error:', err);
    return console.log('Payout:', payout);
};


sendPayout(100, 'acct_1FQjNtEUuPXTvo6S');