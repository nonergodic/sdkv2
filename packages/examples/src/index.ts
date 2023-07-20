// Sol
import bs58 from "bs58";
import {
  Keypair,
  Transaction,
  VersionedTransaction,
  TransactionMessage,
} from "@solana/web3.js";
// Eth
import { ethers } from "ethers";

import * as wh from "@wormhole-foundation/sdk-base";
import * as sol from "@wormhole-foundation/sdk-solana";
import * as evm from "@wormhole-foundation/sdk-evm";
import * as sui from "@wormhole-foundation/sdk-sui";

// Please don't steal my testnet moneys
function getSolanaSigner(): Keypair {
  return Keypair.fromSecretKey(
    bs58.decode(
      "2v5fKQHaDLuWYBQCzFGvovnRNXPy8jkErWkeSMigs1PdsnQvRC5EMX3CJdULaEaQqaMNagfhsoj8sfQ7Dn2MnjKy"
    )
  );
}

function getEthSigner(provider: ethers.providers.Provider): ethers.Wallet {
  const ethPk =
    "0x3f493e59e81db1be4ebbe18b28ba8fdd066ef44139420ead59f37f5dacb80719";
  return new ethers.Wallet(ethPk, provider);
}

(async function () {
  const w = new wh.Wormhole(wh.Network.TESTNET, {
    // TODO: Since we already provide the name of the context and the network,
    // can we just pass a list of these and create the object in the constructor?
    [wh.Context.SOLANA]: new sol.SolanaContext(wh.Network.TESTNET),
    [wh.Context.EVM]: new evm.EvmContext(wh.Network.TESTNET),
    [wh.Context.SUI]: new sui.SuiContext(wh.Network.TESTNET),
  });

  // TODO: getContext returns untyped, can it return the correct context type?
  const solc = w.getContext("solana") as sol.SolanaContext;
  const solConn = solc.connection;

  // TODO: No connection attribute on EvmContext?
  const ethConn = w.mustGetProvider("goerli");

  // TODO: consistent signer interface?
  const ethSigner = getEthSigner(ethConn);
  const solSigner = getSolanaSigner();

  const tx = (await w.startTransfer(
    "native", // TokenId
    10000n, // Amount in base units

    // can we pass an interface that provides
    // both the chain and a fn to get the address?
    "solana",
    solSigner.publicKey.toBase58(),
    "goerli",
    ethSigner.address
  )) as Transaction;

  // Create a VersionedTransaction from the
  // legacy Transaction type
  const txn = new VersionedTransaction(
    new TransactionMessage({
      payerKey: tx.feePayer!,
      recentBlockhash: tx.recentBlockhash!,
      instructions: tx.instructions,
    }).compileToV0Message()
  );

  txn.sign([solSigner]);
  tx.signatures.forEach((sig) => {
    if (sig.signature !== null)
      txn.addSignature(sig.publicKey, new Uint8Array(sig.signature));
  });

  console.log(txn);

  //const x = await solConn?.sendTransaction(txn);
  //console.log(x);
})();
