/*
 * Request handlers
 *
 *
 */
const _data = require('./data');
const helpers = require('./helpers');
const config = require('../config');

const handlers = {};

handlers.ping = function pingHandler(data, clb) {
  // Callback a HTTP status code and payload object
  clb(200);
};

handlers.users = function usersHandler(data, clb) {
  const acceptableMethods = ['get', 'post', 'put', 'delete'];

  // if data mathod exists inside the list of acceptable methods, go ahead
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, clb);
  } else {
    // method is not allowed
    clb(405);
  }
};

// Create a container for the users sub-method
handlers._users = {};

// write users handlers
// required data: phone
// optional data: none

handlers._users.get = function getUsersHandler(data, clb) {
  // Check that the phone number is valid
  const {
    queryStringObj: { phone },
  } = data;

  const userPhone =
    typeof phone === 'string' && phone.trim().length === 10
      ? phone.trim()
      : false;

  if (userPhone) {
    // get a token from the headers
    const token =
      typeof data.headers.token === 'string' ? data.headers.token : false;

    // Verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(
      token,
      phone,
      function verificationCatcher(tokenIsValid) {
        if (tokenIsValid) {
          // Lookup the user
          _data.read('users', userPhone, function (err, dataFromDb) {
            if (!err && dataFromDb) {
              // Remove the hashedPassword
              delete dataFromDb.hashedPassword;
              clb(200, dataFromDb);
            } else {
              clb(404, { error: 'User is not found' });
            }
          });
        } else {
          clb(403, {
            error:
              'Authorization is required token in header or token is invalid',
          });
        }
      }
    );
  } else {
    clb(404, { error: 'Missing required data: phone' });
  }
};

// Post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: no
handlers._users.post = function getUsersHandler(data, clb) {
  // Check that all required fields are there
  const firstName =
    typeof data.payload.firstName === 'string' &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;

  const lastName =
    typeof data.payload.lastName === 'string' &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;

  const phone =
    typeof data.payload.phone === 'string' &&
    data.payload.phone.trim().length === 10
      ? data.payload.phone.trim()
      : false;

  const password =
    typeof data.payload.password === 'string' &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;

  const tosAgreement =
    typeof data.payload.tosAgreement === 'boolean' &&
    data.payload.tosAgreement === true
      ? true
      : false;

  if (firstName && lastName && phone && password && tosAgreement) {
    // Make sure that user doesn't already exists
    _data.read('users', phone, function (err, data) {
      if (err) {
        // We continue after error bcz the err means the file with name aof a phone number was not found, hense such user is not registered

        // Hash password
        const hashedPassword = helpers.hash(password);
        if (hashedPassword) {
          const user = {
            firstName,
            lastName,
            phone,
            hashedPassword,
            tosAgreement: true,
          };

          // Store the user

          _data.create('users', phone, user, function (err) {
            if (!err) {
              clb(201);
            } else {
              console.log(err);
              clb(500, 'Could not create a new user');
            }
          });
        } else {
          clb(500, "Couldn't hash the user's password");
        }
      } else {
        // User already exists
        clb(400, { error: 'User with this phone number already exists' });
      }
    });
  } else {
    clb(400, { error: 'Missing required field' });
  }
};

// Post
// Required data:  phone.
// Optional data: firstName, lastName, password
// At least one of the optional fields must be specified
handlers._users.put = function getUsersHandler(data, clb) {
  // Check that  required field is there

  const phone =
    typeof data.payload.phone === 'string' &&
    data.payload.phone.trim().length === 10
      ? data.payload.phone.trim()
      : false;

  // Check that all optional fields are there
  const firstName =
    typeof data.payload.firstName === 'string' &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;

  const lastName =
    typeof data.payload.lastName === 'string' &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;

  const password =
    typeof data.payload.password === 'string' &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;
  //Error if the phone is invalid

  if (phone) {
    //Error if nothing's sent to update
    if (firstName || lastName || password) {
      // get a token from the headers
      const token =
        typeof data.headers.token === 'string' ? data.headers.token : false;

      // Verify that the given token is valid for the phone number
      handlers._tokens.verifyToken(
        token,
        phone,
        function verificationCatcher(tokenIsValid) {
          if (tokenIsValid) {
            //Lookup user
            _data.read('users', phone, function (err, userData) {
              if (!err && userData) {
                if (firstName) userData.firstName = firstName;
                if (lastName) userData.lastName = lastName;
                if (password) userData.hashedPassword = helpers.hash(password);

                //store the new updates
                _data.update('users', phone, userData, function (err) {
                  if (!err) {
                    clb(200, { message: 'User is updated' });
                  } else {
                    clb(500, { error: 'Something went wrong' });
                  }
                });
              } else {
                clb(400, { error: 'The user does not exist' });
              }
            });
          } else {
            clb(403, {
              error:
                'Authorization is required token in header or token is invalid',
            });
          }
        }
      );
    } else {
      clb(400, { error: 'Missing data that should be updated' });
    }
  } else {
    clb(400, { error: 'Missing required field' });
  }
};

