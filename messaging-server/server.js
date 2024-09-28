const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const { parseJson, isValidCounter, isValidBase64Signature, ClientInfo, isValidPublicKey} = require('./helper.js'); 

const port = process.env.PORT || 3000;

const app = express()
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

/* --- Server State variables --- */

// Map of WebSocket connections
// key: value -> connectionId: ws_conn 
const connections = new Map();

// Map of client connections that have successfully sent a hello
// key: value -> connectionId: ClientInfo object
const clients = new Map();

// Map of external server connctions to  that have successfully sent a server_hello
// key: value -> connectionId: [<server's_clientIds>]
const ext_server_clients = new Map();
  
// Map of servers in neighbourhood
// key: value -> address (ip address): public_key
const neighbourhood = new Map();

// List of valid payload types that can be received
const validPayloadTypes = ["signed_data", "client_list_request", "client_update_request"]

// List of valid data types within a "signed_data" payload
const validDataTypes = ["hello", "server_hello", "chat", "public_chat"]


/* --- Protocol functions --- */

// Processes any payloads of the type "signed_data"
// Returns a string or object as a repliy
function processSignedData (connectionId, payload) {
  // Check for invalid data.type
  if (payload.data.type === undefined || !validDataTypes.includes(payload.data.type)) {
    return "Invalid signed_data: data.type is invalid or missing";
  }
  
  // Client hello
  if (payload.data.type === "hello") {

    // Check for valid public key
    const publicKey = payload.data.public_key;
    if (!isValidPublicKey(publicKey))
      return "Invalid or missing public key";

    // Verify counter - tracked counter is zero
    const counter = payload.data.counter;
    if (!isValidCounter(counter, 0)) 
      return "Invalid or missing counter";

    // Verify signature
    const signature = payload.data.signature;
    if (!isValidBase64Signature(publicKey, signature, JSON.stringify(payload.data) + counter.toString()))
      return "Invalid or missing signature";
    
    // Add connection to list of valid clients
    const clientInfo = ClientInfo(publicKey, counter);
    clients.set(connectionId, clientInfo);
    return "Success";
  }
  else {
    // TODO server hello

    // TODO chat

    // TODO public_chat
    return "Not Implement Yet"
  } 
}


/* --- WebSocket Connection Handling --- */

// Accepts websocket connections
// Handle messages (including parsing and validation)
// Handles disconnection
wss.on('connection', (ws) => {

  // Generate a unique ID for each connection and store connection info
  const connectionId = uuidv4(); 
  connections.set(connectionId, ws); 

  console.log(`New connection: ${connectionId}`)

  // Listen for messages from the client
  ws.on('message', (message) => {
    let reply = "";

    // Check WebSocket message is a json payload
    const payload = parseJson(message);
    if (payload === undefined) {
      reply = "Invalid message/JSON";
    }

    // Check whether the payload type is valid
    if (payload.type === undefined || !validPayloadTypes.includes(payload.type)) {
      reply = "Payload type was invalid or missing"
    }
    
    // If payload is of type "signed_data"
    if (payload.type === "signed_data") {
      reply = processSignedData(connectionId, payload)
    }

    // If payload is of type "client_list_request"
    if (payload.type === "client_list_request") {

    }

    // If payload is of type "client_update_request"
    if (payload.type === "client_update_request") {

    }

    console.log(`Sending reply ${reply} to ${connectionId}`);
    ws.send(reply);
  });

  // Handle client disconnection
  ws.on('close', () => {
    console.log(`Client ${connectionId} disconnected`);

    // Cleanup public keys provided by client
    if (clients.has(connectionId))
      clients.delete(connectionId)

    // Cleanup public keys provided by client
    if (ext_server_clients.has(connectionId))
      ext_server_clients.delete(connectionId)

    // Cleanup WebSocket connection for client
    connections.delete(connectionId);
  });
});

// app.get('/', function (req, res) {
//   res.send('Hello World')
// })

server.listen(port, () => {
  console.log(`Listening at localhost:${port}`)
}) 