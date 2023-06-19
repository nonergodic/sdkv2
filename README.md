= SDK 2.0

== 1 base layer

=== utils repo
* reasonably lightweight
* generally useful Typescript stuff (essentially unify utils defined in multiple places, lodash lite?)
* common types (e.g. which BigNumber library, perhaps Decimal.js)
? Parser

=== constants repo
* lightweight!
* might depend on utils repo
* single source of truth for all constants
  * chain names (e.g. solana, ethereum, aptos, sui, ...)
  * wormhole chain ids
  * networks (mainnet/testnet/localnet)
  * contract addresses
  * misc:
    * contract authorities
    * rpc endpoints
    * tilt guardian key
  * ecosystem specific mappings
    * (evm chainid | Solana genesis block) -> (chain, network)
    ? probably others
* procedural generation of different views in formats that are easily consumable across various tools and languages (.env file, .json, perhaps TypeScript and Rust specific...)
* derive "deployed contract addresses" documentation from it too


== 2 definition layer

=== one package for each module (core bridge, token bridge, nft bridge, relayer)
* lightweight
* general definition of types/data structures etc.
  * e.g. structure of a governance VAA
* encoding/decoding of VAAs, pretty printing, etc.
* mocks (MockGuardian signing etc.)
? Wormhole address conversion functionality (array.ts)
? ecosystem specific functionality that does not require the ecosystem sdk (i.e. light weight)?


== 3 ecosystem layer

=== one package per ecosystem
* potentially heavy weight
* ecosystem specific implementation of apps (separate what's currently all thrown together in bridge, token_bridge, nft_bridge, etc.)
* utility code for those ecosystems (e.g. a more sensible wrapper around Solana's "give me the last 1k transactions for this account" function, testing code, etc.)


== 4 xdapp layer

=== one package
* abstracts away ecosystem specific complexity

example:
1. pull in modules for whatever ecosystems you want to use
2. set up providers for these ecosystems (Provider for ethers, Connection for Solana, etc.) and hide them behind a uniform interface
3. have functions such as tokenBridge.isVaaRedeemed(vaa, providerCollection), which uses the definition layer to parse the vaa and find the target chain id and then query the token bridge using the ecosystem specific implementation