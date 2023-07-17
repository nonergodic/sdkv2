import { reverseMapping } from "../utils/mapping";

//we are not including Unset here because from the PoV of the SDK, it's not a chainId like the
//  others because it has no other types associated with it (such as a platform). Including this
//  null value would make all the other mappings a lot more messy, or would force us to introduce
//  two types of each mapping (one with Unset and one without).
export const chainToChainIdMapping = {
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

export const chainIdToChainMapping = reverseMapping(chainToChainIdMapping);

export type ChainToChainId = typeof chainToChainIdMapping;
export type ChainIdToChain = typeof chainIdToChainMapping;

export type Chain = keyof typeof chainToChainIdMapping;
export type ChainId = keyof typeof chainIdToChainMapping;
export const chains = Object.keys(chainToChainIdMapping) as Chain[];
export const chainIds = Object.values(chainToChainIdMapping);

export const isChain = (chain: string): chain is Chain =>
  chain in chainToChainIdMapping;

export const isChainId = (chainId: number): chainId is ChainId =>
  chainId in chainIdToChainMapping;