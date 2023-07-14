import { reverseMapping } from "../utils/mapping";

//we are not including Unset here because from the PoV of the SDK, it's not a chainId like the
//  others because it has no other types associated with it (such as a platform). Including this
//  null value would make all the other mappings a lot more messy, or would force us to introduce
//  two types of each mapping (one with Unset and one without).
export const ChainToChainIdMapping = {
  //Unset: 0
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

export const ChainIdToChainMapping = reverseMapping(ChainToChainIdMapping);

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

export const isChainId = (chainId: number): chainId is ChainId =>
  chainId in ChainIdToChainMapping;