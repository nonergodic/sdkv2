We need a better way to deal with address conversion between native and Wormhole addresses. The two vectors to consider are:

1. Converting between chain-specific addresses and Wormhole addresses (or vice versa)
2. Converting between types for the same address (e.g. Uint8Array, hex string, base58 string, etc.)

Currently, this functionality is split into multiple methods in `array.ts` with bespoke methods for most possible conversions.

```ts
const nativeSuiAddress =
  "0x7d20dcdb2bca4f508ea9613994683eb4e76e9c4ed371169677c1be02aaf0b58e";
const whAddress = tryNativeToUint8Array(nativeSuiAddress, "sui");
```

We can come up with a far more flexible abstraction that lets us translate between native and universal (i.e. Wormhole) addresses and output any type.

```ts
const nativeSuiAddress =
  "0x7d20dcdb2bca4f508ea9613994683eb4e76e9c4ed371169677c1be02aaf0b58e";
const whAddress = new NativeAddress(nativeSuiAddress, "sui")
  .toUniversalAddress()
  .toUint8Array();
```

TODO: in order to support fully qualified types in Sui, these methods may need to be promisified
TODO: use constants from 1-base-layer instead of existing SDK
