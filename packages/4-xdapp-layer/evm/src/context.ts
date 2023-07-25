import {
  Implementation__factory,
  TokenImplementation__factory,
} from '@certusone/wormhole-sdk/lib/cjs/ethers-contracts';
import {
  BigNumber,
  BigNumberish,
  constants,
  ContractReceipt,
  ethers,
  Overrides,
  PayableOverrides,
  PopulatedTransaction,
  utils,
} from 'ethers';

import {
  TokenId,
  ChainName,
  ChainId,
  NATIVE,
  ParsedRelayerMessage,
  ParsedMessage,
  Context,
  ParsedRelayerPayload,
  Wormhole,
  parseVaa,
  RelayerAbstract,
  createNonce,
  MAINNET_CHAINS,
  Network,
} from '@wormhole-foundation/sdk-base';
import { EvmContracts } from './contracts';

export * from './contracts';

/**
 * @category EVM
 */
export class EvmContext extends RelayerAbstract<ethers.ContractReceipt> {
  readonly type = Context.EVM;
  readonly contracts: EvmContracts;
  protected wormhole: Wormhole;

  constructor(wormholeInstance: Wormhole) {
    super();
    this.wormhole = wormholeInstance;
    this.contracts = new EvmContracts(this.wormhole);
  }

  async getForeignAsset(
    tokenId: TokenId,
    chain: ChainName | ChainId,
  ): Promise<string | null> {
    const toChainId = this.wormhole.toChainId(chain);
    const chainId = this.wormhole.toChainId(tokenId.chain);
    // if the token is already native, return the token address
    if (toChainId === chainId) return tokenId.address;
    // else fetch the representation
    const tokenBridge = this.contracts.mustGetBridge(chain);
    const sourceContext = this.wormhole.getContext(tokenId.chain);
    const tokenAddr = await sourceContext.formatAssetAddress(tokenId.address);
    const foreignAddr = await tokenBridge.wrappedAsset(
      chainId,
      utils.arrayify(tokenAddr),
    );
    if (foreignAddr === constants.AddressZero) return null;
    return foreignAddr;
  }

  async mustGetForeignAsset(
    tokenId: TokenId,
    chain: ChainName | ChainId,
  ): Promise<string> {
    const addr = await this.getForeignAsset(tokenId, chain);
    if (!addr) throw new Error('token not registered');
    return addr;
  }

  /**
   * Returns the decimals for a token
   *
   * @param tokenAddr The token address
   * @param chain The token chain name or id
   * @returns The number of token decimals
   */
  async fetchTokenDecimals(
    tokenAddr: string,
    chain: ChainName | ChainId,
  ): Promise<number> {
    const provider = this.wormhole.mustGetProvider(chain);
    const tokenContract = TokenImplementation__factory.connect(
      tokenAddr,
      provider,
    );
    const decimals = await tokenContract.decimals();
    return decimals;
  }

  async getNativeBalance(
    walletAddr: string,
    chain: ChainName | ChainId,
  ): Promise<BigNumber> {
    const provider = this.wormhole.mustGetProvider(chain);
    return await provider.getBalance(walletAddr);
  }

  async getTokenBalance(
    walletAddr: string,
    tokenId: TokenId,
    chain: ChainName | ChainId,
  ): Promise<BigNumber | null> {
    const address = await this.getForeignAsset(tokenId, chain);
    if (!address) return null;
    const provider = this.wormhole.mustGetProvider(chain);
    const token = TokenImplementation__factory.connect(address, provider);
    const balance = await token.balanceOf(walletAddr);
    return balance;
  }

  /**
   * Approves amount for bridge transfer. If no amount is specified, the max amount is approved
   *
   * @param chain The sending chain name or id
   * @param contractAddress The contract for which to approve (i.e. bridge or relayer)
   * @param tokenAddr The token address
   * @param amount The amount to approve
   * @param overrides Optional overrides, varies by chain
   * @throws If the token address does not exist
   */
  async approve(
    chain: ChainName | ChainId,
    contractAddress: string,
    tokenAddr: string,
    amount?: BigNumberish,
    overrides: PayableOverrides & { from?: string | Promise<string> } = {},
  ): Promise<ethers.ContractReceipt | void> {
    const signer = this.wormhole.getSigner(chain);
    if (!signer) throw new Error(`No signer for ${chain}`);
    const senderAddress = await signer.getAddress();
    const tokenImplementation = TokenImplementation__factory.connect(
      tokenAddr,
      signer,
    );
    if (!tokenImplementation)
      throw new Error(`token contract not available for ${tokenAddr}`);

    const approved = await tokenImplementation.allowance(
      senderAddress,
      contractAddress,
    );
    const approveAmount = amount || constants.MaxUint256;
    // Approve if necessary
    if (approved.lt(approveAmount)) {
      const tx = await tokenImplementation.approve(
        contractAddress,
        approveAmount,
        overrides,
      );
      await tx.wait();
    }
  }

