/*
 * Primary file for the API
 *
 *
 */

const server = require('./lib/server');
const workers = require('./lib/workers');

// Declare the app
const app = {};

// Initialization function

app.init = function init() {
  // Start the server
  server.init();

  // Start the workers
  workers.init();
};

// Execute init() func
app.init();

module.exports = app;
