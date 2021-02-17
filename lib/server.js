/*
 * Server related tasks
 *
 *
 */

const http = require('http');
const https = require('https');
// the server should respond to all requests with a string
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const router = require('../router');
const handlers = require('./handlers');
const config = require('../config');
const fs = require('fs');
const helpers = require('./helpers');
const path = require('path');
const util = require('util');

// cli command for starting
// NODE_DEBUG=server node index.js
const debug = util.debuglog('server');

// Instantiate the server module object
const server = {};

// Instantiate the HTTP server
server.httpServer = http.createServer((req, res) => {
  server.unifiedServer(req, res);
});

server.httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '/../https/cert.pem')),
};

server.httpsServer = https.createServer(
  server.httpsServerOptions,
  (req, res) => {
    server.unifiedServer(req, res);
  }
);

server.unifiedServer = function (req, res) {
  const parsedUrl = url.parse(req.url, true);

  // get the path from url
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');

  // get a query string as an object
  const queryStringObj = parsedUrl.query;

  // het HTTP method
  const method = req.method.toLowerCase();

  // get headers as an object
  const { headers } = req;

  const decoder = new StringDecoder('utf-8');
  let buffer = '';
  req.on('data', function onDataClbck(data) {
    buffer += decoder.write(data);
  });

  req.on('end', function onEnd() {
    buffer += decoder.end();

    const chousenHandler = !router[trimmedPath]
      ? handlers.notFound
      : router[trimmedPath];

    // Construct a data object to go to the handler
    const data = {
      trimmedPath,
      queryStringObj,
      method,
      headers,
      payload: helpers.parseJsonToObject(buffer),
    };

    // Route the request to the handler specified in the router
    chousenHandler(data, function chousenHandlerCallback(statusCode, payload) {
      // Use status code from the handler or define default one
      statusCode = typeof statusCode === 'number' ? statusCode : 200;
      // Use the payload from the handler or default = {}
      payload = typeof payload === 'object' ? payload : {};

      // Convert to a string
      const payloadString = JSON.stringify(payload);

      // Return the response
      res.setHeader('Content-type', 'application/json');
      res.writeHead(statusCode);
      res.end(payloadString);

      // if the response is 200, 2001
      // otherwise - red
      if (statusCode === 200 || statusCode === 201) {
        debug(
          '\x1b[32m%s\x1b[0m',
          `\nMETHOD: ${method.toUpperCase()} \n` +
            ` PATH: ${path} \n` +
            ` BODY: ${buffer} \n` +
            ` CODE: ${statusCode} \n`
        );
      } else {
        debug(
          '\x1b[31m%s\x1b[0m',
          `\nMETHOD: ${method.toUpperCase()} \n` +
            ` PATH: ${path} \n` +
            ` BODY: ${buffer} \n` +
            ` CODE: ${statusCode} \n`
        );
      }
    });
  });
};

server.init = function init() {
  const HTTP_PORT = config.httpPort;

  // Start the HTTP server
  server.httpServer.listen(HTTP_PORT, function listenCallback() {
    console.log(
      '\x1b[36m%s\x1b[0m',
      `The server is listening  on  http port ${HTTP_PORT} 🔥\n`
    );
  });

  // Start the HTTPS server
  const HTTPS_PORT = config.httpsPort;

  server.httpsServer.listen(HTTPS_PORT, function listenCallback() {
    console.log(
      '\x1b[35m%s\x1b[0m',
      `The server is listening  on  http port ${HTTPS_PORT} 🔥 \n`
    );
  });
};

module.exports = server;
