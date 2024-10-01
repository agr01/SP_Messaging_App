import { isBase64String, isNonEmptyString, isNonEmptyStringArray } from "../helpers/validators"

export interface ChatData {
  type: string                    // "chat"
  destination_servers: string[]   // <Address of each recipient's destination server>
  iv: string                      // <Base64 encoded (AES initialisation vector)>
  symm_keys: string[]             // <Base64 encoded (AES key encrypted with recipient's public RSA key)>
  chat: string                    // Chat - <Base64 encoded (AES ciphertext segment)>
}

export function sanitizeChatData(obj: any): ChatData | null{
  if (!isChatData(obj)) return null;

  return {
    type: obj.type,
    destination_servers: obj.destination_servers,
    iv: obj.iv,
    symm_keys: obj.symm_keys,
    chat: obj.chat,
  }
}

function isChatData(obj: any): boolean{
  if (!obj 
    || !obj.type
    || !obj.destination_servers
    || !obj.iv
    || !obj.symm_keys
    || !obj.chat
  ) return false;

  if (obj.type != "chat") return false;

  if (!isNonEmptyStringArray(obj.destination_servers)) return false;

  if (!isNonEmptyString(obj.iv) || !isBase64String(obj.iv)) return false;

  if (!isNonEmptyStringArray(obj.sym_keys)) return false;
  if (!obj.sym_keys.every((key: any)=>isBase64String(key))) return false;

  if (!isNonEmptyString(obj.chat) || !isBase64String(obj.chat)) return false;

  return true;
}