"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { tokensForChain, tokenLogoUrl, type SwapToken } from "@/config/tokens";

function TokenLogo({
  chainId,
  token,
  size,
}: {
  chainId: number;
  token: SwapToken;
  size: number;
}) {
  const [ok, setOk] = useState(true);
  const url = tokenLogoUrl(chainId, token);

  if (url && ok) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        loading="lazy"
        onError={() => setOk(false)}
        className="shrink-0 rounded-full bg-white object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        background: token.color,
        fontSize: Math.round(size * 0.42),
      }}
    >
      {token.symbol[0]}
    </span>
  );
}

/** Token dropdown showing logo + symbol (native <select> can't render images). */
export function TokenSelect({
  chainId,
  value,
  onChange,
  wide = false,
}: {
  chainId: number;
  value: string;
  onChange: (symbol: string) => void;
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const tokens = tokensForChain(chainId);
  const token = tokens.find((t) => t.symbol === value) ?? tokens[0];

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${wide ? "w-full" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-[10px] border border-input bg-surface font-semibold ${
          wide ? "w-full px-3 py-[11px] text-sm" : "px-2.5 py-2 text-sm"
        }`}
      >
        <TokenLogo chainId={chainId} token={token} size={wide ? 22 : 18} />
        <span>{token.symbol}</span>
        {wide && <span className="font-normal text-fg-subtle">· {token.name}</span>}
        <ChevronDown className="ml-auto size-3.5 text-fg-subtle" />
      </button>

      {open && (
        <div
          className={`absolute z-30 mt-1 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-[0_10px_30px_rgba(0,0,0,0.18)] ${
            wide ? "inset-x-0" : "right-0 w-48"
          }`}
        >
          {tokens.map((t) => (
            <button
              key={t.symbol}
              type="button"
              onClick={() => {
                onChange(t.symbol);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-2"
            >
              <TokenLogo chainId={chainId} token={t} size={22} />
              <span className="text-sm font-semibold">{t.symbol}</span>
              <span className="truncate text-xs text-fg-subtle">{t.name}</span>
              {t.symbol === token.symbol && (
                <span className="ml-auto text-brand">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
