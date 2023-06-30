//TODO maybe we want to keep Address implementations free from any ecosystem dependencies
//     in which case toNative should not exist and their implementations should be moved to
//     the definition layer

declare class WormholeAddress {};

export interface Address {
  get(): any; //(Uint8Array for WormholeAddress, string for EVM(ethers), PublicKey for Solana, etc.)
  toString(): string;
  toUint8Array(): Uint8Array;
  toWormholeAddress(): WormholeAddress;
  //static isValidAddress(str: string): boolean;

  //other ideas:
  //zeroAddress
  //verify(message: Uint8Array, signature: Uint8Array): boolean;
  //static byteSize(): number;
}