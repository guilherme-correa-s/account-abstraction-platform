"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccountAddress } from "@/hooks/use-account-address";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useSwapQuote } from "@/hooks/use-swap-quote";
import { useSmartAccount } from "@/hooks/use-smart-account";
import { getRawQuote, executeBatch } from "@/lib/relay/execute";
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
import { formatTokenAmount } from "@/lib/format";
import { TokenSelect } from "@/components/token-select";

type Row = { from: string; to: string; amount: string };

function defaultRows(chainId: number): [Row, Row] {
  const t = tokensForChain(chainId).map((x) => x.symbol);
  return [
    { from: t[1] ?? t[0], to: t[2] ?? t[0], amount: "" },
    { from: t[3] ?? t[0], to: t[0], amount: "" },
  ];
}

function balanceFor(
  portfolio: Portfolio | undefined,
  chainId: number,
  token: SwapToken,
): number {
  const label = chainName(chainId);
  return (
    portfolio?.holdings.find(
      (x) =>
        x.networkLabel === label &&
        (token.native
          ? x.isNative
          : x.tokenAddress?.toLowerCase() === token.address.toLowerCase()),
    )?.balance ?? 0
  );
}

function errMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string" && m.length > 0) return m.slice(0, 200);
  }
  return "execution reverted";
}

export function BatchScreen() {
  const address = useAccountAddress();
  const { data: portfolio } = usePortfolio(address);
  const { getKernelClient } = useSmartAccount();
  const queryClient = useQueryClient();

  const [chainId, setChainId] = useState<number>(137);
  const [rows, setRows] = useState<[Row, Row]>(defaultRows(137));
  const [note, setNote] = useState<string | null>(null);
  const [tx, setTx] = useState<TxState | null>(null);

  // Debounce amounts feeding the live estimates.
  const [debounced, setDebounced] = useState<[Row, Row]>(rows);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(rows), 400);
    return () => clearTimeout(t);
  }, [rows]);

  const tok = (sym: string) => findToken(chainId, sym);

  const q0 = useSwapQuote({
    user: address,
    fromChainId: chainId,
    toChainId: chainId,
    fromToken: tok(debounced[0].from),
    toToken: tok(debounced[0].to),
    amount: debounced[0].amount,
  });
  const q1 = useSwapQuote({
    user: address,
    fromChainId: chainId,
    toChainId: chainId,
    fromToken: tok(debounced[1].from),
    toToken: tok(debounced[1].to),
    amount: debounced[1].amount,
  });
  const quoteResults = [q0, q1];

  function setRow(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) as [Row, Row]);
  }

  function rowValid(r: Row): boolean {
    const a = parseFloat(r.amount) || 0;
    return (
      a > 0 &&
      a <= balanceFor(portfolio, chainId, tok(r.from)) &&
      tok(r.from).address.toLowerCase() !== tok(r.to).address.toLowerCase()
    );
  }
  const valid = rows.every(rowValid);

  async function onExecute() {
    if (!valid || (tx && tx.status === "pending")) return;
    setNote(null);
    if (!hasPimlicoKey()) {
      setNote("Set NEXT_PUBLIC_PIMLICO_API_KEY in .env.local to execute (gasless).");
      return;
    }

    setTx({
      title: "Batch · 2 swaps",
      status: "pending",
      step: 0,
      network: chainName(chainId),
      summary: [],
    });

    try {
      const bundle = await getKernelClient(chainId);
      const quotes = await Promise.all(
        rows.map((r) =>
          getRawQuote({
            user: bundle.account.address,
            fromChainId: chainId,
            toChainId: chainId,
            fromToken: tok(r.from),
            toToken: tok(r.to),
            amount: r.amount,
          }),
        ),
      );
      const hash = await executeBatch(bundle, quotes, (step, h) => {
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
                ...rows.map(
                  (r) =>
                    `Swap ${formatTokenAmount(parseFloat(r.amount) || 0)} ${r.from} → ${r.to}`,
                ),
                "Bundled into 1 UserOperation · 1 signature",
                "Gas sponsored by Pimlico paymaster",
              ],
            }
          : t,
      );
      setRows((rs) => rs.map((r) => ({ ...r, amount: "" })) as [Row, Row]);
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    } catch (e) {
      setTx((t) => (t ? { ...t, status: "failed", reason: errMessage(e) } : t));
    }
  }

  return (
    <>
      <div className="mx-auto max-w-[560px] animate-fade-up">
        <h2 className="mb-1 text-[19px] font-bold tracking-[-0.4px]">
          Batch transactions
        </h2>
        <p className="mb-4 text-[13.5px] text-fg-muted">
          Bundle multiple actions into a single{" "}
          <span className="font-mono text-fg-2">UserOperation</span> — one
          signature, atomic execution.
        </p>

        <div className="rounded-2xl border border-border bg-surface p-[18px]">
          {/* Network (atomic batching is same-chain only) */}
          <div className="mb-3 flex items-center justify-end gap-2 text-[12.5px] text-fg-2">
            <span>Network</span>
            <select
              value={chainId}
              onChange={(e) => {
                const v = Number(e.target.value);
                setChainId(v);
                setRows(defaultRows(v));
              }}
              className="cursor-pointer rounded-[8px] border border-input bg-surface px-2.5 py-1.5 text-[13px] font-semibold outline-none"
            >
              {SWAP_CHAINS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {rows.map((r, i) => (
            <div key={i}>
              {i === 1 && <div className="my-4 h-px bg-divider" />}
              <BatchRow
                index={i}
                row={r}
                chainId={chainId}
                estimate={quoteResults[i]}
                balance={balanceFor(portfolio, chainId, tok(r.from))}
                onChange={(patch) => setRow(i, patch)}
              />
            </div>
          ))}

          {/* Info panel */}
          <div className="mt-[18px] flex items-center gap-3 rounded-xl border border-brand-panel bg-brand-panel px-[15px] py-[13px]">
            <span className="flex size-[30px] items-center justify-center rounded-lg bg-brand text-sm text-white">
              ⚡
            </span>
            <div className="text-[12.5px] leading-[1.4] text-fg-2">
              <b className="text-fg">2 actions · 1 signature.</b> Executed
              atomically in one transaction; gas sponsored by paymaster.
            </div>
          </div>

          <button
            onClick={onExecute}
            disabled={!valid}
            className="mt-4 w-full rounded-[11px] py-[14px] text-[15px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-disabled disabled:text-fg-subtle enabled:bg-brand enabled:hover:bg-brand-hover"
          >
            {valid ? "Execute batch · 1 signature" : "Enter both swaps"}
          </button>

          {note && <p className="mt-2 text-center text-xs text-fg-muted">{note}</p>}
        </div>
      </div>

      <TxModal tx={tx} onClose={() => setTx(null)} onRetry={() => onExecute()} />
    </>
  );
}

