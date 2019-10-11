const axios = require('axios');

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

const client = '';
const secret = '';

function getAccessToken() {
    const auth = client + ':' + secret;
    return axios({
        method: 'post',
        url: 'https://api.sandbox.paypal.com/v1/oauth2/token',
        headers: {
            'Accept': 'application/json',
            'Accept-Language': 'en_US',
            'Authorization': 'Basic ' + Base64.encode(auth),
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        params: {
            'grant_type': 'client_credentials',
        },
    }).then((response) => {
        console.log('Access token data:', response.data);
        return response.data.access_token;
    }).catch((err) => {
        console.error('Error while getting access token:', err);
    });
};


async function verifyAuthPayment(id) {
    return axios({
        method: 'get',
        url: 'https://api.sandbox.paypal.com/v2/payments/authorizations/' + id,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + await getAccessToken(),
        },
    }).then((response) => {
        console.log('Authorized payment data:', response.data);
    }).catch((err) => {
        console.error('Error while getting authorized payment data:', err);
    });
};


async function capturePayment(id) {
    return axios({
        method: 'post',
        url: 'https://api.sandbox.paypal.com/v2/payments/authorizations/' + id + '/capture',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + await getAccessToken(),
        },
        data: {
            // TODO: Only capture the amount that is actually needed (based
            // on the actual duration of the lesson).
            amount: {
                value: 20,
                currency_code: 'USD',
            },
            // NOTE: The note_to_payer max is 255 char and the soft_descriptor
            // max is 22 char.
            note_to_payer: 'Payment to Nicholas Chiang for your tutoring lesson.',
            soft_descriptor: 'Tutoring lesson via TB',
            // TODO: Allow users to pay for multiple lessons in one go and
            // save some money (thus, this would be false).
            final_capture: true,
        },
    }).then((response) => {
        console.log('Captured payment data:', response.data);
    }).catch((err) => {
        console.error('Error while capturing payment:', err);
    });
};


capturePayment('3RH5644896290933K');