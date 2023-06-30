import { Chain } from "./chains";
import { reverseArrayMapping } from "../utils";

export const EcosystemToChainsMapping = {
  Evm: [
    "Ethereum", "Bsc", "Polygon", "Avalanche", "Oasis", "Aurora", "Fantom", "Karura", "Acala",
    "Klaytn", "Celo", "Moonbeam", "Neon", "Arbitrum", "Optimism" , "Gnosis", "Base", "Sepolia",
  ],
  Solana: ["Solana", "Pythnet"],
  Cosmwasm: ["Terra", "Terra2", "Injective", "Xpla", "Sei"],
} as const satisfies Record<string, readonly Chain[]>;

const ChainsToEcosystemMapping = reverseArrayMapping(EcosystemToChainsMapping);

export type Ecosystem = keyof typeof EcosystemToChainsMapping;

export const inEcosystem = (chain: Chain, ecosystem: Ecosystem): boolean =>
  (EcosystemToChainsMapping[ecosystem] as readonly Chain[]).includes(chain);

export const toEcosystem = (chain: Chain): Ecosystem | undefined =>
  ChainsToEcosystemMapping[chain as keyof typeof ChainsToEcosystemMapping];


//TODO environment specific functions, e.g.:
//  evm chain id -> (Chain, Network)
//  Solana genesis block -> (Chain, Network)
//  similar mappings for other groupings
// see: https://book.wormhole.com/reference/contracts.html

// Solana genesis blocks:
//   devnet: EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG
//   testnet: 4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY << not used!
//   mainnet-beta: 5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d
