"use client";

import { useLogout } from "@privy-io/react-auth";
import { useAccountAddress } from "@/hooks/use-account-address";
import { shortAddress } from "@/lib/format";

const TABS = ["Dashboard", "Swap", "Transfer", "Batch", "Recovery", "Export Key"];

/**
 * Top app shell rendered after login. In EIP-7702 mode the smart-account
 * address equals the embedded EOA address. Tabs are visual-only for now.
 */
export function Header() {
  const { logout } = useLogout();
  const address = useAccountAddress();

  return (
    <header className="sticky top-0 z-20 border-b border-[#ebebe8] bg-white">
      <div className="mx-auto flex max-w-[1040px] flex-wrap items-center gap-3 px-5 py-[13px]">
        {/* Brand */}
        <div className="mr-auto flex items-center gap-2.5">
          <div className="flex size-[34px] items-center justify-center rounded-[10px] bg-brand text-[13px] font-bold tracking-tight text-white">
            AA
          </div>
          <div className="text-[14.5px] font-bold leading-[1.1] tracking-tight">
            Account Abstraction
            <br />
            <span className="text-xs font-medium tracking-normal text-[#a1a1aa]">
              Platform
            </span>
          </div>
        </div>

        {/* Network pill */}
        <div className="flex items-center gap-1.5 rounded-[9px] border border-success-border bg-success-bg px-[11px] py-[7px] text-[12.5px] font-semibold text-success-foreground">
          <span className="size-[7px] rounded-full bg-success" />
          Polygon
        </div>

        {/* Account pill (click to copy) */}
        <button
          onClick={() => address && navigator.clipboard?.writeText(address)}
          title={address ? "Copy address" : undefined}
          className="flex items-center gap-2.5 rounded-[9px] border border-input bg-[#fafafa] py-1.5 pl-[7px] pr-[11px] hover:bg-[#f4f4f5]"
        >
          <span className="size-6 rounded-[7px] bg-[linear-gradient(135deg,#6E56CF,#9d86f0)]" />
          <span className="flex flex-col items-start leading-[1.15]">
            <span className="text-[9px] font-semibold uppercase tracking-[0.5px] text-[#a1a1aa]">
              Smart account
            </span>
            <span className="font-mono text-[12.5px] font-medium text-[#27272a]">
              {shortAddress(address)}
            </span>
          </span>
        </button>

        {/* Sign out */}
        <button
          onClick={() => logout()}
          title="Sign out"
          className="flex size-[34px] items-center justify-center rounded-[9px] border border-input bg-[#fafafa] text-[15px] text-[#71717a] hover:bg-[#f4f4f5] hover:text-foreground"
        >
          {"⏏"}
        </button>
      </div>

      {/* Tab row (visual only for now) */}
      <div className="border-t border-[#f2f2ef]">
        <div className="mx-auto flex max-w-[1040px] gap-0.5 overflow-x-auto px-3">
          {TABS.map((t, i) => (
            <button
              key={t}
              className={
                "whitespace-nowrap px-[15px] py-[13px] text-[13.5px] " +
                (i === 0
                  ? "border-b-2 border-brand font-semibold text-foreground"
                  : "border-b-2 border-transparent font-medium text-[#71717a] hover:text-foreground")
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