// required data: phone
// optional data: none

handlers._users.delete = function getUsersHandler(data, clb) {
  // Check that the phone number is valid
  const {
    queryStringObj: { phone },
  } = data;

  const userPhone =
    typeof phone === 'string' && phone.trim().length === 10
      ? phone.trim()
      : false;
  if (userPhone) {
    // get a token from the headers
    const token =
      typeof data.headers.token === 'string' ? data.headers.token : false;

    // Verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(
      token,
      phone,
      function verificationCatcher(tokenIsValid) {
        if (tokenIsValid) {
          // Lookup the user
          _data.read('users', userPhone, function (err, userData) {
            if (!err && userData) {
              _data.delete('users', phone, function (err) {
                if (!err) {
                  // Delete any other files (each of the checks) assosiated with this user
                  const userChecks =
                    typeof userData.checks === 'object' &&
                    userData.checks instanceof Array
                      ? userData.checks
                      : [];
                  const checksToDelete = userChecks.length;
                  if (checksToDelete > 0) {
                    let checksDeleted = 0;
                    let deletionsErrors = false;
                    //Loop throught the checks
                    userChecks.forEach((checkId) => {
                      // Delete the check
                      _data.delete('checks', checkId, (err) => {
                        if (err) {
                          deletionsErrors = true;
                        }
                        checksDeleted++;
                        if (checksDeleted === checksToDelete) {
                          if (!deletionsErrors) {
                            clb(200, { message: 'Deleted successfully' });
                          } else {
                            clb(500, {
                              error:
                                'Errors encountered while etempting to delete all the user checks. All checks may not have been deleted from the system successfully',
                            });
                          }
                        }
                      });
                    });
                  } else {
                    clb(200, { message: 'Deleted successfully' });
                  }
                } else {
                  clb(500, { error: 'Something went wrong' });
                }
              });
            } else {
              clb(400, { error: 'User is not found' });
            }
          });
        } else {
          clb(403, {
            error:
              'Authorization is required token in header or token is invalid',
          });
        }
      }
    );
  } else {
    clb(404, { error: 'Missing required data: phone' });
  }
};

// Tokens
handlers.tokens = function tokensHandler(data, clb) {
  const acceptableMethods = ['get', 'post', 'put', 'delete'];

  // if data mathod exists inside the list of acceptable methods, go ahead
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, clb);
  } else {
    // method is not allowed
    clb(405);
  }
};

// Container for all the tokens methods

handlers._tokens = {};

// Get Token
// Required data: id
// Optional data: none
handlers._tokens.get = function getTokesHandler(data, clb) {
  // check that id is valid
  const {
    queryStringObj: { id },
  } = data;

  const tokenId =
    typeof id === 'string' && id.trim().length === 20 ? id.trim() : false;
  console.log({ id: id.trim(), len: id.trim().length });

  if (tokenId) {
    // Lookup the token
    _data.read('tokens', tokenId, function getTokenFromDB(err, dataFromDb) {
      if (!err && dataFromDb) {
        clb(200, dataFromDb);
      } else {
        clb(404, { error: 'Token does not exist' });
      }
    });
  } else {
    clb(404, { error: 'Missing required data: id' });
  }
};

