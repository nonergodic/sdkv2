export type ReverseRecord<T extends Record<keyof T, any>> = {
  [V in T[keyof T]]: {
    [K in keyof T]: T[K] extends V ? K : never;
  }[keyof T];
};

export const [reverseMapping, reverseArrayMapping] = (() => {
  //tried to combine these two functions into one via:
  //  <T extends Record<PropertyKey, PropertyKey | readonly PropertyKey[]>>(obj: T) =>
  //    Object.entries(obj).reduce(
  //      (acc, [key, value]) => {
  //        Array.isArray(value)
  //          ? value.forEach(elem => checkAndSet(acc, elem, key))
  //          : checkAndSet(acc, value, key);
  //        return acc;
  //      },
  //      {} as any
  //  ) as { [K in keyof T as T[K] extends PropertyKey[] ? T[K][number] : T[K]]: K };
  //but Typescript really wasn't cooperating in any way (the last line is illegal and then there's
  //  also the entire Array.isArray erroneously narrowing to any[] for readonly arrays issue)

  const checkAndSet = (acc: any, key: PropertyKey, value: PropertyKey): void => {
    if (acc[key] !== undefined)
      throw new Error(
        `Mapping can't be uniquely inverted: ` + 
        `key ${String(key)} has at least two values: ${acc[key]} and ${String(value)}}`
      );
    acc[key] = value;
  };

  return [
    <T extends Record<PropertyKey, PropertyKey>>(obj: T) =>
      Object.entries(obj).reduce(
        (acc, [key, value]) => {
          checkAndSet(acc, value, key);
          return acc;
        },
        {} as any
      ) as { [K in keyof T as T[K]]: K },
    
    <T extends Record<PropertyKey, readonly PropertyKey[]>>(obj: T) =>
      Object.entries(obj).reduce(
        (acc, [key, array]) => {
          for (const value of array)
            checkAndSet(acc, value, key);
          return obj;
        },
        {} as any
      ) as { [K in keyof T as T[K][number]]: K }
    ];
})();

export const stripPrefix = (prefix: string, str: string): string =>
  str.startsWith(prefix) ? str.slice(prefix.length) : str;

export const isHexByteString = (str: string, expectedBytes?: number): boolean =>
  //dynamically including the length check in the regex literal would be costly because
  //  it would require rebuilding it every time
  (str.length % 2 === 0) &&
  /^(?:0x)?[a-fA-F0-9]*$/.test(str) &&
  ( expectedBytes === undefined ||
    str.length - ((str.length > 1 && str[1] == "x") ? 2 : 0) === 2 * expectedBytes
  );
  
//TODO implement without using buffer internally
//TODO naming: arrayify (ethers), toBytes (solana)
export const hexByteStringToUint8Array = (str: string): Uint8Array =>
  Uint8Array.from(Buffer.from(stripPrefix("0x", str), "hex"));

//TODO naming: hexlify (ethers)
export const uint8ArrayToHexByteString = (arr: Uint8Array, withPrefix = true): string =>
  (withPrefix ? "0x" : "") + Buffer.from(arr).toString("hex");