import { Address } from "../../2-definition-layer/address";
import { WormholeAddress } from "../../2-definition-layer/wormholeAddress";

import { ethers } from "ethers";

declare global {
  interface EcosystemToNativeAddressMapping {
    Evm: EvmAddress;
  }
}

export class EvmAddress implements Address {
  static readonly byteSize = 20;
  
  private readonly address: string;

  constructor(address: string | Uint8Array | WormholeAddress) {
    if (typeof address === "string") {
      if (!EvmAddress.isValidAddress(address))
        throw new Error(`Invalid EVM address, expected ${EvmAddress.byteSize}-byte hex string but got ${address}`);
      
      this.address = ethers.utils.getAddress(address);
    }
    else if (address instanceof Uint8Array) {
      if (address.length !== EvmAddress.byteSize)
        throw new Error(`Invalid EVM address, expected ${EvmAddress.byteSize} bytes but got ${address.length}`);
      
      this.address = ethers.utils.getAddress(ethers.utils.hexlify(address));
    }
    else if (address instanceof WormholeAddress) {
      this.address = ethers.utils.getAddress(address.toString());
    }
    else
      throw new Error(`Invalid EVM address ${address}`);
  }

  toNative(): string {
    return this.address;
  }

  toString(): string {
    return this.address;
  }

  toUint8Array(): Uint8Array {
    return ethers.utils.arrayify(this.address);
  }

  static isValidAddress(address: string): boolean {
    return ethers.utils.isAddress(address);
  }
}

WormholeAddress.registerNative("Evm", EvmAddress);
