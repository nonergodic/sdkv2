import {
  platformToChainsMapping,
  modules,
  Module,
  CustomConversion,
  column,
  toMapping,
  ToMapping,
  Layout,
  Flatten,
  ConcatStringLiterals,
} from "wormhole-base";

import { chainConversion, universalAddressConversion } from "./layout-conversions";
import { registerPayloadType } from "./vaa";

//TODO should we define governance actions that are specific to a platform here?
//     (reason against: we might want to deserialize types that are specific to the platform)
const evmChainConversion = chainConversion({allowedChains: platformToChainsMapping["Evm"]});

const actionTuples = [
  ["UpgradeContract", {
    allowNull: false,
    layout: [
      { name: "newContract", binary: "bytes", size: 32, custom: universalAddressConversion },
    ] as const satisfies Layout,
  }],
  ["RegisterChain", {
    allowNull: true,
    layout: [
      { name: "foreignChain",   binary: "uint",  size:  2, custom: chainConversion() },
      { name: "foreignAddress", binary: "bytes", size: 32, custom: universalAddressConversion },
    ] as const satisfies Layout,
  }],
  //a word on the chainId for RecoverChainId:
  //The implementation of the contracts accept an arbitrary number when recovering chain ids however
  //  I don't think you ever want to set the wormhole chain id of a contract (even on a fork) to 0
  //  since this would mean that afterwards all the checks that use `vaa.chainId == this.chainId` in
  //  the contract would suddenly accept "broadcast VAAs" which is almost certainly not what's
  //  intended.
  ["RecoverChainId", {
    allowNull: false,
    layout: [
      { name: "evmChainId", binary: "uint", size: 32 },
      { name: "newChainId", binary: "uint", size: 2, custom: evmChainConversion},
    ] as const satisfies Layout,
  }],
  ["GuardianSetUpgrade", {
    allowNull: true,
    layout: [
      { name: "guardianSet", binary: "uint", size: 4 },
      { name: "guardians",   binary: "array", size: 1, elements: [
        { name: "address", binary: "bytes", size: 20 }, //TODO better (custom) type?
      ]},
    ] as const satisfies Layout,
  }],
  ["SetMessageFee", {
    allowNull: false,
    layout: [
      { name: "messageFee", binary: "uint",  size: 32 },
    ] as const satisfies Layout,
  }],
  ["TransferFees", {
    allowNull: true,
    layout: [
      { name: "amount",    binary: "uint",  size: 32 },
      { name: "recipient", binary: "bytes", size: 32, custom: universalAddressConversion },
    ] as const satisfies Layout,
  }],
  ["UpdateDefaultProvider", {
    allowNull: false,
    layout: [
      { name: "defaultProvider", binary: "bytes", size: 32, custom: universalAddressConversion },
    ] as const satisfies Layout,
  }],
] as const;

const actions = column(actionTuples, 0);
type Action = typeof actions[number];

const actionMapping = toMapping(actionTuples);

const sdkModuleNameAndGovernanceVaaModuleEntries = [
  ["CoreBridge",  "Core"],
  ["TokenBridge", "TokenBridge"],
  ["NftBridge",   "NFTBridge"],
  ["Relayer",     "WormholeRelayer"],
] as const satisfies readonly (readonly [Module, string])[];

const sdkModuleNameToGovernanceVaaModuleMapping =
  toMapping(sdkModuleNameAndGovernanceVaaModuleEntries);

const moduleToActionToNumTuples = [
  //see https://github.com/wormhole-foundation/wormhole/blob/96c6cc2b325addc2125bb438b228921a4be6b7f3/ethereum/contracts/GovernanceStructs.sol#L64
  ["CoreBridge", [
    ["UpgradeContract", 1],
    ["GuardianSetUpgrade", 2],
    ["SetMessageFee", 3],
    ["TransferFees", 4],
    ["RecoverChainId", 5],
  ]],
  //see https://github.com/wormhole-foundation/wormhole/blob/96c6cc2b325addc2125bb438b228921a4be6b7f3/ethereum/contracts/bridge/BridgeGovernance.sol#L115
  ["TokenBridge", [
    ["RegisterChain", 1],
    ["UpgradeContract", 2],
    ["RecoverChainId", 3],
  ]],
  //see https://github.com/wormhole-foundation/wormhole/blob/96c6cc2b325addc2125bb438b228921a4be6b7f3/ethereum/contracts/nft/NFTBridgeGovernance.sol#L112
  ["NftBridge", [
    ["RegisterChain", 1],
    ["UpgradeContract", 2],
    ["RecoverChainId", 3],
  ]],
  //see https://github.com/wormhole-foundation/wormhole/blob/96c6cc2b325addc2125bb438b228921a4be6b7f3/ethereum/contracts/relayer/wormholeRelayer/WormholeRelayerGovernance.sol#L60
  ["Relayer", [
    ["RegisterChain", 1],
    ["UpgradeContract", 2],
    ["UpdateDefaultProvider", 3],
  ]],
] as const;

