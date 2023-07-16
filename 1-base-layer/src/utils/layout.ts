type PrimitiveTypesMapping = {
  number: number,
  bigint: bigint,
  Uint8Array: Uint8Array,
};

type PrimitiveTypeLiterals = keyof PrimitiveTypesMapping;
type PrimitiveTypes = PrimitiveTypesMapping[PrimitiveTypeLiterals];

export type BinaryLiterals = "uint" | "bytes" | "array";

//Why only a max value of 2**(6*8)?
//quote from here: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger#description
//"In a similar sense, numbers around the magnitude of Number.MAX_SAFE_INTEGER will suffer from
//  loss of precision and make Number.isInteger return true even when it's not an integer.
//  (The actual threshold varies based on how many bits are needed to represent the decimal — for
//  example, Number.isInteger(4500000000000000.1) is true, but
//  Number.isInteger(4500000000000000.5) is false.)"
//So we are being conservative and just stay away from threshold.
type NumberSize = 1 | 2 | 3 | 4 | 5 | 6;
const numberMaxSize = 6;

type UintSizeToPrimitive<Size extends number> =
  Size extends NumberSize ? number : bigint;

export type CustomConversion<FromType extends PrimitiveTypes, ToType> = {
  to: (val: FromType) => ToType,
  from: (val: ToType) => FromType,
};

interface LayoutItemBase<T extends BinaryLiterals> {
  name: string,
  binary: T,
};

//a word on the size property of LayoutItems:
//For all types except arrays, size specifies the number of bytes of the type itself
//For arrays, size specifies the number of bytes used to encode the number of elements in the array.
//  Hence, a size of 1 for an array means that it contain at most 255 elements

export interface NumberLayoutItem extends LayoutItemBase<"uint"> {
  size: NumberSize,
  custom?: number | CustomConversion<number, any>,
};

export interface BigintLayoutItem extends LayoutItemBase<"uint"> {
  size: number,
  custom?: bigint | CustomConversion<bigint, any>,
};

export interface BytesLayoutItem extends LayoutItemBase<"bytes"> {
  size?: number,
  custom?: Uint8Array | CustomConversion<Uint8Array, any>,
  //TODO do we need variable sized byte "arrays"?
};

export interface ArrayLayoutItem extends LayoutItemBase<"array"> {
  size?: NumberSize, 
  elements: readonly LayoutItem[],
  //custom conversion of arrays can be accomplished via bytes and CustomCoversion using a
  //  separate layout
};

export type UintLayoutItem = NumberLayoutItem | BigintLayoutItem;
export type LayoutItem = UintLayoutItem | BytesLayoutItem | ArrayLayoutItem;

export type LayoutToType<T> =
  T extends readonly LayoutItem[]
  //raw tuple (separate, so we can handle the outermost array)
  ? { [Item in T[number] as Item['name']]: LayoutToType<Item> }
  : T extends ArrayLayoutItem
  ? LayoutToType<T["elements"]>[]
  : T extends UintLayoutItem
  ? ( T["custom"] extends CustomConversion<any, infer ToType>
    ? ToType
    : T["custom"] extends UintSizeToPrimitive<T["size"]>
    ? T["custom"]
    : UintSizeToPrimitive<T["size"]>
  )
  : T extends BytesLayoutItem
  ? ( T["custom"] extends CustomConversion<any, infer ToType>
    ? ToType
    : Uint8Array
  )
  : never;

//couldn't find a way (and I suspect there isn't one) to determine whether a given type is a literal
//  and hence also no way to filter an object type for keys that have a literal type, so we have to
//  effectively duplicate our effort here
export type FixedItems<T extends readonly LayoutItem[]> = 
  T extends readonly (infer Item)[]
  ? ( Item extends LayoutItem & { custom: unknown } 
    ? ( Item["custom"] extends CustomConversion<any, any>
      ? {}
      : { [Name in Item["name"]]: Item["custom"] }
      )
    : {}
    )
  : {};

export type DynamicItems<T extends readonly LayoutItem[]> =
  Omit<LayoutToType<T>, keyof FixedItems<T>>;

export const fixedItems = <const T extends readonly LayoutItem[]>(layout: T): FixedItems<T> =>
  layout.reduce((acc: any, item: any) =>
    item["custom"] !== undefined &&
    item.custom["to"] !== undefined &&
    item.custom["from"] !== undefined
    ? acc
    : {...acc, [item.name]: item.custom },
    {} as any
  );

