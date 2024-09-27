export interface PublicChat {
    type: string // "public_chat"
    sender: string // <Fingerprint of sender>
    message: string // <Plaintext message>
}