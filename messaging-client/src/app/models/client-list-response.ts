import { isValidPemKey, isValidServerAddress } from "../helpers/validators";
import { Client } from "./client";

export interface ClientListResponse {
  type: string        // "client_list"
  servers: [{
    address: string,
    clients: string[] //<PEM of exported RSA public key of client>
  }]
}


export function sanitizeClientListResponse(obj: any): ClientListResponse | null {

  if (!isClientListResponse(obj)) {
    console.log("invalid client list response")
    return null
  };

  let newMessage = {
    type: obj.type,
    servers: [] as { address: string; clients: string[] }[]
  } as ClientListResponse

  for (const server of obj.servers){
    newMessage.servers.push({address: server.address, clients: server.clients})
  }

    
  return {
    type: obj.type,
    servers: obj.servers
  };
  
}

// Type guard to check if a message is a valid client list response
function isClientListResponse(message: any): message is ClientListResponse {
  if (!message) {
    console.log("Message is undefined or null");
    return false;
  }

  if (message.type !== "client_list") {
    console.log("Invalid message type:", message.type);
    return false;
  }

  if (!Array.isArray(message.servers)) {
    console.log("Servers is not an array:", message.servers);
    return false;
  }

  const serversValid = message.servers.every((server: any, index: number) => isValidServer(server, index));
  return serversValid;
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

  return true;
}

