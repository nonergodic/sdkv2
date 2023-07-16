//@noble/hashes is what ethers uses under the hood
import { keccak_256 } from "@noble/hashes/sha3";
import { Signature as SignatureOptionalRecovery } from "@noble/secp256k1";

import {
  ChainId,
  isChainId,
  hexByteStringToUint8Array,
  LayoutItem,
  LayoutToType,
  CustomConversion,
  serializeLayout,
  deserializeLayout,
  FixedItems,
  fixedItems,
} from "wormhole-base";

import { UniversalAddress } from "./universalAddress";

declare global { namespace Wormhole {
  interface PayloadLiteralToTypeMapping {
    Uint8Array: Uint8Array;
  }
}}

type PayloadLiterals = keyof Wormhole.PayloadLiteralToTypeMapping;
// type PayloadTypes = Wormhole.PayloadLiteralToTypeMapping[PayloadLiterals];

export class Signature extends SignatureOptionalRecovery {
  constructor(readonly r: bigint, readonly s: bigint, readonly recovery: number) {
    super(r, s, recovery);
  }
}

const signatureLayout = [
  { name: "r", binary: "uint", size: 8 },
  { name: "s", binary: "uint", size: 8 },
  { name: "v", binary: "uint", size: 1 },
] as const satisfies readonly LayoutItem[];

export const conversions = {
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
  Signature: {
    to: (val: Uint8Array): Signature => {
      const sig = deserializeLayout(signatureLayout, val);
      return new SignatureOptionalRecovery(sig.r, sig.s, sig.v) as Signature;
    },
    from: (val: Signature): Uint8Array =>
      serializeLayout(signatureLayout, {r: val.r, s: val.s, v: val.recovery}),
  } satisfies CustomConversion<Uint8Array, Signature>,
} as const;

const guardianSignatureLayout = [
  { name: "guardianSetIndex", binary: "uint",  size:  1},
  { name: "signature",        binary: "bytes", size: 65, custom: conversions.Signature }
] as const satisfies readonly LayoutItem[];

const headerLayout = [
  { name: "version",     binary: "uint",  size: 1, custom: 1 },
  { name: "guardianSet", binary: "uint",  size: 4 },
  { name: "signatures",  binary: "array", size: 1, elements: guardianSignatureLayout },
] as const satisfies readonly LayoutItem[];

const bodyLayout = [
  { name: "timestamp",        binary: "uint",  size:  4 },
  { name: "nonce",            binary: "uint",  size:  4 },
  { name: "emitterChain",     binary: "uint",  size:  2, custom: conversions.ChainId },
  { name: "emitterAddress",   binary: "bytes", size: 32, custom: conversions.UniversalAddress },
  { name: "sequence",         binary: "uint",  size:  8 },
  { name: "consistencyLevel", binary: "uint",  size:  1 }
] as const satisfies readonly LayoutItem[];

const baseLayout = [...headerLayout, ...bodyLayout] as const;
type BaseLayout = LayoutToType<typeof baseLayout>;

export interface VAA<PayloadLiteral extends PayloadLiterals = "Uint8Array"> extends BaseLayout {
  readonly payloadLiteral: PayloadLiteral,
  readonly payload: Wormhole.PayloadLiteralToTypeMapping[PayloadLiteral],
  readonly hash: Uint8Array,
}

export interface PayloadSerDe {
  serialize(payload: any): Uint8Array;
  deserialize(bytes: Uint8Array): any;
}

const payloadFactory = new Map<PayloadLiterals, PayloadSerDe>();

function getSerDe(payloadLiteral: PayloadLiterals): PayloadSerDe {
  const serDe = payloadFactory.get(payloadLiteral);
  if (!serDe)
    throw new Error(`No serializer/deserializer registered for payload type ${payloadLiteral}`);
  return serDe;
}

export function create<Payload extends PayloadLiterals = "Uint8Array">(
  vaaData: Omit<VAA<Payload>, keyof FixedItems<typeof baseLayout> | "hash">
): VAA<Payload> {
  return {
    ...fixedItems(baseLayout),
    ...vaaData,
    hash: keccak_256(
      serializeLayout(
        [...bodyLayout, { name: "payload", binary: "bytes" }] as const,
        {...vaaData, payload: getSerDe(vaaData.payloadLiteral).serialize(vaaData.payload)}
      )
    )
  }
}

export function registerPayloadType(
  payloadLiteral: PayloadLiterals,
  payloadSerDe: PayloadSerDe,
) {
  if (payloadFactory.has(payloadLiteral))
    throw new Error(`Payload type ${payloadLiteral} already registered`);
  
  payloadFactory.set(payloadLiteral, payloadSerDe);
}

export const serialize = <PayloadLiteral extends PayloadLiterals>(
  vaa: VAA<PayloadLiteral>
): Uint8Array =>
  serializeLayout(
    [...baseLayout, { name: "payload", binary: "bytes" }] as const,
    {...vaa, payload: getSerDe(vaa.payloadLiteral).serialize(vaa.payload)}
  );

export function deserialize<PayloadLiteral extends PayloadLiterals>(
  payloadLiteral: PayloadLiteral,
  data: Uint8Array | string,
): VAA<PayloadLiteral> {
  if (typeof data === "string")
    data = hexByteStringToUint8Array(data);
  
  const header = deserializeLayout(
    [...headerLayout, { name: "rawBody", binary: "bytes" }] as const,
    data,
  );
  const body = deserializeLayout(
    [...bodyLayout, { name: "rawPayload", binary: "bytes" }] as const,
    header.rawBody,
  );
  const payload = getSerDe(payloadLiteral).deserialize(body.rawPayload);
  const hash = keccak_256(header.rawBody);

  return { payloadLiteral, ...header, ...body, payload, hash };
}

payloadFactory.set("Uint8Array", {
  serialize: (payload: Uint8Array) => payload,
  deserialize: (payload: Uint8Array) => payload
});
