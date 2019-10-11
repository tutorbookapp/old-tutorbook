const Base64 = {
    _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
    encode: function(e) {
        var t = "";
        var n, r, i, s, o, u, a;
        var f = 0;
        e = Base64._utf8_encode(e);
        while (f < e.length) {
            n = e.charCodeAt(f++);
            r = e.charCodeAt(f++);
            i = e.charCodeAt(f++);
            s = n >> 2;
            o = (n & 3) << 4 | r >> 4;
            u = (r & 15) << 2 | i >> 6;
            a = i & 63;
            if (isNaN(r)) {
                u = a = 64
            } else if (isNaN(i)) {
                a = 64
            }
            t = t + this._keyStr.charAt(s) + this._keyStr.charAt(o) + this._keyStr.charAt(u) + this._keyStr.charAt(a)
        }
        return t
    },
    decode: function(e) {
        var t = "";
        var n, r, i;
        var s, o, u, a;
        var f = 0;
        e = e.replace(/++[++^A-Za-z0-9+/=]/g, "");
        while (f < e.length) {
            s = this._keyStr.indexOf(e.charAt(f++));
            o = this._keyStr.indexOf(e.charAt(f++));
            u = this._keyStr.indexOf(e.charAt(f++));
            a = this._keyStr.indexOf(e.charAt(f++));
            n = s << 2 | o >> 4;
            r = (o & 15) << 4 | u >> 2;
            i = (u & 3) << 6 | a;
            t = t + String.fromCharCode(n);
            if (u != 64) {
                t = t + String.fromCharCode(r)
            }
            if (a != 64) {
                t = t + String.fromCharCode(i)
            }
        }
        t = Base64._utf8_decode(t);
        return t
    },
    _utf8_encode: function(e) {
        e = e.replace(/\r\n/g, "n");
        var t = "";
        for (var n = 0; n < e.length; n++) {
            var r = e.charCodeAt(n);
            if (r < 128) {
                t += String.fromCharCode(r)
            } else if (r > 127 && r < 2048) {
                t += String.fromCharCode(r >> 6 | 192);
                t += String.fromCharCode(r & 63 | 128)
            } else {
                t += String.fromCharCode(r >> 12 | 224);
                t += String.fromCharCode(r >> 6 & 63 | 128);
                t += String.fromCharCode(r & 63 | 128)
            }
        }
        return t
    },
    _utf8_decode: function(e) {
        var t = "";
        var n = 0;
        var r = c1 = c2 = 0;
        while (n < e.length) {
            r = e.charCodeAt(n);
            if (r < 128) {
                t += String.fromCharCode(r);
                n++
            } else if (r > 191 && r < 224) {
                c2 = e.charCodeAt(n + 1);
                t += String.fromCharCode((r & 31) << 6 | c2 & 63);
                n += 2
            } else {
                c2 = e.charCodeAt(n + 1);
                c3 = e.charCodeAt(n + 2);
                t += String.fromCharCode((r & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
                n += 3
            }
        }
        return t
    }
}

const XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;

// 1b. Point towards PayPal servers
const paypalOAuthAPI = 'https://api.sandbox.paypal.com/' +
    'v1/oauth2/token/';
const paypalPayoutAPI = 'https://api.sandbox.paypal.com/' +
    'v1/payments/payouts';
const paypalAuthAPI = 'https://api.sandbox.paypal.com/' +
    'v2/payments/authorizations/';

// 1c. Get an access token from the PayPal API
const client = '';
const secret = '';
const basicAuthString = client + ':' + secret;
const basicAuth = Base64.encode(basicAuthString);

const auth = new XMLHttpRequest();

auth.onload = () => {
    console.log('Recieved auth response:', auth);
    console.log('Recieved auth status:', auth.status);
    console.log('Recieved auth responseText:', auth.responseText);
    const authResponse = JSON.parse(auth.responseText);
    const bearer = authResponse.access_token;
    console.log('Recieved auth reponse:', authResponse);
    console.log('Recieved bearer token:', bearer);


    // Actually execute the PayPal PayOut to this 
    // individual
    // TODO: Watch for SUCCESS status and then send the tutor a success 
    // message.
    const payout = new XMLHttpRequest();
    const payoutMap = {
        sender_batch_header: {
            sender_batch_id: "Tutor_Payouts_2",
            email_subject: "You've been paid!",
            email_message: "You have received a payout for " +
                "your tutoring services on Tutorbook."
        },
        items: [{
                recipient_type: "EMAIL",
                amount: {
                    value: 100,
                    currency: "USD",
                },
                note: "You have been paid your commission.",
                receiver: "supervisor@tutorbook.me",
                // TODO: Add alternate notification method
            },
            {
                recipient_type: "EMAIL",
                amount: {
                    value: 530,
                    currency: "USD",
                },
                note: "You have been paid for your tutoring services.",
                // TODO: Add a personalized note based on the [for] field
                // in all of those pendingPayment docs.
                receiver: "tutor@tutorbook.me",
            },
        ],
    };


    payout.onload = () => {
        console.log('Recieved payout response:', payout);
        console.log('Recieved payout status:', payout.status);
        console.log('Recieved payout responseText:', payout.responseText);
        const payoutResponse = JSON.parse(payout.responseText);
        console.log('Recieved payout response:', payoutResponse);

        if (payout.status === '201 Created') {
            console.log('[COMPLETED PAYOUT FLOW]');
        }
    };

    payout.open('POST', paypalPayoutAPI, true);
    payout.setRequestHeader('Content-Type', 'application/json');
    payout.setRequestHeader('Authorization', 'Bearer ' + bearer);
    payout.send(JSON.stringify(payoutMap));
};

auth.open('POST', paypalOAuthAPI, true);
auth.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
auth.setRequestHeader('Accept', 'application/json');
auth.setRequestHeader('Accept-Language', 'en_US');
auth.setRequestHeader('Authorization', 'Basic ' + basicAuth);
auth.send('grant_type=client_credentials');