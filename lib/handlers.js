/*
 * Request handlers
 *
 *
 */
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
// TODO: should only let an authenticated users acces their object. Do not let access anyoune else's
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
// TODO: should only let an authenticated users acces their object. Do not let access anyoune else's
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
      clb(400, { error: 'Missing data that should be updated' });
    }
  } else {
    clb(400, { error: 'Missing required field' });
  }
};

// required data: phone
// optional data: none
// TODO: should only let an authenticated users acces their object. Do not let delete anyoune else
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
    clb(404, { error: 'Missing required data: phone' });
  }
};

// define a not found handler
handlers.notFound = function notFoundHandler(data, clb) {
  clb(404);
};

module.exports = handlers;
