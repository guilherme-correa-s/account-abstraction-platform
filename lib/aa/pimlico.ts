// Pimlico bundler + paymaster endpoint (v2). The key is client-exposed
// (NEXT_PUBLIC) because the Kernel account client runs in the browser — restrict
// it by domain in the Pimlico dashboard.
export function pimlicoUrl(chainId: number): string {
  const key = process.env.NEXT_PUBLIC_PIMLICO_API_KEY ?? "";
  return `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${key}`;
}

export function hasPimlicoKey(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_PIMLICO_API_KEY);
}
