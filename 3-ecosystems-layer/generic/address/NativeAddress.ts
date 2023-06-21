import { ChainName } from "@certusone/wormhole-sdk/lib/esm/utils/consts";
import { Address } from "./Address";
import { NativeAddressFactory } from "./NativeAddressFactory";
import { UniversalAddress } from "./UniversalAddress";

export class NativeAddress extends Address {
  chain: ChainName;

  constructor(address: string | Uint8Array | Buffer, chain: ChainName) {
    super(new Uint8Array()); // Dummy value
    this.chain = chain;
    return new (NativeAddressFactory.get(chain))(address, chain);
  }

  public toUniversalAddress(): UniversalAddress {
    return new UniversalAddress(this.address);
  }

  public static isValidAddress(address: string, chain: ChainName): boolean {
    return NativeAddressFactory.get(chain).isValidAddress(address, chain);
  }

  public static fromUniversalAddress(
    address: Uint8Array,
    chain: ChainName
  ): NativeAddress {
    return NativeAddressFactory.get(chain).fromUniversalAddress(address, chain);
  }
}
