import { ChainName } from "@certusone/wormhole-sdk/lib/esm/utils/consts";
import { Address } from "./Address";
import { NativeAddress } from "./NativeAddress";
import { NativeAddressFactory } from "./NativeAddressFactory";
import { strip0x } from "./utils";

export class UniversalAddress extends Address {
  constructor(address: string | Uint8Array | Buffer) {
    if (typeof address === "string") {
      address = strip0x(address).padStart(64, "0");
      if (!UniversalAddress.isValidAddress(address)) {
        throw new Error(
          `Invalid universal address, expected 32-byte hex string but got ${address}`
        );
      }

      address = Buffer.from(address, "hex");
    }

    super(address);
  }

  public toNativeAddress(chain: ChainName): NativeAddress {
    return NativeAddressFactory.get(chain).fromUniversalAddress(
      this.address,
      chain
    );
  }

  public static isValidAddress(address: string): boolean {
    return /^(?:0x)?[a-fA-F0-9]{64}$/.test(address); // 32 byte hex string
  }
}
