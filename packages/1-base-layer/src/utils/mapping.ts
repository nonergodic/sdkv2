export type ReverseRecord<T extends Record<keyof T, any>> = {
  [V in T[keyof T]]: {
    [K in keyof T]: T[K] extends V ? K : never;
  }[keyof T];
};

export const [reverseMapping, reverseArrayMapping] = (() => {
  //tried combining these two functions into one and maintaining specific type information via:
  //  <T extends Record<PropertyKey, PropertyKey | readonly PropertyKey[]>>(obj: T) =>
  //    Object.entries(obj).reduce(
  //      (acc, [key, value]) => {
  //        const set = (v: PropertyKey) => {acc[v] = key;};
  //        Array.isArray(value) ? value.forEach(set) : set(value);
  //        return acc;
  //      },
  //      {} as any
  //  ) as { [K in keyof T as T[K] extends PropertyKey[] ? T[K][number] : T[K]]: K };
  //
  //But Typescript really wasn't cooperating in any way (the last line is illegal and then there's
  //  also the entire issue (known since 2017) of Array.isArray erroneously narrowing to any[]
  //  for readonly arrays...)
  //One could get a single function by sacrificing the specificity via
  //  Object.entries(obj).reduce<Record<PropertyKey, PropertyKey>>
  //  but that's a bad trade-off

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