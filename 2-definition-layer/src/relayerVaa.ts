import {
  CustomConversion,
  Layout,
  UintLayoutItem,
  LengthPrefixedBytesLayoutItem,
  ToMapping
} from "wormhole-base";
import { chainItem, universalAddressItem, sequenceItem } from "./layout-items";
import { registerPayloadType } from "./vaa";

type ExecutionInfo = Uint8Array;

const amountItem = { binary: "uint", size: 32 } as const satisfies Omit<UintLayoutItem, "name">;

const encodedExecutionItem = {
  binary: "bytes",
  lengthSize: 4,
  custom: {
    to: (encoded: Uint8Array): ExecutionInfo => {
      //decoding code goes here (probably just another layout or set of layouts)
      return encoded;
    },
    from: (val: ExecutionInfo): Uint8Array => {
      //encoding code goes here (again, probably leveraging layout serialization)
      return val;
    }
  } satisfies CustomConversion<Uint8Array, ExecutionInfo>
} as const satisfies Omit<LengthPrefixedBytesLayoutItem, "name">;

const vaaKeyLayout = [
  { name: "version", binary: "uint", size: 1, custom: { to: "Key", from: 1 } },
  { name: "chain", ...chainItem() },
  { name: "emitterAddress", ...universalAddressItem },
  { name: "sequence", ...sequenceItem }
] as const satisfies Layout;

const relayerPayloads = [
  [ "DeliveryInstruction", [
    { name: "payloadId", binary: "uint", size: 1, custom: 1 },
    { name: "targetChain", ...chainItem() },
    { name: "targetAddress", ...universalAddressItem },
    { name: "payload", binary: "bytes", lengthSize: 4 },
    { name: "requestedReceiverValue", ...amountItem },
    { name: "extraReceiverValue", ...amountItem },
    { name: "executionInfo", ...encodedExecutionItem},
    { name: "refundChain", ...chainItem() },
    { name: "refundAddress", ...universalAddressItem },
    { name: "refundDeliveryProvider", ...universalAddressItem },
    { name: "sourceDeliveryProvider", ...universalAddressItem },
    { name: "senderAddress", ...universalAddressItem },
    { name: "vaaKeys", binary: "array", lengthSize: 1, elements: vaaKeyLayout }
  ]],
  [ "RedeliveryInstruction", [
    { name: "payloadId", binary: "uint", size: 1, custom: 2 },
    { name: "deliveryVaaKey", binary: "object", layout: vaaKeyLayout },
    { name: "targetChain", ...chainItem() },
    { name: "newRequestedReceiverValue", ...amountItem },
    { name: "newEncodedExecutionInfo", ...encodedExecutionItem },
    { name: "newSourceDeliveryProvider", ...universalAddressItem },
    { name: "newSenderAddress", ...universalAddressItem },
  ]],
  [ "DeliveryOverrideLayout", [
    { name: "version", binary: "uint", size: 1, custom: 1 },
    { name: "receiverValue", ...amountItem },
    { name: "newEncodedExecutionInfo", ...encodedExecutionItem },
    { name: "redeliveryHash", binary: "bytes", size: 32 },
  ]]
] as const satisfies readonly (readonly [string, Layout])[];

// factory registration:

declare global { namespace Wormhole {
  interface PayloadLiteralToDescriptionMapping extends ToMapping<typeof relayerPayloads> {}
}}

relayerPayloads.forEach(([payloadLiteral, layout]) => registerPayloadType(payloadLiteral, layout));