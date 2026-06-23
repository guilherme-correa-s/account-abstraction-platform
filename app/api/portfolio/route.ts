import { isAddress } from "viem";
import { fetchPortfolio } from "@/lib/alchemy/portfolio";

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

// Proxy to Alchemy (Portfolio API for balances + Prices API for prices). Keeps
// the key server-side; React Query on the client hits this route instead.
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
    const portfolio = await fetchPortfolio(ALCHEMY_API_KEY, address);
    return Response.json(portfolio);
  } catch {
    return Response.json({ error: "Failed to load portfolio" }, { status: 502 });
  }
}
