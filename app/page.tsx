"use client";

import { usePrivy } from "@privy-io/react-auth";
import { LoginScreen } from "@/features/login/login-screen";
import { AppShell } from "@/features/app-shell/app-shell";

export default function Home() {
  const { ready, authenticated } = usePrivy();

  // Wait for Privy to hydrate before deciding what to show.
  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-[3px] border-brand-soft border-t-brand" />
      </div>
    );
  }

  if (!authenticated) return <LoginScreen />;

  return <AppShell />;
}
