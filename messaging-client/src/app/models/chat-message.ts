// Group 51: William Godfrey (a1743033) Alexandra Gramss (a1756431)

// Used for storing decoded chat messages
// Can also store public chat messages

export interface ChatMessage {
  sender: string // fingerprint
  recipients: string[] // fingerprints
  isPublic: boolean
  message: string
}
