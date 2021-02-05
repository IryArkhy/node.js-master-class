// define handlers
const handlers = {};

handlers.sample = function sampleHandler(data, clb) {
  // Callback a HTTP status code and payload object
  clb(406, { name: 'My name is sample handler' });
};

// define a not found handler
handlers.notFound = function notFoundHandler(data, clb) {
  clb(404);
};

// define a request router

const router = {
  sample: handlers.sample,
};

module.exports = {
  handlers,
  router,
};
