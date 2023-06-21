import {
  ChainId,
  ChainName,
} from "@certusone/wormhole-sdk/lib/esm/utils/consts";
import { Address } from "./Address";
import { NativeAddressFactory } from "./NativeAddressFactory";
import { strip0x } from "./utils";

export class UniversalAddress extends Address {
  constructor(address: string | Uint8Array | Buffer) {
    super(address);
    if (address instanceof Uint8Array) {
      address = Buffer.from(address).toString("hex");
    }

    this.address = strip0x(address).padStart(64, "0");
  }

  public toNativeAddress = (chain: ChainId | ChainName) => {
    return NativeAddressFactory.get(chain).fromUniversalAddress(this.address);
  };
}
