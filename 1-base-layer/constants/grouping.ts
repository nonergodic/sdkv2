//TODO not convinced that "Grouping" is a good name (sounds too generic) - considered Ecosystems,
//     but that seems to refer more to everything that exists within a single chain, rather
//     than a collection of similar chains

import { Chain, chains } from "./chains";
import { Network } from "./networks";

//TODO not convinced that these are the groupings we want (is terra a valid grouping? are we missing
//     other sensible groupings?)
export const groupings = {
  //TODO if we include unset in the list of chains, we probably want to offer a convenience grouping
  // that excludes it here? (though not sure whether "valid" is a great name for that...)
  Valid: chains.filter((chain: Chain) => chain !== "Unset"),
  Evm: [
    "Ethereum", "Bsc", "Polygon", "Avalanche", "Oasis", "Aurora", "Fantom", "Karura", "Acala",
    "Klaytn", "Celo", "Moonbeam", "Neon", "Arbitrum", "Optimism" , "Gnosis", "Base", "Sepolia",
  ] as Chain[],
  Solana: ["Solana", "Pythnet"] as Chain[],
  Terra: ["Terra", "Terra2"] as Chain[],
  Cosmwasm: ["Terra", "Terra2", "Injective", "Xpla", "Sei"] as Chain[],
} as const;

export type Grouping = keyof typeof groupings;

export const inGrouping = (chain: Chain, grouping: Grouping): boolean =>
  (groupings[grouping]).includes(chain);


//TODO grouping specific functions, e.g.:
//  evm chain id -> (Chain, Network)
//  Solana genesis block -> (Chain, Network)
//  similar mappings for other groupings
// see: https://book.wormhole.com/reference/contracts.html

// Solana genesis blocks:
//   devnet: EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG
//   testnet: 4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY << not used!
//   mainnet-beta: 5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d
