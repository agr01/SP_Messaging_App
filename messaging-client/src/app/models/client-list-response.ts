export interface ClientListResponse {
    type: string        // "client_list"
    servers: Server[]
}

export interface Server {
    address: string     // <Address of server>
    clients: string[]   // <PEM of exported RSA public key of client>
}
