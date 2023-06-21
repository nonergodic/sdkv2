import {
  CHAIN_ID_SOLANA,
  ChainId,
  ChainName,
  coalesceChainId,
  isEVMChain,
} from "@certusone/wormhole-sdk/lib/esm/utils/consts";
import { EvmAddress } from "../../evm/EvmAddress";
import { SolanaAddress } from "../../solana/SolanaAddress";
import { NativeAddress } from "./NativeAddress";

export class NativeAddressFactory {
  static get = (chain: ChainId | ChainName): typeof NativeAddress => {
    const chainId = coalesceChainId(chain);
    if (chainId === CHAIN_ID_SOLANA) {
      return SolanaAddress;
    } else if (isEVMChain(chainId)) {
      return EvmAddress;
    }

    throw new Error("Unsupported chain");
  };
}
