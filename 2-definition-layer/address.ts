//TODO maybe we want to keep Address implementations free from any platform dependencies
//     in which case toNative should not exist and their implementations should be moved to
//     the definition layer

declare class UniversalAddress {};

export interface Address {
  get(): any; //(Uint8Array for UniversalAddress, string for EVM(ethers), PublicKey for Solana, etc.)
  toString(): string;
  toUint8Array(): Uint8Array;
  toUniversalAddress(): UniversalAddress;
  //static isValidAddress(str: string): boolean;

  //other ideas:
  //zeroAddress
  //verify(message: Uint8Array, signature: Uint8Array): boolean;
  //static byteSize(): number;
}