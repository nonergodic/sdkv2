import { Grouping } from "../1-base-layer/constants/grouping";
import { Address } from "./address";
import { hexStringToUint8Array, uint8ArrayToHexString } from "../1-base-layer/utils";

//TODO this should be moved to constants layer
type Ecosystem = Extract<Grouping, "Evm" | "Solana" | "Cosmwasm">;

declare global {
  interface EcosystemToNativeAddressMapping {}
}

type NativeAddressCtr = new (wa: WormholeAddress) => any;

export class WormholeAddress implements Address {
  static nativeFactory: Map<Ecosystem, NativeAddressCtr> = new Map();
  static byteSize = 32;

  private readonly address: Uint8Array;

  constructor(address: string | Uint8Array) {
    if (typeof address === "string") {
      if (!WormholeAddress.isValidAddress(address))
        throw new Error(
          `Invalid Wormhole address, expected ${WormholeAddress.byteSize}-byte hex string but got ${address}`
        );

      this.address = hexStringToUint8Array(address);
    }
    else {
      this.address = address;
    }
  }

  toNative<T extends keyof EcosystemToNativeAddressMapping & Ecosystem>(
    ecosystem: T
  ): EcosystemToNativeAddressMapping[T] {
    const nativeCtr = WormholeAddress.nativeFactory.get(ecosystem);
    if (!nativeCtr)
      throw new Error(`No native address type registered for ecosystem ${ecosystem}`);
    return (new nativeCtr(this)) as EcosystemToNativeAddressMapping[T];
  }

  toString(): string {
    return uint8ArrayToHexString(this.address);
  }

  toUint8Array(): Uint8Array {
    return this.address;
  }
  
  static isValidAddress(address: string): boolean {
    return /^(?:0x)?[a-fA-F0-9]{2*WormholeAddress.byteSize}$/.test(address); // 32 byte hex string
  }

  //TODO we probably also want to include chain -> AddressType in the mapping
  static registerNative<E extends keyof EcosystemToNativeAddressMapping & Ecosystem>(
    ecosystem: E,
    ctr: NativeAddressCtr
  ): void {
    if (WormholeAddress.nativeFactory.has(ecosystem))
      throw new Error(`Native address type for ecosystem ${ecosystem} has already registered`);

    WormholeAddress.nativeFactory.set(ecosystem, ctr);
  }
}