const [actionToNumMapping, numToActionMapping, moduleActions] = (() => {
  //that's what you get when your insane programming language doesn't support higher order functions
  //  on types...
  const moduleToActionTuplesMapping = toMapping(moduleToActionToNumTuples);
  return modules.map((module) => [
      { [module]: toMapping(moduleToActionTuplesMapping[module]) },
      { [module]: toMapping(moduleToActionTuplesMapping[module], 1, 0) },
      { [module]: moduleToActionTuplesMapping[module].map((action) => action[0]) },
    ]) as unknown as [
      { readonly [M in Module]: ToMapping<typeof moduleToActionTuplesMapping[M]> },
      { readonly [M in Module]: ToMapping<typeof moduleToActionTuplesMapping[M], 1, 0> },
      { readonly [M in Module]:
          typeof moduleToActionTuplesMapping[M] extends infer A extends readonly any[]
          ? readonly [...{ [K in keyof A]: A[K][0] }]
          : never
      }
    ]
})();

type ModuleAction<M extends Module> = typeof moduleActions[M][number];

const moduleBytesSize = 32;

const moduleConversion = <const M extends Module>(module: M) => ({
  to: (bytes: Uint8Array): M => {
    //bytes.lastIndexOf(0) + 1 will also work nicely if there's no null byte in the string
    const govModule = String.fromCharCode(...bytes.subarray(bytes.lastIndexOf(0) + 1));
    const expected = sdkModuleNameToGovernanceVaaModuleMapping[module];
    if (expected !== govModule)
      throw new Error(
        `Expected ascii encoding of ${expected} but got ${bytes} = ${module} instead`
      );
    
    return module;
  },
  from: (_moduleStr: M): Uint8Array => {
    const bytes = new Uint8Array(moduleBytesSize);
    for (let i = 0; i < module.length; ++i)
      bytes[moduleBytesSize - i] = module.charCodeAt(module.length - i);
    
    return bytes;
  } 
}) as const satisfies CustomConversion<Uint8Array, M>;

type ActionNum<M extends Module> = keyof typeof numToActionMapping[M];
const isActionNum = (module: Module, actionNum: number): actionNum is ActionNum<typeof module> =>
  actionNum in numToActionMapping[module];

const actionConversion = <
  const M extends Module,
  const A extends ModuleAction<M> 
>(module: M, action: A) => ({
  to: (actionNum: number) => {
    if (!isActionNum(module, actionNum))
      throw new Error(`Invalid action ${actionNum} for module ${module}`);
    
    const moduleNumMapping = numToActionMapping[module]

    const actionStr = moduleNumMapping[actionNum as keyof typeof moduleNumMapping];
    if (actionStr !== action)
      throw new Error(
        `Unexpected action number (${actionNum} = ${actionStr}) for module ${module}: ` +
        `expected ${action} instead`
      );
    
    return action;
  },
  from: (actionStr: A) => {
    if (actionStr !== action)
      throw new Error(
        `Invalid action ${actionStr} for module ${module}: ` +
        `expected ${action} instead`
      );
    
    //TODO why is the explict "as number" cast necessary here?
    return actionToNumMapping[module][action] as number;
  }
}) as const satisfies CustomConversion<number, A>;

export const headerLayout = <
  const M extends Module,
  const A extends ModuleAction<M>
>(module: M, action: A & Action) => [
  { name: "module", binary: "bytes", size: moduleBytesSize, custom: moduleConversion(module) },
  { name: "action", binary: "uint",  size: 1, custom: actionConversion(module, action) },
  { name: "chain",  binary: "uint",  size: 2, custom: chainConversion(actionMapping[action]) },
] as const;

type GovernancePayloadLayouts = Flatten<
  typeof modules extends infer M
    ? { readonly [I in keyof M]:
      typeof modules[I] extends keyof typeof moduleActions
      ? ( typeof moduleActions[typeof modules[I]] extends infer A
        ? { [J in keyof A]: readonly [
          ConcatStringLiterals<[
            typeof modules[I],
            typeof moduleActions[typeof modules[I]][J]
          ]>,
          Flatten<[
            ReturnType<typeof headerLayout<
              typeof modules[I],
              typeof moduleActions[typeof modules[I]][J]
            >>,
            typeof moduleActions[typeof modules[I]][J] extends keyof typeof actionMapping
            ? typeof actionMapping[typeof moduleActions[typeof modules[I]][J]]["layout"]
            : never
          ]>,
        ] }
        : never
      )
      : never
    }
    : never
  >;

declare global { namespace Wormhole {
  interface PayloadLiteralToDescriptionMapping extends ToMapping<GovernancePayloadLayouts> {}
}}

modules.map((module) =>
  moduleActions[module].map((action) =>
    registerPayloadType(
      module + action as keyof Wormhole.PayloadLiteralToDescriptionMapping,
      [...headerLayout(module, action), ...actionMapping[action].layout],
    )
  ));
