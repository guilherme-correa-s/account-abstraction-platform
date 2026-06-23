"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccountAddress } from "@/hooks/use-account-address";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useSwapQuote } from "@/hooks/use-swap-quote";
import { useSmartAccount } from "@/hooks/use-smart-account";
import { getRawQuote, executeSwap } from "@/lib/relay/execute";
import { hasPimlicoKey } from "@/lib/aa/pimlico";
import { TxModal, type TxState } from "@/features/tx/tx-modal";
import {
  SWAP_CHAINS,
  chainName,
  findToken,
  tokensForChain,
  type SwapToken,
} from "@/config/tokens";
import type { Portfolio } from "@/lib/alchemy/portfolio";
import { formatTokenAmount, formatUsd } from "@/lib/format";

function balanceFor(
  portfolio: Portfolio | undefined,
  chainId: number,
  token: SwapToken,
): number {
  const label = chainName(chainId);
  const h = portfolio?.holdings.find(
    (x) =>
      x.networkLabel === label &&
      (token.native
        ? x.isNative
        : x.tokenAddress?.toLowerCase() === token.address.toLowerCase()),
  );
  return h?.balance ?? 0;
}

function errMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string" && m.length > 0) return m.slice(0, 200);
  }
  return "execution reverted";
}

export function SwapScreen() {
  const address = useAccountAddress();
  const { data: portfolio } = usePortfolio(address);
  const { getKernelClient } = useSmartAccount();
  const queryClient = useQueryClient();

  const [fromChainId, setFromChainId] = useState<number>(137);
  const [toChainId, setToChainId] = useState<number>(137);
  const [fromSymbol, setFromSymbol] = useState("USDC");
  const [toSymbol, setToSymbol] = useState("POL");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [tx, setTx] = useState<TxState | null>(null);

  // Debounce the amount feeding the quote.
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(amount), 400);
    return () => clearTimeout(t);
  }, [amount]);

  const fromToken = findToken(fromChainId, fromSymbol);
  const toToken = findToken(toChainId, toSymbol);
  const isCrossChain = fromChainId !== toChainId;
  const sameSelection =
    !isCrossChain &&
    fromToken.address.toLowerCase() === toToken.address.toLowerCase();

  const amountNum = parseFloat(amount) || 0;
  const fromBalance = balanceFor(portfolio, fromChainId, fromToken);
  const insufficient = amountNum > fromBalance;

  const quote = useSwapQuote({
    user: address,
    fromChainId,
    toChainId,
    fromToken,
    toToken,
    amount: debounced,
  });

  const q = quote.data;
  const estStr = quote.isLoading ? "…" : q ? formatTokenAmount(q.outAmount) : "0.0";

  const rateStr = useMemo(() => {
    if (!q || !q.rate) return "—";
    return `1 ${fromToken.symbol} = ${formatTokenAmount(q.rate)} ${toToken.symbol}`;
  }, [q, fromToken.symbol, toToken.symbol]);

  const routeStr = isCrossChain
    ? `Relay · ${chainName(fromChainId)} → ${chainName(toChainId)}`
    : `Relay · ${chainName(fromChainId)}`;

  function flip() {
    setFromChainId(toChainId);
    setToChainId(fromChainId);
    setFromSymbol(toSymbol);
    setToSymbol(fromSymbol);
    setNote(null);
  }

  const disabled = sameSelection || insufficient || amountNum <= 0;
  const btnLabel = sameSelection
    ? "Select different tokens"
    : insufficient
      ? "Insufficient balance"
      : isCrossChain
        ? "Swap & bridge via Relay"
        : "Swap";

  async function onSwap() {
    if (disabled || (tx && tx.status === "pending")) return;
    setNote(null);
    if (!hasPimlicoKey()) {
      setNote("Set NEXT_PUBLIC_PIMLICO_API_KEY in .env.local to execute (gasless).");
      return;
    }
    if (!address) return;

    const title = isCrossChain
      ? `Swap ${fromToken.symbol} (${chainName(fromChainId)}) → ${toToken.symbol} (${chainName(toChainId)})`
      : `Swap ${fromToken.symbol} → ${toToken.symbol}`;
    setTx({ title, status: "pending", step: 0, network: chainName(toChainId), summary: [] });

    try {
      const bundle = await getKernelClient(fromChainId);
      const raw = await getRawQuote({
        user: bundle.account.address,
        fromChainId,
        toChainId,
        fromToken,
        toToken,
        amount,
      });
      const hash = await executeSwap(bundle, raw, (step, h) => {
        setTx((t) =>
          t
            ? {
                ...t,
                step: step === "signing" ? 0 : step === "submitting" ? 1 : 2,
                hash: h ?? t.hash,
              }
            : t,
        );
      });
      setTx((t) =>
        t
          ? {
              ...t,
              status: "success",
              step: 3,
              hash,
              summary: [
                `Swapped ${formatTokenAmount(amountNum)} ${fromToken.symbol} → ~${estStr} ${toToken.symbol}`,
                isCrossChain ? "Bridged & routed via Relay" : "Routed via Relay",
                "Gas sponsored by Pimlico paymaster",
              ],
            }
          : t,
      );
      setAmount("");
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    } catch (e) {
      setTx((t) => (t ? { ...t, status: "failed", reason: errMessage(e) } : t));
    }
  }

  return (
    <>
      <div className="mx-auto max-w-[460px] animate-fade-up">
        <h2 className="mb-4 text-[19px] font-bold tracking-[-0.4px]">Swap</h2>

        {/* Network row */}
        <div className="mb-3 flex items-end gap-2">
          <NetworkSelect
            label="From network"
            value={fromChainId}
            onChange={(v) => {
              setFromChainId(v);
              setFromSymbol(tokensForChain(v)[0].symbol);
            }}
          />
          <span className="pb-2 text-[15px] text-[#a1a1aa]">→</span>
          <NetworkSelect
            label="To network"
            value={toChainId}
            onChange={(v) => {
              setToChainId(v);
              setToSymbol(tokensForChain(v)[0].symbol);
            }}
          />
        </div>

        {isCrossChain && (
          <div className="mb-3 flex items-center gap-2 rounded-[11px] border border-info-border bg-info-bg px-[13px] py-[9px] text-[12.5px] text-info">
            <span>🌐</span>
            <span>
              <b>Cross-chain swap</b> · routed &amp; bridged via Relay
            </span>
          </div>
        )}

        <div className="rounded-2xl border border-[#ebebe8] bg-white p-4">
          {/* From */}
          <div className="rounded-xl border border-[#eee] bg-[#f6f6f4] p-[14px]">
            <div className="mb-2 flex justify-between text-xs text-[#71717a]">
              <span className="font-semibold">From</span>
              <span>
                Balance {formatTokenAmount(fromBalance)} ·{" "}
                <button
                  onClick={() => setAmount(String(fromBalance))}
                  className="font-semibold text-brand"
                >
                  Max
                </button>
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                inputMode="decimal"
                placeholder="0.00"
                className="min-w-0 flex-1 bg-transparent font-mono text-[26px] font-semibold outline-none"
              />
              <TokenSelect
                chainId={fromChainId}
                value={fromSymbol}
                onChange={setFromSymbol}
              />
            </div>
            <div className="mt-1 text-xs text-[#a1a1aa]">
              {q?.inUsd != null ? `≈ ${formatUsd(q.inUsd)}` : "$0.00"}
            </div>
          </div>

          {/* Flip */}
          <div className="relative z-[2] -my-[9px] flex justify-center">
            <button
              onClick={flip}
              className="size-[34px] rounded-[9px] border border-[#e4e4e7] bg-white text-[15px] text-[#71717a] shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:border-brand hover:text-brand"
            >
              ⇅
            </button>
          </div>

          {/* To */}
          <div className="rounded-xl border border-[#eee] bg-[#f6f6f4] p-[14px]">
            <div className="mb-2 flex justify-between text-xs text-[#71717a]">
              <span className="font-semibold">To (estimated)</span>
              <span>
                Balance {formatTokenAmount(balanceFor(portfolio, toChainId, toToken))}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="min-w-0 flex-1 font-mono text-[26px] font-semibold text-[#52525b]">
                {estStr}
              </div>
              <TokenSelect chainId={toChainId} value={toSymbol} onChange={setToSymbol} />
            </div>
            <div className="mt-1 text-xs text-[#a1a1aa]">
              {q?.outUsd != null ? `≈ ${formatUsd(q.outUsd)}` : "$0.00"}
            </div>
          </div>

          {/* Details */}
          <div className="mt-[14px] rounded-xl border border-[#f0f0ed] px-[14px] py-3 text-[12.5px] text-[#52525b]">
            <Row label="Rate">
              <span className="font-mono">{rateStr}</span>
            </Row>
            <Row label="Route">
              <span>{routeStr}</span>
            </Row>
            <Row label="Network fee">
              <span className="inline-flex items-center gap-1.5 rounded-[7px] border border-success-border bg-success-bg px-2 py-0.5 text-[11.5px] font-semibold text-success-foreground">
                ✓ Sponsored · Paymaster
              </span>
            </Row>
          </div>

          <button
            onClick={onSwap}
            disabled={disabled}
            className="mt-4 w-full rounded-[11px] py-[14px] text-[15px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#e4e4e7] disabled:text-[#a1a1aa] enabled:bg-brand enabled:hover:bg-brand-hover"
          >
            {btnLabel}
          </button>

          {quote.isError && (
            <p className="mt-2 text-center text-xs text-danger">
              Couldn&apos;t fetch a quote for this pair.
            </p>
          )}
          {note && <p className="mt-2 text-center text-xs text-[#71717a]">{note}</p>}
        </div>
      </div>

      <TxModal tx={tx} onClose={() => setTx(null)} onRetry={() => onSwap()} />
    </>
  );
}

function NetworkSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex-1 rounded-[11px] border border-[#ebebe8] bg-white px-[11px] py-2">
      <div className="mb-[3px] text-[10px] font-semibold uppercase tracking-[0.4px] text-[#a1a1aa]">
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer border-none bg-transparent text-[13.5px] font-semibold outline-none"
      >
        {SWAP_CHAINS.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function TokenSelect({
  chainId,
  value,
  onChange,
}: {
  chainId: number;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="cursor-pointer rounded-[10px] border border-[#e4e4e7] bg-white px-2.5 py-2 text-sm font-semibold outline-none"
    >
      {tokensForChain(chainId).map((t) => (
        <option key={t.symbol} value={t.symbol}>
          {t.symbol}
        </option>
      ))}
    </select>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-[3px]">
      <span className="text-[#a1a1aa]">{label}</span>
      {children}
    </div>
  );
}
