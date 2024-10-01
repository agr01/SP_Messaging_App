import { isFingerprint, isNotEmptyString } from "../helpers/validators";

export interface PublicChat {
    type: string // "public_chat"
    sender: string // <Fingerprint of sender>
    message: string // <Plaintext message>
}

export function sanitizePublicChat(obj: any): PublicChat | null{
    
    if (!obj || !obj.type || !obj.sender || !obj.message) return null;

    if (!isClientListResponse(obj)) return null;

    return {
        type: obj.type,
        sender: obj.sender,
        message: obj.message
    }
}

function isClientListResponse(obj: any): boolean{
    if (!obj || !obj.type || !obj.sender || !obj.message) return false;

    if (obj.type !== "public_chat") return false;

    if (!isFingerprint(obj.sender)) return false;

    if (!isNotEmptyString(obj.message)) return false;

    return true;
}