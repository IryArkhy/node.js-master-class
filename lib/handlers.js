/*
 * Request handlers
 *
 *
 */
const { tokens } = require('../router');
const _data = require('./data');
const helpers = require('./helpers');

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
// TODO: Cleaunup any other data ffiles associated with this user
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
          _data.read('users', userPhone, function (err, dataFromDb) {
            if (!err && dataFromDb) {
              _data.delete('users', phone, function (err) {
                if (!err) {
                  clb(200, { message: 'Deleted successfully' });
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

// define a not found handler
handlers.notFound = function notFoundHandler(data, clb) {
  clb(404);
};

module.exports = handlers;
