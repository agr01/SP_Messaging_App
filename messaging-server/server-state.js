/* --- Server State variables --- */

// Map of WebSocket connections
// key: value -> connectionId: ws_conn 
const connections = new Map();

// Map of client connections that have successfully sent a hello
// key: value -> connectionId: ClientInfo object
const clients = new Map();

// Map of external server connctions to  that have successfully sent a server_hello
// key: value -> connectionId: ServerInfo object
const active_servers = new Map();
  
// Map of servers in neighbourhood
// key: value -> address (ip address): public_key
const neighbourhood = new Map();

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
function addClient(connectionId, clientInfo) {
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
function addActiveServer(connectionId, clientInfo) {
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
function getNeighbourhoodServerPublicKey(address) {
  return neighbourhood.get(address);
}

// Check if neighbourhood contains address
// Returns: true if address is in neighbourhood; false otherwise
function isInNeighbourhood(address) {
  return neighbourhood.has(address);
}

module.exports = {
  addConnection,
  getConnection,
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
  isInNeighbourhood
}