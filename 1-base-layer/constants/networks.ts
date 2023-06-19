export const networks = ["Mainnet", "Testnet", "Devnet"] as const;
export type Network = typeof networks[number];
export const isNetwork = (network: string): network is Network =>
  networks.includes(network as Network);