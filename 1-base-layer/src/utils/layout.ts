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

// type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// type LayoutItemTemplate<
//   BinaryLiteral extends BinaryLiterals,
//   Size extends number
// > = {
//   name: string,
//   binary: BinaryLiteral,
//   size: Size,
//   custom: BinaryLiteral extends "array"
//     ? readonly LayoutItem[]
//     : BinaryLiteral extends "uint"
//     ? UintSizeToPrimitive<Size>
//       | CustomConversion<UintSizeToPrimitive<Size>, any>
//     : BinaryLiteral extends "bytes" ?
//       Uint8Array | CustomConversion<Uint8Array, any>
//     : never,
// };

// type LayoutItemOptionals<BinaryLiteral extends BinaryLiterals> =
//   BinaryLiteral extends "uint"
//   ? "custom"
//   : BinaryLiteral extends "bytes"
//   ? "size" | "custom"
//   : BinaryLiteral extends "array"
//   ? "size"
//   : never;

// type LayoutItemImpl<BinaryLiteral extends BinaryLiterals> =
//   WithOptional<LayoutItemTemplate<BinaryLiteral, number>, LayoutItemOptionals<BinaryLiteral>>;

// type LayoutItem = LayoutItemImpl<"uint"> | LayoutItemImpl<"bytes"> | LayoutItemImpl<"array">;

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
};

export interface ArrayLayoutItem extends LayoutItemBase<"array"> {
  size?: NumberSize, 
  elements: readonly LayoutItem[],
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

export function serializeLayout<T extends readonly LayoutItem[]>(
  layout: T,
  data: LayoutToType<T>,
): Uint8Array {
  const ret = new Uint8Array(calcLayoutSize(layout, data));
  let offset = 0;
  for (let i = 0; i < layout.length; ++i)
    offset = serializeLayoutItem(layout[i], data[i], ret, offset);
  
  return ret;
}

export function deserializeLayout<T extends readonly LayoutItem[]>(
  layout: T,
  encoded: Uint8Array,
): LayoutToType<T> {
  let [decoded, offset] = deserializeArray(layout, encoded, 0);

  if (offset !== encoded.length)
    throw new Error(`encoded data is longer than expected: ${encoded.length} > ${offset}`);
  
  return decoded as LayoutToType<T>;
}

// -- IMPL --

//Wormhole uses big endian by default for all uints
const serializeUint = (
  encoded: Uint8Array,
  offset: number,
  val: number | bigint,
  bytes: number,
): number => {
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

const serializeLayoutItem = (
  item: LayoutItem,
  data: any,
  encoded: Uint8Array,
  offset: number
): number => {
  switch (item.binary) {
    case "array": {
      if (item.size !== undefined)
        offset = serializeUint(encoded, offset, data.length, item.size);
        
      for (let i = 0; i < item.elements.length; ++i)
        offset = serializeLayoutItem(item.elements[i], data[i], encoded, offset);
      
      break;
    }
    case "bytes": {
      const value = (() => {
        if (item.custom !== undefined) {
          if (item.custom instanceof Uint8Array) {
            //fixed value
            checkUint8ArrayDeeplyEqual(item.custom, data)
            return item.custom;
          }
          //custom conversion
          const converted = item.custom.from(data);
          if (item.size !== undefined)
            checkUint8ArraySize(converted, item.size);
          
          return converted;
        }
        //primitive type
        return data as Uint8Array;
      })();

      encoded.set(value, offset);
      offset += data.length;
      break;
    }
    case "uint": {
      const value = (() => {
        if (item.custom !== undefined) {
          if (typeof item.custom == "number" || typeof item.custom === "bigint") {
            //fixed value
            checkUintEquals(item.custom, data);
            return item.custom;
          }
          //custom conversion
          return item.custom.from(data);
        }
        //primitive type
        return data as number | bigint;
      })();

      offset = serializeUint(encoded, offset, value, item.size);
      break;
    }
  }
  return offset;
};

// deserialize

const updateOffset = (
  encoded: Uint8Array,
  offset: number,
  size: number
): number => {
  const newOffset = offset + size;
  if (newOffset > encoded.length)
    throw new Error(`encoded data is shorter than expected: ${encoded.length} < ${newOffset}`);
  
  return newOffset;
}

const deserializeUint = (
  encoded: Uint8Array,
  offset: number,
  size: number
): [number | bigint, number] => {
  let value = 0n;
  for (let i = 0; i < size; ++i)
    value += BigInt(encoded[offset + i]) << BigInt((size - 1 - i) * 8);

  return [(size > numberMaxSize) ? value : Number(value), updateOffset(encoded, offset, size)];
}

const deserializeArray = (
  elements: readonly LayoutItem[],
  encoded: Uint8Array,
  offset: number,
): [any, number] => {
  let decoded = {} as any;
  for (const element of elements)
    [decoded[element.name], offset] = deserializeLayoutItem(element, encoded, offset);
  
  return [decoded, offset];
}

const deserializeLayoutItem = (
  item: LayoutItem,
  encoded: Uint8Array,
  offset: number,
): [any, number] => {
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
