export type ReverseRecord<T extends Record<keyof T, any>> = {
  [V in T[keyof T]]: {
    [K in keyof T]: T[K] extends V ? K : never;
  }[keyof T];
};

//TODO naming: alternative verbs: inverse, transpose, flip; alternative nouns: object
export const reverseMapping = <T extends Record<PropertyKey, PropertyKey>>(obj: T) =>
 Object.entries(obj).reduce(
  (obj, [key, value]) => {
    obj[value] = key;
    return obj;
  },
  {} as any
) as { [K in keyof T as T[K]]: K };

export const stripPrefix = (prefix: string, str: string) =>
  str.startsWith(prefix) ? str.slice(prefix.length) : str;
  
//TODO implement without using buffer internally
//TODO naming: arrayify (ethers), toBytes (solana)
export const hexStringToUint8Array = (str: string) =>
  Uint8Array.from(Buffer.from(stripPrefix("0x", str), "hex"));

//TODO naming: hexlify (ethers)
export const uint8ArrayToHexString = (arr: Uint8Array, withPrefix = true) =>
  (withPrefix ? "0x" : "") + Buffer.from(arr).toString("hex");