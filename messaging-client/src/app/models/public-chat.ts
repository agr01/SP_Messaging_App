// Group 51: William Godfrey (a1743033) Alexandra Gramss (a1756431)
import { isNonEmptyString } from "../helpers/validators";

export interface PublicChat {
    type: string // "public_chat"
    sender: string // <Fingerprint of sender>
    message: string // <Plaintext message>
}

export function sanitizePublicChat(obj: any): PublicChat | null{
    
    if (!isPublicChat(obj)) return null;

    return {
        type: obj.type,
        sender: obj.sender,
        message: obj.message
    }
}

export function isPublicChat(obj: any): boolean{
    if (!obj || !obj.type || !obj.sender || !obj.message) return false;

    if (obj.type !== "public_chat") return false;

    if (!isNonEmptyString(obj.sender)) return false;

    if (!isNonEmptyString(obj.message)) return false;

    return true;
}
