// define handlers
const handlers = {};

handlers.ping = function pingHandler(data, clb) {
  // Callback a HTTP status code and payload object
  clb(200);
};

// define a not found handler
handlers.notFound = function notFoundHandler(data, clb) {
  clb(404);
};

// define a request router

const router = {
  ping: handlers.ping,
};

module.exports = {
  handlers,
  router,
};
