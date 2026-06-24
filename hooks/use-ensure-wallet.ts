"use client";

import { useEffect, useRef } from "react";
import { usePrivy, useWallets, useCreateWallet } from "@privy-io/react-auth";
import { useAccountAddress } from "./use-account-address";

/**
 * Guarantees the logged-in user has an embedded wallet.
 *
 * Privy's `createOnLogin: "users-without-wallets"` does not reliably provision
 * the embedded wallet on login with our setup (after auth completes and
 * `useWallets()` is ready, the user can still have no wallet). Without a wallet
 * there's no address, so the whole app (header, balances, activity) renders
 * empty. This explicitly creates the embedded wallet when one is missing.
 *
 * Mount ONCE (in AppShell) so we never fire concurrent createWallet() calls
 * from the many components that read `useAccountAddress`.
 */
export function useEnsureWallet() {
  const { ready, authenticated } = usePrivy();
  const { ready: walletsReady } = useWallets();
  const { createWallet } = useCreateWallet();
  const address = useAccountAddress();
  const attempted = useRef(false);

  useEffect(() => {
    if (!ready || !authenticated || !walletsReady) return;
    if (address || attempted.current) return;
    attempted.current = true; // one shot — avoid retry loops / duplicate creates
    // Swallow errors: benign if a wallet already exists (load race), and a hard
    // failure (e.g. embedded wallets disabled) just leaves the address empty.
    createWallet().catch(() => {});
  }, [ready, authenticated, walletsReady, address, createWallet]);
}
