export interface ChatData {
    type: string                    // "chat"
    destination_servers: string[]   // <Address of each recipient's destination server>
    iv: string                      // <Base64 encoded (AES initialisation vector)>
    symm_keys: string[]             // <Base64 encoded (AES key encrypted with recipient's public RSA key)>
    chat: string                    // Chat - <Base64 encoded (AES ciphertext segment)>
}

export interface Chat {
    participants: string[]  // "<Fingerprint of sender comes first>", "<Fingerprints of recipients>",
    message: string         // <Plaintext message>
}