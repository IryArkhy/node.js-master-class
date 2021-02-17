/*
 * Helpers for various tasks
 *
 */

const crypto = require('crypto');
const config = require('../config');
const https = require('https');
const querystring = require('querystring');

const helpers = {};

// Create SHA256 has
helpers.hash = function hashPassword(stringToHash) {
  if (typeof stringToHash === 'string' && stringToHash.length) {
    const hash = crypto
      .createHmac('sha256', config.hashingSecret)
      .update(stringToHash)
      .digest('hex');
    return hash;
  } else {
    return false;
  }
};

helpers.parseJsonToObject = function parsePayloadBufferToJSON(str) {
  try {
    return JSON.parse(str);
  } catch (error) {
    console.log(`Error while parsing JSON: ${error}`);
    return {};
  }
};

// Create a string of random aplphanumeric characters of a given length
helpers.crateRandomString = function creatingRandomString(strLen) {
  const stringisValid =
    typeof strLen === 'number' && strLen > 0 ? strLen : false;
  if (stringisValid) {
    // Define all the possible characters that could go into a string
    const possibleCharacters = 'abcdefghigklmnopqrstuvwxyz0123456789';

    // Start the final string;
    let str = '';
    for (i = 1; i <= strLen; i++) {
      // Get a random character from the possibleCharacters
      // Append it to a final string

      const randomChar = possibleCharacters.charAt(
        Math.floor(Math.random() * possibleCharacters.length)
      );
      str += randomChar;
    }
    return str;
  } else {
    return false;
  }
};

// Send an SMS message via Twilio (Twilio integration)

helpers.sendTwilioSms = function twilioMessaging(phone, msg, clb) {
  // validate the parameters
  const phoneNumber =
    typeof phone === 'string' && phone.trim().length === 10
      ? phone.trim()
      : false;

  const message =
    typeof msg === 'string' &&
    msg.trim().length > 0 &&
    msg.trim().length <= 1600
      ? msg.trim()
      : false;

  if (phoneNumber && message) {
    // configure the request payload
    const payload = {
      From: config.twilio.fromPhone,
      To: '+1' + phoneNumber,
      Body: message,
    };

    // Stringify the payload
    const stringPayload = querystring.stringify(payload);

    //configure the request details
    const requestDetails = {
      protocol: 'https:',
      hostname: 'api.twilio.com',
      method: 'POST',
      path:
        '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
      auth: config.twilio.accountSid + ':' + config.twilio.authToken,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload),
      },
    };

    // Instantiate a request object
    const req = https.request(requestDetails, function (res) {
      // Grab the status of the sent request
      const { statusCode } = res;
      // Callback successfully if the request came through
      if (statusCode === 200 || statusCode === 201) {
        clb(false);
      } else {
        clb('Status code returned was' + statusCode);
      }
    });

    // Bind to the error event so it doesn't get thrown
    req.on('error', (err) => {
      clb(err);
    });

    // Add a payload to the request
    req.write(stringPayload);

    // End the request
    req.end();
  } else {
    clb('Given parameters were missing or invalid');
  }
};
module.exports = helpers;
