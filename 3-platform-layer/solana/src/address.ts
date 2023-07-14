import { isHexByteString, hexByteStringToUint8Array } from "wormhole-base";
import { Address, registerNative, UniversalAddress } from "wormhole-definitions";

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

  unwrap(): PublicKey { return this.address; }
  toString() { return this.address.toBase58(); }
  toUint8Array() { return this.address.toBytes(); }
  toUniversalAddress() { return new UniversalAddress(this.address.toBytes()); }
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

registerNative("Solana", SolanaAddress);
