import { ChainName } from "@certusone/wormhole-sdk/lib/esm/utils/consts";
import { NativeAddress } from "../generic/address/NativeAddress";
import { strip0x } from "../generic/address/utils";

export class EvmAddress extends NativeAddress {
  constructor(address: string | Uint8Array | Buffer, chain: ChainName) {
    if (typeof address === "string") {
      address = strip0x(address).padStart(40, "0");
      if (!EvmAddress.isValidAddress(address)) {
        throw new Error(
          `Invalid EVM address, expected 20-byte hex string but got ${address}`
        );
      }

      address = Buffer.from(address, "hex");
    }

    super(address, chain);
  }

  public static isValidAddress(address: string): boolean {
    return /^(?:0x)?[a-fA-F0-9]{40}$/.test(address); // 20 byte hex string
  }

  public static fromUniversalAddress(
    address: Uint8Array,
    chain: ChainName
  ): EvmAddress {
    return new EvmAddress(address, chain);
  }
}
