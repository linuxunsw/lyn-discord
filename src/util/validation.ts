const zIDRegex: RegExp = /^z[0-9]{7}$/;

export function isValidZID(zID: string): boolean {
  return zIDRegex.test(zID);
}
