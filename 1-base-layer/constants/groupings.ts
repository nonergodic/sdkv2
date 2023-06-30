//TODO not convinced we actually need this

import { Chain, chains } from "./chains";

export const groupings = {
  //TODO if we include unset in the list of chains, we probably want to offer a convenience grouping
  // that excludes it here? (though not sure whether "valid" is a great name for that...)
  Valid: chains.filter((chain: Chain) => chain !== "Unset"),
  Terra: ["Terra", "Terra2"] as Chain[],
} as const;

export type Grouping = keyof typeof groupings;

export const inGrouping = (chain: Chain, grouping: Grouping): boolean =>
  (groupings[grouping]).includes(chain);
