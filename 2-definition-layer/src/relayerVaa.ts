import {
  Layout,
  UintLayoutItem,
  LengthPrefixedBytesLayoutItem,
  ToMapping,
  layoutConversion
} from "wormhole-base";
import { chainItem, universalAddressItem, sequenceItem } from "./layout-items";
import { registerPayloadType } from "./vaa";

const amountItem = { binary: "uint", size: 32 } as const satisfies Omit<UintLayoutItem, "name">;

const executionInfoLayout = [
  { name: "version", binary: "uint", size: 32, custom: 0n },
  { name: "gasLimit", ...amountItem },
  { name: "targetChainRefundPerGasUnused", ...amountItem },
] as const satisfies Layout;

const encodedExecutionItem = {
  binary: "bytes",
  lengthSize: 4,
  custom: layoutConversion(executionInfoLayout)
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
    { name: "newExecutionInfo", ...encodedExecutionItem },
    { name: "redeliveryHash", binary: "bytes", size: 32 },
  ]]
] as const satisfies readonly (readonly [string, Layout])[];

// factory registration:

declare global { namespace Wormhole {
  interface PayloadLiteralToDescriptionMapping extends ToMapping<typeof relayerPayloads> {}
}}

relayerPayloads.forEach(([payloadLiteral, layout]) => registerPayloadType(payloadLiteral, layout));