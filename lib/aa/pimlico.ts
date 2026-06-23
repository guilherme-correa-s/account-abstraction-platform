// Pimlico bundler + paymaster, proxied through our own server route so the API
// key (PIMLICO_API_KEY, server-only) never reaches the browser.
// See app/api/pimlico/[chainId]/route.ts.
export function pimlicoUrl(chainId: number): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/api/pimlico/${chainId}`;
}

export function hasPimlicoKey(): boolean {
  // The key lives server-side now, so the client can't check it directly.
  // We assume gasless is configured; a misconfigured server surfaces a clear
  // error from the proxy at execution time.
  return true;
}