  /**
   * Prepare a send tx for a Token Bridge transfer (does not dispatch the transaction)
   *
   * @param token The Token Identifier (chain/address) or `'native'` if sending the native token
   * @param amount The token amount to be sent
   * @param sendingChain The source chain name or id
   * @param senderAddress The address that is dispatching the transfer
   * @param recipientChain The destination chain name or id
   * @param recipientAddress The wallet address where funds will be sent (On solana, this is the associated token account)
   * @param relayerFee A fee that would go to a relayer, if any
   * @param overrides Overrides
   * @returns The populated transaction
   */
  async prepareTransfer(
    token: TokenId | typeof NATIVE,
    amount: bigint,
    sendingChain: ChainName | ChainId,
    senderAddress: string,
    recipientChain: ChainName | ChainId,
    recipientAddress: string,
    relayerFee: ethers.BigNumberish = 0,
    overrides: PayableOverrides & { from?: string | Promise<string> } = {},
  ): Promise<ethers.PopulatedTransaction> {
    const destContext = this.wormhole.getContext(recipientChain);
    const recipientChainId = this.wormhole.toChainId(recipientChain);
    const sendingChainName = this.wormhole.toChainName(sendingChain);
    const amountBN = ethers.BigNumber.from(amount);
    const bridge = this.contracts.mustGetBridge(sendingChain);

    let recipientAccount = recipientAddress;
    // get token account for solana
    if (recipientChainId === MAINNET_CHAINS.solana) {
      let tokenId = token;
      if (token === NATIVE) {
        tokenId = {
          address: await bridge.WETH(),
          chain: sendingChainName,
        };
      }
      recipientAccount = await this.wormhole.getSolanaRecipientAddress(
        recipientChain,
        tokenId as TokenId,
        recipientAddress,
      );
    }

    if (token === NATIVE) {
      // sending native ETH
      await bridge.callStatic.wrapAndTransferETH(
        recipientChainId,
        destContext.formatAddress(recipientAccount),
        relayerFee,
        createNonce(),
        {
          ...overrides,
          value: amountBN,
          from: senderAddress,
        },
      );
      return bridge.populateTransaction.wrapAndTransferETH(
        recipientChainId,
        destContext.formatAddress(recipientAccount),
        relayerFee,
        createNonce(),
        {
          ...overrides,
          value: amountBN,
        },
      );
    } else {
      // sending ERC-20
      //approve and send
      const tokenAddr = await this.mustGetForeignAsset(token, sendingChain);
      // simulate transaction
      await bridge.callStatic.transferTokens(
        tokenAddr,
        amountBN,
        recipientChainId,
        destContext.formatAddress(recipientAccount),
        relayerFee,
        createNonce(),
        {
          ...overrides,
          from: senderAddress,
        },
      );
      return bridge.populateTransaction.transferTokens(
        tokenAddr,
        amountBN,
        recipientChainId,
        destContext.formatAddress(recipientAccount),
        relayerFee,
        createNonce(),
        overrides,
      );
    }
  }

  async startTransfer(
    token: TokenId | typeof NATIVE,
    amount: bigint,
    sendingChain: ChainName | ChainId,
    senderAddress: string,
    recipientChain: ChainName | ChainId,
    recipientAddress: string,
    relayerFee: ethers.BigNumberish = 0,
    overrides: PayableOverrides & { from?: string | Promise<string> } = {},
  ): Promise<ethers.ContractReceipt> {
    const signer = this.wormhole.getSigner(sendingChain);
    if (!signer) throw new Error(`No signer for ${sendingChain}`);

    // approve for ERC-20 token transfers
    if (token !== NATIVE) {
      const amountBN = ethers.BigNumber.from(amount);
      const bridge = this.contracts.mustGetBridge(sendingChain);
      const tokenAddr = await this.mustGetForeignAsset(token, sendingChain);
      await this.approve(
        sendingChain,
        bridge.address,
        tokenAddr,
        amountBN,
        overrides,
      );
    }

    // prepare and simulate transfer
    const tx = await this.prepareTransfer(
      token,
      amount,
      sendingChain,
      senderAddress,
      recipientChain,
      recipientAddress,
      relayerFee,
      overrides,
    );

    const v = await signer.sendTransaction(tx);
    return await v.wait();
  }

