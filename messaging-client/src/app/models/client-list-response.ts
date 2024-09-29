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

  if (isClientListResponse(message) === null) {
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

  const serverAddressRegex = /^(localhost:\d{1,5}|(\d{1,3}\.){3}\d{1,3}:\d{1,5})$/;
  const pemKeyRegex = /^-----BEGIN PUBLIC KEY-----\n([A-Za-z0-9+/=\n]+)\n-----END PUBLIC KEY-----$/;

  return (
    message &&
    message.type === "client_list" &&
    Array.isArray(message.servers) &&
    message.servers.every(
      (server: any) =>
        typeof server.address === "string" &&
        serverAddressRegex.test(server.address) &&
        Array.isArray(server.clients) &&
        server.clients.every((client: any) => {
          typeof client === "string" &&
            pemKeyRegex.test(client)
        })
    )
  );
}