import {
  Wormhole,
  filterByContext,
  ContractsAbstract,
  ChainName,
  ChainId,
  Context,
  Contracts,
} from '@wormhole-foundation/sdk-base';

export class SeiContracts extends ContractsAbstract {
  protected _contracts: Map<ChainName, any>;
  protected context: Wormhole;

  constructor(context: Wormhole) {
    super();
    this.context = context;
    this._contracts = new Map();
    const chains = filterByContext(context.conf, Context.SEI);
    chains.forEach((c) => {
      this._contracts.set(c.key, c.contracts);
    });
  }

  getContracts(chain: ChainName | ChainId): Contracts | undefined {
    const chainName = this.context.toChainName(chain);
    return this._contracts.get(chainName);
  }

  mustGetContracts(chain: ChainName | ChainId): Contracts {
    const chainName = this.context.toChainName(chain);
    const contracts = this._contracts.get(chainName);
    if (!contracts) throw new Error(`no Sui contracts found for ${chain}`);
    return contracts;
  }

  getCore(chain: ChainName | ChainId) {
    throw new Error('Method not implemented.');
  }

  mustGetCore(chain: ChainName | ChainId) {
    throw new Error('Method not implemented.');
  }

  getBridge(chain: ChainName | ChainId) {
    throw new Error('Method not implemented.');
  }

  mustGetBridge(chain: ChainName | ChainId) {
    throw new Error('Method not implemented.');
  }

  getNftBridge(chain: ChainName | ChainId) {
    throw new Error('Method not implemented.');
  }

  mustGetNftBridge(chain: ChainName | ChainId) {
    throw new Error('Method not implemented.');
  }

  getTokenBridgeRelayer(chain: ChainName | ChainId) {
    throw new Error('Method not implemented.');
  }

  mustGetTokenBridgeRelayer(chain: ChainName | ChainId) {
    throw new Error('Method not implemented.');
  }
}
