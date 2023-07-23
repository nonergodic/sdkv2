//@noble is what ethers uses under the hood
import { keccak_256 } from "@noble/hashes/sha3";

import {
  hexByteStringToUint8Array,
  Layout,
  LayoutItem,
  LayoutToType,
  serializeLayout,
  deserializeLayout,
  FixedItems,
  fixedItems,
  CustomConversion,
} from "wormhole-base";

import { Signature } from "./signature";
import { chainConversion, universalAddressConversion } from "./layout-conversions";

const uint8ArrayConversion = {
  to: (val: Uint8Array) => val,
  from: (val: Uint8Array) => val,
} as const satisfies CustomConversion<Uint8Array, Uint8Array>;

//PayloadLiteralToDescriptionMapping is the compile-time analog/complement to the runtime
//  payload factory. It uses TypeScript's interface merging mechanic to "dynamically" extend known
//  payload types that are declared in different modules. This allows us to have full type safety
//  when constructing payloads via the factory without having to ever declare the mapping of all
//  payloads and their respective layouts in a single place (which, besides being a terrible code
//  smell, would also prevent users of the SDK to register their own payload types!)
declare global { namespace Wormhole {
  //effective type: Record<string, Layout | CustomConversion<Uint8Array, any>>
  interface PayloadLiteralToDescriptionMapping {
    Uint8Array: typeof uint8ArrayConversion;
  }
}}

type PayloadLiteral = keyof Wormhole.PayloadLiteralToDescriptionMapping;
type DescriptionOf<PL extends PayloadLiteral> = Wormhole.PayloadLiteralToDescriptionMapping[PL];

const layoutConversion = <L extends Layout>(layout: L) => ({
  to: (val: Uint8Array): LayoutToType<L> => deserializeLayout(layout, val),
  from: (val: LayoutToType<L>): Uint8Array => serializeLayout(layout, val),
}) as const satisfies CustomConversion<Uint8Array, LayoutToType<L>>;

type DescriptionToCustomConversion<D extends DescriptionOf<PayloadLiteral>> =
  D extends CustomConversion<Uint8Array, infer T>
  ? CustomConversion<Uint8Array, T>
  : D extends Layout
  ? ReturnType<typeof layoutConversion<D>>
  : never;

type CustomConversionToType<C extends CustomConversion<Uint8Array, any>> =
  ReturnType<C["to"]>;

type PayloadLiteralToPayloadType<PL extends PayloadLiteral> =
  DescriptionToCustomConversion<DescriptionOf<PL>> extends CustomConversion<Uint8Array, any>
  ? CustomConversionToType<DescriptionToCustomConversion<DescriptionOf<PL>>>
  : never;

const signatureConversion = {
  to: (val: Uint8Array): Signature => {
    const sig = deserializeLayout(signatureLayout, val);
    return new Signature(sig.r, sig.s, sig.v);
  },
  from: (val: Signature): Uint8Array =>
    serializeLayout(signatureLayout, {r: val.r, s: val.s, v: val.recovery}),
} as const satisfies CustomConversion<Uint8Array, Signature>;

const signatureLayout = [
  { name: "r", binary: "uint", size: 32 },
  { name: "s", binary: "uint", size: 32 },
  { name: "v", binary: "uint", size:  1 },
] as const satisfies Layout;

const guardianSignatureLayout = [
  { name: "guardianIndex", binary: "uint",  size:  1},
  { name: "signature",     binary: "bytes", size: 65, custom: signatureConversion }
] as const satisfies Layout;

const headerLayout = [
  { name: "version",     binary: "uint",  size:  1, custom: 1 },
  { name: "guardianSet", binary: "uint",  size:  4 },
  { name: "signatures",  binary: "array", size:  1, elements: guardianSignatureLayout },
] as const satisfies Layout;

const envelopeLayout = [
  { name: "timestamp",        binary: "uint",  size:  4 },
  { name: "nonce",            binary: "uint",  size:  4 },
  { name: "emitterChain",     binary: "uint",  size:  2, custom: chainConversion() },
  { name: "emitterAddress",   binary: "bytes", size: 32, custom: universalAddressConversion },
  { name: "sequence",         binary: "uint",  size:  8 },
  { name: "consistencyLevel", binary: "uint",  size:  1 }
] as const satisfies Layout;

const baseLayout = [...headerLayout, ...envelopeLayout] as const;
type BaseLayout = LayoutToType<typeof baseLayout>;

