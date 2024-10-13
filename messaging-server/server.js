const express = require('express');
const http = require('http')
const https = require('https')
const WebSocket = require('ws');
const fs = require('fs');
const multer = require('multer');
const dotenv = require('dotenv');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const {
  setupWebSocketEvents
} = require('./websocket-events.js');

const {
  addConnection,
  getNeighbourhood,
  initialiseKeys,
  insertNeighbourhoodServer
} = require('./server-state.js');


// Get the env file and setup config
const ENV_FILE = process.argv[2] || 'server1.env';
dotenv.config({ path: path.resolve(__dirname, ENV_FILE)});
const httpPort = process.env.PORT || 3000;
const httpHost = `localhost:${httpPort}`;
const httpsPort = parseInt(httpPort, 10) + 100;
const httpsHost = `localhost:${httpsPort}`;
const hosts = [httpHost, httpsHost];
initialiseKeys();

// Setup https using server private and public key
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'ssl', 'server.key')),
  cert: fs.readFileSync(path.join(__dirname, 'ssl', 'server.cert'))
};

// Setup servers
// HTTP Setup (for interfacing with non HTTPS servers)
const httpApp = express();
const httpServer = http.createServer(httpApp);
const httpWss = new WebSocket.Server({ server: httpServer });
httpApp.use(cors());

// HTTPS Setup
const httpsApp = express();
const httpsServer = https.createServer(httpsOptions, httpsApp);
const httpsWss = new WebSocket.Server({ server: httpsServer });
httpsApp.use(cors());

/* Websocket connection handling */

// Accepts HTTP WebSocket (ws://) connections
// Handle messages (including parsing and validation)
// Handles disconnection
httpWss.on('connection', (ws, req) => {
  // Generate a unique ID for each connection and store connection info
  const connectionId = uuidv4();
  console.log(`New connection: ${connectionId}`);

  // Setup all the websocket event logic and add the connection
  setupWebSocketEvents(ws, hosts, "Client", connectionId);
  addConnection(connectionId, ws);
});


// Accepts HTTPS WebSocket (wss://) connections
// Handle messages (including parsing and validation)
// Handles disconnection
httpsWss.on('connection', (ws, req) => {
  // Generate a unique ID for each connection and store connection info
  const connectionId = uuidv4();
  console.log(`New connection: ${connectionId}`);

  // Setup all the websocket event logic and add the connection
  setupWebSocketEvents(ws, hosts, "Client", connectionId);
  addConnection(connectionId, ws);
});

/* --- Neighbourhood Websocket client Setup --- */

// Function to open a websocket connection to all listed neighbourhood servers
function joinNeighbourhood () {
  serverList = getNeighbourhood();
  serverList.forEach((_, address) => {
    
    // Don't establish connection to self
    if (hosts.includes(address)) {
      return;
    }

    // Initialise websocket connection to address
    const wsClient = new WebSocket("wss://"+ address, { rejectUnauthorized: false });
    const connectionId = uuidv4();
    console.log(`New connection: ${connectionId}`);

    // Setup websocket events
    setupWebSocketEvents(wsClient, hosts, "Server", connectionId, address);

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
    const uploadPath = path.join(__dirname, 'uploads/');

    // Check if the directory exists
    if (!fs.existsSync(uploadPath)) {
      console.log("creating /uploads dir")
      // Create the directory if it does not exist
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, 'uploads/');  
  },
  
  
  filename: (_, file, cb) => {
    console.log("file original name: ", file.originalname)
    // Save file with unique UUID as filename
    const uniqueFilename = uuidv4() + file.originalname;
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
httpApp.post('/api/upload', upload.single('file'), (req, res) => {
  res.status(400).send("File upload not permitted over http");
});

// Endpoint to download files
httpApp.get('/api/download/:uuid', (req, res) => {
  res.status(400).send("File download not permitted over http");
});

// Endpoint to handle file uploads
httpsApp.post('/api/upload', upload.single('file'), (req, res) => {
  // Check file was actually attached
  if (!req.file) {
    console.log("No file uploaded")
    return res.status(400).send('No file uploaded.');
  }

  console.log("Uploading file", req.file)

  // Generate a download URL based on the uploaded file's name (UUID)
  const fileUrl = `https://${httpsHost}/api/download/${req.file.filename}`;
  const body = { file_url: fileUrl }

  console.log("Sending response:", body);
  res.status(200).send(body);
});

// Endpoint to download files
httpsApp.get('/api/download/:uuid', (req, res) => {
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

httpServer.listen(httpPort, () => {
  console.log(`Listening for https requests at http://localhost:${httpPort}`);
});

httpsServer.listen(httpsPort, () => {
  console.log(`Listening for https requests at https://localhost:${httpsPort}`);
});

setupNeighbourhood();
joinNeighbourhood();
