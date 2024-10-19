// Group 51: William Godfrey (a1743033) Alexandra Gramss (a1756431)

// Returns an object if the string can be passed
// Otherwise returns null
export function parseJson(str: string): any | null{
  try {
    return JSON.parse(str);
  } catch (error) {
    return null;
  }
}