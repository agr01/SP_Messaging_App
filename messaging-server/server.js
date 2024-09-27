const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const port = process.env.PORT || 3000;

const app = express()
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const clients = new Map();

/* --- Connection Handling ---

Accepts the  websocket connection and attempts to process data mes     



*/
wss.on('connection', (ws) => {

  const clientId = uuidv4(); // Generate a unique ID for each client
  clients.set(clientId, ws); // Store the connection

  console.log(`New client connected: ${clientId}`);

  // Listen for messages from the client
  ws.on('message', (message) => {
    console.log(`Received message from ${clientId}: ${message}`);
  });

  // Handle client disconnection
  ws.on('close', () => {
    console.log(`Client disconnected: ${clientId}`);
    clients.delete(clientId); // Remove the connection from the tracking object
  });

  // Send a message to the client
  ws.send('Welcome, you are connected!');
});

app.get('/', function (req, res) {
  res.send('Hello World')
})

app.ws('/echo', function(ws, req) {
  ws.on('message', function(msg) {
    console.log(msg);
    ws.send(msg);
  });
});

  
server.listen(port, () => {
  console.log(`Listening at localhost:${port}`)
}) 