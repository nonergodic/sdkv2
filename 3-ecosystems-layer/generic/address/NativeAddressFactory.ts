import {
  ChainName,
  isEVMChain,
} from "@certusone/wormhole-sdk/lib/esm/utils/consts";
import { EvmAddress } from "../../evm/EvmAddress";
import { SolanaAddress } from "../../solana/SolanaAddress";
import { NativeAddress } from "./NativeAddress";

export class NativeAddressFactory {
  static get(chain: ChainName): typeof NativeAddress {
    if (chain === "solana") {
      return SolanaAddress;
    } else if (isEVMChain(chain)) {
      return EvmAddress;
    }

    throw new Error("Unsupported chain");
  }
}