  /**
   * Prepares a send tx for a Token Bridge transfer with a payload.  The payload is used to convey extra information about a transfer to be utilized in an application
   *
   * @dev This _must_ be claimed on the destination chain, see {@link Wormhole#redeem | redeem}
   *
   * @param token The Token Identifier (chain/address) or `'native'` if sending the native token
   * @param amount The token amount to be sent
   * @param sendingChain The source chain name or id
   * @param senderAddress The address that is dispatching the transfer
   * @param recipientChain The destination chain name or id
   * @param recipientAddress The wallet address where funds will be sent (On solana, this is the associated token account)
   * @param payload Arbitrary bytes that can contain any addition information about a given transfer
   * @param overrides Overrides
   * @returns The populated transaction
   */
  async startTransferWithPayload(
    token: TokenId | typeof NATIVE,
    amount: bigint,
    sendingChain: ChainName | ChainId,
    senderAddress: string,
    recipientChain: ChainName | ChainId,
    recipientAddress: string,
    payload: Uint8Array,
    overrides: PayableOverrides & { from?: string | Promise<string> } = {},
  ): Promise<ethers.ContractReceipt> {
    const destContext = this.wormhole.getContext(recipientChain);
    const recipientChainId = this.wormhole.toChainId(recipientChain);
    const bridge = this.contracts.mustGetBridge(sendingChain);
    const amountBN = ethers.BigNumber.from(amount);

    if (token === NATIVE) {
      // sending native ETH
      const v = await bridge.wrapAndTransferETHWithPayload(
        recipientChainId,
        destContext.formatAddress(recipientAddress),
        createNonce(),
        payload,
        {
          ...overrides,
          value: amountBN,
        },
      );
      return await v.wait();
    } else {
      // sending ERC-20
      const tokenAddr = await this.mustGetForeignAsset(token, sendingChain);
      await this.approve(sendingChain, bridge.address, tokenAddr, amountBN);
      const v = await bridge.transferTokensWithPayload(
        tokenAddr,
        amountBN,
        recipientChainId,
        destContext.formatAddress(recipientAddress),
        createNonce(),
        payload,
        overrides,
      );
      return await v.wait();
    }
  }

  /**
   * Prepares a send tx for a Token Bridge Relay transfer. This will automatically dispatch funds to the recipient on the destination chain.
   *
   * @param token The Token Identifier (native chain/address) or `'native'` if sending the native token
   * @param amount The token amount to be sent, as a string
   * @param toNativeToken The amount of sending token to be converted to native gas token on the destination chain
   * @param sendingChain The source chain name or id
   * @param senderAddress The address that is dispatching the transfer
   * @param recipientChain The destination chain name or id
   * @param recipientAddress The wallet address where funds will be sent (On solana, this is the associated token account)
   * @param overrides Optional overrides, varies by chain
   * @returns The populated relay transaction
   */
  async prepareTransferWithRelay(
    token: TokenId | 'native',
    amount: bigint,
    toNativeToken: string,
    sendingChain: ChainName | ChainId,
    senderAddress: string,
    recipientChain: ChainName | ChainId,
    recipientAddress: string,
    overrides: PayableOverrides & { from?: string | Promise<string> } = {},
  ): Promise<ethers.PopulatedTransaction> {
    const destContext = this.wormhole.getContext(recipientChain);
    const recipientChainId = this.wormhole.toChainId(recipientChain);
    const amountBN = ethers.BigNumber.from(amount);
    const relayer = this.contracts.mustGetTokenBridgeRelayer(sendingChain);
    const nativeTokenBN = ethers.BigNumber.from(toNativeToken);

    if (token === NATIVE) {
      // sending native ETH
      return relayer.populateTransaction.wrapAndTransferEthWithRelay(
        nativeTokenBN,
        recipientChainId,
        destContext.formatAddress(recipientAddress),
        0, // opt out of batching
        {
          ...overrides,
          value: amountBN,
        },
      );
    } else {
      // sending ERC-20
      const tokenAddr = await this.mustGetForeignAsset(token, sendingChain);
      return relayer.populateTransaction.transferTokensWithRelay(
        this.parseAddress(tokenAddr),
        amountBN,
        nativeTokenBN,
        recipientChainId,
        destContext.formatAddress(recipientAddress),
        0, // opt out of batching
        overrides,
      );
    }
  }

