
// Returns an object if the string can be passed
// Otherwise returns null
export function parseJson(str: string): object | null{
  try {
    return JSON.parse(str);
  } catch (error) {
    return null;
  }
}