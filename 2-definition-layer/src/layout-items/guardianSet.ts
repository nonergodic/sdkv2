import { UintLayoutItem } from "wormhole-base";

export const guardianSetItem = {
  binary: "uint",
  size: 4,
} as const satisfies Omit<UintLayoutItem, "name">;
