import { TESTNET_CHAINS } from "../../src/config/TESTNET";
import { Network, Context, ContextConfig, AnyContext, TokenId, ChainName, ChainId } from "../../src/types";
import { Wormhole } from "../../src/wormhole";
import { MockContext } from "../mockContext";

const NETWORK = Network.TESTNET;

describe('registers context classes correctly', () => {
  it('true equals true', () => {
    expect(true).toBeTruthy();
  });
  it('registers context classes correctly', async () => {
    const mockEvm = new MockContext(NETWORK) as any as AnyContext;
    const mockSolana = new MockContext(NETWORK) as any as AnyContext;
    mockSolana.startTransfer = async function (
      token: TokenId | 'native',
      amount: bigint,
      sendingChain: ChainName | ChainId,
      senderAddress: string,
      recipientChain: ChainName | ChainId,
      recipientAddress: string,
      relayerFee: any,
    ): Promise<any> {
      return 2;
    };
    const contextConfig: ContextConfig = {
      [Context.EVM]: mockEvm,
      [Context.SOLANA]: mockSolana,
    }
    const wormhole = new Wormhole(NETWORK, contextConfig);
    const evmContext = wormhole.getContext(TESTNET_CHAINS.goerli);
    const solanaContext = wormhole.getContext(TESTNET_CHAINS.solana);
    const evmAnswer = await evmContext.startTransfer('native', BigInt(0), 1, '', 2, '', undefined);
    expect(evmAnswer).toEqual(1);
    const solanaAnswer = await solanaContext.startTransfer('native', BigInt(0), 1, '', 2, '', undefined);
    expect(solanaAnswer).toEqual(2);
  })
});
