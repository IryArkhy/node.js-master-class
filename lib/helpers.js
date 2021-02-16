/*
 * Helpers for various tasks
 *
 */

const crypto = require('crypto');
const config = require('../config');

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

module.exports = helpers;
