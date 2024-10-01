import { isNonEmptyString, isNumber } from "../helpers/validators"
import { ChatData, isChatData, sanitizeChatData } from "./chat-data"
import { Hello } from "./hello"
import { isPublicChat, PublicChat, sanitizePublicChat } from "./public-chat"

export interface SignedData {
    type: string        // "signed_data",
    data: Hello | ChatData | PublicChat 
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
// function isIncomingSignedData(obj: any): boolean{
//     if (!obj || !obj.type || !obj.data || !obj.counter || !obj.signature) return false;

//     if (obj.type !== "signed_data") return false;

//     if (!(isChatData(obj.data) || isPublicChat(obj.data))) return false;

//     if (!isNumber(obj.counter) || obj.counter < 0 || obj.counter > Number.MAX_SAFE_INTEGER) return false;

//     if (!isNonEmptyString(obj.signature)) return false;

//     return true;
// }

// TODO: Revert to quiet function
function isIncomingSignedData(obj: any): boolean {
    if (!obj || !obj.type || !obj.data || !obj.counter || !obj.signature) {
        console.log("Failed initial property existence check:", obj);
        return false;
    }

    if (obj.type !== "signed_data") {
        console.log("Type check failed: Expected 'signed_data', got", obj.type);
        return false;
    }

    if (!(isChatData(obj.data) || isPublicChat(obj.data))) {
        console.log("Failed chat type validation: Not valid chat data or public chat");
        return false;
    }

    if (!isNumber(obj.counter) || obj.counter < 0 || obj.counter > Number.MAX_SAFE_INTEGER) {
        console.log("Counter validation failed:", {
            counter: obj.counter,
            isNumber: isNumber(obj.counter),
            inRange: obj.counter >= 0 && obj.counter <= Number.MAX_SAFE_INTEGER
        });
        return false;
    }

    if (!isNonEmptyString(obj.signature)) {
        console.log("Signature validation failed:", {
            signature: obj.signature,
            isNonEmptyString: isNonEmptyString(obj.signature)
        });
        return false;
    }

    return true;
}