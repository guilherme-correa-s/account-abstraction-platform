// Block explorer "tx" base URLs per chain id.
const EXPLORER_TX: Record<number, string> = {
  1: "https://etherscan.io/tx/",
  10: "https://optimistic.etherscan.io/tx/",
  56: "https://bscscan.com/tx/",
  100: "https://gnosisscan.io/tx/",
  130: "https://uniscan.xyz/tx/",
  137: "https://polygonscan.com/tx/",
  324: "https://explorer.zksync.io/tx/",
  480: "https://worldscan.org/tx/",
  8453: "https://basescan.org/tx/",
  42161: "https://arbiscan.io/tx/",
  43114: "https://snowtrace.io/tx/",
  59144: "https://lineascan.build/tx/",
  534352: "https://scrollscan.com/tx/",
  81457: "https://blastscan.io/tx/",
};

export function explorerTxUrl(
  chainId: number | undefined,
  hash: string,
): string | null {
  if (chainId == null || !hash) return null;
  const base = EXPLORER_TX[chainId];
  return base ? `${base}${hash}` : null;
}
