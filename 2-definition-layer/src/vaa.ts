import {
  ChainId,
  isChainId,
  hexByteStringToUint8Array,
  LayoutItem,
  LayoutToType,
  CustomConversion,
  serializeLayout,
  deserializeLayout
} from "wormhole-base";

import { UniversalAddress } from "./universalAddress";

declare global { namespace Wormhole {
  interface PayloadLiteralToTypeMapping {
    Uint8Array: Uint8Array;
  }
}}

type PayloadLiterals = keyof Wormhole.PayloadLiteralToTypeMapping;
// type PayloadTypes = Wormhole.PayloadLiteralToTypeMapping[PayloadLiterals];


//TODO better naming? code structure (should they be grouped or separate?)
export const builtinConversions = {
  UniversalAddress: {
    to: (val: Uint8Array): UniversalAddress => new UniversalAddress(val),
    from: (val: UniversalAddress): Uint8Array => val.toUint8Array(),
  } satisfies CustomConversion<Uint8Array, UniversalAddress>,
  ChainId: {
    to: (val: number): ChainId => {
      if (!isChainId(val))
        throw new Error(`Invalid chain id ${val}`);
      return val;
    },
    from: (val: ChainId): number => val,
  } satisfies CustomConversion<number, ChainId>,
} as const;

const signatureLayout = [
  {
    name: "guardianSetIndex",
    binary: "uint",
    size: 1,
  }, {
    name: "signature",
    binary: "bytes",
    size: 65,
    //TODO custom: mapping to proper secp256k1 signature type
  }
] as const satisfies readonly LayoutItem[];

const headerLayout = [
  {
    name: "version",
    binary: "uint",
    size: 1,
    custom: 1,
  },
  {
    name: "guardianSet",
    binary: "uint",
    size: 4,
  },
  {
    name: "signatures",
    binary: "array",
    size: 1,
    elements: signatureLayout
  },
] as const satisfies readonly LayoutItem[];

const bodyLayout = [
  {
  name: "timestamp",
    binary: "uint",
    size: 4,
  },
  {
    name: "nonce",
    binary: "uint",
    size: 4,
  },
  {
    name: "emitterChain",
    binary: "uint",
    size: 2,
    custom: builtinConversions.ChainId
  },
  {
    name: "emitterAddress",
    binary: "bytes",
    size: 32,
    custom: builtinConversions.UniversalAddress,
  },
  {
    name: "sequence",
    binary: "uint",
    size: 8,
  },
  {
    name: "consistencyLevel",
    binary: "uint",
    size: 1,
  }
] as const satisfies readonly LayoutItem[];

const baseLayout = [...headerLayout, ...bodyLayout] as const satisfies readonly LayoutItem[];
export type BaseLayout = LayoutToType<typeof baseLayout>;

export interface VAA<PayloadLiteral extends PayloadLiterals = "Uint8Array"> extends BaseLayout {
  readonly payloadLiteral: PayloadLiteral,
  readonly payload: Wormhole.PayloadLiteralToTypeMapping[PayloadLiteral],
}

//In a better world, we'd use the layoutGenerator at the bottom of this comment.
//However because of various issues in the current (July 2023) implementation of const type
//  parameters in Typescript we are stuck with using a less elegant solution.
//The issues are:
//  * Using extends in conjunction with a const type parameter screws up the inferred type and
//      so we receive a union type instead of an array of singular, explicit LayoutItems (i.e.
//      why we are using a const type parameter in the first place...)
//  * Array.isArray fails to narrow the type of readonly arrays correctly (a known issue since
//      2017, see here: https://github.com/microsoft/TypeScript/issues/17002) and we can't even
//      manually do the cast ourselves since we don't know the specific type of the array elements
//      either (which yet again is entirely the point of using a const type parameter in the first
//      place), which ultimately means we simply can't pass in (i.e. use) a readonly array (and the
//      array must be readonly since it stems from an `as const` definition).
//(Alternatively, you can also just uncomment the code and see for yourself.)
//
//The code we'd like to use:
// type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
// const layoutGenerator =
//   <const PayloadLayout extends (DistributiveOmit<LayoutItem, "name"> | readonly LayoutItem[])>(
//     payloadLayout: PayloadLayout
//   ) => [
//     ...headerLayout
//     ...bodyLayout,
//     {
//       name: "payload",
//       ...(Array.isArray(payloadLayout)
//         ? {
//           binary: "array",
//           elements: payloadLayout
//         }
//         : payloadLayout
//       )
//     }
//   ] as const satisfies readonly LayoutItem[];
//
//The shittier version we're stuck with:
export const layoutGenerator = <const PayloadLayout>(payloadLayout: PayloadLayout) => [
  ...baseLayout,
  {
    name: "payload",
    ...payloadLayout
  }
] as const;

const rawVaaLayout = layoutGenerator({"binary": "bytes"});

export interface PayloadSerDe {
  serialize(payload: any): Uint8Array;
  deserialize(bytes: Uint8Array): any;
}

const payloadFactory = new Map<PayloadLiterals, PayloadSerDe>();

export function registerPayloadType(
  payloadLiteral: PayloadLiterals,
  payloadSerDe: PayloadSerDe,
) {
  if (payloadFactory.has(payloadLiteral))
    throw new Error(`Payload type ${payloadLiteral} already registered`);
  
  payloadFactory.set(payloadLiteral, payloadSerDe);
}

export function serialize<PayloadLiteral extends PayloadLiterals>(
  vaa: VAA<PayloadLiteral>
): Uint8Array {
  const serde = payloadFactory.get(vaa.payloadLiteral);
  if (!serde)
    throw new Error(`No serializer/deserializer registered for payload type ${vaa.payloadLiteral}`);

  return serializeLayout(rawVaaLayout, {...vaa, payload: serde.serialize(vaa.payload)});
}

export function deserialize<PayloadLiteral extends PayloadLiterals>(
  payloadLiteral: PayloadLiteral,
  data: Uint8Array | string,
): VAA<PayloadLiteral> {
  const serde = payloadFactory.get(payloadLiteral);
  if (!serde)
    throw new Error(`No serializer/deserializer registered for payload type ${payloadLiteral}`);
  
  if (typeof data === "string")
    data = hexByteStringToUint8Array(data);
  
  const rawVaa = deserializeLayout(rawVaaLayout, data);

  return {
    ...rawVaa,
    payloadLiteral,
    payload: serde.deserialize(rawVaa.payload)
  } as VAA<PayloadLiteral>;
}

payloadFactory.set("Uint8Array", {
  serialize: (payload: Uint8Array) => payload,
  deserialize: (payload: Uint8Array) => payload
});
