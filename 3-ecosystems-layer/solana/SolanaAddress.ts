import { PublicKey } from "@solana/web3.js";
import { NativeAddress } from "../generic/address/NativeAddress";

export class SolanaAddress extends NativeAddress {
  constructor(address: string | Uint8Array | Buffer) {
    if (typeof address === "string") {
      if (!SolanaAddress.isValidAddress(address)) {
        throw new Error(
          `Invalid Solana address, expected 32-byte base58 string but got ${address}`
        );
      }
    }

    address = new PublicKey(address).toBuffer();
    super(address, "solana");
  }

  public toBuffer(): Buffer {
    return new PublicKey(this.address).toBuffer();
  }

  public static isValidAddress(address: string): boolean {
    return /^[1-9A-HJ-NP-Za-km-z]{44}$/.test(address); // 32 byte base58 string
  }

  public static fromUniversalAddress(address: Uint8Array): SolanaAddress {
    return new SolanaAddress(address);
  }
}