// Post Token
// Required data: phone and password
// Optional data: none
handlers._tokens.post = function postTokensHandler(data, clb) {
  // Check that  required field is there
  const phone =
    typeof data.payload.phone === 'string' &&
    data.payload.phone.trim().length === 10
      ? data.payload.phone.trim()
      : false;
  const password =
    typeof data.payload.password === 'string' &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;

  if (phone && password) {
    // Look up the user who maches that phone number
    _data.read('users', phone, function readingInUsersBD(err, userData) {
      if (!err && userData) {
        // has the sent password
        const hashedPassword = helpers.hash(password);

        // compare the hashed passwords
        if (hashedPassword === userData.hashedPassword) {
          // if valid create a new token with a random name
          // set expiration date - 1 hour in the future
          const tokenId = helpers.crateRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObject = {
            phone,
            id: tokenId,
            expires,
          };

          // Store the token
          _data.create(
            'tokens',
            tokenId,
            tokenObject,
            function wtitingNewTokenInDB(err) {
              if (!err) {
                clb(200, tokenObject);
              } else {
                clb(500, 'Could not create token');
              }
            }
          );
        } else {
          clb(400, {
            error:
              "Password did not match the specified user's stored password",
          });
        }
      } else {
        clb(400, { error: 'Could not find the specified user' });
      }
    });
  } else {
    clb(400, { error: 'Missing required field(s)' });
  }
};

// Put Token
// Required data: tokenId, extend
// Optional data: none
handlers._tokens.put = function putTokesHandler(data, clb) {
  const id =
    typeof data.payload.id === 'string' && data.payload.id.trim().length === 20
      ? data.payload.id.trim()
      : false;

  const extend =
    typeof data.payload.extend === 'boolean' && data.payload.extend === true
      ? true
      : false;

  if (id && extend) {
    // Lookup a token
    _data.read('tokens', id, function getTokenFromDB(err, tokenData) {
      if (!err && tokenData) {
        // check to make sure that the token is not already expired
        if (tokenData.expires > Date.now()) {
          // set the expiration date and hour from now
          tokenData.expires = Date.now() + 1000 * 60 * 60;

          // store the new updates
          _data.update('tokens', id, tokenData, function (err) {
            if (!err) {
              clb(200, { message: 'Token is extended' });
            } else {
              clb(500, { error: 'Could not update the token expiration' });
            }
          });
        } else {
          clb(400, {
            error: 'The token is already expired and cannot be extended',
          });
        }
      } else {
        clb(404, { error: 'Token does not exist' });
      }
    });
  } else {
    clb(400, { error: 'Missing required fields or fields are invalid' });
  }
};

// Delete token
// Required: id
handlers._tokens.delete = function deleteTokesHandler(data, clb) {
  // Check that the id is valid
  const {
    queryStringObj: { id },
  } = data;

  const tokenId =
    typeof id === 'string' && id.trim().length === 20 ? id.trim() : false;

  if (tokenId) {
    // Lookup the token
    _data.read('tokens', tokenId, function (err, tokenData) {
      if (!err && tokenData) {
        _data.delete('tokens', tokenId, function (err) {
          if (!err) {
            clb(200, { message: 'Token is Deleted successfully' });
          } else {
            clb(500, { error: 'Something went wrong' });
          }
        });
      } else {
        clb(400, { error: 'Token is not found' });
      }
    });
  } else {
    clb(404, { error: 'Missing required data: id' });
  }
};

// Verify if the given id is currently valid for a given user
handlers._tokens.verifyToken = function validateToken(id, phone, clb) {
  // Lookup the token
  _data.read('tokens', id, function (err, tokenData) {
    if (!err && tokenData) {
      // Check if the token for the given user and is not expired
      if (tokenData.phone === phone && tokenData.expires > Date.now()) {
        clb(true);
      } else {
        clb(false);
      }
    } else {
      clb(false);
    }
  });
};

// Checks

handlers.checks = function checksHandler(data, clb) {
  const acceptableMethods = ['get', 'post', 'put', 'delete'];

  // if data mathod exists inside the list of acceptable methods, go ahead
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, clb);
  } else {
    // method is not allowed
    clb(405);
  }
};

// Check container
handlers._checks = {};

