import { parseUnits } from "viem";
import { relayClient } from "./client";
import type { SwapToken } from "@/config/tokens";
import type { SmartAccountBundle } from "@/hooks/use-smart-account";

// The raw Relay quote returns a `steps` array of transactions to run. For a
// smart account we pull each step's call ({to, data, value}) and batch them into
// a single sponsored UserOperation (approve + swap, atomic).
type RelayStepItem = { data?: { to?: string; data?: string; value?: string } };
type RelayStep = { kind?: string; requestId?: string; items?: RelayStepItem[] };
type RawQuote = { steps?: RelayStep[] };

type Call = { to: `0x${string}`; value: bigint; data: `0x${string}` };

export async function getRawQuote(params: {
  user: string;
  fromChainId: number;
  toChainId: number;
  fromToken: SwapToken;
  toToken: SwapToken;
  amount: string;
}): Promise<unknown> {
  const { user, fromChainId, toChainId, fromToken, toToken, amount } = params;
  const wei = parseUnits(amount as `${number}`, fromToken.decimals).toString();
  return relayClient().actions.getQuote({
    chainId: fromChainId,
    toChainId,
    currency: fromToken.address,
    toCurrency: toToken.address,
    amount: wei,
    user,
    recipient: user,
    tradeType: "EXACT_INPUT",
  });
}

export function extractCalls(quote: unknown): Call[] {
  const q = quote as RawQuote;
  const calls: Call[] = [];
  for (const step of q.steps ?? []) {
    if (step.kind && step.kind !== "transaction") continue;
    for (const item of step.items ?? []) {
      const d = item.data;
      if (!d?.to || !d?.data) continue;
      calls.push({
        to: d.to as `0x${string}`,
        data: d.data as `0x${string}`,
        value: d.value ? BigInt(d.value) : BigInt(0),
      });
    }
  }
  return calls;
}

export type ExecStep = "signing" | "submitting" | "confirming";

// Encode calls into one sponsored UserOperation and wait for the receipt.
async function sendCalls(
  bundle: SmartAccountBundle,
  calls: Call[],
  onStep: (step: ExecStep, hash?: string) => void,
): Promise<string> {
  const { kernelClient, account } = bundle;
  if (calls.length === 0) throw new Error("No executable calls");

  onStep("signing");
  const callData = await account.encodeCalls(calls);
  const hash = await kernelClient.sendUserOperation({ callData });

  onStep("submitting", hash);
  const receipt = await kernelClient.waitForUserOperationReceipt({ hash });
  if (!receipt.success) throw new Error("UserOperation reverted on-chain");

  const txHash = receipt.receipt.transactionHash;
  onStep("confirming", txHash);
  return txHash;
}

/** Execute a single Relay swap quote as one sponsored UserOperation. */
export function executeSwap(
  bundle: SmartAccountBundle,
  quote: unknown,
  onStep: (step: ExecStep, hash?: string) => void,
): Promise<string> {
  return sendCalls(bundle, extractCalls(quote), onStep);
}

/**
 * Execute multiple same-chain Relay quotes atomically: flatten every quote's
 * calls into ONE UserOperation (1 signature, all-or-nothing).
 */
export function executeBatch(
  bundle: SmartAccountBundle,
  quotes: unknown[],
  onStep: (step: ExecStep, hash?: string) => void,
): Promise<string> {
  const calls = quotes.flatMap((q) => extractCalls(q));
  return sendCalls(bundle, calls, onStep);
}
