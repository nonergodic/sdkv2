import { Chain, Network } from "wormhole-base";
import { UnsignedTransaction } from "wormhole-definitions";
import { TransactionRequest } from "ethers";

export class EvmUnsignedTransaction implements UnsignedTransaction {
  constructor(
    readonly transacion: TransactionRequest,
    readonly network: Network,
    readonly chain: Chain,
    readonly description: string,
    readonly stackable: boolean = false,
  ) {}
}