export const addFixed = <T extends readonly LayoutItem[]>(
  layout: T,
  dynamicValues: DynamicItems<T>,
): LayoutToType<T> =>
  ({...fixedItems(layout), ...dynamicValues}) as LayoutToType<T>;

export function serializeLayout<T extends readonly LayoutItem[]>(
  layout: T,
  data: LayoutToType<T>,
): Uint8Array;

export function serializeLayout<T extends readonly LayoutItem[]>(
  layout: T,
  data: LayoutToType<T>,
  encoded: Uint8Array,
  offset?: number,
): number;

export function serializeLayout<T extends readonly LayoutItem[]>(
  layout: T,
  data: LayoutToType<T>,
  encoded?: Uint8Array,
  offset = 0,
): Uint8Array | number {
  let ret = encoded ?? new Uint8Array(calcLayoutSize(layout, data));
  for (let i = 0; i < layout.length; ++i)
    offset = serializeLayoutItem(layout[i], data[i], ret, offset);
  
  return encoded === undefined ? ret : offset;
}

export function deserializeLayout<T extends readonly LayoutItem[]>(
  layout: T,
  encoded: Uint8Array,
  offset?: number,
  consumeAll?: true,
): LayoutToType<T>;

export function deserializeLayout<T extends readonly LayoutItem[]>(
  layout: T,
  encoded: Uint8Array,
  offset?: number,
  consumeAll?: true,
): [LayoutToType<T>, number];

export function deserializeLayout<T extends readonly LayoutItem[]>(
  layout: T,
  encoded: Uint8Array,
  offset = 0,
  consumeAll = true,
): LayoutToType<T> | [LayoutToType<T>, number] {
  let [decoded, newOffset] = deserializeArray(layout, encoded, offset);

  if (consumeAll && newOffset !== encoded.length)
    throw new Error(`encoded data is longer than expected: ${encoded.length} > ${newOffset}`);
  
  return decoded as LayoutToType<T>;
}

// -- IMPL --

//Wormhole uses big endian by default for all uints
function serializeUint(
  encoded: Uint8Array,
  offset: number,
  val: number | bigint,
  bytes: number,
): number {
  if (val < 0 || (typeof val === "number" && !Number.isInteger(val)))
    throw new Error(`Value ${val} is not an unsigned integer`);
  
  if (bytes > numberMaxSize && typeof val === "number" && val >= 2**(numberMaxSize * 8))
    throw new Error(`Value ${val} is too large to be safely converted into an integer`);
  
  if (val >= 2n ** BigInt(bytes))
    throw new Error(`Value ${val} is too large for ${bytes} bytes`);
  
  //big endian byte order
  for (let i = 0; i < bytes; ++i)
    encoded[offset + i] = Number(BigInt(val) & (0xffn << BigInt(i)));
  
  return offset + bytes;
}

const calcLayoutSize = (layout: readonly LayoutItem[], data: any): number =>
  layout.reduce(
    (acc: number, item: LayoutItem) =>
      item.binary === "array"
      ? acc + (item.size ?? 0) + calcLayoutSize(item.elements, data[item.name]) 
      : item.size !== undefined
      ? acc + item.size
      : acc + data[item.name].length,
    0
  );

const checkUint8ArraySize = (custom: Uint8Array, size: number): void => {
  if (custom.length !== size)
    throw new Error(
      `binary size mismatch: layout size: ${custom.length}, data size: ${size}`
    );
}

const checkUintEquals = (custom: number | bigint, data: number | bigint): void => {
  if (custom != data)
    throw new Error(
      `value mismatch: (constant) layout value: ${custom}, data value: ${data}`
    );
}

const checkUint8ArrayDeeplyEqual = (custom: Uint8Array, data: Uint8Array): void => {
  checkUint8ArraySize(custom, data.length);

  for (let i = 0; i < custom.length; ++i)
    if (custom[i] !== data[i])
      throw new Error(
        `binary data mismatch: layout value: ${custom}, data value: ${data}`
      );
}

