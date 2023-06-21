import { CHAIN_ID_ETH } from "@certusone/wormhole-sdk/lib/cjs/utils/consts";
import { NativeAddress } from "../generic/address/NativeAddress";
import { strip0x } from "../generic/address/utils";

export class EvmAddress extends NativeAddress {
  constructor(address: string | Uint8Array | Buffer) {
    super(address, CHAIN_ID_ETH);
    if (address instanceof Uint8Array) {
      address = Buffer.from(address).toString("hex");
    }

    this.address = strip0x(address).padStart(40, "0"); // 20 byte hex string
  }

  public static fromUniversalAddress(address: string): EvmAddress {
    return new EvmAddress(address);
  }
}
