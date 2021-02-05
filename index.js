// Starting an HTTP server
/*
 * Primary file for the API
 *
 *
 */

const http = require('http');
// the server should respond to all requests with a string
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const router = require('./router').router;
const handlers = require('./router').handlers;
const config = require('./config');

// start the server and have it listen on the port 3000
// when we create the server and tell it to listen
// when the request comes in both of these objects (req and res) get filled and available iside the body of the func
// every time the request comes in, these objects will be created again and again new for every request.
const server = http.createServer((req, res) => {
  // get the url and parse it
  const parsedUrl = url.parse(req.url, true); // second parameter is true: parse the query string with a query native module, so I don't need to require it
  // parsedUrl = {[key]: value}

  // get the path from url
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');

  // get a query string as an object
  const queryStringObj = parsedUrl.query;

  // het HTTP method
  const method = req.method.toLowerCase();

  // get headers as an object
  const { headers } = req;

  // get the payload if there is any. Pass to the constructor what it should be decoding
  // Node has a lot to do with streams. They're bits of information that are comming in a little bit at a time
  // as oposed to all at once.
  // Payloads that come as a part of a HTTP request come to a HTTP server as a stream
  // So we need to collect that stream and then when a stream tels us that we're at the end - coelase that into one coehearent thing. Then we can figure out what the entire payload is.
  const decoder = new StringDecoder('utf-8');
  let buffer = '';
  // when the request object emmits the event 'data', we want the callback to be called and the data to be passed to this callback.
  req.on('data', function onDataClbck(data) {
    buffer += decoder.write(data);
  });
  req.on('end', function onEnd() {
    buffer += decoder.end();

    // Choose the handler this request should go to
    // If one is not found, use notFound handler
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
    // Return the response
    // res.end('Hello user\n');

    // log the path the person was asking for
    // console.log(`🔻 **Requested path**: ${trimmedPath}\n`);
    // console.log(`🔻 Method: ${method}\n`);
    // console.log(`🔻 Query string object: ${JSON.stringify(queryStringObj)}\n`);
    // console.log(`🔻 Headers: `, headers);
    // not every request is going to have a payload
    // the `end` event is still gonna get called but the `data` event won't always be called if there is no req body.
    // console.log(`🔻 Payload: `, buffer, '\n payload type:', typeof buffer);
  });
});

const PORT = config.httpPort;

server.listen(PORT, function listenCallback() {
  console.log(`The server is listening  on  port ${PORT} 🔥`);
});
