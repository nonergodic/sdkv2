import { UintLayoutItem } from "wormhole-base";

export const amountItem = {
  binary: "uint",
  size: 32
} as const satisfies Omit<UintLayoutItem, "name">;
