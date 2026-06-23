"use client";

import { usePrivy } from "@privy-io/react-auth";
import { LoginScreen } from "@/features/login/login-screen";
import { Header } from "@/features/app-shell/header";
import { Dashboard } from "@/features/dashboard/dashboard";

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

  return (
    <>
      <Header />
      <main className="mx-auto max-w-[1040px] px-5 pb-[72px] pt-6">
        <Dashboard />
      </main>
    </>
  );
}
