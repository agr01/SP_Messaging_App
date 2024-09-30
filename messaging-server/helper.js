const crypto = require('crypto')

/* --- Classes --- */

// For storing the publicKey and counter of 
function ClientInfo(publicKey, counter){
  this.publicKey = publicKey;
  this.counter = counter;
}

// Object used in the "client_list" response to store server address and client
// list informantion. 
function ServerInfo(address, clients) {
  this.address = address;
  this.clients = clients;
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

module.exports = {
  ClientInfo,
  ServerInfo,
  parseJson,
  isValidPublicKey,
  isValidCounter,
  isValidBase64Signature
}