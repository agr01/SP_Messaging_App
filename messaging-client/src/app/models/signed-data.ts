import { ChatData } from "./chat-data"
import { Hello } from "./hello"
import { PublicChat } from "./public-chat"

export interface SignedData {
    type: string        // "signed_data",
    data: Hello | ChatData | PublicChat 
    counter: number     // 12345,
    signature: string   // "<Base64 encoded (signature of (data JSON concatenated with counter))>"
}
