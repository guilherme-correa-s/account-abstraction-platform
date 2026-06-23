import { useQuery } from "@tanstack/react-query";
import type { Portfolio } from "@/lib/alchemy/portfolio";

async function fetchPortfolio(address: string): Promise<Portfolio> {
  const res = await fetch(`/api/portfolio?address=${address}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Failed to load portfolio");
  }
  return res.json() as Promise<Portfolio>;
}

/** Fetches the address's priced token holdings via /api/portfolio. */
export function usePortfolio(address?: string) {
  return useQuery({
    queryKey: ["portfolio", address],
    queryFn: () => fetchPortfolio(address as string),
    enabled: Boolean(address),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
