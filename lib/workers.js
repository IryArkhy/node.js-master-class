/* Workers are going to do all the checking for which we are building this application
 * List all the available checks
 * Worker-related tasks
 */

const path = require('path');
const fs = require('fs');
const url = require('url');
const http = require('http');
const https = require('https');
const _data = require('./data');
const helpers = require('./helpers');
const _logs = require('./logs');

// Instantiate worker object
const workers = {};

// look up all the checks, gather all that data and send it to validator
workers.gatherAllChecks = function gatherAllChecks() {
  // get all the checks that exists in the system
  _data.list('checks', function (err, checks) {
    // console.log({ err, checks });
    if (!err && checks && checks.length > 0) {
      checks.forEach((check) => {
        // Read in the check data
        _data.read('checks', check, function (err, originalCheckData) {
          if (!err && originalCheckData) {
            // Pass data to a check validator and let that function continue or
            //log out the error when needed
            workers.validateCheckData(originalCheckData);
          } else {
            console.log("Error: Reading one of the check's data ");
          }
        });
      });
    } else {
      // this is a background worker. There is no request/response structure
      console.log('Error: Could not find any checks to process ');
    }
  });
};

// Sanity checking the check data

workers.validateCheckData = function validateCheckData(originalCheckData) {
  originalCheckData =
    typeof originalCheckData === 'object' && originalCheckData
      ? originalCheckData
      : {};

  originalCheckData.ID =
    typeof originalCheckData.ID === 'string' &&
    originalCheckData.ID.trim().length === 20
      ? originalCheckData.ID.trim()
      : false;

  originalCheckData.userPhone =
    typeof originalCheckData.userPhone === 'string' &&
    originalCheckData.userPhone.trim().length === 10
      ? originalCheckData.userPhone.trim()
      : false;

  originalCheckData.protocol =
    typeof originalCheckData.protocol === 'string' &&
    ['http', 'https'].indexOf(originalCheckData.protocol.trim()) > -1
      ? originalCheckData.protocol.trim()
      : false;

  originalCheckData.url =
    typeof originalCheckData.url === 'string' &&
    originalCheckData.url.trim().length > 0
      ? originalCheckData.url.trim()
      : false;

  originalCheckData.method =
    typeof originalCheckData.method === 'string' &&
    ['get', 'post', 'put', 'delete'].indexOf(originalCheckData.method.trim()) >
      -1
      ? originalCheckData.method.trim()
      : false;

  originalCheckData.successCodes =
    typeof originalCheckData.successCodes === 'object' &&
    originalCheckData.successCodes instanceof Array &&
    originalCheckData.successCodes.length > 0
      ? originalCheckData.successCodes
      : false;

  originalCheckData.timeoutSeconds =
    typeof originalCheckData.timeoutSeconds === 'number' &&
    originalCheckData.timeoutSeconds % 1 === 0 &&
    originalCheckData.timeoutSeconds >= 1 &&
    originalCheckData.timeoutSeconds <= 5
      ? originalCheckData.timeoutSeconds
      : false;

  // Set the keys that may not be set (if the workers have never see this check before)
  originalCheckData.state =
    typeof originalCheckData.state === 'string' &&
    ['up', 'down'].indexOf(originalCheckData.state.trim()) > -1
      ? originalCheckData.state.trim()
      : 'down';

  // Last checked
  originalCheckData.lastChecked =
    typeof originalCheckData.lastChecked === 'number' &&
    originalCheckData.lastChecked > 0
      ? originalCheckData.lastChecked
      : false;

  // If all the checks passed, pass the data along to the next step in the process
  if (
    originalCheckData.ID &&
    originalCheckData.userPhone &&
    originalCheckData.protocol &&
    originalCheckData.url &&
    originalCheckData.method &&
    originalCheckData.successCodes &&
    originalCheckData.timeoutSeconds
  ) {
    workers.performCheck(originalCheckData);
  } else {
    console.log(
      'Error: one of the checks is not properly formated. Skipping it',
      {
        ID: originalCheckData.ID,
        userPhone: originalCheckData.userPhone,
        protocol: originalCheckData.protocol,
        url: originalCheckData.url,
        method: originalCheckData.method,
        successCodes: originalCheckData.successCodes,
        timeoutSeconds: originalCheckData.timeoutSeconds,
      }
    );
  }
};