// Required: protocol, url, method, successCodes, timeoutSeconds
// Optional: none
handlers._checks.post = function createCheck(data, clb) {
  // validate inputs
  const protocol =
    typeof data.payload.protocol === 'string' &&
    ['http', 'https'].indexOf(data.payload.protocol.trim()) > -1
      ? data.payload.protocol.trim()
      : false;

  const url =
    typeof data.payload.url === 'string' && data.payload.url.trim().length > 0
      ? data.payload.url.trim()
      : false;

  const method =
    typeof data.payload.method === 'string' &&
    ['post', 'get', 'put', 'delete'].indexOf(data.payload.method.trim()) > -1
      ? data.payload.method.trim()
      : false;

  const successCodes =
    typeof data.payload.successCodes === 'object' &&
    data.payload.successCodes instanceof Array &&
    data.payload.successCodes.length > 0
      ? data.payload.successCodes
      : false;

  const timeoutSeconds =
    typeof data.payload.timeoutSeconds === 'number' &&
    data.payload.timeoutSeconds % 1 === 0 &&
    data.payload.timeoutSeconds >= 1 &&
    data.payload.timeoutSeconds <= 5
      ? data.payload.timeoutSeconds
      : false;

  if (protocol && url && method && successCodes && timeoutSeconds) {
    // Check user's authorization: get the tokens from the header
    // get a token from the headers
    const token =
      typeof data.headers.token === 'string' ? data.headers.token : false;

    // Lookup the user by reading the token
    _data.read('tokens', token, (err, tokenData) => {
      if (!err && tokenData) {
        const { phone: userPhone } = tokenData;

        //Lookup the user data
        _data.read('users', userPhone, (err, userData) => {
          if (!err && userData) {
            const userChecks =
              typeof userData.checks === 'object' &&
              userData.checks instanceof Array
                ? userData.checks
                : [];
            // Verify that the user has less than max-checks-per-user

            if (userChecks.length < config.maxChecks) {
              // Create a random id for the check
              const checkId = helpers.crateRandomString(20);

              // Create the check object and include the user's phone

              const checkObject = {
                ID: checkId,
                userPhone,
                protocol,
                url,
                method,
                successCodes,
                timeoutSeconds,
              };

              // Save the object
              _data.create('checks', checkId, checkObject, (err) => {
                if (!err) {
                  // Add the check id to the user's object

                  userData.checks = userChecks;
                  userData.checks.push(checkId);

                  _data.update('users', userPhone, userData, (err) => {
                    if (!err) {
                      // Return the data about the new check
                      clb(201, {
                        message: 'The new check is created',
                        checkObject,
                      });
                    } else {
                      clb(500, {
                        error: 'Could not update the user with the new check',
                      });
                    }
                  });
                } else {
                  clb(500, 'Could not create the new check');
                }
              });
            } else {
              clb(400, {
                error: `The user already has the maximum number of checks: ${config.maxChecks}.`,
              });
            }
          } else {
            clb(403, {
              error: 'Not authorized, the token may not correspond to a user',
            });
          }
        });
      } else {
        clb(403, { error: 'The token is missing' });
      }
    });
  } else {
    clb(400, { error: 'Missing required data or data is invalid' });
  }
};

// Required: checkId
// Optional: none
handlers._checks.get = function getCheck(data, clb) {
  // Check that the id  is valid
  const {
    queryStringObj: { id },
  } = data;

  const checkId =
    typeof id === 'string' && id.trim().length === 20 ? id.trim() : false;

  if (checkId) {
    // Lookup the check
    _data.read('checks', checkId, (err, checkData) => {
      if (!err && checkData) {
        // get a token from the headers
        const token =
          typeof data.headers.token === 'string' ? data.headers.token : false;

        // Verify that the given token is valid and belongs to user who created the check
        handlers._tokens.verifyToken(
          token,
          checkData.userPhone,
          function verificationCatcher(tokenIsValid) {
            if (tokenIsValid) {
              // Retunr the check data
              clb(200, checkData);
            } else {
              clb(403, {
                error:
                  'Authorization is required token in header or token is invalid',
              });
            }
          }
        );
      } else {
        clb(404, { error: 'The check is not found' });
      }
    });
  } else {
    clb(404, { error: 'Missing required data: id' });
  }
};

