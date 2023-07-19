import {
  Chain,
  isModule,
  Module,
  CustomConversion,
} from "wormhole-base";

import { conversions } from "./vaa";

//a word on the chainId for RecoverChainId:
//The implementation of the contracts accept an arbitrary number when recovering chain ids however
//  I don't think you ever want to set the wormhole chain id of a contract (even on a fork) to 0
//  since this would mean that afterwards all the checks that use `vaa.chainId == this.chainId` in
//  the contract would suddenly accept "broadcast VAAs" which is almost certainly not what's
//  intended.
const actions = {
  //see here: https://github.com/wormhole-foundation/wormhole/blob/96c6cc2b325addc2125bb438b228921a4be6b7f3/ethereum/contracts/GovernanceStructs.sol#L64
  Core: {
    1: { name: "UpgradeContract",    allowUnset: false },
    2: { name: "GuardianSetUpgrade", allowUnset: true  },
    3: { name: "SetMessageFee",      allowUnset: false },
    4: { name: "TransferFees",       allowUnset: true  },
    5: { name: "RecoverChainId",     allowUnset: false },
  },
  //see here: https://github.com/wormhole-foundation/wormhole/blob/96c6cc2b325addc2125bb438b228921a4be6b7f3/ethereum/contracts/bridge/BridgeGovernance.sol#L115
  TokenBridge: {
    1: { name: "RegisterChain",   allowUnset: true  },
    2: { name: "UpgradeContract", allowUnset: false },
    3: { name: "RecoverChainId",  allowUnset: false },
  },
  //see here: https://github.com/wormhole-foundation/wormhole/blob/96c6cc2b325addc2125bb438b228921a4be6b7f3/ethereum/contracts/nft/NFTBridgeGovernance.sol#L112
  NFTBridge: {
    1: { name: "RegisterChain",   allowUnset: true  },
    2: { name: "UpgradeContract", allowUnset: false },
    3: { name: "RecoverChainId",  allowUnset: false },
  },
  //see here: https://github.com/wormhole-foundation/wormhole/blob/96c6cc2b325addc2125bb438b228921a4be6b7f3/ethereum/contracts/relayer/wormholeRelayer/WormholeRelayerGovernance.sol#L60
  WormholeRelayer: {
    1: { name: "RegisterChain",         allowUnset: true  },
    2: { name: "UpgradeContract",       allowUnset: false },
    3: { name: "UpdateDefaultProvider", allowUnset: false },
  },
} as const;

const moduleBytesSize = 32;

const moduleConversion = {
  to: (bytes: Uint8Array): Module => {
    //bytes.lastIndexOf(0) + 1 will also work nicely if there's no null byte in the string
    const module = String.fromCharCode(...bytes.subarray(bytes.lastIndexOf(0) + 1));
    if (!isModule(module))
      throw new Error(`Expected ascii encoded module name but got ${bytes} = ${module} instead`);
    
    return module;
  },
  from: (module: Module): Uint8Array => {
    const bytes = new Uint8Array(moduleBytesSize);
    for (let i = 0; i < module.length; ++i)
      bytes[moduleBytesSize - i] = module.charCodeAt(module.length - i);
    
    return bytes;
  } 
} as const satisfies CustomConversion<Uint8Array, Module>;

type ActionNum<M extends Module> = keyof typeof actions[M];
const isActionNum = (module: Module, actionNum: number): actionNum is ActionNum<typeof module> =>
  actionNum in actions[module];

type ActionName<M extends Module> =
  typeof actions[M][ActionNum<M>] extends { name: infer S } ? S : never;

const actionConversion = <const M extends Module>(module: M) => ({
  to: (actionNum: number) => {
    if (!isActionNum(module, actionNum))
      throw new Error(`Invalid action ${actionNum} for module ${module}`);
    
    return actions[module][actionNum].name as ActionName<M>;
  },
  from: (actionStr: ActionName<M>) => {
    const acts = actions[module];
    const action = Object.keys(acts).find(actionNum =>
      acts[actionNum as keyof typeof acts] === actionStr
    );
    if (!action)
      throw new Error(`Invalid action ${String(actionStr)} for module ${module}`);
    
    return parseInt(action);
  }
}) as const satisfies CustomConversion<number, ActionName<M>>;

type ChainOptional<T extends boolean> = T extends true ? Chain | null : Chain;

const chainConversion = <T extends boolean>(allowNull: T) => ({
  to: (chainId: number): ChainOptional<T> => {
    if (chainId === 0) {
      if (!allowNull)
        throw new Error("ChainId 0 is not valid for this module and action");
      
      return null as ChainOptional<T>;
    }

    return conversions.Chain.to(chainId);
  },
  from: (chain: ChainOptional<T>): number => {
    if (chain === null)
      return 0;
    
    return conversions.Chain.from(chain);
  }
}) as const;

export const governanceVaaHeaderLayout = <
  const M extends Module,
  const A extends keyof typeof actions[M]
>(module: M, action: A) => [
  { 
    name: "module",
    binary: "bytes",
    size: moduleBytesSize,
    custom: moduleConversion
  },
  { 
    name: "action",
    binary: "uint",
    size: 1,
    custom: actionConversion(module)
  },
  { 
    name: "chain",
    binary: "uint", 
    size: 2,
    custom: chainConversion((actions[module][action] as {allowUnset: boolean}).allowUnset)
  },
] as const;
