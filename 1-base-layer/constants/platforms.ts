//TODO alternative names:
// ChainType, ChainFamily, or just Family?

import { Chain } from "./chains";
import { reverseArrayMapping } from "../utils/mapping";

export const PlatformToChainsMapping = {
  Evm: [
    "Ethereum", "Bsc", "Polygon", "Avalanche", "Oasis", "Aurora", "Fantom", "Karura", "Acala",
    "Klaytn", "Celo", "Moonbeam", "Neon", "Arbitrum", "Optimism" , "Gnosis", "Base", "Sepolia",
  ],
  Solana: ["Solana", "Pythnet"],
  Cosmwasm: ["Terra", "Terra2", "Injective", "Xpla", "Sei"],
} as const satisfies Record<string, readonly Chain[]>;

export const ChainsToPlatformMapping = reverseArrayMapping(PlatformToChainsMapping);

export type Platform = keyof typeof PlatformToChainsMapping;

export const inPlatform = (chain: Chain, platform: Platform): boolean =>
  (PlatformToChainsMapping[platform] as readonly Chain[]).includes(chain);

export const toPlatform = (chain: Chain & keyof typeof ChainsToPlatformMapping) =>
  ChainsToPlatformMapping[chain];

//TODO platform specific functions, e.g.:
//  evm chain id <-> (Chain, Network)
//  Solana genesis block <-> (Chain, Network)
//  similar mappings for other platforms
// see: https://book.wormhole.com/reference/contracts.html

// Solana genesis blocks:
//   devnet: EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG (i.e. testnet for us)
//   testnet: 4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY << not used!
//   mainnet-beta: 5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d
