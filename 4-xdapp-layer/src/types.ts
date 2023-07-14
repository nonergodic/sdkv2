import { BigNumber, ContractReceipt } from 'ethers';
import { TransactionResponse } from '@solana/web3.js';
import { SuiTransactionBlockResponse } from '@mysten/sui.js';
import { IndexedTx } from '@cosmjs/stargate';
import { Types } from 'aptos';
import { ParsedVaa, SignedVaa } from 'vaa';
// import { Wormhole } from './wormhole';
import { MainnetChainId, MainnetChainName } from './config/MAINNET';
import { TestnetChainId, TestnetChainName } from './config/TESTNET';
import { AptosContext, AptosContracts } from './contexts/aptos';
import { EthContext, EthContracts } from './contexts/eth';
import { SolanaContext, SolContracts } from './contexts/solana';
import { SuiContext, SuiContracts } from './contexts/sui';
import { SeiContext, SeiContracts } from './contexts/sei';

export enum Network {
  MAINNET = 'mainnet',
  TESTNET = 'testnet',
  DEVNET = 'devnet',
}
export const NATIVE = 'native';
// TODO: conditionally set these types
export type ChainName = MainnetChainName | TestnetChainName;
export type ChainId = MainnetChainId | TestnetChainId;
export enum Context {
  ETH = 'Ethereum',
  TERRA = 'Terra',
  INJECTIVE = 'Injective',
  XPLA = 'XPLA',
  SOLANA = 'Solana',
  ALGORAND = 'Algorand',
  NEAR = 'Near',
  APTOS = 'Aptos',
  SUI = 'Sui',
  SEI = 'Sei',
  OTHER = 'OTHER',
}

export type ChainResourceMap = {
  [chain in ChainName]?: string;
};

export type Contracts = {
  core?: string;
  token_bridge?: string;
  nft_bridge?: string;
  relayer?: string;
  suiOriginalTokenBridgePackageId?: string;
  suiRelayerPackageId?: string;
  seiTokenTranslator?: string;
};

export type ChainConfig = {
  key: ChainName;
  id: ChainId;
  context: Context;
  contracts: Contracts;
  finalityThreshold: number;
  nativeTokenDecimals: number;
};

export type WormholeConfig = {
  network: Network;
  rpcs: ChainResourceMap;
  rest: ChainResourceMap;
  chains: {
    [chain in ChainName]?: ChainConfig;
  };
};

export type Address = string;

export type TokenId = {
  chain: ChainName;
  address: string;
};

export type AnyContext =
  | EthContext
  | SolanaContext
  | SuiContext
  | AptosContext
  | SeiContext;

export type AnyContracts =
  | EthContracts
  | SolContracts
  | SuiContracts
  | AptosContracts
  | SeiContracts;

export interface ParsedMessage {
  sendTx: string;
  sender: string;
  amount: BigNumber;
  payloadID: number;
  recipient: string;
  toChain: ChainName;
  fromChain: ChainName;
  tokenAddress: string;
  tokenChain: ChainName;
  tokenId: TokenId;
  sequence: BigNumber;
  emitterAddress: string;
  block: number;
  gasFee?: BigNumber;
  payload?: string;
}

export interface ParsedRelayerPayload {
  relayerPayloadId: number;
  to: string;
  relayerFee: BigNumber;
  toNativeTokenAmount: BigNumber;
}

export type ParsedRelayerMessage = ParsedMessage & ParsedRelayerPayload;

export type AnyMessage = ParsedMessage | ParsedRelayerMessage;

export type TokenDetails = {
  symbol: string;
  decimals: number;
};

export interface WormholeWrappedInfo {
  isWrapped: boolean;
  chainId: ChainId;
  assetAddress: Uint8Array;
}

export type SendResult = Awaited<ReturnType<AnyContext['startTransfer']>>;
export type RedeemResult = Awaited<ReturnType<AnyContext['completeTransfer']>>;

export type VaaSourceTransaction =
  | ContractReceipt
  | Types.UserTransaction
  | TransactionResponse
  | SuiTransactionBlockResponse
  | IndexedTx;
export interface VaaInfo<T extends VaaSourceTransaction = any> {
  transaction: T;
  rawVaa: SignedVaa;
  vaa: ParsedVaa;
}
