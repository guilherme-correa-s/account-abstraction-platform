"use client";

import { useState } from "react";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useActivity } from "@/hooks/use-activity";
import { useAccountAddress } from "@/hooks/use-account-address";
import type { Tab } from "@/features/app-shell/header";
import {
  formatTokenAmount,
  formatUsd,
  relativeTime,
  shortAddress,
} from "@/lib/format";
import type { Holding } from "@/lib/alchemy/portfolio";
import type { ActivityItem, ActivityKind } from "@/lib/alchemy/activity";

const TOKEN_COLORS: Record<string, string> = {
  USDC: "#2775CA",
  POL: "#8247E5",
  MATIC: "#8247E5",
  WETH: "#627EEA",
  ETH: "#627EEA",
  DAI: "#F5AC37",
};

function tokenColor(symbol: string) {
  return TOKEN_COLORS[symbol.toUpperCase()] ?? "#6E56CF";
}

const ACTIVITY_ICON: Record<
  ActivityKind,
  { char: string; bg: string; color: string }
> = {
  receive: { char: "↓", bg: "var(--success-bg)", color: "var(--success-foreground)" },
  send: { char: "↑", bg: "var(--danger-bg)", color: "var(--danger-foreground)" },
  swap: { char: "⇄", bg: "var(--brand-soft)", color: "var(--brand-fg)" },
};

export function Dashboard({ onNavigate }: { onNavigate?: (tab: Tab) => void }) {
  const address = useAccountAddress();
  const portfolio = usePortfolio(address);
  const activity = useActivity(address);

  const holdings = portfolio.data?.holdings ?? [];
  const total = portfolio.data?.totalUsd ?? 0;
  const items = activity.data ?? [];

  return (
    <div className="animate-fade-up">
      {/* Balance hero */}
      <div className="rounded-[18px] bg-[linear-gradient(135deg,#6E56CF,#8b74e8)] p-6 text-white shadow-[0_12px_30px_rgba(110,86,207,0.28)]">
        <div className="text-[13px] font-medium opacity-85">Total balance</div>
        <div className="my-1 mb-[14px] font-sans text-[38px] font-bold leading-none tracking-[-1.2px]">
          {portfolio.isLoading ? "—" : formatUsd(total)}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-[5px] font-mono text-xs">
            {shortAddress(address)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-[5px] text-xs font-medium">
            <span className="size-1.5 rounded-full bg-[#7ee2a8]" />
            Polygon
          </span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => onNavigate?.("Swap")}
              className="rounded-[9px] bg-white/95 px-4 py-[9px] text-[13.5px] font-semibold text-brand hover:bg-white"
            >
              Swap
            </button>
            <button
              onClick={() => onNavigate?.("Transfer")}
              className="rounded-[9px] border border-white/30 bg-white/15 px-4 py-[9px] text-[13.5px] font-semibold text-white hover:bg-white/25"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Assets + Activity */}
      <div className="mt-4 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(290px,1fr))]">
        {/* Assets */}
        <section className="overflow-hidden rounded-[14px] border border-border bg-surface">
          <div className="border-b border-divider px-[18px] py-[15px] text-sm font-semibold">
            Assets
          </div>
          <div>
            {portfolio.isLoading && <RowSkeletons />}
            {!portfolio.isLoading && portfolio.isError && (
              <Empty text={(portfolio.error as Error)?.message ?? "Couldn't load assets"} />
            )}
            {!portfolio.isLoading && !portfolio.isError && holdings.length === 0 && (
              <Empty text="No priced assets yet" />
            )}
            {!portfolio.isLoading &&
              !portfolio.isError &&
              holdings.map((h) => <AssetRow key={h.id} h={h} />)}
          </div>
        </section>

        {/* Activity */}
        <section className="overflow-hidden rounded-[14px] border border-border bg-surface">
          <div className="border-b border-divider px-[18px] py-[15px] text-sm font-semibold">
            Activity
          </div>
          <div>
            {activity.isLoading && <RowSkeletons />}
            {!activity.isLoading && activity.isError && (
              <Empty text={(activity.error as Error)?.message ?? "Couldn't load activity"} />
            )}
            {!activity.isLoading && !activity.isError && items.length === 0 && (
              <Empty text="No activity yet" />
            )}
            {!activity.isLoading &&
              !activity.isError &&
              items.map((a) => <ActivityRow key={a.id} a={a} />)}
          </div>
        </section>
      </div>
    </div>
  );
}

