"use client";

import type { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { defaultChain, supportedChains } from "@/config/chains";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

/**
 * Client-only web3 providers. This is where Privy lives today; the Kernel
 * (EIP-7702) account client, Pimlico bundler/paymaster and Relay client get
 * wired in here (or in child providers/hooks) as screens are built.
 *
 * Loaded via `next/dynamic` with `ssr: false` (see app/providers.tsx) so none
 * of this runs on the server, where `window` / `indexedDB` are unavailable.
 *
 * NOTE: verify the exact Privy config shape against the current
 * @privy-io/react-auth docs — these options move between versions.
 */
export function Web3Providers({ children }: { children: ReactNode }) {
  // Let the app boot during scaffolding before keys are set.
  if (!PRIVY_APP_ID) {
    if (typeof window !== "undefined") {
      console.warn(
        "[Web3Providers] NEXT_PUBLIC_PRIVY_APP_ID is not set — rendering without Privy. " +
          "Add it to .env.local to enable auth + the smart-account stack.",
      );
    }
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["email", "google", "apple", "wallet"],
        embeddedWallets: { createOnLogin: "users-without-wallets" },
        defaultChain,
        supportedChains,
        appearance: { theme: "light", accentColor: "#6E56CF" },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
