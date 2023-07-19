type And<T extends readonly boolean[]> = T[number] extends true ? true : false;
type IndexIsPropertyKeyArray<Arr extends readonly any[], I extends number> =
  Arr extends readonly [infer M extends readonly any[], ...infer Tail extends readonly any[]]
  ? [M[I] extends PropertyKey ? true : false, ...IndexIsPropertyKeyArray<Tail, I>]
  : [];

type IndexIsPropertyKey<Arr extends readonly any[], I extends number> =
  And<IndexIsPropertyKeyArray<Arr, I>>;

type DefinedOrDefault<T, D> = undefined extends T ? D : Exclude<T, undefined>;

export const constArrayToConstMapping = <
  const Arr extends readonly (readonly any[])[],
  const KeyIndex extends number,
  const ValIndex extends number,
>(
  arr: Arr,
  keyIndex?: KeyIndex,
  valIndex?: ValIndex,
) => arr.reduce((acc, entry) => {
    acc[entry[keyIndex ?? 0]] = entry[valIndex ?? 1];
    return acc;
  },
  {} as any
) as IndexIsPropertyKey<Arr, DefinedOrDefault<typeof keyIndex, 0>> extends true
  ? {
      [E in Arr[number] as E[DefinedOrDefault<typeof keyIndex, 0>]]:
        E[DefinedOrDefault<typeof valIndex, 1>]
    }
  : never;

export type ExtractTupleElementFromConstTupleArray<
  TupArr extends readonly (readonly any[])[],
  Index extends number
> =
  TupArr extends readonly [
    infer Tuple extends readonly any[],
    ...infer Tail extends readonly any[]
  ]
  ? [Tuple[Index], ...ExtractTupleElementFromConstTupleArray<Tail, Index>]
  : [];

export const extractTupleElementFromConstTupleArray = <
  const TupArr extends readonly (readonly any[])[],
  const Index extends number,
>(tupArr: TupArr, index: Index) =>
  tupArr.map((tuple) => tuple[index]) as ExtractTupleElementFromConstTupleArray<TupArr, Index>;

export type ReverseRecord<T extends Record<keyof T, any>> = {
  [V in T[keyof T]]: {
    [K in keyof T]: T[K] extends V ? K : never;
  }[keyof T];
};

//TODO take another look at this!
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