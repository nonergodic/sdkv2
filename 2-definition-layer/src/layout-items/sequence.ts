import { UintLayoutItem } from "wormhole-base";

export const sequenceItem = {
  binary: "uint",
  size: 8,
} as const satisfies Omit<UintLayoutItem, "name">;
