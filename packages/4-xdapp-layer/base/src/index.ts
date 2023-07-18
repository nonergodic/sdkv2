import TESTNET_CONFIG from './config/TESTNET';
import MAINNET_CONFIG from './config/MAINNET';
import * as SolanaWormhole from './anchor-idl/wormhole.json';
import * as SolanaTokenBridge from './anchor-idl/token_bridge.json';
import * as SolanaNftBridge from './anchor-idl/nft_bridge.json';

export type {
  TestnetChainId,
  TestnetChainName,
  ChainContracts as TestnetChainContracts,
  TESTNET_CHAINS,
} from './config/TESTNET';

export * from './types';
export * from './vaa';
export * from './config/MAINNET';
export * from './explorer';
export * from './utils';
export const CONFIG = {
  MAINNET: MAINNET_CONFIG,
  TESTNET: TESTNET_CONFIG,
};

export { RelayerAbstract } from './abstracts/relayer';
export { ContractsAbstract } from './abstracts/contracts';
export { TokenBridgeAbstract } from './abstracts/tokenBridge';
export * from './abis/TokenBridgeRelayer';
export * from './abis/TokenBridgeRelayer__factory';
export const SolanaContracts = {
  Wormhole: SolanaWormhole,
  TokenBridge: SolanaTokenBridge,
  NftBridge: SolanaNftBridge,
};
