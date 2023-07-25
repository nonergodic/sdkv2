export type ConcatStringLiterals<Arr extends readonly any[]> =
  Arr extends readonly [infer S extends string, ...infer Tail extends readonly any[]]
  ? `${S}${ConcatStringLiterals<Tail>}`
  : "";

export type Flatten<T extends readonly any[]> =
  T extends readonly [infer Head, ...infer Tail]
  ? Head extends readonly any[]
    ? readonly [...Head, ...Flatten<Tail>]
    : readonly [Head, ...Flatten<Tail>]
  : readonly [];

export type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;

export type And<T extends readonly boolean[]> = T[number] extends true ? true : false;

type IndexIsTypeArray<TupArr extends readonly (readonly any[])[], Index, Type> =
TupArr extends readonly [infer A extends readonly any[], ...infer Tail extends readonly any[]]
  ? ( Index extends keyof A
    ? [A[Index] extends Type ? true : false, ...IndexIsTypeArray<Tail, Index, Type>]
    : never
  )
  : [];

export type IndexIsType<Arr extends readonly any[], Index, Type> =
  And<IndexIsTypeArray<Arr, Index, Type>>;

export type DefinedOrDefault<T, D> = undefined extends T ? D : Exclude<T, undefined>;