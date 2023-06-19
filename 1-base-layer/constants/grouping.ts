//TODO not convinced that "Grouping" is a good name (sounds too generic) - considered Ecosystems,
//     but that seems to refer more to everything that exists within a single chain, rather
//     than a collection of similar chains

import { Chain, ChainId, chains, toChainId } from "./chains";
import { Network } from "./networks";

//TODO not convinced that these are the groupings we want (is terra a valid grouping? are we missing
//     other sensible groupings?)
export const Groupings: Record<string, readonly Chain[]> = {
  //TODO if we include unset in the list of chains, we probably want to offer a convenience grouping
  // that excludes it here? (though not sure whether "valid" is a great name for that...)
  Valid: chains.filter((chain: Chain) => chain !== "Unset"),
  Evm: [
    "Ethereum", "Bsc", "Polygon", "Avalanche", "Oasis", "Aurora", "Fantom", "Karura", "Acala",
    "Klaytn", "Celo", "Moonbeam", "Neon", "Arbitrum", "Optimism" , "Gnosis", "Base", "Sepolia",
  ],
  Solana: ["Solana", "Pythnet"],
  Terra: ["Terra", "Terra2"],
  Cosmwasm: ["Terra", "Terra2", "Injective", "Xpla", "Sei"],
} as const;

export type Grouping <T extends keyof typeof Groupings> = typeof Groupings[T];

export const inGrouping = <T extends keyof typeof Groupings>(chain: Chain, grouping: T): boolean =>
  (Groupings[grouping] as Chain[]).includes(chain);

export const groupingChainIds = <T extends keyof typeof Groupings>(grouping: T): ChainId[] =>
  Groupings[grouping].map(toChainId);

//TODO grouping specific functions, e.g.:
//  evm chain id -> (Chain, Network)
//  Solana genesis block -> (Chain, Network)
//  similar mappings for other groupings