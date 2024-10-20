// Group 51: William Godfrey (a1743033) Alexandra Gramss (a1756431)

const serverAddressRegex = /^(localhost:\d{1,5}|(\d{1,3}\.){3}\d{1,3}:\d{1,5})$/;
const pemKeyRegex = /^-----BEGIN PUBLIC KEY-----\n([A-Za-z0-9+/=\n]+)\n-----END PUBLIC KEY-----$/;

export function isNonEmptyString(value: any): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isValidServerAddress(address: string): boolean {
  const match = serverAddressRegex.test(address);

  if (!match) console.error("Invalid server address:", address);
  return match;
}

export function isValidPemKey(key: string): boolean {
  const match = pemKeyRegex.test(key);

  if (!match) console.error("Invalid pem key:", key);
  return match;
}

export function isNonEmptyStringArray(obj: any): boolean {
  if (!Array.isArray(obj) || obj.length < 1) return false;
  if (!obj.every(item => typeof item === 'string')) return false;
  return true;
}

export function isNumber(value: any): boolean {
  return typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value) && value < Number.MAX_SAFE_INTEGER;
}