//TODO maybe we want to keep Address implementations free from any ecosystem dependencies
//     in which case toNative should not exist and their implementations should be moved to
//     the definition layer
export interface Address {
  toNative(): any; //(string for Wormhole/EVM, PublicKey for Solana, etc.)
  toString(): string;
  toUint8Array(): Uint8Array;
  //static isValidAddress(str: string): boolean;

  //other ideas:
  //zeroAddress
  //verify(message: Uint8Array, signature: Uint8Array): boolean;
  //static byteSize(): number;
}