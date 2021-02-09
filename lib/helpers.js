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

module.exports = helpers;
