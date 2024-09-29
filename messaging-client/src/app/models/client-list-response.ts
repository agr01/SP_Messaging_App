import { Client } from "./client";

export interface ClientListResponse {
  type: string        // "client_list"
  servers: [{
    address: string,
    clients: string[] //<PEM of exported RSA public key of client>
  }]
}


export function sanitizeClientListResponse(message: any): ClientListResponse | null {

  console.log("Sanitizing client list response");

  if (!isClientListResponse(message)) {
    console.log("invalid client list response")
    return null
  };

  let newMessage = {
    type: message.type,
    servers: [] as { address: string; clients: string[] }[]
  } as ClientListResponse

  for (const server of message.servers){
    newMessage.servers.push({address: server.address, clients: server.clients})
  }

    
  return {
    type: message.type,
    servers: message.servers
  };
  
}

// Type guard to check if a message is a valid client list response
function isClientListResponse(message: any): message is ClientListResponse {
  if (!isValidMessage(message)) return false;

  if (!Array.isArray(message.servers)) {
    console.log("Servers is not an array:", message.servers);
    return false;
  }

  const serversValid = message.servers.every((server: any, index: number) => isValidServer(server, index));
  return serversValid;
}

function isValidMessage(message: any): boolean {
  if (!message) {
    console.log("Message is undefined or null");
    return false;
  }

  if (message.type !== "client_list") {
    console.log("Invalid message type:", message.type);
    return false;
  }

  return true;
}

function isValidServer(server: any, index: number): boolean {
  if (typeof server.address !== "string") {
    console.log(`Server at index ${index} has an invalid address type:`, server.address);
    return false;
  }

  if (!isValidServerAddress(server.address)) {
    console.log(`Server at index ${index} has an invalid address:`, server.address);
    return false;
  }

  if (!Array.isArray(server.clients)) {
    console.log(`Server at index ${index} has clients that is not an array:`, server.clients);
    return false;
  }

  return server.clients.every((client: any, clientIndex: number) => isValidClient(client, index, clientIndex));
}

function isValidClient(client: any, serverIndex: number, clientIndex: number): boolean {
  if (typeof client !== "string") {
    console.log(`Client at index ${clientIndex} in server at index ${serverIndex} has an invalid type:`, client);
    return false;
  }

  if (!isValidPemKey(client)) {
    console.log(`Client at index ${clientIndex} in server at index ${serverIndex} has an invalid PEM key:`, client);
    return false;
  }

  return true; // Client is valid
}

function isValidServerAddress(address: string): boolean {
  const serverAddressRegex = /^(localhost:\d{1,5}|(\d{1,3}\.){3}\d{1,3}:\d{1,5})$/;
  const match = serverAddressRegex.test(address);

  if (!match) console.log("Invalid server address:", address);
  return match;
}

function isValidPemKey(key: string): boolean {
  const pemKeyRegex = /^-----BEGIN PUBLIC KEY-----\n([A-Za-z0-9+/=\n]+)\n-----END PUBLIC KEY-----$/;
  const match = pemKeyRegex.test(key);

  if (!match) console.log("Invalid pem key:", key);
  return match;
}
