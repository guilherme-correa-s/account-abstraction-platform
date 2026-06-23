"use client";

import { useState } from "react";
import { useExportWallet } from "@privy-io/react-auth";
import { useAccountAddress } from "@/hooks/use-account-address";
import { shortAddress } from "@/lib/format";

/**
 * Export the embedded signer (EOA) private key. Privy renders its OWN secure
 * iframe for the key via exportWallet() — we never read, render, or copy raw key
 * material ourselves. The dark box here is a visual placeholder for that flow.
 */
export function ExportKeyScreen() {
  const address = useAccountAddress();
  const { exportWallet } = useExportWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onExport() {
    if (!address || busy) return;
    setError(null);
    setBusy(true);
    try {
      await exportWallet({ address });
    } catch (e) {
      const m =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: unknown }).message)
          : "Couldn't open the export window.";
      setError(m.slice(0, 160));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[520px] animate-fade-up">
      <h2 className="mb-1 text-[19px] font-bold tracking-[-0.4px]">
        Export private key
      </h2>
      <p className="mb-4 text-[13.5px] text-fg-muted">
        Export the key of your embedded signer (EOA) that controls this smart
        account.
      </p>

      {/* Warning */}
      <div className="mb-4 flex gap-[11px] rounded-[13px] border border-danger-border bg-danger-bg px-4 py-[14px]">
        <span className="text-base leading-[1.2] text-danger">⚠</span>
        <div className="text-[12.5px] leading-[1.45] text-danger-foreground">
          Anyone with this key has full control of your signer and funds. Never
          share it, never paste it on a website, and store it offline.
        </div>
      </div>

      <div className="rounded-[14px] border border-border bg-surface p-[18px]">
        <div className="mb-[9px] text-xs font-semibold uppercase tracking-[0.4px] text-fg-muted">
          Signer private key
        </div>

        {/* Dark box — placeholder; the real key opens in Privy's secure window */}
        <div className="flex min-h-[54px] items-center break-all rounded-[11px] bg-surface-dark px-4 py-[14px] font-mono text-[13px] leading-[1.7] text-[#e4e4e7]">
          <span className="tracking-[2px] text-fg-2">{"•".repeat(48)}</span>
        </div>

        <button
          onClick={onExport}
          disabled={!address || busy}
          className="mt-[14px] w-full rounded-[10px] bg-brand py-3 text-[13.5px] font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-disabled disabled:text-fg-subtle"
        >
          {busy ? "Opening secure window…" : "Export private key"}
        </button>

        <p className="mt-2.5 text-center text-[11.5px] text-fg-subtle">
          Opens Privy&apos;s secure window — your key never touches this app.
        </p>

        {error && (
          <p className="mt-2 text-center text-xs font-medium text-danger">{error}</p>
        )}

        <div className="mt-3 font-mono text-[11.5px] text-fg-subtle">
          Signer EOA · {shortAddress(address)}
        </div>
      </div>
    </div>
  );
}
