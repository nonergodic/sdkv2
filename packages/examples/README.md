## Examples of usage of the Wormhole SDK v2

Should hold (tested) examples of common usage patterns

## Notes

- We should try to set TESTNET/MAINET/DEVNET in 1 place for a given Wormhole+Contexts.
- We need to figure out the right pattern for providing signing of transactions
- Things like completeTransfer for solana should account for things like ensuring the ATA exists

Usage ideas

```ts
interface Account {
  getAddress(): string;
  getChainId(): ChainId;
  getChainName(): ChainName;
  sign(tx: UnsignedTx<ChainName>): SignedTxn<>;
}

interface SendResult {
  txid: string;
  vaaKey: {
    chainId: ChainId;
    emitter: string;
    seq: int;
  };
}

const wh = new Wormhole(TESTNET, [
  SolanaContext,
  EthereumContext,
  AlgorandContext,
]);

// User
const solAcct: Account = new SolanaAccount("...");
const algoAcct: Account = new AlgorandAccount("...");

// Internally calls fns to get addresses and sign for `from`
// Gets the VAA and redeems with signer for `to` address
const confirmedTxId = await wh.transfer({
  token: "native",
  amt: "1.0",
  from: algoAcct,
  to: solAcct,
});

// Or
const xfer: SendResult = await wh.startTransfer({
  token: "native",
  amt: "1.0",
  from: algoAcct,
  to: solAcct,
});
const vaa: VAA = await wh.getVaa(xfer);
const confirmed: RedeemResult = await wh.completeTransfer(solAccount, vaa);

// Or even
const mon: TransferMonitor = await wh.monitoredTransfer({
  token: "native",
  amt: "1.0",
  from: algoAcct,
  to: solAcct,
});
mon.on("source-submitted", (e) => {
  console.log("source submitted: ", e);
});
mon.on("source-confirmed", (e) => {
  console.log("source confirmed: ", e);
});
mon.on("vaa-signed", (e) => {
  console.log("vaa signed: ", e);
});
mon.on("target-submitted", (e) => {
  console.log("target submitted: ", e);
});
mon.on("target-confirmed", (e) => {
  console.log("target confirmed: ", e);
});
```
