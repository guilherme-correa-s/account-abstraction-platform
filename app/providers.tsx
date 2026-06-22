"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

/**
 * The web3 providers touch browser-only APIs (window, indexedDB, WalletConnect,
 * Privy's iframe). We load them with `ssr: false` so they never execute on the
 * server. `ssr: false` is only allowed inside a Client Component — hence the
 * "use client" directive above.
 */
const Web3Providers = dynamic(
  () =>
    import("@/components/providers/web3-providers").then(
      (m) => m.Web3Providers,
    ),
  { ssr: false, loading: () => null },
);

export function Providers({ children }: { children: ReactNode }) {
  return <Web3Providers>{children}</Web3Providers>;
}
