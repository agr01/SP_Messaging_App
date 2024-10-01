const crypto = require('crypto');

/* --- Classes --- */

// For storing the publicKey and counter of an active client
class ClientInfo {
  constructor(publicKey, counter) {
    this.publicKey = publicKey;
    this.counter = counter;
    this.fingerprint = generateFingerprint(publicKey);
  }
}

// Object used for storing the server address and an arry of ClientInfo objects
// of an active server
class ActiveServerInfo {

  constructor(address, clientInfos) {
    this.address = address;
    this.clientInfos = clientInfos;
  }

  // Gets the counter of an client connected to an active server or returns a
  // default base value. Attempts to find the counter using the client's public key
  // Returns counter of found client; defaults to -1
  getClientCounter(publicKey) {
    // Attempts to find client
    let client = this.clientInfos.find(clientInfo =>
      clientInfo.publicKey === publicKey
    );
    
    // Returns counter if found
    if (client !== undefined) {
      return client.counter;
    }

    // Defaults to -1 (new counter)
    return -1;
  }

  getPublicKeyUsingFingerprint(fingerprint) {
    let client = this.clientInfos.find(clientInfo =>
      clientInfo.fingerprint === fingerprint
    );

    if (client !== undefined) {
      return client.publicKey;
    } 

    return undefined;
  }
}

/* --- Helper Functions --- */

// Attempts to parse json for a given websocket message
function parseJson (wsMsg){
  // Catch any parsing errors
  try {
    return JSON.parse(wsMsg);
  }
  catch (e) {
    console.log(`An error occurred when trying to parse json ${e.message}`);
  }

  return;
}

// Generate SHA-256 Fingerprint
function generateFingerprint(publicKey) {
  const encoder = new TextEncoder();
  utf8bytes = encoder.encode(publicKey);
  return crypto.createHash('sha256').update(utf8bytes).digest('base64');
} 

// Checks whether a public key is valid
function isValidPublicKey(publicKey) {
  // Check for undefined
  if (publicKey === undefined) {
    console.log("Public key was undefined");
    return false;
  }

  // Attempt to generate a valid public key in pem format
  try {
    crypto.createPublicKey(publicKey);
    console.log("Public key is valid");
    return true;
  }
  catch (e) {
    console.error(`Invalid public key: ${e.message}`)
    return false;
  }
}

// Check whether a base 64 signature is valid
function isValidBase64Signature (signature, publicKey, data) {
  // Check for undefined
  if (signature === undefined) {
    console.log("Signature was undefined");
    return false;
  }

  try {
    // Create a verification object
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(data);
    verify.end();

    // Verify the base 64 signature
    let key = crypto.createPublicKey(publicKey);
    const signatureBuffer = Buffer.from(signature, 'base64');
    const isValid = verify.verify(
      {
        key: key, 
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING, 
        saltLength: 32
      }
      , signatureBuffer
      
    );    console.log('Signature validation result:', isValid);

    return isValid;
  }
  catch (e) {
    console.error(`Signature validation error: ${e.message}`)
    return false;
  }
}

// Checks for valid counter
function isValidCounter(counter, trackedCounter) {
  // Check for undefined
  if(counter === undefined) {
    console.log("Counter was undefined");
    return false;
  }
  
  // Check for a number
  if (typeof(counter) !== "number") {
    console.log("Counter was not a number");
    return false;
  }

  // Check whether counter matches tracked counter
  if(counter <= trackedCounter) {
    console.log("Counter was less than equal to tracked counter. Possible replay attack");
    return false;
  }
  
  return true;
}

// Function to genarate a fingerprint 


module.exports = {
  ClientInfo,
  ActiveServerInfo,
  parseJson,
  isValidPublicKey,
  isValidCounter,
  isValidBase64Signature
}