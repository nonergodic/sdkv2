# SDK Base

The primary component here is the Wormhole class, which serves as a wrapper for all the sdk methods.  It ensures that each chain implements certain methods with the same function signature and provides an interface for calling those methods easily.

## Usage

A developer would use this package in conjunction with 1 or more of the chain context packages. Why so many packages? Because most developers don't use every single chain and may only use a couple, this allows developers to import only the dependencies they actually need.

Getting started is simple, just import and pass in the contexts to the Wormhole class.

```ts
import { Wormhole, Context, Network } from '@wormhole-foundation/sdk-base';
import { EvmContext } from '@wormhole-foundation/sdk-evm';
import { SolanaContext } from '@wormhole-foundation/sdk-solana';

const contexts = {
  [Context.EVM]: EvmContext,
  [Context.Solana]: SolanaContext,
}
const wormholeSDK = new Wormhole(Network.MAINNET, contexts);
const receipt = wormholeSDK.startTransfer(
  {
    chain: 'ethereum',
    address: '0x123...',
  }, // token id (native chain and address)
  new BigInt(10), // amount
  'ethereum', // sending chain
  '0x789...', // sender address
  'moonbeam', // destination chain
  '0x789...', // recipient address on destination chain
)
```

### Note WIP

Several components will be replaced over time.  Portions that will be changed:

1. `@certusone/wormhole-sdk` will be removed as a dependency from all packages
2. Contract interfaces will be imported from another package
3. Chain Config will be rewritten and imported from [1-base-layer](https://github.com/nonergodic/sdkv2/tree/main/1-base-layer)
4. Utils (`vaa`, `array`, `createNonce`, etc) will be rewritten and imported from [2-base-layer](https://github.com/nonergodic/sdkv2/tree/main/2-definition-layer)
