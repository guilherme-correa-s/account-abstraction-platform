"use client";

import { useState } from "react";
import { isAddress } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { useAccountAddress } from "@/hooks/use-account-address";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useSmartAccount } from "@/hooks/use-smart-account";
import { executeTransfer } from "@/lib/aa/transfer";
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
import { formatTokenAmount, formatUsd, shortAddress } from "@/lib/format";

function holdingFor(
  portfolio: Portfolio | undefined,
  chainId: number,
  token: SwapToken,
) {
  const label = chainName(chainId);
  return portfolio?.holdings.find(
    (x) =>
      x.networkLabel === label &&
      (token.native
        ? x.isNative
        : x.tokenAddress?.toLowerCase() === token.address.toLowerCase()),
  );
}

function errMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string" && m.length > 0) return m.slice(0, 200);
  }
  return "execution reverted";
}

export function TransferScreen() {
  const address = useAccountAddress();
  const { data: portfolio } = usePortfolio(address);
  const { getKernelClient } = useSmartAccount();
  const queryClient = useQueryClient();

  const [chainId, setChainId] = useState<number>(137);
  const [symbol, setSymbol] = useState("USDC");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [tx, setTx] = useState<TxState | null>(null);

  const token = findToken(chainId, symbol);
  const holding = holdingFor(portfolio, chainId, token);
  const balance = holding?.balance ?? 0;
  const price = holding?.priceUsd ?? null;

  const amountNum = parseFloat(amount) || 0;
  const recipientOk = isAddress(to);
  const insufficient = amountNum > balance;
  const disabled = !recipientOk || amountNum <= 0 || insufficient;

  const recipientHint =
    to === ""
      ? { text: "Enter a valid 0x address", color: "#a1a1aa" }
      : recipientOk
        ? { text: "✓ Valid address", color: "#16a34a" }
        : { text: "Invalid address", color: "#dc2626" };

  const btnLabel = insufficient
    ? "Insufficient balance"
    : !recipientOk && to !== ""
      ? "Invalid recipient"
      : "Send";

  async function onSend() {
    if (disabled || (tx && tx.status === "pending")) return;
    setNote(null);
    if (!hasPimlicoKey()) {
      setNote("Set NEXT_PUBLIC_PIMLICO_API_KEY in .env.local to execute (gasless).");
      return;
    }

    setTx({
      title: `Send ${formatTokenAmount(amountNum)} ${token.symbol}`,
      status: "pending",
      step: 0,
      network: chainName(chainId),
      summary: [],
    });

    try {
      const bundle = await getKernelClient(chainId);
      const hash = await executeTransfer(bundle, { token, to, amount }, (step, h) => {
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
                `Sent ${formatTokenAmount(amountNum)} ${token.symbol}`,
                `To ${shortAddress(to)}`,
                "Gas sponsored by Pimlico paymaster",
              ],
            }
          : t,
      );
      setAmount("");
      setTo("");
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    } catch (e) {
      setTx((t) => (t ? { ...t, status: "failed", reason: errMessage(e) } : t));
    }
  }

  return (
    <>
      <div className="mx-auto max-w-[460px] animate-fade-up">
        <h2 className="mb-4 text-[19px] font-bold tracking-[-0.4px]">Transfer</h2>

        <div className="rounded-2xl border border-[#ebebe8] bg-white p-[18px]">
          {/* Network */}
          <label className="text-[12.5px] font-semibold text-[#52525b]">Network</label>
          <select
            value={chainId}
            onChange={(e) => {
              const v = Number(e.target.value);
              setChainId(v);
              setSymbol(tokensForChain(v)[0].symbol);
            }}
            className="mb-[14px] mt-[7px] w-full cursor-pointer rounded-[10px] border border-[#e4e4e7] bg-white px-3 py-[11px] text-sm font-semibold outline-none"
          >
            {SWAP_CHAINS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Asset */}
          <label className="text-[12.5px] font-semibold text-[#52525b]">Asset</label>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="mb-[14px] mt-[7px] w-full cursor-pointer rounded-[10px] border border-[#e4e4e7] bg-white px-3 py-[11px] text-sm font-semibold outline-none"
          >
            {tokensForChain(chainId).map((t) => (
              <option key={t.symbol} value={t.symbol}>
                {t.symbol} · {t.name}
              </option>
            ))}
          </select>

          {/* Recipient */}
          <label className="text-[12.5px] font-semibold text-[#52525b]">
            Recipient address
          </label>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value.trim())}
            placeholder="0x..."
            className="mb-1 mt-[7px] w-full rounded-[10px] border border-input bg-[#fcfcfb] px-[14px] py-3 font-mono text-[13.5px] outline-none focus:border-brand focus:bg-white focus:ring-[3px] focus:ring-brand/15"
          />
          <div className="mb-[14px] text-[11.5px]" style={{ color: recipientHint.color }}>
            {recipientHint.text}
          </div>

          {/* Amount */}
          <div className="mb-1.5 flex justify-between text-[12.5px] text-[#52525b]">
            <label className="font-semibold">Amount</label>
            <span className="text-[#71717a]">
              Balance {formatTokenAmount(balance)} ·{" "}
              <button
                onClick={() => setAmount(String(balance))}
                className="font-semibold text-brand"
              >
                Max
              </button>
            </span>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-[#eee] bg-[#f6f6f4] px-[14px] py-3">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              placeholder="0.00"
              className="min-w-0 flex-1 bg-transparent font-mono text-[22px] font-semibold outline-none"
            />
            <span className="text-sm font-semibold text-[#52525b]">{token.symbol}</span>
          </div>
          <div className="mt-[5px] text-xs text-[#a1a1aa]">
            {price != null && amountNum > 0
              ? `≈ ${formatUsd(amountNum * price)}`
              : "$0.00"}
          </div>

          {/* Network fee */}
          <div className="mt-[14px] flex items-center justify-between rounded-xl border border-[#f0f0ed] px-[14px] py-[11px] text-[12.5px]">
            <span className="text-[#a1a1aa]">Network fee</span>
            <span className="inline-flex items-center gap-1.5 rounded-[7px] border border-success-border bg-success-bg px-2 py-0.5 text-[11.5px] font-semibold text-success-foreground">
              ✓ Sponsored · Paymaster
            </span>
          </div>

          <button
            onClick={onSend}
            disabled={disabled}
            className="mt-4 w-full rounded-[11px] py-[14px] text-[15px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#e4e4e7] disabled:text-[#a1a1aa] enabled:bg-brand enabled:hover:bg-brand-hover"
          >
            {btnLabel}
          </button>

          {note && <p className="mt-2 text-center text-xs text-[#71717a]">{note}</p>}
        </div>
      </div>

      <TxModal tx={tx} onClose={() => setTx(null)} onRetry={() => onSend()} />
    </>
  );
}
