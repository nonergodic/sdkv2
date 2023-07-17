import { Context, WormholeConfig } from "../types";

export * from "./createNonce";
export * from "./array";

export function filterByContext(config: WormholeConfig, context: Context) {
  return Object.values(config.chains).filter((c) => c.context === context);
}
