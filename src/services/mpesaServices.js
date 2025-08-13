// src/services/mpesaServices.js
import fetch from 'node-fetch';        // If Node >= 18, you can use global fetch and remove this
import dayjs from 'dayjs';
import dotenv from 'dotenv';

dotenv.config();

const {
  MPESA_CONSUMER_KEY,
  MPESA_CONSUMER_SECRET,
  MPESA_SHORTCODE,
  MPESA_PASSKEY,
  MPESA_CALLBACK_URL
} = process.env;

if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET || !MPESA_SHORTCODE || !MPESA_PASSKEY || !MPESA_CALLBACK_URL) {
  throw new Error('Missing M-Pesa environment variables');
}

const authUrl = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
const stkPushUrl = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

let tokenCache = null;
let tokenExpiry = 0;

async function getAccessToken() {
  const now = Date.now();
  if (tokenCache && now < tokenExpiry) return tokenCache;

  const credentials = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
  const res = await fetch(authUrl, { headers: { Authorization: `Basic ${credentials}` } });
  const data = await res.json();
  if (!data.access_token) throw new Error('Failed to get MPESA access token');
  tokenCache = data.access_token;
  tokenExpiry = now + ((data.expires_in || 3600) - 60) * 1000; // safety buffer
  return tokenCache;
}

function getTimestamp() {
  return dayjs().format('YYYYMMDDHHmmss'); // NOTE: HH (24h)
}

function getPassword(timestamp) {
  const str = `${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`;
  return Buffer.from(str).toString('base64');
}

export async function initiateStkPush({ amount, phoneNumber, accountReference, transactionDesc }) {
  const accessToken = await getAccessToken();
  const timestamp = getTimestamp();
  const password = getPassword(timestamp);

  const payload = {
    BusinessShortCode: MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.round(amount), // Daraja expects integer amounts (KES), round to be safe
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
  if (data.ResponseCode !== '0') {
    throw new Error(`STK Push initiation failed: ${JSON.stringify(data)}`);
  }

  return data; // has CheckoutRequestID, MerchantRequestID
}
