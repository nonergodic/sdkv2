//TODO alternative names:
// ChainType, ChainFamily, or just Family?

import { Chain } from "./chains";
import { reverseArrayMapping } from "../utils/mapping";

export const PlatformToChainsMapping = {
  Evm: [
    "Ethereum", "Bsc", "Polygon", "Avalanche", "Oasis", "Aurora", "Fantom", "Karura", "Acala",
    "Klaytn", "Celo", "Moonbeam", "Neon", "Arbitrum", "Optimism" , "Gnosis", "Base", "Sepolia",
  ] satisfies readonly Chain[],
  Solana: ["Solana", "Pythnet"] satisfies readonly Chain[],
  Cosmwasm: ["Terra", "Terra2", "Injective", "Xpla", "Sei"] satisfies readonly Chain[],
  Btc: ["Btc"] satisfies readonly Chain[],
  //TODO don't know if any of the following chains actually share a platform with any other chain
  Algorand: ["Algorand"] satisfies readonly Chain[],
  Sui: ["Sui"] satisfies readonly Chain[],
  Aptos: ["Aptos"] satisfies readonly Chain[],
  Osmosis: ["Osmosis"] satisfies readonly Chain[],
  Wormchain: ["Wormchain"] satisfies readonly Chain[],
  Near: ["Near"] satisfies readonly Chain[],
} as const;

export const ChainToPlatformMapping = reverseArrayMapping(PlatformToChainsMapping);

export type Platform = keyof typeof PlatformToChainsMapping;

export type ToPlatform<C extends Chain> = typeof ChainToPlatformMapping[C];

export const toPlatform = (chain: Chain) =>
  ChainToPlatformMapping[chain];

export const inPlatform = (chain: Chain, platform: Platform): boolean =>
  (PlatformToChainsMapping[platform] as readonly Chain[]).includes(chain);

//TODO platform specific functions, e.g.:
//  evm chain id <-> (Chain, Network)
//  Solana genesis block <-> (Chain, Network)
//  similar mappings for other platforms
// see: https://book.wormhole.com/reference/contracts.html

// Solana genesis blocks:
//   devnet: EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG (i.e. testnet for us)
//   testnet: 4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY << not used!
//   mainnet-beta: 5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d