  async startTransferWithRelay(
    token: TokenId | 'native',
    amount: bigint,
    toNativeToken: string,
    sendingChain: ChainName | ChainId,
    senderAddress: string,
    recipientChain: ChainName | ChainId,
    recipientAddress: string,
    overrides: PayableOverrides & { from?: string | Promise<string> } = {},
  ): Promise<ethers.ContractReceipt> {
    const signer = this.wormhole.getSigner(sendingChain);
    if (!signer) throw new Error(`No signer for ${sendingChain}`);

    // approve for ERC-20 token transfers
    if (token !== NATIVE) {
      const amountBN = ethers.BigNumber.from(amount);
      const relayer = this.contracts.mustGetTokenBridgeRelayer(sendingChain);
      const tokenAddr = await this.mustGetForeignAsset(token, sendingChain);
      await this.approve(
        sendingChain,
        relayer.address,
        tokenAddr,
        amountBN,
        overrides,
      );
    }

    // prepare and simulate transfer
    const tx = await this.prepareTransferWithRelay(
      token,
      amount,
      toNativeToken,
      sendingChain,
      senderAddress,
      recipientChain,
      recipientAddress,
      overrides,
    );

    const v = await signer.sendTransaction(tx);
    return await v.wait();
  }

  /**
   * Prepares a redeem tx, which redeems funds for a token bridge transfer on the destination chain
   *
   * @param destChain The destination chain name or id
   * @param signedVAA The Signed VAA bytes
   * @param overrides Optional overrides, varies between chains
   * @returns The populated redeem transaction
   */
  async prepareRedeem(
    destChain: ChainName | ChainId,
    signedVAA: Uint8Array,
    overrides: Overrides & { from?: string | Promise<string> } = {},
  ): Promise<PopulatedTransaction> {
    const bridge = this.contracts.mustGetBridge(destChain);
    await bridge.callStatic.completeTransfer(signedVAA, overrides);
    return bridge.populateTransaction.completeTransfer(signedVAA, overrides);
  }

  async completeTransfer(
    destChain: ChainName | ChainId,
    signedVAA: Uint8Array,
    overrides: Overrides & { from?: string | Promise<string> } = {},
  ): Promise<ContractReceipt> {
    const signer = this.wormhole.getSigner(destChain);
    if (!signer) throw new Error(`No signer for ${destChain}`);
    const tx = await this.prepareRedeem(destChain, signedVAA, overrides);
    const v = await signer.sendTransaction(tx);
    return await v.wait();
    // TODO: unwrap native assets
    // const v = await bridge.completeTransferAndUnwrapETH(signedVAA, overrides);
    // const receipt = await v.wait();
    // return receipt;
  }

  async calculateMaxSwapAmount(
    destChain: ChainName | ChainId,
    tokenId: TokenId,
    walletAddress: string,
  ): Promise<BigNumber> {
    const relayer = this.contracts.mustGetTokenBridgeRelayer(destChain);
    const token = await this.mustGetForeignAsset(tokenId, destChain);
    return await relayer.calculateMaxSwapAmountIn(token);
  }

  async calculateNativeTokenAmt(
    destChain: ChainName | ChainId,
    tokenId: TokenId,
    amount: BigNumberish,
    walletAddress: string,
  ): Promise<BigNumber> {
    const relayer = this.contracts.mustGetTokenBridgeRelayer(destChain);
    const token = await this.mustGetForeignAsset(tokenId, destChain);
    return await relayer.calculateNativeSwapAmountOut(token, amount);
  }

