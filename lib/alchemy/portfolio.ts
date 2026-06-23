import { formatUnits } from "viem";

/**
 * Portfolio = Alchemy Portfolio API "tokens by address" (balances + metadata +
 * inline prices, paginated) enriched with the dedicated Prices API for tokens
 * the Portfolio API leaves unpriced. Base comes priced inline; Polygon's prices
 * come back empty from this endpoint, so those are filled via the Prices API.
 * Tokens without a positive USD price are dropped, plus a small dust threshold.
 *
 * Network ids: Polygon is requested as `matic-mainnet` everywhere EXCEPT the
 * Prices API, which only accepts `polygon-mainnet` (it 404s on matic-mainnet).
 */
const PORTFOLIO_NETWORKS = ["matic-mainnet", "base-mainnet"] as const;
const MIN_USD_VALUE = 0.01; // hide dust below ~1 cent
const MAX_PAGINATION = 10;
const PRICE_BATCH = 25; // Prices by-address accepts up to 25 addresses/call
const MAX_PRICED_TOKENS = 100; // bound pricing work for spammy wallets

const NETWORK_LABELS: Record<string, string> = {
  "eth-mainnet": "Ethereum",
  "polygon-mainnet": "Polygon",
  "matic-mainnet": "Polygon",
  "base-mainnet": "Base",
  "arb-mainnet": "Arbitrum",
  "opt-mainnet": "Optimism",
};

const NATIVE: Record<string, { symbol: string; name: string }> = {
  "eth-mainnet": { symbol: "ETH", name: "Ethereum" },
  "base-mainnet": { symbol: "ETH", name: "Ethereum" },
  "arb-mainnet": { symbol: "ETH", name: "Ethereum" },
  "opt-mainnet": { symbol: "ETH", name: "Ethereum" },
  "polygon-mainnet": { symbol: "POL", name: "Polygon" },
  "matic-mainnet": { symbol: "POL", name: "Polygon" },
};

const TRUST_CHAIN: Record<string, string> = {
  "matic-mainnet": "polygon",
  "polygon-mainnet": "polygon",
  "base-mainnet": "base",
  "eth-mainnet": "ethereum",
};

// Prices API only accepts polygon-mainnet (it 404s on matic-mainnet).
function canonicalNetwork(network: string): string {
  return network === "matic-mainnet" ? "polygon-mainnet" : network;
}

export function networkLabel(network: string) {
  return NETWORK_LABELS[network] ?? network;
}

function logoUrl(network: string, tokenAddress: string | null): string | null {
  const chain = TRUST_CHAIN[network];
  if (!chain) return null;
  const base = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chain}`;
  if (tokenAddress == null) return `${base}/info/logo.png`;
  return `${base}/assets/${tokenAddress}/logo.png`;
}

type PriceEntry = { currency: string; value: string };

type RawToken = {
  network: string;
  tokenAddress: string | null;
  tokenBalance: string; // hex
  tokenMetadata: {
    symbol: string | null;
    decimals: number | null;
    name: string | null;
    logo: string | null;
  } | null;
  tokenPrices: PriceEntry[] | null;
};

type RawPortfolioResponse = {
  data?: { tokens?: RawToken[]; pageKey?: string | null };
};

export type Holding = {
  id: string;
  network: string;
  networkLabel: string;
  tokenAddress: string | null;
  isNative: boolean;
  symbol: string;
  name: string;
  decimals: number;
  logo: string | null;
  balance: number;
  priceUsd: number | null;
  valueUsd: number;
};

export type Portfolio = {
  address: string;
  totalUsd: number;
  holdings: Holding[];
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function usdOf(prices: PriceEntry[] | null | undefined): number | null {
  const v = prices?.find((p) => p.currency === "usd")?.value;
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Paginate the Portfolio API for balances + metadata + inline prices.
async function fetchRawTokens(apiKey: string, address: string): Promise<RawToken[]> {
  const tokens: RawToken[] = [];
  let pageKey: string | null = null;
  let count = 0;

  do {
    const res = await fetch(
      `https://api.g.alchemy.com/data/v1/${apiKey}/assets/tokens/by-address`,
      {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({
          addresses: [{ address, networks: PORTFOLIO_NETWORKS }],
          ...(pageKey ? { pageKey } : {}),
        }),
      },
    );
    if (!res.ok) {
      throw new Error(`Alchemy portfolio request failed (${res.status})`);
    }
    const json = (await res.json()) as RawPortfolioResponse;
    if (json.data?.tokens) tokens.push(...json.data.tokens);
    pageKey = json.data?.pageKey ?? null;
    count++;
  } while (pageKey && count < MAX_PAGINATION);

  return tokens;
}

