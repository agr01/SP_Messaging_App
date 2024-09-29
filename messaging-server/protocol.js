const {
  getConnections,
  deleteConnection,
  addClient,
  getClient,
  getClients,
  isClient,
  deleteClient,
  addActiveServer,
  getServer,
  getActiveServers,
  isActiveServer,
  deleteActiveServer,
  getNeighbourhoodServerPublicKey,
  isInNeighbourhood,
  getConnection,
  addConnection
} = require("./server-state.js");

const { 
  ClientInfo,
  ServerInfo,
  parseJson,
  isValidCounter,
  isValidBase64Signature,
  isValidPublicKey
} = require('./helper.js');

// List of valid data types within a "signed_data" payload
const validDataTypes = ["hello", "server_hello", "chat", "public_chat"]

/* --- Protocol Classes --- */

// Object used in the generation of "client_update" response
function ClientUpdate() {
  this.type = "client_update"
  this.clients = []
}

// Object used in the generation of "client_update_request" payload
function ClientUpdateRequest() {
  this.type = "client_update_request";
}

// Object used in the generation of "server_hello" payload
function ServerHelloData(host) {
  this.type = "server_hello";
  this.sender = host;
}

// Object used in the generation of "signed_data" payload
function SignedData(data, counter, signature) {
  this.type = "signed_data";
  this.data = data;
  this.counter = counter;
  this.signature = signature;
}

// Object used in the creation of "client_list" response
function ClientList() {
  this.type = "client_list";
  this.servers = [];
}

/* --- Protocol functions --- */

// Processes a data object of type "hello"
// Returns a generic message (no protocol defined response)
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
  addClient(connectionId, new ClientInfo(publicKey, counter));
  return "Success";
}

// Process server hellos
// Returns true if server was successfully identified and all validations pass;
// false otherwise
function processServerHello(connectionId, data, counter, signature) {
  
  // Check whether sender field is valid
  const sender = data.sender;
  if (sender === undefined || typeof(sender) !== "string") {
    console.log("Invalid or missing sender field");
    return false;
  }

  // Check if server is in the neighbourhood
  if (!isInNeighbourhood(sender)) {
    console.log("Server sender was not present in the neighbourhood");
    return false;
  }

  // Check for valid public key  
  const publicKey = getNeighbourhoodServerPublicKey(sender);
  if (!isValidPublicKey(publicKey)) {
    console.log("Invalid or missing public key. Please get admin to update");
    return false;
  }

  // Verify counter - tracked counter is starts at -1
  if (!isValidCounter(counter, -1)) {
    console.log("Invalid or missing counter.");
    return false;
  }

  // Verify signature
  const concat = JSON.stringify(data) + counter.toString();
  if (!isValidBase64Signature(signature, publicKey, concat)){
    console.log("Invalid or missing signature for server");
    return false;
  }
    
  // Add connection to list of valid clients
  addActiveServer(connectionId, new ServerInfo(sender, []));
  return true;
}

// Processes any requests of the type "signed_data"
// Returns json string if there is a reply; otherwise undefined
function processSignedData (connectionId, payload) {

  // Check for invalid data.type
  const dataType = payload.data.type;
  if (dataType === undefined || !validDataTypes.includes(dataType)) {
    console.log("Invalid signed_data: data.type is invalid or missing");
    return;
  }

  // Process client hello message
  switch (dataType) {
    case "hello":
      console.log("Processing hello message");
      let message = processHello(
        connectionId, 
        payload.data,
        payload.counter,
        payload.signature
      );
      console.log(`ProcessHello returned: ${message}` ) 
      return;

      // Process the server_hello message
      case "server_hello":
        let success = processServerHello(
          connectionId,
          payload.data,
          payload.counter,
          payload.signature
        );

        // When successfully processed, immediately send a client_update_request in reply
        if (success) {
          console.log("Server hello valid and server recorded as active, sending client_update_request");
          return JSON.stringify(generateClientUpdateReq());
        }
        
        // On failure to validate server_hello, close connection to free up resources 
        console.log("Server hello could not be processed, closing server connection");
        const serverWs = getConnection(connectionId);
        serverWs.close();
        return;

      // TODO chat
      // TODO public_chat
      case "public_chat":
      case "chat":
  }
}

// Processes requests of the type "client_list_request"
// Returns a string or json string for websocket reply
function processClientListReq (host) {
  
  let clientList = new ClientList();
  
  // Add current host's clients 
  let myClients = [];
  const clients = getClients();
  clients.forEach((client) => {
    myClients.push(client.publicKey);
  });

  // Add host server info to list of servers
  clientList.servers.push(new ServerInfo(host, myClients));

  // Add all other servers to server list
  const activeServers = getActiveServers();
  activeServers.forEach((serverInfo) => {
    clientList.servers.push(serverInfo);
  });

  // Stringify the object in preparation for sending
  return JSON.stringify(clientList);
}

// Processes requests of the type "client_update"
// Return true clientUpdate is able to match to an actvie server and update clients;
// false otherwise
function processClientUpdate(connectionId, clients) {
  
  // Check whether there is active server
  const activeServer = getActiveServer(connectionId);
  if (activeServer === undefined) {
    console.log(`Could not find active server for ${connectionId}, exiting`);
    return false;
  }

  // Check whether clients is an array
  if (!clients instanceof Array) {
    console.log(`Parsed data clients was not an array, defaulting to empty`);
    return false
  }

  // Ensure all of the clients are valid public keys in the correct format
  let result = []
  clients.forEach((client) => {
    if(isValidPublicKey(client)) {
      result.push(client);
    }
  }); 
  
  // Update the active server map value
  activeServer.clients = result;
  setActiveServer(connectionId, activeServer);
  return true;
}

// Generate Client Update payload
// Returns a ClientUpdate object
function generateClientUpdate() {
  // Prepare client_update 
  let clientUpdate = new ClientUpdate();
  
  // Get connected clients
  const clients = getClients(); 
  clients.forEach((client) => {
    clientUpdate.clients.push(client.publicKey);
  });

  return clientUpdate;
}

// Generate Client Update Request
// Returns a ClientUpdateRequest 
function generateClientUpdateReq() {
  return new ClientUpdateRequest();
}

module.exports = {
  processSignedData,
  processClientListReq,
  processClientUpdate,
  generateClientUpdate,
  generateClientUpdateReq
}