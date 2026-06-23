"use client";

import type { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { defaultChain, supportedChains } from "@/config/chains";
import { QueryProvider } from "./query-provider";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const PRIVY_CLIENT_ID = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;

/**
 * Client-only web3 providers. Privy + React Query live here today; the Kernel
 * (EIP-7702) account client + Pimlico bundler/paymaster + Relay get layered in
 * as screens are built (see ./smart-wallets and the Pimlico Privy-signer guide).
 *
 * Loaded via `next/dynamic` with `ssr: false` (app/providers.tsx) so none of
 * this runs on the server, where `window` / `indexedDB` are unavailable.
 */
export function Web3Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <PrivyLayer>{children}</PrivyLayer>
    </QueryProvider>
  );
}

function PrivyLayer({ children }: { children: ReactNode }) {
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
      clientId={PRIVY_CLIENT_ID}
      config={{
        loginMethods: ["email", "google", "apple", "wallet"],
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" },
        },
        defaultChain,
        supportedChains,
        appearance: { theme: "light", accentColor: "#6E56CF" },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