// ERC-20 prices via the dedicated Prices API, batched, keyed `network:addrLower`.
async function fetchPricesByAddress(
  apiKey: string,
  pairs: { network: string; address: string }[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const batches = await Promise.all(
    chunk(pairs, PRICE_BATCH).map(async (batch) => {
      try {
        const res = await fetch(
          `https://api.g.alchemy.com/prices/v1/${apiKey}/tokens/by-address`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ addresses: batch }),
          },
        );
        if (!res.ok) return [];
        const json = (await res.json()) as {
          data?: { network: string; address: string; prices?: PriceEntry[] }[];
        };
        return json.data ?? [];
      } catch {
        return [];
      }
    }),
  );
  for (const data of batches) {
    for (const d of data) {
      const usd = usdOf(d.prices);
      if (usd != null) {
        map.set(`${canonicalNetwork(d.network)}:${d.address.toLowerCase()}`, usd);
      }
    }
  }
  return map;
}

// Native coin prices via the Prices API by-symbol (native has no contract).
async function fetchNativePrices(
  apiKey: string,
  symbols: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const uniq = [...new Set(symbols)];
  if (uniq.length === 0) return map;
  try {
    const qs = uniq.map((s) => `symbols=${encodeURIComponent(s)}`).join("&");
    const res = await fetch(
      `https://api.g.alchemy.com/prices/v1/${apiKey}/tokens/by-symbol?${qs}`,
    );
    if (!res.ok) return map;
    const json = (await res.json()) as {
      data?: { symbol: string; prices?: PriceEntry[] }[];
    };
    for (const d of json.data ?? []) {
      const usd = usdOf(d.prices);
      if (usd != null) map.set(d.symbol.toUpperCase(), usd);
    }
  } catch {
    /* ignore */
  }
  return map;
}

export async function fetchPortfolio(
  apiKey: string,
  address: string,
): Promise<Portfolio> {
  const tokens = await fetchRawTokens(apiKey, address);

  type Pre = {
    network: string;
    tokenAddress: string | null;
    isNative: boolean;
    symbol: string;
    name: string;
    decimals: number;
    logo: string | null;
    balance: number;
    inlinePrice: number | null;
  };

  const pre: Pre[] = [];
  for (const t of tokens) {
    const isNative = t.tokenAddress == null;
    const decimals = t.tokenMetadata?.decimals ?? 18;

    let balance = 0;
    try {
      balance = Number(formatUnits(BigInt(t.tokenBalance ?? "0x0"), decimals));
    } catch {
      balance = 0;
    }
    if (!(balance > 0)) continue;

    const native = NATIVE[t.network];
    const symbol =
      t.tokenMetadata?.symbol ?? (isNative ? native?.symbol : null) ?? "?";
    const name =
      t.tokenMetadata?.name ?? (isNative ? native?.name : null) ?? symbol;

    pre.push({
      network: t.network,
      tokenAddress: t.tokenAddress,
      isNative,
      symbol,
      name,
      decimals,
      logo: t.tokenMetadata?.logo ?? logoUrl(t.network, t.tokenAddress),
      balance,
      inlinePrice: usdOf(t.tokenPrices),
    });
  }

  // Fill price gaps (mostly Polygon) via the dedicated Prices API.
  const erc20Gaps = pre
    .filter((p) => p.inlinePrice == null && !p.isNative && p.tokenAddress)
    .slice(0, MAX_PRICED_TOKENS);
  const pairs = erc20Gaps.map((p) => ({
    network: canonicalNetwork(p.network),
    address: p.tokenAddress as string,
  }));
  const nativeGaps = pre
    .filter((p) => p.inlinePrice == null && p.isNative)
    .map((p) => p.symbol);

  const [priceMap, nativeMap] = await Promise.all([
    pairs.length
      ? fetchPricesByAddress(apiKey, pairs)
      : Promise.resolve(new Map<string, number>()),
    nativeGaps.length
      ? fetchNativePrices(apiKey, nativeGaps)
      : Promise.resolve(new Map<string, number>()),
  ]);

  const holdings: Holding[] = [];
  for (const p of pre) {
    const priceUsd =
      p.inlinePrice ??
      (p.isNative
        ? (nativeMap.get(p.symbol.toUpperCase()) ?? null)
        : (priceMap.get(
            `${canonicalNetwork(p.network)}:${(p.tokenAddress as string).toLowerCase()}`,
          ) ?? null));
    if (priceUsd == null || !(priceUsd > 0)) continue;

    const valueUsd = p.balance * priceUsd;
    if (valueUsd < MIN_USD_VALUE) continue;

    holdings.push({
      id: `${p.network}:${p.tokenAddress ?? "native"}`,
      network: p.network,
      networkLabel: networkLabel(p.network),
      tokenAddress: p.tokenAddress,
      isNative: p.isNative,
      symbol: p.symbol,
      name: p.name,
      decimals: p.decimals,
      logo: p.logo,
      balance: p.balance,
      priceUsd,
      valueUsd,
    });
  }

  holdings.sort((a, b) => b.valueUsd - a.valueUsd);
  const totalUsd = holdings.reduce((s, h) => s + h.valueUsd, 0);
  return { address, totalUsd, holdings };
}
