import { Address } from "../../2-definition-layer/address";
import { WormholeAddress } from "../../2-definition-layer/wormholeAddress";

import { PublicKey, PublicKeyInitData } from "@solana/web3.js";

declare global {
  interface EcosystemToNativeAddressMapping {
    Solana: SolanaAddress;
  }
}

export class SolanaAddress implements Address {
  static readonly byteSize = 32;

  private readonly address: PublicKey;

  constructor(address: PublicKeyInitData | WormholeAddress) {
    if (address instanceof WormholeAddress) {
      this.address = new PublicKey(address.toUint8Array());
    }
    if (typeof address === "string") {
      //TODO check if PublicKey always expects base58 encoding or whether it also accepts hex strings
      //     if hex is fine too, just delete this branch
      this.address = new PublicKey(address);
    }
    else
      this.address = new PublicKey(address);
  }

  toNative(): PublicKey {
    return this.address;
  }

  toString(): string {
    return this.address.toBase58();
  }

  toUint8Array(): Uint8Array {
    return this.address.toBytes();
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

WormholeAddress.registerNative("Solana", SolanaAddress);