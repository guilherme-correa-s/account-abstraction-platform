"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";

/**
 * The user's account address. In EIP-7702 mode the smart-account address equals
 * the embedded EOA address; until the Kernel client is wired we return the Privy
 * embedded wallet address.
 */
export function useAccountAddress(): string | undefined {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const embedded = wallets.find((w) => w.walletClientType === "privy");
  return embedded?.address ?? user?.wallet?.address ?? undefined;
}
