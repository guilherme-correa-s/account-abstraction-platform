import { formatTokenAmount } from "@/lib/format";
import type { ActivityItem } from "@/lib/alchemy/activity";

// Relay's own transaction history (swaps/bridges), richer + already classified.
// GET https://api.relay.link/requests/v2?user=<addr>
const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  10: "Optimism",
  56: "BNB Chain",
  100: "Gnosis",
  130: "Unichain",
  137: "Polygon",
  324: "zkSync",
  480: "World Chain",
  8453: "Base",
  42161: "Arbitrum",
  43114: "Avalanche",
  59144: "Linea",
  534352: "Scroll",
  81457: "Blast",
};
const chainLabel = (id?: number) =>
  id != null ? (CHAIN_NAMES[id] ?? `Chain ${id}`) : "";

type RelayTx = { hash?: string; chainId?: number; timestamp?: number };
type RelayCurrency = {
  currency?: { chainId?: number; symbol?: string };
  amountFormatted?: string;
};
type RelayRequest = {
  id: string;
  status?: string;
  data?: {
    metadata?: { currencyIn?: RelayCurrency; currencyOut?: RelayCurrency };
    inTxs?: RelayTx[];
    outTxs?: RelayTx[];
  };
};

/**
 * Fetch the address's Relay swap/bridge history. Returns activity items plus the
 * set of all related tx hashes (origin + destination) so the caller can dedup
 * against the Alchemy transfer feed (a Relay swap also shows up there).
 */
export async function fetchRelayRequests(
  address: string,
  limit = 15,
): Promise<{ items: ActivityItem[]; hashes: Set<string> }> {
  const hashes = new Set<string>();
  const items: ActivityItem[] = [];

  try {
    const url = `https://api.relay.link/requests/v2?user=${address}&limit=${limit}&sortBy=createdAt&sortDirection=desc`;
    const res = await fetch(url);
    if (!res.ok) return { items, hashes };
    const json = (await res.json()) as { requests?: RelayRequest[] };

    for (const r of json.requests ?? []) {
      // Collect every tx hash for dedup against Alchemy transfers.
      for (const t of [...(r.data?.inTxs ?? []), ...(r.data?.outTxs ?? [])]) {
        if (t.hash) hashes.add(t.hash.toLowerCase());
      }
      if (r.status !== "success") continue;

      const inC = r.data?.metadata?.currencyIn;
      const outC = r.data?.metadata?.currencyOut;
      const inSym = inC?.currency?.symbol ?? "?";
      const outSym = outC?.currency?.symbol ?? "?";
      const inChain = inC?.currency?.chainId;
      const outChain = outC?.currency?.chainId;
      const cross = inChain != null && outChain != null && inChain !== outChain;

      const originTx = r.data?.inTxs?.[0];
      const hash = originTx?.hash;
      if (!hash) continue;

      const ts = originTx?.timestamp;
      const ms = ts != null ? (ts < 1e12 ? ts * 1000 : ts) : null;
      const timestamp = ms != null ? new Date(ms).toISOString() : null;

      const outAmt = outC?.amountFormatted ? Number(outC.amountFormatted) : 0;

      items.push({
        id: `relay:${r.id}`,
        kind: "swap",
        title: cross
          ? `Bridged ${inSym} → ${outSym}`
          : `Swapped ${inSym} → ${outSym}`,
        hash,
        network: chainLabel(inChain),
        networkLabel: cross
          ? `${chainLabel(inChain)} → ${chainLabel(outChain)}`
          : chainLabel(inChain),
        timestamp,
        amount: outAmt > 0 ? `+${formatTokenAmount(outAmt)} ${outSym}` : outSym,
        positive: true,
      });
    }
  } catch {
    /* resilient: fall back to Alchemy-only activity */
  }

  return { items, hashes };
}
