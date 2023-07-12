import {
  Platform,
  hexByteStringToUint8Array,
  uint8ArrayToHexByteString,
  isHexByteString
} from "wormhole-base";

import { Address } from "./address";

declare global { namespace Wormhole {
  interface PlatformToNativeAddressMapping {}
}}

type MappedPlatforms = keyof Wormhole.PlatformToNativeAddressMapping & Platform;
type NativeAddressType<T extends MappedPlatforms> =
  Wormhole.PlatformToNativeAddressMapping[T];

type NativeAddressCtr = new (wa: UniversalAddress) => Address;

export class UniversalAddress implements Address {
  private static nativeFactory: Map<Platform, NativeAddressCtr> = new Map();
  
  static readonly byteSize = 32;

  private readonly address: Uint8Array;

  constructor(address: string | Uint8Array) {
    if (typeof address === "string") {
      if (!UniversalAddress.isValidAddress(address))
        throw new Error(
          `Invalid Wormhole address, expected ${UniversalAddress.byteSize}-byte ` +
          `hex string but got ${address}`
        );

      this.address = hexByteStringToUint8Array(address);
    }
    else {
      this.address = address;
    }
  }

  toNative<T extends MappedPlatforms>(platform: T): NativeAddressType<T> {
    const nativeCtr = UniversalAddress.nativeFactory.get(platform);
    if (!nativeCtr)
      throw new Error(`No native address type registered for platform ${platform}`);
    return (new nativeCtr(this)) as NativeAddressType<T>;
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

  toUniversalAddress(): UniversalAddress {
    return this;
  }
  
  static isValidAddress(address: string): boolean {
    return isHexByteString(address, UniversalAddress.byteSize);
  }

  //TODO we probably also want to include chain -> AddressType in the mapping
  static registerNative<T extends MappedPlatforms>(
    platform: T,
    ctr: NativeAddressCtr
  ): void {
    if (UniversalAddress.nativeFactory.has(platform))
      throw new Error(`Native address type for platform ${platform} has already registered`);

    UniversalAddress.nativeFactory.set(platform, ctr);
  }
}
