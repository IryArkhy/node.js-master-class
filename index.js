// Starting an HTTP server
/*
 * Primary file for the API
 *
 *
 */

const http = require('http');
const https = require('https');
// the server should respond to all requests with a string
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const router = require('./router').router;
const handlers = require('./router').handlers;
const config = require('./config');
const fs = require('fs');
const _data = require('./lib/data');

// Testing the written lib for writing files -------
// @TODO: delete this after testing (files inside the .data/test dirs)

// Run this one at a time to test (the testing one leave, adn others - just comment out)

_data.create('test', 'newFile', { foo: 'bar' }, function (err) {
  console.log('This was the error: ', !err ? 'no error' : err);
});

_data.read('test', 'newFile', function (err, data) {
  console.log('This was the error: ', !err ? 'no error' : err);
  console.log('This was the data: ', data);
});

_data.update('test', 'newFile', { newData: 'hello worls' }, function (err) {
  console.log('This was the error: ', !err ? 'no error' : err);
});

_data.delete('test', 'newFile', function (err) {
  console.log('This was the error: ', !err ? 'no error' : err);
});

// --------------------------------------------------

const httpServer = http.createServer((req, res) => {
  unifiedServer(req, res);
});

const HTTP_PORT = config.httpPort;

httpServer.listen(HTTP_PORT, function listenCallback() {
  console.log(`The server is listening  on  http port ${HTTP_PORT} 🔥`);
});

const httpsServerOptions = {
  key: fs.readFileSync('./https/key.pem'),
  cert: fs.readFileSync('./https/cert.pem'),
};

const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
  unifiedServer(req, res);
});

const HTTPS_PORT = config.httpsPort;

httpsServer.listen(HTTPS_PORT, function listenCallback() {
  console.log(`The server is listening  on  httsp port ${HTTPS_PORT} 🔥`);
});

function unifiedServer(req, res) {
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
      payload: buffer,
    };
    console.log(router[trimmedPath], { chousenHandler }, handlers.notFound);

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
      console.log(
        `🔻 Payload of this response: `,
        buffer,
        '\n payload type:',
        typeof buffer,
        '\n status code: ',
        statusCode
      );
    });
  });
}
