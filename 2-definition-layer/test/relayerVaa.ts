import { expect, use as chaiUse } from "chai";
// import chaiAsPromised from 'chai-as-promised';
// chaiUse(chaiAsPromised);

import { hexByteStringToUint8Array } from "wormhole-base";
import { serializePayload, deserializePayload } from "../src/vaa";
import "../src/payloads/relayer";

//monkey-patch to allow stringifying BigInts
(BigInt.prototype as any).toJSON = function() { return this.toString() };

//log taken from here: https://moonbeam.moonscan.io/tx/0x6a2c36673e8cbbef29cc3bad4eabfb8edb0851c0d27defba300f80561ccecec6
const original = "0x01000500000000000000000000000046AF49E93E92ACE9CB04545C6548E3F12BE61FD7000000600000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000C746573746772656574696E67000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000C350000000000000000000000000000000000000000000000000000000308FD36EDB00050000000000000000000000007A0A53847776F7E94CC35742971ACB2217B0DB810000000000000000000000007A0A53847776F7E94CC35742971ACB2217B0DB810000000000000000000000007A0A53847776F7E94CC35742971ACB2217B0DB8100000000000000000000000046AF49E93E92ACE9CB04545C6548E3F12BE61FD700";

describe("Relayer VAA tests", function () {
  it("should correctly deserialize and reserialize a relayer VAA", function () {
    const payload = deserializePayload("DeliveryInstruction", original);
    expect(payload.target.chain).to.equal("Polygon");
    expect(payload.refund.chain).to.equal("Polygon");

    // console.log(payload);

    const encoded = serializePayload("DeliveryInstruction", payload);
    expect(encoded).to.deep.equal(hexByteStringToUint8Array(original));
  });
});