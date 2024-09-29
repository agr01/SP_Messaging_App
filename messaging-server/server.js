const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const { ConnectionInfo, ServerInfo, ClientList, parseJson, isValidCounter, isValidBase64Signature, isValidPublicKey} = require('./helper.js'); 
const { resolvePtr } = require('dns');

const port = process.env.PORT || 3000;

const app = express()
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });


/* --- Server State variables --- */

// Map of WebSocket connections
// key: value -> connectionId: ws_conn 
const connections = new Map();

// Map of client connections that have successfully sent a hello
// key: value -> connectionId: ConnectionInfo object
const clients = new Map();

// Map of external server connctions to  that have successfully sent a server_hello
// key: value -> connectionId: ServerInfo object
const ext_server_conns = new Map();
  
// Map of servers in neighbourhood
// key: value -> address (ip address): public_key
const neighbourhood = new Map();

// List of valid payload types that can be received
const validPayloadTypes = ["signed_data", "client_list_request", "client_update_request"]

// List of valid data types within a "signed_data" payload
const validDataTypes = ["hello", "server_hello", "chat", "public_chat"]


/* --- Protocol functions --- */

// Processes a data object of type "hello"
function processHello(connectionId, data, counter, signature) {
  // Check for valid public key
  const publicKey = data.public_key;
  if (!isValidPublicKey(publicKey))
    return "Invalid or missing public key";

  // Verify counter - tracked counter is zero
  if (!isValidCounter(counter, -1)) 
    return "Invalid or missing counter";

  // Verify signature
  const concat = JSON.stringify(data) + counter.toString()
  if (!isValidBase64Signature(signature, publicKey, concat))
    return "Invalid or missing signature";

  // Add connection to list of valid clients
  clients.set(connectionId, new ConnectionInfo(publicKey, counter));
  return "Success";
}

// Processes any requests of the type "signed_data"
// Returns a string or json string as a reply
function processSignedData (connectionId, payload) {
  
  // Check for invalid data.type
  const dataType = payload.data.type;
  if (dataType === undefined || !validDataTypes.includes(dataType))
    return "Invalid signed_data: data.type is invalid or missing";
  
  // Process client hello message
  if (dataType === "hello") {
    console.log("Processing hello message");
    return processHello(
      connectionId, 
      payload.data,
      payload.counter,
      payload.signature
    );
  }
    

  else {
    // TODO server hello

    // TODO chat

    // TODO public_chat
    return "Not implemented yet";
  } 
}

// Processes requests of the type "client_list_request"
// Returns a string or json string for websocket reply
function processClientListReq (host) {
  
  let clientList = new ClientList();
  
  // Add current host's clients 
  let myClients = [];
  clients.forEach((connectionInfo) => {
    myClients.push(connectionInfo.publicKey);
  });

  // Add host server info to list of servers
  clientList.servers.push(new ServerInfo(host, myClients));

  // Add all other servers to server list
  ext_server_conns.forEach((serverInfo) => {
    clientList.Server.push(serverInfo);
  });

  // Stringify the object in preparation for sending
  return JSON.stringify(clientList);
}

// Processes requests of the type "client_update_request"
// Returns a string or json string for websocket reply
function processClientUpdateReq () {
  
  // Prepare client_update 
  let clientUpdate = {};
  clientUpdate.type = "client_update";

  // Add current host's clients 
  let myClients = [];
  clients.forEach((connectionInfo) => {
    myClients.push(connectionInfo.publicKey);
  });

  // Add the list of client public keys to client_update payload 
  clientUpdate.clients = myClients;

  // Stringify the object in preparation for sending
  return JSON.stringify(clientUpdate);
}

/* --- WebSocket Connection Handling --- */

// Accepts websocket connections
// Handle messages (including parsing and validation)
// Handles disconnection
wss.on('connection', (ws, req) => {

  // Generate a unique ID for each connection and store connection info
  const connectionId = uuidv4(); 
  connections.set(connectionId, ws);

  const host = req.headers.host;

  console.log(`New connection: ${connectionId}`);

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
      reply = "Payload type was invalid or missing";
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
      reply = processClientUpdateReq();
    }

    console.log(`Sending reply ${reply} to ${connectionId}`);
    ws.send(reply);
  });

  // Handle client disconnection
  ws.on('close', () => {
    console.log(`Client ${connectionId} disconnected`);

    // Cleanup public keys provided by client
    if (clients.has(connectionId))
      clients.delete(connectionId);

    // Cleanup public keys provided by client
    if (ext_server_conns.has(connectionId))
      ext_server_conns.delete(connectionId);

    // Cleanup WebSocket connection for client
    connections.delete(connectionId);
  });
});

// app.get('/', function (req, res) {
//   res.send('Hello World')
// })

server.listen(port, () => {
  console.log(`Listening at localhost:${port}`);
}) 