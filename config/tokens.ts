// Curated swap token lists per chain (Polygon + Base). Native coin uses the
// zero address (Relay convention). Addresses are mainnet contracts.
export type SwapToken = {
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
  native?: boolean;
  color: string;
};

export const SWAP_CHAINS = [
  { id: 137, name: "Polygon" },
  { id: 8453, name: "Base" },
] as const;

export type SwapChainId = (typeof SWAP_CHAINS)[number]["id"];

const NATIVE = "0x0000000000000000000000000000000000000000" as const;

export const SWAP_TOKENS: Record<number, SwapToken[]> = {
  137: [
    { symbol: "POL", name: "Polygon", address: NATIVE, decimals: 18, native: true, color: "#8247E5" },
    { symbol: "USDC", name: "USD Coin", address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", decimals: 6, color: "#2775CA" },
    { symbol: "WETH", name: "Wrapped Ether", address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", decimals: 18, color: "#627EEA" },
    { symbol: "DAI", name: "Dai", address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", decimals: 18, color: "#F5AC37" },
  ],
  8453: [
    { symbol: "ETH", name: "Ethereum", address: NATIVE, decimals: 18, native: true, color: "#627EEA" },
    { symbol: "USDC", name: "USD Coin", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6, color: "#2775CA" },
    { symbol: "WETH", name: "Wrapped Ether", address: "0x4200000000000000000000000000000000000006", decimals: 18, color: "#627EEA" },
    { symbol: "DAI", name: "Dai", address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", decimals: 18, color: "#F5AC37" },
  ],
};

export function chainName(id: number): string {
  return SWAP_CHAINS.find((c) => c.id === id)?.name ?? String(id);
}

export function tokensForChain(chainId: number): SwapToken[] {
  return SWAP_TOKENS[chainId] ?? [];
}

export function findToken(chainId: number, symbol: string): SwapToken {
  const list = tokensForChain(chainId);
  return list.find((t) => t.symbol === symbol) ?? list[0];
}
