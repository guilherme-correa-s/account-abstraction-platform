import { formatTokenAmount } from "@/lib/format";
import { explorerTxUrl } from "@/lib/explorer";
import { networkLabel } from "./portfolio";

/**
 * Activity feed built from Alchemy's Transfers API (alchemy_getAssetTransfers).
 * Alchemy returns raw asset movements (no "operation" label), so we query both
 * directions per network, group by tx hash, and derive the operation:
 *   - in only            -> receive
 *   - out only           -> send
 *   - out + in (diff)    -> swap
 *
 * These hit the JSON-RPC endpoints (`<network>.g.alchemy.com/v2`); Alchemy
 * aliases both `matic-mainnet` and `polygon-mainnet` to the same Polygon RPC.
 */
const ACTIVITY_NETWORKS = ["matic-mainnet", "base-mainnet"] as const;

const NETWORK_CHAIN_ID: Record<string, number> = {
  "matic-mainnet": 137,
  "polygon-mainnet": 137,
  "base-mainnet": 8453,
};

type RawTransfer = {
  hash: string;
  category: string;
  from: string | null;
  to: string | null;
  value: number | null;
  asset: string | null;
  metadata?: { blockTimestamp?: string };
};

export type ActivityKind = "receive" | "send" | "swap";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  title: string;
  hash: string;
  network: string;
  networkLabel: string;
  timestamp: string | null;
  amount: string;
  positive: boolean;
  explorerUrl: string | null;
};

const rpcUrl = (network: string, key: string) =>
  `https://${network}.g.alchemy.com/v2/${key}`;

async function getTransfers(
  network: string,
  key: string,
  address: string,
  dir: "from" | "to",
): Promise<RawTransfer[]> {
  const params: Record<string, unknown> = {
    fromBlock: "0x0",
    toBlock: "latest",
    category: ["external", "erc20"],
    withMetadata: true,
    excludeZeroValue: true,
    maxCount: "0x19", // 25
    order: "desc",
  };
  if (dir === "from") params.fromAddress = address;
  else params.toAddress = address;

  try {
    const res = await fetch(rpcUrl(network, key), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getAssetTransfers",
        params: [params],
      }),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      result?: { transfers?: RawTransfer[] };
    };
    return json?.result?.transfers ?? [];
  } catch {
    return []; // resilient to per-network timeouts
  }
}

function amountStr(value: number | null, asset: string | null, sign: "+" | "−") {
  return `${sign}${formatTokenAmount(value ?? 0)} ${asset ?? ""}`.trim();
}

function classifyNetwork(
  network: string,
  outgoing: RawTransfer[],
  incoming: RawTransfer[],
): ActivityItem[] {
  const byHash = new Map<
    string,
    { out: RawTransfer[]; in: RawTransfer[]; ts: string | null }
  >();

  const add = (t: RawTransfer, side: "out" | "in") => {
    const g = byHash.get(t.hash) ?? { out: [], in: [], ts: null };
    (side === "out" ? g.out : g.in).push(t);
    const ts = t.metadata?.blockTimestamp ?? null;
    if (ts && (!g.ts || ts > g.ts)) g.ts = ts;
    byHash.set(t.hash, g);
  };
  outgoing.forEach((t) => add(t, "out"));
  incoming.forEach((t) => add(t, "in"));

  const byValue = (a: RawTransfer, b: RawTransfer) => (b.value ?? 0) - (a.value ?? 0);
  const items: ActivityItem[] = [];

  for (const [hash, g] of byHash) {
    const pOut = [...g.out].sort(byValue)[0];
    const pIn = [...g.in].sort(byValue)[0];

    let kind: ActivityKind;
    let title: string;
    let amount: string;
    let positive: boolean;

    if (pOut && pIn && pOut.asset !== pIn.asset) {
      kind = "swap";
      title = `Swapped ${pOut.asset ?? "?"} → ${pIn.asset ?? "?"}`;
      amount = amountStr(pIn.value, pIn.asset, "+");
      positive = true;
    } else if (pIn && !pOut) {
      kind = "receive";
      title = `Received ${pIn.asset ?? "tokens"}`;
      amount = amountStr(pIn.value, pIn.asset, "+");
      positive = true;
    } else if (pOut) {
      kind = "send";
      title = `Sent ${pOut.asset ?? "tokens"}`;
      amount = amountStr(pOut.value, pOut.asset, "−");
      positive = false;
    } else {
      continue;
    }

    items.push({
      id: `${network}:${hash}`,
      kind,
      title,
      hash,
      network,
      networkLabel: networkLabel(network),
      timestamp: g.ts,
      amount,
      positive,
      explorerUrl: explorerTxUrl(NETWORK_CHAIN_ID[network], hash),
    });
  }

  return items;
}

export async function fetchActivity(
  apiKey: string,
  address: string,
): Promise<ActivityItem[]> {
  const tasks = ACTIVITY_NETWORKS.flatMap((net) => [
    getTransfers(net, apiKey, address, "from").then((t) => ({ net, dir: "from" as const, t })),
    getTransfers(net, apiKey, address, "to").then((t) => ({ net, dir: "to" as const, t })),
  ]);
  const results = await Promise.all(tasks);

  const byNet = new Map<string, { out: RawTransfer[]; in: RawTransfer[] }>();
  for (const r of results) {
    const g = byNet.get(r.net) ?? { out: [], in: [] };
    if (r.dir === "from") g.out.push(...r.t);
    else g.in.push(...r.t);
    byNet.set(r.net, g);
  }

  const items: ActivityItem[] = [];
  for (const [net, g] of byNet) items.push(...classifyNetwork(net, g.out, g.in));

  items.sort((a, b) => (b.timestamp ?? "").localeCompare(a.timestamp ?? ""));
  return items.slice(0, 20);
}
