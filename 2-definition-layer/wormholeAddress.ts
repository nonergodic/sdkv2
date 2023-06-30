import { Ecosystem } from "../1-base-layer/constants/ecosystems";
import { Address } from "./address";
import {
  hexByteStringToUint8Array,
  uint8ArrayToHexByteString,
  isHexByteString
} from "../1-base-layer/utils";

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

      this.address = hexByteStringToUint8Array(address);
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

  get(): Uint8Array {
    return this.address;
  }

  toString(): string {
    return uint8ArrayToHexByteString(this.address);
  }

  toUint8Array(): Uint8Array {
    return this.address;
  }

  toWormholeAddress(): WormholeAddress {
    return this;
  }
  
  static isValidAddress(address: string): boolean {
    return isHexByteString(address, WormholeAddress.byteSize);
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
