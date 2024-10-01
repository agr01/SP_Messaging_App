import { isFingerprint, isNonEmptyString, isNonEmptyStringArray } from "../helpers/validators";

export interface Chat {
  participants: string[]  // "<Fingerprint of sender comes first>", "<Fingerprints of recipients>",
  message: string         // <Plaintext message>
}

export function sanitizeChat(obj: any): Chat | null{
  if (!isChat) return null;

  return {
    participants: obj.participants,
    message: obj.message
  }
}

function isChat(obj: any){
  if (!obj || !obj.participants || !obj.message) return false;

  if (!isNonEmptyStringArray(obj.participants) || obj.participants.length < 2) return false;

  if (!obj.participants.every((p: any) => isFingerprint(p))) return false;

  if (!isNonEmptyString(obj.message)) return false;

  return true;
}