export interface VAA<PL extends PayloadLiteral = "Uint8Array"> extends BaseLayout {
  readonly payloadLiteral: PL,
  readonly payload: PayloadLiteralToPayloadType<PL>,
  //TODO various problems with storing the hash here:
  // 1. On EVM the core bridge actually uses the double keccak-ed hash because of an early oversight
  // 2. As discussed on slack, storing memoized values on an object is a smell too
  //kept as is for now to get something usable out there, but this should receive more thought once
  //  the SDK has matured a little further.
  readonly hash: Uint8Array,
}

// type govAA = "CoreBridgeUpgradeContract";
// type MyDescription = DescriptionOf<govAA>
// type MyType = LayoutToType<LiteralToPayloadLayoutItem<govAA>>;
// type MyVaa = { [K in keyof VAA<govAA>]: VAA<govAA>[K] };
// type Look = MyVaa["signatures"];

const payloadFactory = new Map<PayloadLiteral, Layout | CustomConversion<Uint8Array, any>>();

function getPayloadDescription<PL extends PayloadLiteral>(payloadLiteral: PL) {
  const description = payloadFactory.get(payloadLiteral);
  if (!description)
    throw new Error(`No layout registered for payload type ${payloadLiteral}`);
  return description as DescriptionOf<PL>;
}

//We are keeping getPayladDescription() and descriptionToPayloadLayoutItem() separate because we'll
//  want to have access to the layout (if we it was registered as such) in the future when
//  implementing a deserialization function that takes a set of payload literals and determines
//  which layouts (if any) the serialized VAA encodes by leveraging:
//    1. the size of the encoded VAA (if it is constant given the layout)
//    2. the fixed items of the layout
//  as a fast way to determine if that layout could possibly match at all.
const descriptionToPayloadLayoutItem = <PL extends PayloadLiteral> (
  description: DescriptionOf<PL>
) => ({
  name: "payload",
  binary: "bytes",
  custom: (Array.isArray(description))
    ? layoutConversion(description)
    : description as CustomConversion<Uint8Array, any>,
}) as const satisfies LayoutItem;

const bodyLayout = <PL extends PayloadLiteral>(payloadLiteral: PL) => [
  ...envelopeLayout,
  descriptionToPayloadLayoutItem(getPayloadDescription(payloadLiteral))
] as const satisfies Layout;

export const create = <PL extends PayloadLiteral = "Uint8Array">(
  vaaData: Omit<VAA<PL>, keyof FixedItems<typeof baseLayout> | "hash">
): VAA<PL> => ({
  ...fixedItems(baseLayout),
  ...vaaData,
  hash: keccak_256(serializeLayout(bodyLayout(vaaData.payloadLiteral), vaaData)),
});

export function registerPayloadType<PL extends PayloadLiteral>(
  payloadLiteral: PL,
  payloadSerDe: CustomConversion<Uint8Array, any> | Layout,
) {
  if (payloadFactory.has(payloadLiteral))
    throw new Error(`Payload type ${payloadLiteral} already registered`);

  payloadFactory.set(payloadLiteral, payloadSerDe);
}

export const serialize = <PL extends PayloadLiteral>(
  vaa: VAA<PL>
): Uint8Array => {
  const layout = [
    ...baseLayout,
    descriptionToPayloadLayoutItem(getPayloadDescription(vaa.payloadLiteral)),
  ];
  return serializeLayout(layout, vaa as LayoutToType<typeof layout>);
}

export function deserialize<PL extends PayloadLiteral>(
  payloadLiteral: PL,
  data: Uint8Array | string,
): VAA<PL> {
  if (typeof data === "string")
    data = hexByteStringToUint8Array(data);

  const [header, bodyOffset] = deserializeLayout(headerLayout, data, 0, false);

  //ensure that guardian signature indicies are unique and in ascending order - see:
  //https://github.com/wormhole-foundation/wormhole/blob/8e0cf4c31f39b5ba06b0f6cdb6e690d3adf3d6a3/ethereum/contracts/Messages.sol#L121
  for (let i = 1; i < header.signatures.length; ++i)
    if (header.signatures[i].guardianIndex <= header.signatures[i - 1].guardianIndex)
      throw new Error("Guardian signatures must be in ascending order of guardian set index");

  const body = deserializeLayout(bodyLayout(payloadLiteral), data, bodyOffset);
  const hash = keccak_256(data.slice(bodyOffset));

  return { payloadLiteral, ...header, ...body, hash } as VAA<PL>;
}

payloadFactory.set("Uint8Array", uint8ArrayConversion);
