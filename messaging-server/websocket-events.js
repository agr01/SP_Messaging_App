const { 
  parseJson,
  ActiveServerInfo
} = require('./helper.js'); 

const {
  deleteConnection,
  isClient,
  deleteClient,
  isActiveServer,
  upsertActiveServer,
  deleteActiveServer,
} = require("./server-state.js");

const {
  processSignedData,
  processClientListReq,
  processClientUpdate,
  generateClientUpdate,
  generateClientUpdateReq,
  generateServerHello,
  sendClientUpdates
} = require("./protocol.js")



/* --- WebSocket Event Handling --- */
// List of valid payload types that can be received
const validPayloadTypes = ["signed_data", "client_list_request", "client_update_request", "client_update"]

// Function to setup websocket event handling logic 
function setupWebSocketEvents(ws, httpHost, httpsHost, type, connectionId, address) {
  ws.isAlive = true;

  if (type === "Server") {
    ws.on("open", () => {
      console.log("Successfully established connection to server");
      // generate server hello
      
      // Add server to active servers
      upsertActiveServer(connectionId, new ActiveServerInfo(address, []))
      // generate server hello      
      ws.send(JSON.stringify(generateServerHello(httpHost)));

      // Send a client update request
      ws.send(JSON.stringify(generateClientUpdateReq()));
    });
  }
  
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
      console.log("Payload type was invalid or missing");
      return;
    }
    
    // If payload is of type "signed_data"
    if (payload.type === "signed_data") {
      reply = processSignedData(connectionId, payload, host);
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
      let success = processClientUpdate(connectionId, payload.clients);
      if (!success) {
        console.log(`Failure with client update. Closing bad connection`);
        ws.close();
      }
    }

    if (reply !== undefined) {
      console.log(`Sending message reply for ${payload.type} to ${connectionId}`);
      ws.send(reply);
    }
  });

  // Handle client disconnection
  ws.on('close', () => {
    console.log(`Client ${connectionId} disconnected`);
    
    // Cleanup public keys provided by client
    if (isClient(connectionId)){
      console.log(`Client ${connectionId} removed from client list`);
      deleteClient(connectionId);
      sendClientUpdates();
    }
    
    // Cleanup external server information
    if (isActiveServer(connectionId)){
      console.log(`Server ${connectionId} removed from connected servers list`);
      deleteActiveServer(connectionId);
    }

    // Cleanup WebSocket connection for client
    // Potential security flaw - don't cleanup connection
    deleteConnection(connectionId);
  });

  ws.on('error', (error) => {
    console.log(`Client ${connectionId} experienced an error: ${JSON.stringify(error)}`);
  });
}

module.exports = {
  setupWebSocketEvents
}