function serializeLayoutItem(
  item: LayoutItem,
  data: LayoutToType<typeof item>,
  encoded: Uint8Array,
  offset: number
): number {
  switch (item.binary) {
    case "array": {
      const narrowedData = data as LayoutToType<typeof item>;
      if (item.size !== undefined)
        offset = serializeUint(encoded, offset, narrowedData.length, item.size);
      
      for (let i = 0; i < narrowedData.length; ++i)
        offset = serializeLayout(item.elements, narrowedData[i], encoded, offset);
      
      break;
    }
    case "bytes": {
      const value = ((): LayoutToType<typeof item> => {
        if (item.custom !== undefined) {
          if (item.custom instanceof Uint8Array) {
            //fixed value
            checkUint8ArrayDeeplyEqual(item.custom, data as LayoutToType<typeof item>)
            return item.custom;
          }
          //custom conversion
          const converted = item.custom.from(data);
          if (item.size !== undefined)
            checkUint8ArraySize(converted, item.size);
          
          return converted;
        }
        //primitive type
        return data as LayoutToType<typeof item>;
      })();

      encoded.set(value, offset);
      offset += value.length;
      break;
    }
    case "uint": {
      const value = (() => {
        if (item.custom !== undefined) {
          if (typeof item.custom == "number" || typeof item.custom === "bigint") {
            //fixed value
            checkUintEquals(item.custom, data as LayoutToType<typeof item>);
            return item.custom;
          }
          //custom conversion
          return item.custom.from(data);
        }
        //primitive type
        return data as UintSizeToPrimitive<typeof item.size>;
      })();

      offset = serializeUint(encoded, offset, value, item.size);
      break;
    }
  }
  return offset;
};

// deserialize

function updateOffset (
  encoded: Uint8Array,
  offset: number,
  size: number
): number {
  const newOffset = offset + size;
  if (newOffset > encoded.length)
    throw new Error(`encoded data is shorter than expected: ${encoded.length} < ${newOffset}`);
  
  return newOffset;
}

function deserializeUint(
  encoded: Uint8Array,
  offset: number,
  size: number
): [number | bigint, number] {
  let value = 0n;
  for (let i = 0; i < size; ++i)
    value += BigInt(encoded[offset + i]) << BigInt((size - 1 - i) * 8);

  return [(size > numberMaxSize) ? value : Number(value), updateOffset(encoded, offset, size)];
}

function deserializeArray (
  elements: readonly LayoutItem[],
  encoded: Uint8Array,
  offset: number,
): [LayoutToType<typeof elements>, number] {
  let decoded = {} as any;
  for (const element of elements)
    [decoded[element.name], offset] = deserializeLayoutItem(element, encoded, offset);
  
  return [decoded, offset];
}

function deserializeLayoutItem(
  item: LayoutItem,
  encoded: Uint8Array,
  offset: number,
): [LayoutToType<typeof item>, number] {
  switch (item.binary) {
    case "array": {
      let ret = [] as any[];
      if (item.size !== undefined) {
        const [length, newOffset] = deserializeUint(encoded, offset, item.size) as [number, number];
        offset = newOffset;
        for (let i = 0; i < length; ++i)
          [ret[i], offset] = deserializeArray(item.elements, encoded, offset);
      }
      else {
        while (offset < encoded.length)
          [ret[ret.length], offset] = deserializeArray(item.elements, encoded, offset);
      }
      return [ret, offset];
    }
    case "bytes": {
      let newOffset;
      if (item.size !== undefined)
        newOffset = updateOffset(encoded, offset, item.size)
      else
        newOffset = encoded.length
      
      const value = encoded.slice(offset, newOffset);
      if (item.custom !== undefined) {
        if (item.custom instanceof Uint8Array) {
          //fixed value
          checkUint8ArrayDeeplyEqual(item.custom, value);
          return [value, newOffset];
        }
        //custom conversion
        return [item.custom.from(value), newOffset];
      }
      //primitive type
      return [value, newOffset];
    }
    case "uint": {
      const [value, newOffset] = deserializeUint(encoded, offset, item.size);
      if (item.custom !== undefined) {
        if (typeof item.custom === "number" || typeof item.custom === "bigint") {
          //fixed value
          checkUintEquals(item.custom, value);
          
          return [value, newOffset];
        }
        //custom conversion
        return [item.custom.from(value), newOffset];
      }
      //primitive type
      return [value, newOffset];
    }
  }
}