// Perform the check, send the originalCheckData and the outcome of the check process to the next step in the process
workers.performCheck = function performCheck(originalCheckData) {
  // Prepare the initial check outcome
  const checkOutcome = {
    error: false,
    responseCode: false,
  };

  // Mark that outcome has not been sent yet
  let outcomeSent = false;

  // Parse the hostname and the path out of the original check data
  const parsedUrl = url.parse(
    originalCheckData.protocol + '://' + originalCheckData.url,
    true
  );

  const { hostname, path } = parsedUrl; // we are using path and not pathname because we want a query string

  // Construct the request
  const requestDetails = {
    protocol: `${originalCheckData.protocol}:`,
    hostname,
    method: originalCheckData.method.toUpperCase(),
    path,
    timeout: originalCheckData.timeoutSeconds * 1000, // because we need miliseconds
  };

  // Instantiate a request obj using either the HTTP or HTPPS
  const _moduleToUse = originalCheckData.protocol === 'http' ? http : https;
  const req = _moduleToUse.request(
    requestDetails,
    function responseHandler(res) {
      // grab the status of the sent request
      const status = res.statusCode;

      // Update the check outcome and pass the data along
      checkOutcome.responseCode = status;
      if (!outcomeSent) {
        workers.processCheckOutcome(originalCheckData, checkOutcome);
        outcomeSent = true;
      }
    }
  );

  // Bind to the error event so it doesn't get thrown
  req.on('error', function (error) {
    // Update the check outcome and pass the data along
    checkOutcome.error = { error: true, value: error };

    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the timeout event

  req.on('timeout', function (error) {
    // Update the check outcome and pass the data along
    checkOutcome.error = { error: true, value: 'timeout' };

    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // End the request
  req.end();
};

// Process the check outcome, update the check data as needed, trigger and aler to the user as needed
// Special logic for accomodating a check that has never been tested before (don't alert on that ones):
// that means if the 'down' was sent by default from the beginning - we do not need to alet the user about that
workers.processCheckOutcome = function processCheckOutcome(
  originalCheckData,
  checkOutcome
) {
  // Decide if the check is considered up or down
  const state =
    !checkOutcome.error &&
    checkOutcome.responseCode &&
    originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1
      ? 'up'
      : 'down';

  // Decide if the alet is warranted
  const alertWarranted =
    originalCheckData.lastChecked && originalCheckData.state !== state
      ? true
      : false;

  const timeOfCheck = Date.now();

  // Update the check data
  const newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = timeOfCheck;

  // Log the outcome of the check
  // Log the original check data
  // Log alertWarranted and time of check
  workers.log(
    originalCheckData,
    checkOutcome,
    state,
    alertWarranted,
    timeOfCheck
  );

  // Save the updates to disk
  _data.update('checks', newCheckData.ID, newCheckData, function (err) {
    if (!err) {
      // Send the new check data to the next phase in the process if need
      if (alertWarranted) {
        workers.alertUserToStatusChange(newCheckData);
      } else {
        console.log('Check outcome has not changed, alert is not neded');
      }
    } else {
      console.log(
        'Error: trying to save updates to one of the checks: checkId: ',
        newCheckData.ID
      );
    }
  });
};

// Alert user about the changed status
workers.alertUserToStatusChange = function alertUserToStatusChange(
  newCheckData
) {
  const message = `Alert: your check for ${newCheckData.method.toUpperCase()}, ${
    newCheckData.protocol
  }://${newCheckData.url} is currently ${newCheckData.state}`;

  helpers.sendTwilioSms(newCheckData.userPhone, message, function (err) {
    if (!err) {
      console.log(
        'Success, user was alerted to a status change in their check via sms',
        message
      );
    } else {
      console.log(
        'Error: could not send an sms alert who has a change in their checks'
      );
    }
  });
};

workers.log = function logger(
  originalCheckData,
  checkOutcome,
  state,
  alertWarranted,
  timeOfCheck
) {
  // Form the log data
  const logedData = {
    check: originalCheckData,
    outcome: checkOutcome,
    state,
    alertWarranted,
    time: timeOfCheck,
  };

  const stringifiedData = JSON.stringify(logedData);

  // Determine the name of the log file
  // Write dif logs for dif checks

  const logFileName = originalCheckData.ID;

  // Append the log sting to a file
  _logs.append(logFileName, stringifiedData, function (err) {
    if (!err) {
      console.log('Logging to a file succeded');
    } else {
      console.log('Logging to a file failed');
    }
  });
};

// Compress the log files
workers.rotateLogs = function rotateLogs() {
  // Start by listing all the non-compressed log files in .logs/
  // fist param: false - just uncompresed files, true - include in listing even compressed ones

  _logs.list(false, function (err, logs) {
    if (!err && logs && logs.length > 0) {
      logs.forEach((log) => {
        // Compress the data to a different file
        const logId = log.replace('.log', '');
        const newFileId = `${logId}-${Date.now()}`;

        _logs.compress(logId, newFileId, function (err) {
          if (!err) {
            // Truncate the log
            _logs.truncate(logId, function (err) {
              if (!err) {
                console.log('Success: truncating a log file');
              } else {
                console.log('Error: truncating a log file');
              }
            });
          } else {
            console.log('Error: compressing one of the log files: ', err);
          }
        });
      });
    } else {
      console.log('Error: could not find logs to rotate');
    }
  });
};

// Timer to execute the log-rotation process once per day
workers.logRotationLoop = function logDailyRotation() {
  setInterval(() => {
    workers.rotateLogs();
  }, 1000 * 60 * 60 * 24);
};

// Timer to execute the worker process once per minute
workers.loop = function loop() {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * 60);
};

// Init function
workers.init = function () {
  // Execute all checks immediatelly
  workers.gatherAllChecks();
  // Call the loop so the checks will execute later on
  workers.loop();

  // Rotate logs: compress all the logs
  workers.rotateLogs();

  // Compression loop, so logs will be compressed later on
  workers.logRotationLoop();
};

module.exports = workers;
