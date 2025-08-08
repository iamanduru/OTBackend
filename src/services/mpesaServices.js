import fetch from 'node-fetch';
import dayjs from 'dayjs';
import dotenc from 'dotenv';

const {
    MPESA_CONSUMER_KEY,
  MPESA_CONSUMER_SECRET,
  MPESA_SHORTCODE,
  MPESA_PASSKEY,
  MPESA_CALLBACK_URL
} = process.env;

if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET || !MPESA_SHORTCODE || !MPESA_CALLBACK_URL) {
    throw new Error('Missing M-Pesa environment variables');
}

const authUrl = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
const stkPushUrl = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

let tokenCache = null;
let tokenExpiry = 0;

async function getAccessToken() {
  const now = Date.now();
  if (tokenCache && now < tokenExpiry) {
    return tokenCache;
  }

  const credentials = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
  const res = await fetch(authUrl, {
    headers: {
      Authorization: `Basic ${credentials}`
    }
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Failed to get MPESA access token');
  tokenCache = data.access_token;
  // typically expires in 3600 sec
  tokenExpiry = now + (data.expires_in - 60) * 1000;
  return tokenCache;
}

function getTimestamp() {
    return dayjs().format('YYYYMMDDHmmss');
}

function getPassword(timestamp) {
    const str = `${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`;
    return Buffer.from(str).toString('base64');
}

export async function initiateStkPush({ amount, phoneNumber,  accountReference, transactionDesc, orderId }) {
    const accessToken = await getAccessToken();
    const timestamp = getTimestamp();
    const password = getPassword(timestamp);

    const payload = {
        BusinessShortCode: MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phoneNumber.replace(/\+/g, ''), // e.g., 2547XXXXXXXX
        PartyB: MPESA_SHORTCODE,
        PhoneNumber: phoneNumber.replace(/\+/g, ''),
        CallBackURL: MPESA_CALLBACK_URL,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc
    };

    const res = await fetch(stkPushUrl, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const data = await res.json();
    if(data.ResponseCode !== '0') {
        throw new Error(
            `STK Push initiation failed: ${JSON.stringify(data)}`
        );
    }

    //CheckoutRequest and merchantRequest
    return data;
}