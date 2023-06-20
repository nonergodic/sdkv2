import { reverseMapping } from "../utils";

const ChainToChainIdMapping = {
  //TODO I'm not convinced it's a good idea to have Unset in here ('off' is not a TV channel either)
  Unset: 0,
  Solana: 1,
  Ethereum: 2,
  Terra: 3,
  Bsc: 4,
  Polygon: 5,
  Avalanche: 6,
  Oasis: 7,
  Algorand: 8,
  Aurora: 9,
  Fantom: 10,
  Karura: 11,
  Acala: 12,
  Klaytn: 13,
  Celo: 14,
  Near: 15,
  Moonbeam: 16,
  Neon: 17,
  Terra2: 18,
  Injective: 19,
  Osmosis: 20,
  Sui: 21,
  Aptos: 22,
  Arbitrum: 23,
  Optimism: 24,
  Gnosis: 25,
  Pythnet: 26,
  Xpla: 28,
  Btc: 29,
  Base: 30,
  Sei: 32,
  Wormchain: 3104,
  //TODO holy cow, how ugly of a hack is that?! - a chainId that's exclusive to a testnet!
  Sepolia: 10002,
} as const;

const ChainIdToChainMapping = reverseMapping(ChainToChainIdMapping);

export type ChainToChainId = typeof ChainToChainIdMapping;
export type ChainIdToChain = typeof ChainIdToChainMapping;

export type Chain = keyof typeof ChainToChainIdMapping;
export type ChainId = keyof typeof ChainIdToChainMapping;
export const chains = Object.keys(ChainToChainIdMapping) as Chain[];
export const chainIds = Object.values(ChainToChainIdMapping);

export const isChain = (chain: string): chain is Chain =>
  chain in ChainToChainIdMapping;

export const toChainId = (chain: Chain): ChainId =>
  ChainToChainIdMapping[chain];
