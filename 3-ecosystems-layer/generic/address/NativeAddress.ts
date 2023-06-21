import {
  ChainId,
  ChainName,
  coalesceChainId,
} from "@certusone/wormhole-sdk/lib/esm/utils/consts";
import { Address } from "./Address";
import { NativeAddressFactory } from "./NativeAddressFactory";
import { UniversalAddress } from "./UniversalAddress";

export class NativeAddress extends Address {
  chainId: ChainId;

  constructor(
    address: string | Uint8Array | Buffer,
    chain: ChainId | ChainName
  ) {
    super(address);
    this.chainId = coalesceChainId(chain);
    return new (NativeAddressFactory.get(chain))(address, chain);
  }

  public toUniversalAddress = (): UniversalAddress => {
    return new UniversalAddress(this.toBuffer());
  };

  public static fromUniversalAddress(address: string): NativeAddress {
    throw new Error("Not implemented");
  }
}
