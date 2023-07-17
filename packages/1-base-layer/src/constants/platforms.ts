//TODO alternative names:
// ChainType, ChainFamily, or just Family?

import { Chain } from "./chains";
import { reverseArrayMapping } from "../utils/mapping";

export const platformToChainsMapping = {
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

export const ChainToPlatformMapping = reverseArrayMapping(platformToChainsMapping);

export type Platform = keyof typeof platformToChainsMapping;

export type ToPlatform<C extends Chain> = typeof ChainToPlatformMapping[C];

export const toPlatform = (chain: Chain) =>
  ChainToPlatformMapping[chain];

export const inPlatform = (chain: Chain, platform: Platform): boolean =>
  (platformToChainsMapping[platform] as readonly Chain[]).includes(chain);

//TODO platform specific functions, e.g.:
//  evm chain id <-> (Chain, Network)
//  Solana genesis block <-> (Chain, Network)
//  similar mappings for other platforms
// see: https://book.wormhole.com/reference/contracts.html

// Solana genesis blocks:
//   devnet: EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG (i.e. testnet for us)
//   testnet: 4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY << not used!
//   mainnet-beta: 5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d


//from here: https://github.com/wormhole-foundation/wormhole/blob/96c6cc2b325addc2125bb438b228921a4be6b7f3/ethereum/contracts/Implementation.sol#L39
// if (evmChainId() == 0) {
//   uint256 evmChainId;
//   uint16 chain = chainId();

//   // Wormhole chain ids explicitly enumerated
//   if        (chain == 2)  { evmChainId = 1;          // ethereum
//   } else if (chain == 4)  { evmChainId = 56;         // bsc
//   } else if (chain == 5)  { evmChainId = 137;        // polygon
//   } else if (chain == 6)  { evmChainId = 43114;      // avalanche
//   } else if (chain == 7)  { evmChainId = 42262;      // oasis
//   } else if (chain == 9)  { evmChainId = 1313161554; // aurora
//   } else if (chain == 10) { evmChainId = 250;        // fantom
//   } else if (chain == 11) { evmChainId = 686;        // karura
//   } else if (chain == 12) { evmChainId = 787;        // acala
//   } else if (chain == 13) { evmChainId = 8217;       // klaytn
//   } else if (chain == 14) { evmChainId = 42220;      // celo
//   } else if (chain == 16) { evmChainId = 1284;       // moonbeam
//   } else if (chain == 17) { evmChainId = 245022934;  // neon
//   } else if (chain == 23) { evmChainId = 42161;      // arbitrum
//   } else if (chain == 24) { evmChainId = 10;         // optimism
//   } else if (chain == 25) { evmChainId = 100;        // gnosis
//   } else {
//       revert("Unknown chain id.");
//   }

//   setEvmChainId(evmChainId);
// }
