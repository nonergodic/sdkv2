import { Chain, Network } from "wormhole-base";

export interface UnsignedTransaction {
  readonly transacion: any;
  readonly network: Network;
  readonly chain: Chain;
  readonly description: string;
  readonly stackable: boolean;
}
