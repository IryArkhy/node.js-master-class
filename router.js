const handlers = require('./lib/handlers');

// define a request router
const router = {
  ping: handlers.ping,
  users: handlers.users,
};

module.exports = router;
