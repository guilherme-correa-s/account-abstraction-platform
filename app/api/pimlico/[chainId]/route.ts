// Server-side proxy for the Pimlico bundler + paymaster RPC.
// Keeps PIMLICO_API_KEY off the browser: the client posts JSON-RPC to
// /api/pimlico/<chainId> and we forward it upstream with the secret key.
const ALLOWED_CHAINS = new Set([137, 8453]);

export async function POST(
  req: Request,
  ctx: { params: Promise<{ chainId: string }> },
) {
  const { chainId } = await ctx.params;
  const id = Number(chainId);

  if (!ALLOWED_CHAINS.has(id)) {
    return Response.json({ error: "Unsupported chain" }, { status: 400 });
  }

  const key = process.env.PIMLICO_API_KEY;
  if (!key) {
    return Response.json(
      { error: "PIMLICO_API_KEY is not configured on the server" },
      { status: 500 },
    );
  }

  const body = await req.text();
  const upstream = await fetch(
    `https://api.pimlico.io/v2/${id}/rpc?apikey=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    },
  );

  // Pass the bundler/paymaster JSON-RPC response straight back.
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