function BatchRow({
  index,
  row,
  chainId,
  estimate,
  balance,
  onChange,
}: {
  index: number;
  row: Row;
  chainId: number;
  estimate: ReturnType<typeof useSwapQuote>;
  balance: number;
  onChange: (patch: Partial<Row>) => void;
}) {
  const est = estimate.isLoading
    ? "…"
    : estimate.data
      ? formatTokenAmount(estimate.data.outAmount)
      : "0.0";

  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2">
        <span className="flex size-[22px] items-center justify-center rounded-[7px] bg-brand-soft text-[12px] font-bold text-brand">
          {index + 1}
        </span>
        <span className="text-[13.5px] font-semibold">Swap</span>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="flex flex-1 items-center gap-2 rounded-[11px] border border-divider bg-surface-inset px-[11px] py-[9px]">
          <input
            value={row.amount}
            onChange={(e) => onChange({ amount: e.target.value.replace(/[^0-9.]/g, "") })}
            inputMode="decimal"
            placeholder="0.00"
            className="min-w-0 flex-1 bg-transparent font-mono text-base font-semibold outline-none"
          />
          <TokenSelect
            chainId={chainId}
            value={row.from}
            onChange={(v) => onChange({ from: v })}
          />
        </div>
        <span className="text-base text-fg-subtle">→</span>
        <TokenSelect chainId={chainId} value={row.to} onChange={(v) => onChange({ to: v })} />
      </div>
      <div className="mb-0.5 mt-1.5 text-xs text-fg-subtle">
        Est. receive ~{est} {row.to} · Balance {formatTokenAmount(balance)} {row.from}
      </div>
    </div>
  );
}
