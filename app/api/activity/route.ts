import { isAddress } from "viem";
import { fetchActivity } from "@/lib/alchemy/activity";

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

// Proxy to Alchemy's Transfers API. Keeps the key server-side; React Query on
// the client hits this route instead.
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
    const items = await fetchActivity(ALCHEMY_API_KEY, address);
    return Response.json({ address, items });
  } catch {
    return Response.json({ error: "Failed to load activity" }, { status: 502 });
  }
}
