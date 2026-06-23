"use client";

import { useState } from "react";
import { Header, type Tab } from "./header";
import { Dashboard } from "@/features/dashboard/dashboard";
import { SwapScreen } from "@/features/swap/swap-screen";
import { TransferScreen } from "@/features/transfer/transfer-screen";
import { BatchScreen } from "@/features/batch/batch-screen";
import { ExportKeyScreen } from "@/features/export-key/export-key-screen";

export function AppShell() {
  const [tab, setTab] = useState<Tab>("Dashboard");

  return (
    <>
      <Header active={tab} onSelect={setTab} />
      <main className="mx-auto max-w-[1040px] px-5 pb-[72px] pt-6">
        {tab === "Dashboard" && <Dashboard />}
        {tab === "Swap" && <SwapScreen />}
        {tab === "Transfer" && <TransferScreen />}
        {tab === "Batch" && <BatchScreen />}
        {tab === "Export Key" && <ExportKeyScreen />}
      </main>
    </>
  );
}
