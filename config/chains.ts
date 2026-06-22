import { polygon, base, arbitrum, optimism } from "viem/chains";
import type { Chain } from "viem";

// Polygon is the primary chain; the others are available for Relay
// cross-chain swaps. Keep this list in sync with the Privy `supportedChains`
// and the per-chain Pimlico/Alchemy clients you build later.
export const supportedChains: [Chain, ...Chain[]] = [
  polygon,
  base,
  arbitrum,
  optimism,
];

export const defaultChain: Chain = polygon;
