import { useQuery } from "@tanstack/react-query";
import type { ActivityItem } from "@/lib/alchemy/activity";

async function fetchActivityFeed(address: string): Promise<ActivityItem[]> {
  const res = await fetch(`/api/activity?address=${address}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Failed to load activity");
  }
  const data = (await res.json()) as { items?: ActivityItem[] };
  return data.items ?? [];
}

/** Fetches the address's recent activity (receive/send/swap) via /api/activity. */
export function useActivity(address?: string) {
  return useQuery({
    queryKey: ["activity", address],
    queryFn: () => fetchActivityFeed(address as string),
    enabled: Boolean(address),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
