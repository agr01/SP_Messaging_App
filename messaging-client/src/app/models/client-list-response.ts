// Group 51: William Godfrey (a1743033) Alexandra Gramss (a1756431)
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
    console.error("Received invalid client list response")
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
  if (!message) return false;

  if (message.type !== "client_list") return false;

  if (!Array.isArray(message.servers)) return false;

  const serversValid = message.servers.every((server: any, index: number) => isValidServer(server, index));
  return serversValid;
}

function isValidServer(server: any, index: number): boolean {
  if (typeof server.address !== "string") return false;

  if (!isValidServerAddress(server.address)) return false;

  if (!Array.isArray(server.clients)) return false;

  return server.clients.every((client: any, clientIndex: number) => isValidClient(client, index, clientIndex));
}

function isValidClient(client: any, serverIndex: number, clientIndex: number): boolean {
  if (typeof client !== "string") return false;

  if (!isValidPemKey(client)) return false;

  return true;
}