// Change the check
// Required: id
// Optional: protocol, url, method, successCodes, timeoutSeconds
// One of optional fields must be sent
handlers._checks.put = function updateCheck(data, clb) {
  // Check for a required field
  const id =
    typeof data.payload.id === 'string' && data.payload.id.trim().length === 20
      ? data.payload.id.trim()
      : false;

  // validate optional inputs
  const protocol =
    typeof data.payload.protocol === 'string' &&
    ['http', 'https'].indexOf(data.payload.protocol.trim()) > -1
      ? data.payload.protocol.trim()
      : false;

  const url =
    typeof data.payload.url === 'string' && data.payload.url.trim().length > 0
      ? data.payload.url.trim()
      : false;

  const method =
    typeof data.payload.method === 'string' &&
    ['post', 'get', 'put', 'delete'].indexOf(data.payload.method.trim()) > -1
      ? data.payload.method.trim()
      : false;

  const successCodes =
    typeof data.payload.successCodes === 'object' &&
    data.payload.successCodes instanceof Array &&
    data.payload.successCodes.length > 0
      ? data.payload.successCodes
      : false;

  const timeoutSeconds =
    typeof data.payload.timeoutSeconds === 'number' &&
    data.payload.timeoutSeconds % 1 === 0 &&
    data.payload.timeoutSeconds >= 1 &&
    data.payload.timeoutSeconds <= 5
      ? data.payload.timeoutSeconds
      : false;

  // Check if id is valid
  if (id) {
    // Check if one of the optional fields is sent
    if (protocol || url || method || successCodes || timeoutSeconds) {
      // Look up the check

      _data.read('checks', id, (err, checkData) => {
        if (!err && checkData) {
          // get a token from the headers
          const token =
            typeof data.headers.token === 'string' ? data.headers.token : false;

          // Verify that the given token is valid and belongs to user who created the check
          handlers._tokens.verifyToken(
            token,
            checkData.userPhone,
            function verificationCatcher(tokenIsValid) {
              if (tokenIsValid) {
                // Update the check where nesessary
                if (protocol) {
                  checkData.protocol = protocol;
                }
                if (url) {
                  checkData.url = url;
                }
                if (method) {
                  checkData.method = method;
                }
                if (successCodes) {
                  checkData.successCodes = successCodes;
                }
                if (timeoutSeconds) {
                  checkData.timeoutSeconds = timeoutSeconds;
                }

                _data.update('checks', id, checkData, (err) => {
                  if (!err) {
                    clb(200, { message: 'Updated successfully', checkData });
                  } else {
                    clb(500, `Could not update the check with id ${id}`);
                  }
                });
              } else {
                clb(403, {
                  error:
                    'Authorization is required token in header or token is invalid',
                });
              }
            }
          );
        } else {
          clb(404, { error: 'Check id does not exist' });
        }
      });
    } else {
      clb(400, {
        error:
          'Missing the fields to update: protocol, url, method, successCodes, timeoutSeconds',
      });
    }
  } else {
    clb(400, { error: 'Missing required field: id. Or id is invalid' });
  }
};

// Required: id
// Optional: none
handlers._checks.delete = function deleteCheck(data, clb) {
  // Check that the id number is valid
  const {
    queryStringObj: { id },
  } = data;

  const checkId =
    typeof id === 'string' && id.trim().length === 20 ? id.trim() : false;

  if (checkId) {
    // Lookupt the check to delet
    _data.read('checks', checkId, (err, checkData) => {
      if (!err && checkData) {
        // get a token from the headers
        const token =
          typeof data.headers.token === 'string' ? data.headers.token : false;

        // Verify that the given token is valid for the user
        handlers._tokens.verifyToken(
          token,
          checkData.userPhone,
          function verificationCatcher(tokenIsValid) {
            if (tokenIsValid) {
              // Delete the check data
              _data.delete('checks', checkId, (err) => {
                if (!err) {
                  // Lookup the user
                  _data.read(
                    'users',
                    checkData.userPhone,
                    function (err, userData) {
                      if (!err && userData) {
                        const userChecks =
                          typeof userData.checks === 'object' &&
                          userData.checks instanceof Array
                            ? userData.checks
                            : [];
                        // Remove the deleted check from the list of checks

                        const checkPosition = userChecks.indexOf(checkId);
                        if (checkPosition > -1) {
                          userChecks.splice(checkPosition, 1);
                          // Re-save the user's data
                          _data.update(
                            'users',
                            checkData.userPhone,
                            userData,
                            function (err) {
                              if (!err) {
                                clb(200, {
                                  mesage: 'Check deleted syccessfuly',
                                  checkData,
                                  usersChecks: userData.checks,
                                });
                              } else {
                                clb(500, {
                                  error:
                                    'Could not find the user who created this check',
                                });
                              }
                            }
                          );
                        } else {
                          clb(500, {
                            error:
                              'Could not find the check in users check list so could not remove it',
                          });
                        }
                      } else {
                        clb(400, { error: 'User is not found' });
                      }
                    }
                  );
                } else {
                  clb(500, { error: 'Could not delete the check' });
                }
              });
            } else {
              clb(403, {
                error:
                  'Authorization is required token in header or token is invalid',
              });
            }
          }
        );
      } else {
        clb(404, { error: 'The check was not found' });
      }
    });
  } else {
    clb(404, { error: 'Missing required data: id' });
  }
};
// define a not found handler
handlers.notFound = function notFoundHandler(data, clb) {
  clb(404);
};

module.exports = handlers;
