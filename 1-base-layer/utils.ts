export type ReverseRecord<T extends Record<keyof T, any>> = {
  [V in T[keyof T]]: {
    [K in keyof T]: T[K] extends V ? K : never;
  }[keyof T];
};

//TODO alternative verbs: inverse, transpose, flip; alternative nouns: object
export const reverseMapping = <T extends Record<PropertyKey, PropertyKey>>(obj: T) =>
 Object.entries(obj).reduce(
  (obj, [key, value]) => {
    obj[value] = key;
    return obj;
  },
  {} as any
) as { [K in keyof T as T[K]]: K };
