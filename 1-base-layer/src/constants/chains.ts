import { unzip, toMapping } from "../utils/mapping";

//Typescript being the absolute mess that it is has no way to turn the keys of an object that is
//  declared `as const` into an `as const` array (see:
//  https://github.com/microsoft/TypeScript/issues/31652), however the other way around works fine,
//  hence we're defining the mapping via its entry representation and deriving it from taht
const chainsAndChainIdEntries = [
  //Unlike the old sdk, we are not including an "Unset" chain with chainId 0 here because:
  //  * no other types would be associated with it (such as contracts or a platform)
  //  * avoids awkward "chain but not 'Unset'" checks
  //  * "off" is not a TV channel either
  //Instead we'll use `null` for chain and 0 as the chainId where appropriate (e.g. governance VAAs)
  ["Solana", 1],
  ["Ethereum", 2],
  ["Terra", 3],
  ["Bsc", 4],
  ["Polygon", 5],
  ["Avalanche", 6],
  ["Oasis", 7],
  ["Algorand", 8],
  ["Aurora", 9],
  ["Fantom", 10],
  ["Karura", 11],
  ["Acala", 12],
  ["Klaytn", 13],
  ["Celo", 14],
  ["Near", 15],
  ["Moonbeam", 16],
  ["Neon", 17],
  ["Terra2", 18],
  ["Injective", 19],
  ["Osmosis", 20],
  ["Sui", 21],
  ["Aptos", 22],
  ["Arbitrum", 23],
  ["Optimism", 24],
  ["Gnosis", 25],
  ["Pythnet", 26],
  ["Xpla", 28],
  ["Btc", 29],
  ["Base", 30],
  ["Sei", 32],
  ["Wormchain", 3104],
  //TODO holy cow, how ugly of a hack is that?! - a chainId that's exclusive to a testnet!
  ["Sepolia", 10002],
 ] as const;

export const [chains, chainIds] = unzip(chainsAndChainIdEntries);
export type Chain = typeof chains[number];
export type ChainId = typeof chainIds[number];

export const chainToChainIdMapping = toMapping(chainsAndChainIdEntries);
export const chainIdToChainMapping = toMapping(chainsAndChainIdEntries, 1, 0);

export const isChain = (chain: string): chain is Chain =>
  chain in chainToChainIdMapping;

export const isChainId = (chainId: number): chainId is ChainId =>
  chainId in chainIdToChainMapping;