// Group 51: William Godfrey (a1743033) Alexandra Gramss (a1756431)

const express = require('express');
const https = require('https');
const WebSocket = require('ws');
const fs = require('fs');
const multer = require('multer');
const dotenv = require('dotenv');
const path = require('path')
const { v4: uuidv4 } = require('uuid');
const { 
  parseJson,
  ActiveServerInfo,
  getDirectorySize
} = require('./helper.js'); 
const cors = require('cors');

const {
  addConnection,
  deleteConnection,
  isClient,
  deleteClient,
  upsertActiveServer,
  isActiveServer,
  deleteActiveServer,
  getNeighbourhood,
  initialiseKeys,
  insertNeighbourhoodServer
} = require("./server-state.js");

const {
  processSignedData,
  generateClientList,
  processClientUpdate,
  generateClientUpdate,
  generateClientUpdateReq,
  generateServerHello,
  sendClientUpdates,
  sendClientLists
} = require("./protocol.js")

// Constant Variables
SERVERS_FILE = "./servers.json"

// File Storage
// Max file size = 25 MB
const MAX_FILE_SIZE = 25 * 1024 * 1024
// Max storage size - 1 GB
const MAX_STORAGE_SIZE = 1024 * 1024 * 1024
// File storage directory
const FILE_STORAGE_DIR = '../server-uploads/';
const FILE_STORAGE_PATH = path.join(__dirname, FILE_STORAGE_DIR);

// Get the env file and setup config
const ENV_FILE = process.argv[2] || 'server1.env';
dotenv.config({ path: path.resolve(__dirname, ENV_FILE)});
const port = process.env.PORT || 3000;
const host = process.env.HOST || "localhost:3000";
initialiseKeys();

// Setup https using server private and public key
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'ssl', 'server.key')),
  cert: fs.readFileSync(path.join(__dirname, 'ssl', 'server.crt'))
};

// Setup servers
const app = express()
const server =  https.createServer(httpsOptions, app);
const wss = new WebSocket.Server({ server });
app.use(cors());

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
      reply = JSON.stringify(generateClientList(host));
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

      // Update connected servers with connected clients
      sendClientUpdates();
    }
    
    // Cleanup external server information
    if (isActiveServer(connectionId)){
      console.log(`Server ${connectionId} removed from connected servers list`);
      deleteActiveServer(connectionId);
    }

    // Cleanup WebSocket connection for client
    deleteConnection(connectionId);

    // Update all connected clients
    sendClientLists(host);
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
function setupNeighbourhood() {
  // Get servers from servers.json
  const serversArr = JSON.parse(fs.readFileSync(SERVERS_FILE).toString());

  let serverAddresses = [];
  let numServers = 0;
  let publicKeys = [];

  for (const server of serversArr){
    if (typeof server.address !== "string" || typeof server.pubKeyPem !== "string") 
      throw Error("Invalid server in servers.json");
    
    insertNeighbourhoodServer(server.address, server.pubKeyPem)
  }
  
}

/* --- HTTPS File Upload/Download --- */

// Set up file storage
const storage = multer.diskStorage({
  // directory where files will be saved
  destination: async (req, file, cb) => {

    console.log("Filestoragepath: ", FILE_STORAGE_PATH)
    
    // Check if the directory exists
    if (!fs.existsSync(FILE_STORAGE_PATH)) {
      console.log("creating /uploads dir")
      // Create the directory if it does not exist
      fs.mkdirSync(FILE_STORAGE_PATH, { recursive: true });
    }

    // Check if the directory is full & empty directory if it is
    const dirSize = await getDirectorySize(FILE_STORAGE_PATH);
    const dirIsFull = dirSize >= MAX_STORAGE_SIZE - MAX_FILE_SIZE;
    if (dirIsFull){
      clearFileStorageDirectory();
    }

    cb(null, FILE_STORAGE_PATH);  
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
    fileSize: MAX_FILE_SIZE,
    files: 1,
  }
});

// Removes all files in the file storage directory
// Source: https://stackoverflow.com/questions/27072866/how-to-remove-all-files-from-directory-without-removing-directory-in-node-js
function clearFileStorageDirectory(){
  fs.readdir(FILE_STORAGE_PATH, (err, files) => {
    if (err) console.error("Error clearing stored files: ", err) ;
  
    for (const file of files) {
      fs.unlink(path.join(FILE_STORAGE_PATH, file), (err) => {
        if (err) console.error("Error clearing stored files: ", err) ;
      });
    }
  });
}

// Endpoint to handle file uploads
app.post('/api/upload', upload.single('file'), (req, res) => {
  // Check file was actually attached
  if (!req.file) {
    console.log("No file uploaded")
    return res.status(400).send('No file uploaded.');
  }

  console.log("Uploading file", req.file)

  // Generate a download URL based on the uploaded file's name (UUID)
  const fileUrl = `https://${host}/api/download/${req.file.filename}`;
  const body = { file_url: fileUrl }

  console.log("Sending response:", body);
  res.status(200).send(body);
});

// Endpoint to download files
app.get('/api/download/:uuid', (req, res) => {
  const filePath = path.join(FILE_STORAGE_PATH, req.params.uuid);

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
  console.log(`Listening at https://localhost:${port}`);
});

setupNeighbourhood();
joinNeighbourhood();
