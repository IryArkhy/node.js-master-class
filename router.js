const handlers = require('./lib/handlers');

// define a request router
const router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks,
};

module.exports = router;
