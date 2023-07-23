import { expect, use as chaiUse } from "chai";
// import chaiAsPromised from 'chai-as-promised';
// chaiUse(chaiAsPromised);

import { UniversalAddress } from "../src/universalAddress";
import { create, deserialize } from "../src/vaa";
import "../src/governanceVaa";

//monkey-patch to allow stringifying BigInts
(BigInt.prototype as any).toJSON = function() { return this.toString() };

//from here: https://etherscan.io/tx/0xfe57d65421ddd689a660a7906c685954fa5c1102716452cbc8acada0214e4522
//decode via https://vaa.dev
const guardianSetUpgrade = "0x01000000020d00ce45474d9e1b1e7790a2d210871e195db53a70ffd6f237cfe70e2686a32859ac43c84a332267a8ef66f59719cf91cc8df0101fd7c36aa1878d5139241660edc0010375cc906156ae530786661c0cd9aef444747bc3d8d5aa84cac6a6d2933d4e1a031cffa30383d4af8131e929d9f203f460b07309a647d6cd32ab1cc7724089392c000452305156cfc90343128f97e499311b5cae174f488ff22fbc09591991a0a73d8e6af3afb8a5968441d3ab8437836407481739e9850ad5c95e6acfcc871e951bc30105a7956eefc23e7c945a1966d5ddbe9e4be376c2f54e45e3d5da88c2f8692510c7429b1ea860ae94d929bd97e84923a18187e777aa3db419813a80deb84cc8d22b00061b2a4f3d2666608e0aa96737689e3ba5793810ff3a52ff28ad57d8efb20967735dc5537a2e43ef10f583d144c12a1606542c207f5b79af08c38656d3ac40713301086b62c8e130af3411b3c0d91b5b50dcb01ed5f293963f901fc36e7b0e50114dce203373b32eb45971cef8288e5d928d0ed51cd86e2a3006b0af6a65c396c009080009e93ab4d2c8228901a5f4525934000b2c26d1dc679a05e47fdf0ff3231d98fbc207103159ff4116df2832eea69b38275283434e6cd4a4af04d25fa7a82990b707010aa643f4cf615dfff06ffd65830f7f6cf6512dabc3690d5d9e210fdc712842dc2708b8b2c22e224c99280cd25e5e8bfb40e3d1c55b8c41774e287c1e2c352aecfc010b89c1e85faa20a30601964ccc6a79c0ae53cfd26fb10863db37783428cd91390a163346558239db3cd9d420cfe423a0df84c84399790e2e308011b4b63e6b8015010ca31dcb564ac81a053a268d8090e72097f94f366711d0c5d13815af1ec7d47e662e2d1bde22678113d15963da100b668ba26c0c325970d07114b83c5698f46097010dc9fda39c0d592d9ed92cd22b5425cc6b37430e236f02d0d1f8a2ef45a00bde26223c0a6eb363c8b25fd3bf57234a1d9364976cefb8360e755a267cbbb674b39501108db01e444ab1003dd8b6c96f8eb77958b40ba7a85fefecf32ad00b7a47c0ae7524216262495977e09c0989dd50f280c21453d3756843608eacd17f4fdfe47600001261025228ef5af837cb060bcd986fcfa84ccef75b3fa100468cfd24e7fadf99163938f3b841a33496c2706d0208faab088bd155b2e20fd74c625bb1cc8c43677a0163c53c409e0c5dfa000100000000000000000000000000000000000000000000000000000000000000046c5a054d7833d1e42000000000000000000000000000000000000000000000000000000000436f7265020000000000031358cc3ae5c097b213ce3c81979e1b9f9570746aa5ff6cb952589bde862c25ef4392132fb9d4a42157114de8460193bdf3a2fcf81f86a09765f4762fd1107a0086b32d7a0977926a205131d8731d39cbeb8c82b2fd82faed2711d59af0f2499d16e726f6b211b39756c042441be6d8650b69b54ebe715e234354ce5b4d348fb74b958e8966e2ec3dbd4958a7cd15e7caf07c4e3dc8e7c469f92c8cd88fb8005a2074a3bf913953d695260d88bc1aa25a4eee363ef0000ac0076727b35fbea2dac28fee5ccb0fea768eaf45ced136b9d9e24903464ae889f5c8a723fc14f93124b7c738843cbb89e864c862c38cddcccf95d2cc37a4dc036a8d232b48f62cdd4731412f4890da798f6896a3331f64b48c12d1d57fd9cbe7081171aa1be1d36cafe3867910f99c09e347899c19c38192b6e7387ccd768277c17dab1b7a5027c0b3cf178e21ad2e77ae06711549cfbb1f9c7a9d8096e85e1487f35515d02a92753504a8d75471b9f49edb6fbebc898f403e4773e95feb15e80c9a99c8348d";

describe("governanceVAA", function () {
  it("should create an empty VAA from an object with omitted fixed values", function () {
    const vaa = create({
      payloadLiteral: "Uint8Array",
      guardianSet: 0,
      signatures: [],
      nonce: 0,
      timestamp: 0,
      sequence: 0n,
      emitterChain: "Ethereum",
      emitterAddress: new UniversalAddress(new Uint8Array(32)),
      consistencyLevel: 0,
      payload: new Uint8Array(0)
    });
    expect(vaa.hash).to.not.equal(new Uint8Array(32));
  });

  it("should deserialize a guardian set upgrade governance VAA", function () {
    const vaa = deserialize("CoreBridgeGuardianSetUpgrade", guardianSetUpgrade);
    expect(vaa.payloadLiteral).to.equal("CoreBridgeGuardianSetUpgrade");
    expect(vaa.version).to.equal(1);
    expect(vaa.guardianSet).to.equal(2);
    expect(vaa.signatures).to.have.length(13);
    expect(vaa.nonce).to.equal(2651610618);
    expect(vaa.emitterChain).to.equal("Solana");
    expect(vaa.payload.module).to.equal("CoreBridge");
    expect(vaa.payload.action).to.equal("GuardianSetUpgrade");
    expect(vaa.payload.guardianSet).to.equal(3);
    expect(vaa.payload.guardians).to.have.length(19);
  });

  it("should use something that's imported", function () {
    const addr = new UniversalAddress(new Uint8Array(32));
    // console.log(keccak_256(addr.toUint8Array()));
    expect(addr.toUint8Array()).to.deep.equal(new Uint8Array(32));
  });
});