function TokenAvatar({ symbol, logo }: { symbol: string; logo: string | null }) {
  const [ok, setOk] = useState(Boolean(logo));
  if (ok && logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt=""
        loading="lazy"
        onError={() => setOk(false)}
        className="size-[34px] shrink-0 rounded-full bg-surface object-cover"
      />
    );
  }
  return (
    <span
      className="flex size-[34px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
      style={{ background: tokenColor(symbol) }}
    >
      {symbol.slice(0, 1)}
    </span>
  );
}

function AssetRow({ h }: { h: Holding }) {
  return (
    <div className="flex items-center gap-3 border-b border-divider px-[18px] py-[13px]">
      <TokenAvatar symbol={h.symbol} logo={h.logo} />
      <div className="min-w-0 leading-[1.25]">
        <div className="text-sm font-semibold">{h.symbol}</div>
        <div className="truncate text-xs text-fg-subtle">
          {h.name} · {h.networkLabel}
        </div>
      </div>
      <div className="ml-auto text-right leading-[1.25]">
        <div className="font-mono text-sm font-semibold">
          {formatTokenAmount(h.balance)} {h.symbol}
        </div>
        <div className="text-xs text-fg-subtle">{formatUsd(h.valueUsd)}</div>
      </div>
    </div>
  );
}

function ActivityRow({ a }: { a: ActivityItem }) {
  const icon = ACTIVITY_ICON[a.kind];
  const base =
    "flex items-center gap-3 border-b border-divider px-[18px] py-[13px]";

  const inner = (
    <>
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-[9px] text-sm font-bold"
        style={{ background: icon.bg, color: icon.color }}
      >
        {icon.char}
      </span>
      <div className="min-w-0 leading-[1.25]">
        <div className="truncate text-[13.5px] font-semibold">{a.title}</div>
        <div className="font-mono text-[11.5px] text-fg-subtle">
          {shortAddress(a.hash)} · {relativeTime(a.timestamp)} · {a.networkLabel}
        </div>
      </div>
      <div className="ml-auto text-right leading-[1.3]">
        <div
          className="font-mono text-[13.5px] font-semibold"
          style={{ color: a.positive ? "var(--success-foreground)" : "var(--fg)" }}
        >
          {a.amount}
        </div>
        <div className="text-[11px] font-semibold text-success-foreground">
          Confirmed
        </div>
      </div>
    </>
  );

  if (a.explorerUrl) {
    return (
      <a
        href={a.explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="View on explorer"
        className={`${base} transition-colors hover:bg-surface-2`}
      >
        {inner}
      </a>
    );
  }
  return <div className={base}>{inner}</div>;
}

function Empty({ text }: { text: string }) {
  return (
    <div className="px-[18px] py-10 text-center text-[13px] text-fg-subtle">
      {text}
    </div>
  );
}

function RowSkeletons() {
  return (
    <div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-divider px-[18px] py-[13px]"
        >
          <span className="size-[34px] animate-pulse rounded-full bg-surface-skeleton" />
          <div className="space-y-1.5">
            <div className="h-3 w-16 animate-pulse rounded bg-surface-skeleton" />
            <div className="h-2.5 w-24 animate-pulse rounded bg-surface-skeleton" />
          </div>
          <div className="ml-auto space-y-1.5 text-right">
            <div className="h-3 w-20 animate-pulse rounded bg-surface-skeleton" />
            <div className="ml-auto h-2.5 w-12 animate-pulse rounded bg-surface-skeleton" />
          </div>
        </div>
      ))}
    </div>
  );
}