  async parseMessageFromTx(
    tx: string,
    chain: ChainName | ChainId,
  ): Promise<ParsedMessage[] | ParsedRelayerMessage[]> {
    const provider = this.wormhole.mustGetProvider(chain);
    const receipt = await provider.getTransactionReceipt(tx);
    if (!receipt) throw new Error(`No receipt for ${tx} on ${chain}`);

    let gasFee: BigNumber;
    const { gasUsed, effectiveGasPrice } = receipt;
    if (gasUsed && effectiveGasPrice) {
      gasFee = gasUsed.mul(effectiveGasPrice);
    }

    const core = this.contracts.mustGetCore(chain);
    const bridge = this.contracts.mustGetBridge(chain);
    const bridgeLogs = receipt.logs.filter((l: any) => {
      return l.address === core.address;
    });
    const parsedLogs = bridgeLogs.map(async (bridgeLog) => {
      const parsed =
        Implementation__factory.createInterface().parseLog(bridgeLog);

      // parse token bridge message
      const fromChain = this.wormhole.toChainName(chain);
      if (parsed.args.payload.startsWith('0x01')) {
        const parsedTransfer = await bridge.parseTransfer(parsed.args.payload); // for bridge messages
        const destContext = this.wormhole.getContext(
          parsedTransfer.toChain as ChainId,
        );
        const tokenContext = this.wormhole.getContext(
          parsedTransfer.tokenChain as ChainId,
        );
        const tokenAddress = await tokenContext.parseAssetAddress(
          parsedTransfer.tokenAddress,
        );
        const tokenChain = this.wormhole.toChainName(parsedTransfer.tokenChain);
        const parsedMessage: ParsedMessage = {
          sendTx: tx,
          sender: receipt.from,
          amount: parsedTransfer.amount,
          payloadID: parsedTransfer.payloadID,
          recipient: destContext.parseAddress(parsedTransfer.to),
          toChain: this.wormhole.toChainName(parsedTransfer.toChain),
          fromChain,
          tokenAddress,
          tokenChain,
          tokenId: {
            chain: tokenChain,
            address: tokenAddress,
          },
          sequence: parsed.args.sequence,
          emitterAddress: utils.hexlify(this.formatAddress(bridge.address)),
          block: receipt.blockNumber,
          gasFee,
        };
        return parsedMessage;
      }

      // parse token bridge relayer message
      const parsedTransfer = await bridge.parseTransferWithPayload(
        parsed.args.payload,
      );
      const destContext = this.wormhole.getContext(
        parsedTransfer.toChain as ChainId,
      );

      const toChain = this.wormhole.toChainName(parsedTransfer.toChain);

      /**
       * Not all relayers follow the same payload structure (i.e. sei)
       * so we request the destination context to parse the payload
       */
      const relayerPayload: ParsedRelayerPayload =
        destContext.parseRelayerPayload(
          Buffer.from(utils.arrayify(parsedTransfer.payload)),
        );

      const tokenContext = this.wormhole.getContext(
        parsedTransfer.tokenChain as ChainId,
      );
      const tokenAddress = await tokenContext.parseAssetAddress(
        parsedTransfer.tokenAddress,
      );
      const tokenChain = this.wormhole.toChainName(parsedTransfer.tokenChain);
      const parsedMessage: ParsedRelayerMessage = {
        sendTx: tx,
        sender: receipt.from,
        amount: parsedTransfer.amount,
        payloadID: parsedTransfer.payloadID,
        to: destContext.parseAddress(parsedTransfer.to),
        toChain,
        fromChain,
        tokenAddress,
        tokenChain,
        tokenId: {
          chain: tokenChain,
          address: tokenAddress,
        },
        sequence: parsed.args.sequence,
        emitterAddress: utils.hexlify(this.formatAddress(bridge.address)),
        block: receipt.blockNumber,
        gasFee,
        payload: parsedTransfer.payload,
        relayerPayloadId: relayerPayload.relayerPayloadId,
        recipient: destContext.parseAddress(relayerPayload.to),
        relayerFee: relayerPayload.relayerFee,
        toNativeTokenAmount: relayerPayload.toNativeTokenAmount,
      };
      return parsedMessage;
    });
    return await Promise.all(parsedLogs);
  }

  async getRelayerFee(
    sourceChain: ChainName | ChainId,
    destChain: ChainName | ChainId,
    tokenId: TokenId,
  ): Promise<BigNumber> {
    const relayer = this.contracts.mustGetTokenBridgeRelayer(sourceChain);
    // get asset address
    const address = await this.mustGetForeignAsset(tokenId, sourceChain);
    // get token decimals
    const provider = this.wormhole.mustGetProvider(sourceChain);
    const tokenContract = TokenImplementation__factory.connect(
      address,
      provider,
    );
    const decimals = await tokenContract.decimals();
    // get relayer fee as token amt
    const destChainId = this.wormhole.toChainId(destChain);
    return await relayer.calculateRelayerFee(destChainId, address, decimals);
  }

  async isTransferCompleted(
    destChain: ChainName | ChainId,
    signedVaa: string,
  ): Promise<boolean> {
    const tokenBridge = this.contracts.mustGetBridge(destChain);
    const hash = parseVaa(utils.arrayify(signedVaa)).hash;
    return await tokenBridge.isTransferCompleted(hash);
  }

  formatAddress(address: string): Uint8Array {
    return Buffer.from(utils.zeroPad(address, 32));
  }

  parseAddress(address: ethers.utils.BytesLike): string {
    const parsed = utils.hexlify(utils.stripZeros(address));
    return utils.getAddress(parsed);
  }

  async formatAssetAddress(address: string): Promise<Uint8Array> {
    return this.formatAddress(address);
  }

  async parseAssetAddress(address: string): Promise<string> {
    return this.parseAddress(address);
  }

  async getCurrentBlock(chain: ChainName | ChainId): Promise<number> {
    const provider = this.wormhole.mustGetProvider(chain);
    return await provider.getBlockNumber();
  }
}
