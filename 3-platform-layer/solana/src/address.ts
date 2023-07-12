import { isHexByteString, hexByteStringToUint8Array } from "../../wormhole-base/utils/hexstring";
import { Address } from "../../../2-definition-layer/address";
import { UniversalAddress } from "../../../2-definition-layer/universalAddress";

import { PublicKey, PublicKeyInitData } from "@solana/web3.js";

declare global { namespace Wormhole {
  interface PlatformToNativeAddressMapping {
    Solana: SolanaAddress;
  }
}}

export class SolanaAddress implements Address {
  static readonly byteSize = 32;

  private readonly address: PublicKey;

  constructor(address: PublicKeyInitData | UniversalAddress) {
    if (address instanceof UniversalAddress)
      this.address = new PublicKey(address.toUint8Array());
    if (typeof address === "string" && isHexByteString(address))
      this.address = new PublicKey(hexByteStringToUint8Array(address));
    else
      this.address = new PublicKey(address);
  }

  get(): PublicKey {
    return this.address;
  }

  toString(): string {
    return this.address.toBase58();
  }

  toUint8Array(): Uint8Array {
    return this.address.toBytes();
  }

  toUniversalAddress(): UniversalAddress {
    return new UniversalAddress(this.address.toBytes());
  }

  isValidAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    }
    catch (e) {
      return false;
    }
  }
}

UniversalAddress.registerNative("Solana", SolanaAddress);