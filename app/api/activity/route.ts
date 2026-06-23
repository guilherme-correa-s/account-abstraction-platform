import { isAddress } from "viem";
import { fetchActivity } from "@/lib/alchemy/activity";
import { fetchRelayRequests } from "@/lib/relay/requests";

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

// Hybrid activity feed: Relay swaps/bridges (rich, already classified) merged
// with Alchemy transfers (plain sends/receives). Relay items win on dedup since
// a Relay swap also surfaces as transfers in Alchemy.
export async function GET(req: Request) {
  const address = new URL(req.url).searchParams.get("address");

  if (!address || !isAddress(address)) {
    return Response.json(
      { error: "Invalid or missing `address` query param." },
      { status: 400 },
    );
  }
  if (!ALCHEMY_API_KEY) {
    return Response.json(
      { error: "ALCHEMY_API_KEY is not set on the server." },
      { status: 500 },
    );
  }

  try {
    const [alchemy, relay] = await Promise.all([
      fetchActivity(ALCHEMY_API_KEY, address),
      fetchRelayRequests(address),
    ]);

    const alchemyItems = alchemy.filter(
      (a) => !relay.hashes.has(a.hash.toLowerCase()),
    );
    // Guarantee Relay swaps/bridges get slots (high-signal), then fill with
    // Alchemy transfers up to 20 total, sorted by recency for display.
    const keptRelay = relay.items.slice(0, 10);
    const keptAlchemy = alchemyItems.slice(0, Math.max(0, 20 - keptRelay.length));
    const merged = [...keptRelay, ...keptAlchemy].sort((a, b) =>
      (b.timestamp ?? "").localeCompare(a.timestamp ?? ""),
    );

    return Response.json({ address, items: merged });
  } catch {
    return Response.json({ error: "Failed to load activity" }, { status: 502 });
  }
}
