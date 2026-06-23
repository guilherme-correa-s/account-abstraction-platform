"use client";

import { shortAddress } from "@/lib/format";

export type TxState = {
  title: string;
  status: "pending" | "success" | "failed";
  step: number; // 0 signing · 1 submitting · 2 confirming
  network: string;
  hash?: string;
  summary: string[];
  reason?: string;
};

export function TxModal({
  tx,
  onClose,
  onRetry,
}: {
  tx: TxState | null;
  onClose: () => void;
  onRetry?: () => void;
}) {
  if (!tx) return null;

  const steps = [
    "Signing UserOperation",
    "Submitting to bundler",
    `Confirming on ${tx.network}`,
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(24,24,27,0.45)] p-6 animate-overlay-in">
      <div className="w-full max-w-[400px] rounded-[18px] bg-surface p-[22px] shadow-[0_24px_60px_rgba(0,0,0,0.25)] animate-pop">
        <div className="text-[16px] font-bold tracking-[-0.3px]">{tx.title}</div>
        <div className="mb-[18px] mt-1 font-mono text-[12.5px] text-fg-subtle">
          {tx.hash ? shortAddress(tx.hash) : "Preparing…"}
        </div>

        {tx.status === "pending" && (
          <div className="flex flex-col gap-[14px]">
            {steps.map((label, i) => {
              const done = tx.step > i;
              const active = tx.step === i;
              return (
                <div key={label} className="flex items-center gap-3">
                  {done ? (
                    <span className="flex size-6 items-center justify-center rounded-full bg-success text-[13px] text-white">
                      ✓
                    </span>
                  ) : active ? (
                    <span className="size-6 animate-spin rounded-full border-[3px] border-brand-soft border-t-brand" />
                  ) : (
                    <span className="size-6 rounded-full border-2 border-input" />
                  )}
                  <span
                    className="text-[13.5px] font-medium"
                    style={{
                      color: done
                        ? "var(--success)"
                        : active
                          ? "var(--fg)"
                          : "var(--fg-subtle)",
                    }}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {tx.status === "success" && (
          <div>
            <div className="flex flex-col items-center px-0 pb-[14px] pt-1 text-center">
              <span className="flex size-[46px] items-center justify-center rounded-full bg-success text-2xl text-white">
                ✓
              </span>
              <div className="mt-3 text-[16px] font-bold">Transaction confirmed</div>
              <div className="mt-0.5 text-[12.5px] text-fg-subtle">
                Included on {tx.network}
              </div>
            </div>
            <div className="rounded-[11px] border border-divider bg-surface-inset px-[14px] py-3">
              {tx.summary.map((line, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 py-[3px] text-[12.5px] text-fg-2"
                >
                  <span className="text-success-foreground">✓</span>
                  {line}
                </div>
              ))}
            </div>
            <button
              onClick={onClose}
              className="mt-4 w-full rounded-[10px] bg-brand py-3 text-[14.5px] font-semibold text-white hover:bg-brand-hover"
            >
              Done
            </button>
          </div>
        )}

        {tx.status === "failed" && (
          <div>
            <div className="flex flex-col items-center px-0 pb-[14px] pt-1 text-center">
              <span className="flex size-[46px] items-center justify-center rounded-full bg-danger text-[21px] text-white">
                ✕
              </span>
              <div className="mt-3 text-[16px] font-bold">Transaction failed</div>
              <div className="mt-0.5 text-[12.5px] text-fg-subtle">
                Reverted at · {steps[tx.step] ?? steps[steps.length - 1]}
              </div>
            </div>
            <div className="break-words rounded-[11px] border border-danger-border bg-danger-bg px-[14px] py-3 font-mono text-[12px] leading-[1.5] text-danger-foreground">
              {tx.reason ?? "execution reverted"}
            </div>
            <div className="mt-2.5 flex items-center gap-2 rounded-[10px] border border-success-border bg-success-bg px-3 py-[9px] text-[11.5px] leading-[1.4] text-success-foreground">
              <span>✓</span>No funds moved — the failed attempt was atomic and gas
              was sponsored, so it cost you nothing.
            </div>
            <div className="mt-4 flex gap-[9px]">
              <button
                onClick={onClose}
                className="flex-1 rounded-[10px] border border-input bg-surface py-3 text-[14px] font-semibold text-fg hover:bg-surface-2"
              >
                Dismiss
              </button>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="flex-1 rounded-[10px] bg-brand py-3 text-[14px] font-semibold text-white hover:bg-brand-hover"
                >
                  Try again
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
