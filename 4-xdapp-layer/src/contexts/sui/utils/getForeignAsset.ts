import { JsonRpcProvider } from "@mysten/sui.js";
import { ChainId } from "types";
import { getTokenCoinType } from "./utils";

export async function getForeignAsset(
  provider: JsonRpcProvider,
  tokenBridgeStateObjectId: string,
  originChainId: ChainId,
  originAddress: Uint8Array
): Promise<string | null> {
  return getTokenCoinType(
    provider,
    tokenBridgeStateObjectId,
    originAddress,
    originChainId
  );
}