const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const { 
  parseJson,
  isValidCounter,
  isValidBase64Signature,
  isValidPublicKey
} = require('./helper.js'); 

const {
  getConnections,
  deleteConnection,
  addClient,
  getClient,
  getClients,
  isClient,
  deleteClient,
  addActiveServer,
  getActiveServer,
  getActiveServers,
  isActiveServer,
  deleteActiveServer,
  getNeighbourhoodServerPublicKey,
  isInNeighbourhood,
  getConnection,
  addConnection
} = require("./server-state.js");

const {
  processSignedData,
  processClientListReq,
  processClientUpdate,
  generateClientUpdate,
  generateClientUpdateReq
} = require("./protocol.js")

const port = process.env.PORT || 3000;

const app = express()
const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

// List of valid payload types that can be received
const validPayloadTypes = ["signed_data", "client_list_request", "client_update_request"]

/* --- WebSocket Connection Handling --- */

// Accepts websocket connections
// Handle messages (including parsing and validation)
// Handles disconnection
wss.on('connection', (ws, req) => {
  ws.isAlive = true;

  // Generate a unique ID for each connection and store connection info
  const connectionId = uuidv4(); 
  addConnection(connectionId, ws);

  const host = req.headers.host;

  console.log(`New connection: ${connectionId}`);

  // Listen for messages from the client
  ws.on('message', (message) => {

    let reply;
    // Check WebSocket message is a json payload
    const payload = parseJson(message);
    if (payload === undefined) {
      console.log("Invalid message/JSON");
      return;
    }

    // Check whether the payload type is valid
    if (payload.type === undefined || !validPayloadTypes.includes(payload.type)) {
      console("Payload type was invalid or missing");
      return;
    }
    
    // If payload is of type "signed_data"
    if (payload.type === "signed_data") {
      reply = processSignedData(connectionId, payload);
    }

    // If payload is of type "client_list_request"
    if (payload.type === "client_list_request") {
      reply = processClientListReq(host);
    }

    // If payload is of type "client_update_request"
    if (payload.type === "client_update_request") {
      reply = JSON.stringify(generateClientUpdate());
    }

    // If payload is of type "client_update"
    if (payload.type === "client_update") {
      let success = processClientUpdate(connectionId);
      if (!success) {
        console.log("Server sent a bad client_update, closing the connection");
        ws.close();
      }
    }

    console.log(`Sending reply ${reply} to ${connectionId}`);
    ws.send(reply);
  });

  // Handle client disconnection
  ws.on('close', () => {
    
    console.log(`Client ${connectionId} disconnected`);

    // Cleanup public keys provided by client
    if (isClient(connectionId)){
      console.log(`Client ${connectionId} removed from client list`);
      deleteClient(connectionId);
    }
    
    // Cleanup external server information
    if (isActiveServer(connectionId)){
      console.log(`Server ${connectionId} removed from connected servers list`);
      deleteActiveServer(connectionId);
    }

    // Cleanup WebSocket connection for client
    deleteConnection(connectionId);
  });
});

// app.get('/', function (req, res) {
//   res.send('Hello World')
// })

server.listen(port, () => {
  console.log(`Listening at localhost:${port}`);
}) 