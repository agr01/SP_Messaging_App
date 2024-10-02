const express = require('express');
const https = require('https')
const WebSocket = require('ws');
const fs = require('fs');
const multer = require('multer');
const dotenv = require('dotenv');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { 
  parseJson,
  ActiveServerInfo
} = require('./helper.js'); 

const {
  addConnection,
  deleteConnection,
  isClient,
  deleteClient,
  isActiveServer,
  upsertActiveServer,
  deleteActiveServer,
  getNeighbourhood,
  initialiseKeys,
  insertNeighbourhoodServer
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

// Get the env file and setup config
const ENV_FILE = process.argv[2] || 'server1.env';
dotenv.config({ path: path.resolve(__dirname, ENV_FILE)});
const port = process.env.PORT || 3000;
const host = process.env.HOST || "localhost:3000";
initialiseKeys();

// Setup https using server private and public key
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'ssl', 'server.key')),
  cert: fs.readFileSync(path.join(__dirname, 'ssl', 'server.cert'))
};

// Setup servers
const app = express();
const server = https.createServer(httpsOptions, app);
const wss = new WebSocket.Server({ server });

// List of valid payload types that can be received
const validPayloadTypes = ["signed_data", "client_list_request", "client_update_request", "client_update"]

/* --- WebSocket Connection and Event Handling --- */

// Function to setup websocket event handling logic 
function setupWebSocketEvents(ws, host, type, connectionId, address) {
  ws.isAlive = true;

  if (type === "Server") {
    ws.on("open", () => {
      console.log("Successfully established connection to server");
      // generate server hello
      
      // Add server to active servers
      upsertActiveServer(connectionId, new ActiveServerInfo(address, []))
      // generate server hello      
      ws.send(JSON.stringify(generateServerHello(host)));

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

// Accepts websocket connections
// Handle messages (including parsing and validation)
// Handles disconnection
wss.on('connection', (ws, req) => {
  // Generate a unique ID for each connection and store connection info
  const connectionId = uuidv4();
  console.log(`New connection: ${connectionId}`);

  // Setup all the websocket event logic and add the connection
  setupWebSocketEvents(ws, host, "Client", connectionId);
  addConnection(connectionId, ws);
});

/* --- Neighbourhood Websocket client Setup --- */

// Function to open a websocket connection to all listed neighbourhood servers
function joinNeighbourhood () {
  serverList = getNeighbourhood();
  serverList.forEach((_, address) => {
    
    // Don't establish connection to self
    if (address === host) {
      return;
    }

    // Initialise websocket connection to address
    const wsClient = new WebSocket("wss://"+ address, { rejectUnauthorized: false });
    const connectionId = uuidv4();
    console.log(`New connection: ${connectionId}`);

    // Setup websocket events
    setupWebSocketEvents(wsClient, host, "Server", connectionId, address);

    addConnection(connectionId, wsClient);
  });
}

// Function to open a websocket connection to all listed neighbourhood servers
function setupNeighbourhood () {
  
  // List servers and publicKeys to put into neighbourhood map
  const numServers = 2;
  const serverAddresses = [
    "localhost:3000",
    "localhost:3001"
  ]
  const publicKeys = [
    "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtGqTe0Y0+wf0AZIHCROZ8FY03+1RurIILj775S9HhbFJXjp+JfxM73EoYv4VfjIMix+tkSk1qVB2dLMk1LVkKtw9ZWe9vwmerW17+tf6+ZEB4sLsPj1wyBXrShO9voHWA6lbEqPdmF2gcdhnejG0+GzdW+mfYb2ROwmFmkajGSYdGJIz6c0zwY83TD+IeCqvv0wTKZp71DWoPS7kPacsXbdQcYMV0Kp7gAOYI4Uy/6h3/rjhmgFZWiJJ/xYHh2bNbKSnTEvgdfInj1EBy/dpjNsI4zdfWV74mzivkf1ojVCvAW+QrO1sEtG/HFtiReIvLZNXirNnhYU+SMnW0Xs5GwIDAQAB\n-----END PUBLIC KEY-----",
    "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwGUeqejbScEvYpTb22QyjlOeLJV30bhJOOPDh4OIHBjNpGfNwe7YMZcSEmSbgWp1SmQVukgr09/FvxpbaVOndnx6LegpXIp1d9QZXc7AGuQJXKdOWzDA87O2UbfZSOHVGcn87r6EesMjc+SS9T1gxcIldbm6pdIqEU/ThQLD6rKK56G0TNzI97Qp7g+sXLV7h19s91bLwQScwypwpi2DZ9/UJMVAyvmAbelIXmU3yfwpFywZerHFtFssucg5WMXk69B2sRRv0Hfi+JVEkWEAdOWfm4o6es2GWT0ddXRmZNThmx7BLR/tfg+PZgo7N/bfLNrwkEUEnxKqZzOt+DjaAwIDAQAB\n-----END PUBLIC KEY-----"
  ]

  for(i = 0; i < numServers; i++){
    insertNeighbourhoodServer(serverAddresses[i], publicKeys[i])
  }
}

/* --- HTTPS File Upload/Download --- */

// Set up file storage
const storage = multer.diskStorage({
  // directory where files will be saved
  destination: (req, file, cb) => {
    cb(null, 'uploads/');  
  },
   
  filename: (_, file, cb) => {
    // Save file with unique UUID as filename
    const uniqueFilename = uuidv4() + path.extname(file.originalname);
    cb(null, uniqueFilename); 
  }
});

// Set a size limit 25 MB
const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024  
  }
});

// Endpoint to handle file uploads
app.post('/api/upload', upload.single('file'), (req, res) => {
  // Check file was actually attached
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  // Generate a download URL based on the uploaded file's name (UUID)
  const fileUrl = `https://${host}/api/download/${req.file.filename}`;
  const body = { file_url: fileUrl }


  res.status(200).send(body);
});

// Endpoint to download files
app.get('/api/download/:uuid', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.uuid);

  // Check if the file exists
  if (fs.existsSync(filePath)) {
    // Respond with the file download
    res.download(filePath);
  } 
  else {
    res.status(404).send('File not found.');
  }
});

server.listen(port, () => {
  console.log(`Listening for https file uploads at https://localhost:${port}`);
});

setupNeighbourhood();
joinNeighbourhood();
