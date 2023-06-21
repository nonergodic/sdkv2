import { CHAIN_ID_SOLANA } from "@certusone/wormhole-sdk/lib/cjs/utils/consts";
import { PublicKey } from "@solana/web3.js";
import { NativeAddress } from "../generic/address/NativeAddress";

export class SolanaAddress extends NativeAddress {
  constructor(address: string | Uint8Array | Buffer) {
    super(address, CHAIN_ID_SOLANA);
    this.address = new PublicKey(address).toBase58(); // 32 byte base58 string
  }

  public toBuffer(): Buffer {
    return new PublicKey(this.address).toBuffer();
  }

  public static fromUniversalAddress(address: string): SolanaAddress {
    return new SolanaAddress(address);
  }
}
