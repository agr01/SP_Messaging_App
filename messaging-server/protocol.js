// Group 53: William Godfrey (a1743033) Alexandra Gramss (a1756431)

const {
  getConnections,
  deleteConnection,
  upsertClient,
  getClient,
  getClients,
  isClient,
  deleteClient,
  upsertActiveServer,
  getActiveServer,
  getActiveServers,
  isActiveServer,
  deleteActiveServer,
  getNeighbourhoodServerPublicKey,
  isInNeighbourhood,
  getConnection,
  addConnection,
  getAndIncreaseCounter
} = require("./server-state.js");

const { 
  ClientInfo,
  ActiveServerInfo,
  parseJson,
  isValidCounter,
  isValidBase64Signature,
  isValidPublicKey,
  generateSignature
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
class ClientUpdateRequest {
  constructor() {
    this.type = "client_update_request";
  }
}

// Object used in the generation of "server_hello" payload
class ServerHelloData {
  constructor(host) {
    this.type = "server_hello";
    this.sender = host;
  }
}

// Object used in the generation of "signed_data" payload
class SignedData {
  constructor(data, counter, signature) {
    this.type = "signed_data";
    this.data = data;
    this.counter = counter;
    this.signature = signature;
  }
}

// Object used in the creation of "client_list" response
class ClientList {
  constructor() {
    this.type = "client_list";
    this.servers = [];
  }
}

// Object used in the creation of "client_list" response
class ServerClientList {
  constructor(address, clients) {
    this.address = address;
    this.clients = clients;
  }
}

/* --- Protocol functions --- */

// Validate that message has a valid signature and valid counter
function isValidMessage (publicKey, data, signature, counter, trackedCounter) {

  // Verify counter
  if (!isValidCounter(counter, trackedCounter)) {
    console.error("Invalid or missing counter.");
    return false;
  }

  // Verify signature
  const concat = JSON.stringify(data) + counter.toString();
  if (!isValidBase64Signature(signature, publicKey, concat)){
    console.error("Invalid or missing signature");
    return false;
  }

  return true;
}

/* --- Fuctions for "signed_data" payloads --- */

// Processes a data object of type "hello"
// Returns a generic message (no protocol defined response)
function processHello(connectionId, data, counter, signature) {
  // Check for valid public key
  const publicKey = data.public_key;
  if (!isValidPublicKey(publicKey))
    return "Invalid or missing public key";

  // Validates message. As hello is assumed to be the first messsage from the
  // client, -1 is used as the first tracked counter
  if (!isValidMessage(publicKey, data, signature, counter, -1)) 
    return "Message failed validation";

  // Add connection to list of valid clients
  upsertClient(connectionId, new ClientInfo(publicKey, counter));
  return "Success";
}

// Process server_hello messages
// Returns true if server was successfully identified and all validations pass;
// false otherwise
function processServerHello(connectionId, data, counter, signature) {
  
  // Check whether sender field is valid
  const sender = data.sender;
  if (sender === undefined || typeof(sender) !== "string") {
    console.error("Invalid or missing sender field");
    return false;
  }

  // Check if server is in the neighbourhood
  if (!isInNeighbourhood(sender)) {
    console.error("Server sender was not present in the neighbourhood");
    return false;
  }

  // Check for valid public key  
  const publicKey = getNeighbourhoodServerPublicKey(sender);
  if (!isValidPublicKey(publicKey)) {
    console.error("Invalid or missing public key");
    return false;
  }

  // Check for valid server_hello message
  if (!isValidMessage(publicKey, data, signature, counter, -1)) {
    console.error("Message failed validation");
    return false;
  }
    
  // Insert/Update active server for the connection
  upsertActiveServer(connectionId, new ActiveServerInfo(sender, []));
  return true;
}

/* --- Fuctions for "signed_data" payloads of type "public_chat" --- */

// Checks if a public chat message is valid
// Return false if any validation fail; true otherwise
function isValidPublicChat(connectionId, data, counter, signature) {
  let publicKey;
  let trackedCounter;
  const fingerprint = data.sender;

  // Ensure that fingerprint is not missing and is a string
  if (typeof(fingerprint) !== "string") {
    console.error("Sender was invalid type or missing");
    return false;
  }

  // Ensure that sender is connected to the network in a valid way
  if (isClient(connectionId)) {
    
    // When connection is a client, publicKey and counter can just be retrieved
    let client = getClient(connectionId);
    publicKey = client.publicKey;
    trackedCounter = client.counter;
  }
  else if (isActiveServer(connectionId)) {
    
    // When connection is active server, have to get public key using fingerprint
    const activeServer = getActiveServer(connectionId);
    console.log("Active server: ", activeServer)
    publicKey = activeServer.getPublicKeyUsingFingerprint(fingerprint);
    
    // Ensure client is still connected to the server
    if (publicKey === undefined) {
      console.log("Sending client was not found on active server that forwarded message");
      return false;
    }

    // Get the counter for the client
    trackedCounter = activeServer.getClientCounter(fingerprint);
  }
  else {
    // Message coming a client/server that has not properly integrated
    console.log("Chat message did not orginate from an active client or server, exiting");
    return false;
  }

  // Check for valid message
  if (!isValidMessage(publicKey, data, signature, counter, trackedCounter)) {
    console.log("Invalid message detected, exiting")
    return false;
  }

  return true;
}

// Forwards the "public_chat" payload to all other connected clients and servers
// except the sender
function forwardPublicChat(connectionId, payload) {
  // For each client currently connected to the server, distribute the public message
  const otherClients = getClients(); 
  otherClients.forEach((_, otherConnId) => { 
    // If sender is a client, ensure public message is not sent back
    if (otherConnId !== connectionId) {
      let ws = getConnection(otherConnId);
      ws.send(JSON.stringify(payload));
    }
  });

  // For each server currently connected to this server
  const activeServers = getActiveServers();
  activeServers.forEach((_, serverConnId) => {
    // If sender is a server, ensure public message is not sent back
    if (serverConnId !== connectionId) {
      let ws = getConnection(serverConnId);
      ws.send(JSON.stringify(payload));
    }
  });
}

// Checks if a "chat" message is valid
// Return false if any validation fail; true otherwise
function isValidChat(connectionId, data, counter, signature) {
 
  // Check the destination_servers is an array and ensure it contains data
  const dests = data.destination_servers;
  if (!(dests instanceof Array) || dests.length === 0) {
    console.log("Data field destination_servers was invalid, missing or empty");
    return false;
  }

  // Check the symm_keys is an array and ensure it contains right amount of data
  const symmKeys = data.symm_keys;
  if (!(symmKeys instanceof Array) || symmKeys.length < dests.length) {
    console.log("Data field symm_keys was invalid, missing or empty");
    return false;
  }

  // Unable to validate counter and signature forwarded messages 
  if (isActiveServer(connectionId)) {
    console.log("Chat is message forwarded from other server. Stopping signature and counter validation");
    return true;
  }
  
  let publicKey, trackedCounter;
  // Ensure that sender is connected to the network in a valid way
  if (isClient(connectionId)) {
    
    // When connection is a client, publicKey and counter can just be retrieved
    let client = getClient(connectionId);
    publicKey = client.publicKey;
    trackedCounter = client.counter;
  }
  else {
    // Message coming a client/server that has not properly integrated
    console.log("Chat message did not orginate from an active client or server, exiting");
    return false;
  }

  // Check for valid message
  if (!isValidMessage(publicKey, data, signature, counter, trackedCounter)) {
    console.log("Invalid message detected, exiting");
    return false;
  }

  return true;
}

// Forwards the "chat" payload to relevant connected clients and servers
// except the sender
function forwardChat(connectionId, host, payload) {
  const dests = payload.data.destination_servers;

  console.log(`Checking whether host ${host} is included`);
  // Don't send chat to other clients unless destinations includes host
  if (dests.includes(host)) {
    // For each client currently connected to the server, distribute the message
    const otherClients = getClients(); 
    otherClients.forEach((connectionInfo, otherConnId) => { 
      // If sender is a client, ensure public message is not sent back
      if (otherConnId !== connectionId) {
        let ws = getConnection(otherConnId);
        console.log(`Forwarding chat to ${connectionInfo.fingerprint}`);
        ws.send(JSON.stringify(payload));
      }
    });
  }

  // For each server currently connected to this server
  const activeServers = getActiveServers();
  activeServers.forEach((serverInfo, serverConnId) => {
    // If sender is a server, ensure message is not sent back
    // Ensure that message is only sent to relevant servers
    if (serverConnId !== connectionId && dests.includes(serverInfo.address)) {
      let ws = getConnection(serverConnId);
      console.log(`Sending to active server ${serverInfo.address} connection ${connectionId}`);
      ws.send(JSON.stringify(payload));
    }
  });
}

// Processes any requests of the type "signed_data"
// Returns json string if there is a reply; otherwise undefined
function processSignedData (connectionId, payload, host) {

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
      sendClientUpdates();
      console.log(`ProcessHello returned: ${message}` ) 
      return;

      // Process server_hello message
      case "server_hello":
        console.log(`Processing server_hello message`);
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

      // Process public_chat message
      case "public_chat":
        console.log("Processing public chat");
        if (isValidPublicChat(
          connectionId,
          payload.data,
          payload.counter,
          payload.signature)
        ) {
          // Only forward public chat if message is valid
          console.log("Forwarding public chat");
          forwardPublicChat(connectionId, payload);
        } 
        return;

      case "chat":
        // Validate the chat is a valid message from one connected clients
        console.log("Processing chat message");
        if (isValidChat(
          connectionId,
          payload.data,
          payload.counter,
          payload.signature)
        ) {
          // Only forward public chat if message is valid
          console.log("Forwarding chat");
          forwardChat(connectionId, host, payload);
        } 
        return;
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
  clientList.servers.push(new ServerClientList(host, myClients));

  // Add all other servers to server list
  const activeServers = getActiveServers();
  activeServers.forEach((activeServerInfo) => {
    clientList.servers.push(
      new ServerClientList(
        activeServerInfo.address,
        activeServerInfo.clientInfos.map(client => client.publicKey)
      )
    );
  });

  // Stringify the object in preparation for sending
  return JSON.stringify(clientList);
}

// Processes requests of the type "client_update"
// Return true clientUpdate is able to match to an actvie server and update clients;
// false otherwise
function processClientUpdate(connectionId, publicKeys) {
  
  // Check whether there is active server
  const activeServer = getActiveServer(connectionId);
  if (!activeServer) {
    console.log(`Could not find active server for ${connectionId}, resending server_hello`);
    return false;
  }

  // Check whether publicKeys is an array
  if ( !publicKeys || !publicKeys instanceof Array) {
    console.log(`Parsed data clients was not an array, defaulting to empty`);
    return false;
  }

  // Ensure all of the publicKeys are valid public keys in the correct format
  let updateClientInfos = []; 
  if (publicKeys.length > 0) {
    publicKeys.forEach((publicKey) => {
      // Filter out any invalid public keys
      if(!isValidPublicKey(publicKey)) {
        return;
      }

      updateClientInfos.push(
        new ClientInfo(publicKey, activeServer.getClientCounter(publicKey))
      );
    }); 
  }
  
  // Update the active server map value
  activeServer.clientInfos = updateClientInfos;
  upsertActiveServer(connectionId, activeServer);
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

// Generates client updates to send to all active servers
function sendClientUpdates() {

  // Get connected servers
  const activeServers = getActiveServers(); 
  activeServers.forEach((_, connectionId) => {
    let ws = getConnection(connectionId);
    ws.send(JSON.stringify(generateClientUpdate())) 
  });
}


// Generate Client Update Request
// Returns a ClientUpdateRequest 
function generateClientUpdateReq() {
  return new ClientUpdateRequest();
}

// Generates a server_hello signed_data payload
// Returns signed_data payload with server_hello data
function generateServerHello(host) {
  const serverHello = new ServerHelloData(host);
  const counter = getAndIncreaseCounter();
  const concat = JSON.stringify(serverHello) + counter.toString(); 
  return new SignedData(
    serverHello,
    counter,
    generateSignature(concat)
  );
}

module.exports = {
  processSignedData,
  processClientListReq,
  processClientUpdate,
  generateClientUpdate,
  generateClientUpdateReq,
  generateServerHello,
  sendClientUpdates
}