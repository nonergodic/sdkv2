import { Layout, serializeLayout, deserializeLayout, CustomConversion } from "wormhole-base";
import { Signature } from "../signature";

const signatureLayout = [
  { name: "r", binary: "uint", size: 32 },
  { name: "s", binary: "uint", size: 32 },
  { name: "v", binary: "uint", size:  1 },
] as const satisfies Layout;

export const signatureConversion = {
  to: (val: Uint8Array): Signature => {
    const sig = deserializeLayout(signatureLayout, val);
    return new Signature(sig.r, sig.s, sig.v);
  },
  from: (val: Signature): Uint8Array =>
    serializeLayout(signatureLayout, {r: val.r, s: val.s, v: val.recovery}),
} as const satisfies CustomConversion<Uint8Array, Signature>;
