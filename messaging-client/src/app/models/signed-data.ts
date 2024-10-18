// Group 51: William Godfrey (a1743033) Alexandra Gramss (a1756431)
import { isNonEmptyString, isNumber } from "../helpers/validators"
import { ChatData, isChatData, sanitizeChatData } from "./chat-data"
import { Hello } from "./hello"
import { isPublicChat, PublicChat, sanitizePublicChat } from "./public-chat"

export interface SignedData {
    type: string        // "signed_data",
    // data: Hello | ChatData | PublicChat 
    data: string
    counter: number     // 12345,
    signature: string   // "<Base64 encoded (signature of (data JSON concatenated with counter))>"
}

// Sanitizes incoming signed data
// Does not check for data type of Hello as that is outgoing only
export function sanitizeSignedData(obj: any): SignedData | null{
    if (!isIncomingSignedData(obj)) return null

    let sanitizedData = null
    if (isChatData(obj.data)) sanitizedData = sanitizeChatData(obj.data);
    else if (isPublicChat(obj.data)) sanitizedData = sanitizePublicChat(obj.data);

    if (!sanitizedData) return null;

    return {
        type: obj.type,
        data: sanitizedData,
        counter: obj.counter,
        signature: obj.signature
    }
}

// Does not check for valid Hello data type as that is outgoing only
function isIncomingSignedData(obj: any): boolean{
    if (!obj || !obj.type || !obj.data || !obj.counter || !obj.signature) return false;

    if (obj.type !== "signed_data") return false;

    if (!(isChatData(obj.data) || isPublicChat(obj.data))) return false;

    if (!isNumber(obj.counter) || obj.counter < 0 || obj.counter > Number.MAX_SAFE_INTEGER) return false;

    if (!isNonEmptyString(obj.signature)) return false;

    return true;
}
