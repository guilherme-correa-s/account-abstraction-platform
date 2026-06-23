import { useQuery } from "@tanstack/react-query";
import { parseUnits, formatUnits } from "viem";
import { relayClient } from "@/lib/relay/client";
import type { SwapToken } from "@/config/tokens";

export type SwapQuote = {
  outAmount: number;
  rate: number; // 1 fromToken = rate toToken
  feeUsd: number | null;
  timeSeconds: number | null;
  impactPercent: number | null;
  inUsd: number | null;
  outUsd: number | null;
};

// Minimal view of the Relay quote response (we only read these fields).
type RelayQuote = {
  details?: {
    rate?: string | number;
    timeEstimate?: number;
    currencyIn?: { amountUsd?: string | number };
    currencyOut?: { amount?: string; amountUsd?: string | number };
    totalImpact?: { percent?: string | number };
  };
  fees?: {
    gas?: { amountUsd?: string | number };
    relayer?: { amountUsd?: string | number };
  };
};

const num = (v: unknown): number | null => {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function useSwapQuote(params: {
  user?: string;
  fromChainId: number;
  toChainId: number;
  fromToken: SwapToken;
  toToken: SwapToken;
  amount: string; // human-readable
}) {
  const { user, fromChainId, toChainId, fromToken, toToken, amount } = params;
  const amountNum = parseFloat(amount) || 0;
  const sameToken =
    fromChainId === toChainId &&
    fromToken.address.toLowerCase() === toToken.address.toLowerCase();
  const enabled = amountNum > 0 && Boolean(user) && !sameToken;

  return useQuery<SwapQuote>({
    queryKey: [
      "swap-quote",
      fromChainId,
      toChainId,
      fromToken.address,
      toToken.address,
      amount,
      user,
    ],
    enabled,
    staleTime: 15_000,
    refetchInterval: 20_000,
    retry: 1,
    queryFn: async () => {
      const wei = parseUnits(amount as `${number}`, fromToken.decimals).toString();
      const client = relayClient();
      const quote = (await client.actions.getQuote({
        chainId: fromChainId,
        toChainId,
        currency: fromToken.address,
        toCurrency: toToken.address,
        amount: wei,
        user: user as string,
        recipient: user as string,
        tradeType: "EXACT_INPUT",
      })) as unknown as RelayQuote;

      const d = quote.details ?? {};
      const outRaw = d.currencyOut?.amount;
      const outAmount = outRaw
        ? Number(formatUnits(BigInt(outRaw), toToken.decimals))
        : 0;
      const rate =
        num(d.rate) ?? (amountNum > 0 ? outAmount / amountNum : 0);
      const feeUsd =
        (num(quote.fees?.gas?.amountUsd) ?? 0) +
        (num(quote.fees?.relayer?.amountUsd) ?? 0);

      return {
        outAmount,
        rate: rate ?? 0,
        feeUsd: feeUsd > 0 ? feeUsd : null,
        timeSeconds: d.timeEstimate ?? null,
        impactPercent: num(d.totalImpact?.percent),
        inUsd: num(d.currencyIn?.amountUsd),
        outUsd: num(d.currencyOut?.amountUsd),
      };
    },
  });
}
