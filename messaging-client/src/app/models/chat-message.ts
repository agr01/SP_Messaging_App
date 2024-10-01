
// Used for storing decoded chat messages
// Can also store public chat messages

export interface ChatMessage {
  sender: string // fingerprint
  recipients: string[] // fingerprints
  isPublic: boolean
  message: string
}
