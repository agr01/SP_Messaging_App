// Group 51: William Godfrey (a1743033) Alexandra Gramss (a1756431)

/* --- Server State variables --- */

// Map of WebSocket connections
// key: value -> connectionId: ws_conn 
const connections = new Map();

// Map of client connections that have successfully sent a hello
// key: value -> connectionId: ClientInfo object
const clients = new Map();

// Map of external server connctions to  that have successfully sent a server_hello
// key: value -> connectionId: ActiveServerInfo object
const active_servers = new Map();
  
// Map of servers in neighbourhood
// key: value -> address (ip address): public_key
const neighbourhood = new Map();

// Server RSA keys in PEM format
const keys = { publicKey: "", privateKey: "" };

var counter = 0;

/* --- Server State support functions --- */

/* --- Functions for connections  --- */
// Adds a new connection to the connections Map
// Returns: void
function addConnection(connectionId, ws) {
  connections.set(connectionId, ws);
}

// Gets the corresponding Websocket for a connectionId
// Returns: reference to Websocket connection
function getConnection(connectionId) {
  return connections.get(connectionId);
}

// Get the Map containing all the connections
// Returns: reference to Map 
function getConnections() {
  return connections;
}

// Deletes a key:value pair from the connections Map
// Returns void
function deleteConnection(connectionId) {
  connections.delete(connectionId);
}

/* --- Functions for ext_server_conns --- */

// Adds a new connection to the clients Map
// Returns: void
function upsertClient(connectionId, clientInfo) {
  clients.set(connectionId, clientInfo);
}

// Gets the corresponding Websocket for a connectionId
// Returns: reference to Websocket connection
function getClient(connectionId) {
  return clients.get(connectionId);
}

// Get the Map containing all the clients
// Returns: reference to Map 
function getClients() {
  return clients;
}

// Check if clients contains connectionId
// Returns: reference to Map 
function isClient(connectionId) {
  return clients.has(connectionId);
}

// Deletes a key:value pair from the clients Map
// Returns void
function deleteClient(connectionId) {
  clients.delete(connectionId);
}

/* --- Functions for active_servers --- */

// Adds a new connection to the active_servers Map
// Returns: void
function upsertActiveServer(connectionId, clientInfo) {
  active_servers.set(connectionId, clientInfo);
}

// Gets the corresponding Websocket for a connectionId
// Returns: reference to Websocket connection
function getActiveServer(connectionId) {
  return active_servers.get(connectionId);
}

// Get the Map containing all the active_servers
// Returns: reference to Map 
function getActiveServers() {
  return active_servers;
}

// Check if active_servers contains connectionId
// Returns: reference to Map 
function isActiveServer(connectionId) {
  return active_servers.has(connectionId);
}

// Deletes a key:value pair from the active_servers Map
// Returns void
function deleteActiveServer(connectionId) {
  active_servers.delete(connectionId);
}

/* --- Functions for neighbourhood --- */

// Gets the corresponding Websocket for a connectionId
// Returns: reference to Websocket connection
function getNeighbourhood() {
  return neighbourhood;
}

// Gets the public keey for a corresponding neighbourhood address
// Returns: publicKey string
function getNeighbourhoodServerPublicKey(address) {
  return neighbourhood.get(address);
}

// Add servers to the neighbourhood
function insertNeighbourhoodServer(address, publicKey) {
  neighbourhood.set(address, publicKey);
}


// Check if neighbourhood contains address
// Returns: true if address is in neighbourhood; false otherwise
function isInNeighbourhood(address) {
  return neighbourhood.has(address);
}

// Initialise the public and private keys in the server variable
function initialiseKeys() {
  keys.publicKey = process.env.PUBLIC_KEY || "";
  keys.privateKey = process.env.PRIVATE_KEY || "";
}

// Returns the servers publicKey
function getPublicKey() {
  return keys.publicKey;
}

// Returns the servers privateKey
function getPrivateKey() {
  return keys.privateKey;
}

// Returns server counter
function getAndIncreaseCounter() {
  counter += 1;
  return counter-1;
}


module.exports = {
  addConnection,
  getConnection,
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
  getNeighbourhood,
  getNeighbourhoodServerPublicKey,
  insertNeighbourhoodServer,
  isInNeighbourhood,
  initialiseKeys,
  getPublicKey,
  getPrivateKey,
  getAndIncreaseCounter
}